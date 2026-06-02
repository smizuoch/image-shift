import { canvasToBlob } from './formats.js';
import { loadImageElement } from './image-io.js';

export async function convertImage(source, options) {
  const image = await loadImageElement(source.previewUrl);
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;

  const context = canvas.getContext('2d');
  if (!options.format.supportsAlpha) {
    context.fillStyle = options.matteColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await encodeCanvas(canvas, options);
  if (!blob) {
    throw new Error(`${options.format.label} への変換に失敗しました。`);
  }
  if (blob.type && blob.type.toLowerCase() !== options.format.mime) {
    throw new Error(`このブラウザは ${options.format.label} の書き出しに対応していません。`);
  }

  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    outputType: options.format.mime,
    outputTypeLabel: options.format.label,
    outputSize: blob.size,
    width: source.width,
    height: source.height,
    matteApplied: !options.format.supportsAlpha && source.hasAlpha,
    losslessApplied: options.lossless && options.format.lossless,
    losslessRequested: options.lossless,
  };
}

function clampQuality(value) {
  if (!Number.isFinite(value)) {
    return 0.92;
  }
  return Math.min(1, Math.max(0.01, value));
}

async function encodeCanvas(canvas, options) {
  if (options.format.encoder === 'bmp') {
    return encodeBmp(canvas);
  }
  if (options.format.encoder === 'ico') {
    return encodeIco(canvas);
  }

  const quality = !options.format.supportsQuality
    ? undefined
    : options.lossless
      ? 1
      : clampQuality(options.quality / 100);
  return canvasToBlob(canvas, options.format.mime, quality);
}

function encodeBmp(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const context = canvas.getContext('2d');
  const { data } = context.getImageData(0, 0, width, height);
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 14 + 40 + pixelArraySize;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  view.setUint16(0, 0x4d42, true);
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixelArraySize, true);
  view.setUint32(38, 2835, true);
  view.setUint32(42, 2835, true);

  let offset = 54;
  for (let y = height - 1; y >= 0; y -= 1) {
    const rowStart = offset;
    for (let x = 0; x < width; x += 1) {
      const sourceIndex = (y * width + x) * 4;
      bytes[offset] = data[sourceIndex + 2];
      bytes[offset + 1] = data[sourceIndex + 1];
      bytes[offset + 2] = data[sourceIndex];
      offset += 3;
    }
    offset = rowStart + rowSize;
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

async function encodeIco(canvas) {
  if (canvas.width > 256 || canvas.height > 256) {
    throw new Error('ICO は 256 x 256px 以下の画像で利用できます。寸法を変更しない方針のため、この画像ではICOに変換できません。');
  }
  const pngBlob = await canvasToBlob(canvas, 'image/png');
  if (!pngBlob) {
    return null;
  }
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
  const headerSize = 6;
  const directorySize = 16;
  const imageOffset = headerSize + directorySize;
  const buffer = new ArrayBuffer(imageOffset + pngBytes.byteLength);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  bytes[6] = canvas.width >= 256 ? 0 : canvas.width;
  bytes[7] = canvas.height >= 256 ? 0 : canvas.height;
  bytes[8] = 0;
  bytes[9] = 0;
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, pngBytes.byteLength, true);
  view.setUint32(18, imageOffset, true);
  bytes.set(pngBytes, imageOffset);

  return new Blob([buffer], { type: 'image/x-icon' });
}
