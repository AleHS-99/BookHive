export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';

  // SQLite devuelve "2025-01-15 10:30:00" o timestamp
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return d.toLocaleString();
};