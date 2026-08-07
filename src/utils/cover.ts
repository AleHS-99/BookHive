export const getCoverSrc = (url?: string): string | undefined => {
  if (!url) return undefined;

  if (url.startsWith('cover:')) {
    return url;
  }

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  return undefined;
};