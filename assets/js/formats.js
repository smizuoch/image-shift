export const OUTPUT_FORMAT_CANDIDATES = [
  {
    mime: 'image/png',
    label: 'PNG',
    extension: 'png',
    supportsAlpha: true,
    supportsQuality: false,
    lossless: true,
    encoder: 'canvas',
  },
  {
    mime: 'image/jpeg',
    label: 'JPEG',
    extension: 'jpg',
    supportsAlpha: false,
    supportsQuality: true,
    lossless: false,
    encoder: 'canvas',
  },
  {
    mime: 'image/webp',
    label: 'WebP',
    extension: 'webp',
    supportsAlpha: true,
    supportsQuality: true,
    lossless: false,
    encoder: 'canvas',
  },
  {
    mime: 'image/avif',
    label: 'AVIF',
    extension: 'avif',
    supportsAlpha: true,
    supportsQuality: true,
    lossless: false,
    encoder: 'canvas',
  },
  {
    mime: 'image/bmp',
    label: 'BMP',
    extension: 'bmp',
    supportsAlpha: false,
    supportsQuality: false,
    lossless: true,
    encoder: 'bmp',
  },
  {
    mime: 'image/x-icon',
    label: 'ICO',
    extension: 'ico',
    supportsAlpha: true,
    supportsQuality: false,
    lossless: true,
    encoder: 'ico',
  },
];

export async function detectSupportedOutputFormats() {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const context = canvas.getContext('2d');
  context.fillStyle = '#3366ff';
  context.fillRect(0, 0, 2, 2);

  const supported = [];
  let canEncodePng = false;
  for (const candidate of OUTPUT_FORMAT_CANDIDATES) {
    if (candidate.encoder === 'bmp') {
      supported.push(candidate);
      continue;
    }
    if (candidate.encoder === 'ico') {
      if (canEncodePng) {
        supported.push(candidate);
      }
      continue;
    }
    if (await canEncodeWithCanvas(canvas, candidate.mime)) {
      supported.push(candidate);
      if (candidate.mime === 'image/png') {
        canEncodePng = true;
      }
    }
  }
  return supported;
}

async function canEncodeWithCanvas(canvas, mime) {
  const blob = await canvasToBlob(canvas, mime, 0.92);
  if (blob && normalizeMime(blob.type) === mime) {
    return true;
  }

  try {
    return canvas.toDataURL(mime, 0.92).startsWith(`data:${mime}`);
  } catch {
    return false;
  }
}

export function findFormat(formats, mime) {
  return formats.find((format) => format.mime === mime) || formats[0] || null;
}

export function labelForMime(mime) {
  const known = OUTPUT_FORMAT_CANDIDATES.find((format) => format.mime === normalizeMime(mime));
  if (known) {
    return known.label;
  }
  const subtype = normalizeMime(mime).split('/')[1];
  return subtype ? subtype.toUpperCase() : 'IMAGE';
}

export function extensionForMime(mime) {
  const known = OUTPUT_FORMAT_CANDIDATES.find((format) => format.mime === normalizeMime(mime));
  if (known) {
    return known.extension;
  }
  const subtype = normalizeMime(mime).split('/')[1];
  return subtype ? subtype.replace('jpeg', 'jpg') : 'img';
}

export function normalizeMime(mime) {
  return String(mime || '').trim().toLowerCase();
}

export function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}
