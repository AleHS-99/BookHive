export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;

  const w = window as any;

  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__);
};