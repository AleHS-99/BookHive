import { invoke } from '@tauri-apps/api/core';
import {
  PaginatedTreePage,
  SearchPage,
  FolderPickerPage,
  BookProperties,
} from '../types';
import { StorageService } from './storage.service';
import { ImportService } from './import.service';
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
  openBookExternal: async (bookId: string): Promise<void> => {
    if (!isTauri()) return;

    const numericId = parseBookId(bookId);
    if (numericId === null) {
      throw new Error('Book id inválido.');
    }

    await invoke('open_book_external', {
      bookId: numericId,
    });
  },
  renameFolder: async (folderId: string, newName: string): Promise<void> => {
    if (!isTauri()) return;

    const numericId = parseFolderId(folderId);
    if (numericId === null) {
      throw new Error('Folder id inválido.');
    }

    await invoke('rename_folder', {
      folderId: numericId,
      newName,
    });
  },

  getFolderSummary: async (folderId: string): Promise<{ subfolders: number; books: number }> => {
    if (!isTauri()) {
      return { subfolders: 0, books: 0 };
    }

    const numericId = parseFolderId(folderId);
    if (numericId === null) {
      throw new Error('Folder id inválido.');
    }

    const result = await invoke<[number, number]>('get_folder_summary', {
      folderId: numericId,
    });

    return {
      subfolders: result[0],
      books: result[1],
    };
  },

  deleteFolder: async (folderId: string, force: boolean): Promise<void> => {
    if (!isTauri()) return;

    const numericId = parseFolderId(folderId);
    if (numericId === null) {
      throw new Error('Folder id inválido.');
    }

    await invoke('delete_folder', {
      folderId: numericId,
      force,
    });
  },

  deleteBook: async (bookId: string): Promise<void> => {
    if (!isTauri()) return;

    const numericId = parseBookId(bookId);
    if (numericId === null) {
      throw new Error('Book id inválido.');
    }

    await invoke('delete_book', {
      bookId: numericId,
    });
  },
  importBooks: async (
    filePaths: string[],
    targetFolderId: string | null
  ): Promise<number> => {
    if (!isTauri()) return 0;

    const isAndroid = await StorageService.isAndroid();
    
    if (isAndroid) {
      // En Android, usamos el ImportService
      return await ImportService.importFiles(filePaths, targetFolderId);
    }
    
    // En PC, usamos el comportamiento original (invoke a Rust)
    return invoke<number>('import_books', {
      filePaths,
      targetFolderId: parseFolderId(targetFolderId),
    });
  },
};

