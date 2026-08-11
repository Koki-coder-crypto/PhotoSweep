export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i < 2 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

export function estimateBytes(width: number, height: number) {
  // Conservative on-device estimate when original file size is unavailable.
  return Math.max(250_000, Math.round(width * height * 0.42));
}
