export type Book = {
  id: string;
  title: string;
  author: string;
  imageUrl?: string;
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