import { labelForMime, normalizeMime } from './formats.js';

const MAX_PIXELS = 80_000_000;

export async function loadImageSource(file) {
  if (!file) {
    throw new Error('画像ファイルを選択してください。');
  }
  const declaredType = normalizeMime(file.type);
  if (declaredType && !declaredType.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください。');
  }

  const previewUrl = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(previewUrl);
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height) {
      throw new Error('画像サイズを取得できませんでした。');
    }
    if (width * height > MAX_PIXELS) {
      throw new Error('画像が大きすぎます。80メガピクセル以下の画像で試してください。');
    }

    const sourceType = declaredType || inferMimeFromName(file.name) || 'image/unknown';
    return {
      file,
      name: file.name,
      size: file.size,
      type: sourceType,
      typeLabel: labelForMime(sourceType),
      previewUrl,
      width,
      height,
      hasAlpha: await detectAlpha(image, width, height),
    };
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}

function inferMimeFromName(name) {
  const extension = String(name || '').split('.').pop()?.toLowerCase();
  const map = {
    avif: 'image/avif',
    bmp: 'image/bmp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    jxl: 'image/jxl',
    png: 'image/png',
    svg: 'image/svg+xml',
    webp: 'image/webp',
  };
  return map[extension] || '';
}

export function revokeObjectUrl(url) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

export function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('ブラウザがこの画像を読み込めませんでした。'));
    image.decoding = 'async';
    image.src = url;
  });
}

async function detectAlpha(image, width, height) {
  const sampleCanvas = document.createElement('canvas');
  const scale = Math.min(1, 320 / Math.max(width, height));
  sampleCanvas.width = Math.max(1, Math.round(width * scale));
  sampleCanvas.height = Math.max(1, Math.round(height * scale));
  const context = sampleCanvas.getContext('2d');
  context.clearRect(0, 0, sampleCanvas.width, sampleCanvas.height);
  context.drawImage(image, 0, 0, sampleCanvas.width, sampleCanvas.height);

  try {
    const { data } = context.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height);
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] < 255) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}
