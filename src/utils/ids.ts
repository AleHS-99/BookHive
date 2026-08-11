export const parseFolderId = (folderId: string | null): number | null => {
  if (!folderId || folderId === 'root') {
    return null;
  }

  const value = folderId.startsWith('folder:')
    ? Number(folderId.split(':')[1])
    : Number(folderId);

  return Number.isNaN(value) ? null : value;
};

export const parseBookId = (bookId: string): number | null => {
  const value = bookId.startsWith('book:')
    ? Number(bookId.split(':')[1])
    : Number(bookId);

  return Number.isNaN(value) ? null : value;
};