export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '--';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function formatDelta(sourceBytes, outputBytes) {
  if (!sourceBytes || !outputBytes) {
    return '';
  }
  const ratio = ((outputBytes - sourceBytes) / sourceBytes) * 100;
  if (Math.abs(ratio) < 0.05) {
    return '元画像とほぼ同じサイズです。';
  }
  const sign = ratio > 0 ? '+' : '';
  return `元画像比 ${sign}${ratio.toFixed(1)}%`;
}
