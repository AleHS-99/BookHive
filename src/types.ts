export type Book = {
  id: string;
  title: string;
  author: string;
  imageUrl?: string;
  format?: 'epub' | 'pdf' | string;
};

export type Folder = {
  id: string;
  name: string;
  type: 'folder';
  count: number;
  children: (Folder | Book)[];
};

export type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
};

export type AppSettings = {
  library_path: string | null;
};

export type LibraryStatus = {
  configured: boolean;
  library_path: string | null;
  is_empty: boolean;
};

export type FolderPaginationState = {
  page: number;
  hasMore: boolean;
  loading: boolean;
};

export type PaginatedTreePage = {
  items: (Folder | Book)[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type SearchBook = {
  id: string;
  title: string;
  author: string;
  format?: 'epub' | 'pdf' | string;
  imageUrl?: string;
  folderName?: string | null;
};

export type SearchPage = {
  items: SearchBook[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};