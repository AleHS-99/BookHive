import { invoke } from '@tauri-apps/api/core';
import {
  PaginatedTreePage,
  SearchPage,
  FolderPickerPage,
  BookProperties,
} from '../types';
import { mockBookshelf } from '../data/mockData';
import { isTauri } from '../utils/platform';
import { parseBookId, parseFolderId } from '../utils/ids';

export const BookshelfService = {
  syncLibrary: async (): Promise<void> => {
    if (!isTauri()) {
      return;
    }

    await invoke('sync_library');
  },

  getFolderPage: async (
    folderId: string | null,
    page: number,
    pageSize: number
  ): Promise<PaginatedTreePage> => {
    if (!isTauri()) {
      const items = folderId ? [] : mockBookshelf.children;

      return {
        items,
        total: items.length,
        page,
        pageSize,
        hasMore: false,
      };
    }

    return invoke<PaginatedTreePage>('get_folder_page', {
      folderId: parseFolderId(folderId),
      page,
      pageSize,
    });
  },

  searchBooks: async (
    query: string,
    page: number,
    pageSize: number
  ): Promise<SearchPage> => {
    if (!isTauri()) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      };
    }

    return invoke<SearchPage>('search_books', {
      query,
      page,
      pageSize,
    });
  },

  getFolderPickerChildren: async (
    folderId: string | null,
    page: number,
    pageSize: number
  ): Promise<FolderPickerPage> => {
    if (!isTauri()) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      };
    }

    return invoke<FolderPickerPage>('get_folder_picker_children', {
      parentId: parseFolderId(folderId),
      page,
      pageSize,
    });
  },

  createFolder: async (
    parentId: string | null,
    name: string
  ): Promise<string> => {
    if (!isTauri()) {
      return 'folder:mock';
    }

    return invoke<string>('create_folder', {
      parentId: parseFolderId(parentId),
      name,
    });
  },

  moveBook: async (
    bookId: string,
    targetFolderId: string | null
  ): Promise<void> => {
    if (!isTauri()) {
      return;
    }

    const numericBookId = parseBookId(bookId);

    if (numericBookId === null) {
      throw new Error('Book id inválido.');
    }

    await invoke('move_book', {
      bookId: numericBookId,
      targetFolderId: parseFolderId(targetFolderId),
    });
  },

  processPendingCovers: async (): Promise<number> => {
    if (!isTauri()) {
      return 0;
    }

    return invoke<number>('process_pending_covers');
  },
  processPendingMetadata: async (): Promise<number> => {
    if (!isTauri()) {
      return 0;
    }

    return invoke<number>('process_pending_metadata');
  },

  getBookProperties: async (bookId: string): Promise<BookProperties> => {
    if (!isTauri()) {
      throw new Error('Propiedades solo disponibles en Tauri.');
    }

    const numericId = parseBookId(bookId);
    if (numericId === null) {
      throw new Error('Book id inválido.');
    }

    return invoke<BookProperties>('get_book_properties', {
      bookId: numericId,
    });
  },

  renameBookFile: async (
    bookId: string,
    newName: string
  ): Promise<void> => {
    if (!isTauri()) return;

    const numericId = parseBookId(bookId);
    if (numericId === null) {
      throw new Error('Book id inválido.');
    }

    await invoke('rename_book_file', {
      bookId: numericId,
      newName,
    });
  },
};

