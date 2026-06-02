import { extensionForMime } from './formats.js';

export function buildOutputName(fileName, mime) {
  const extension = extensionForMime(mime);
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'image';
  return `${baseName}.${extension}`;
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}
