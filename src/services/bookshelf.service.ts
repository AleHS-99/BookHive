import { invoke } from '@tauri-apps/api/core';
import { Folder, PaginatedTreePage } from '../types';
import { mockBookshelf } from '../data/mockData';
import { isTauri } from '../utils/platform';

const parseFolderId = (folderId: string | null): number | null => {
  if (!folderId || folderId === 'root') {
    return null;
  }

  if (folderId.startsWith('folder:')) {
    const value = Number(folderId.split(':')[1]);
    return Number.isNaN(value) ? null : value;
  }

  return null;
};

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

  processPendingCovers: async (): Promise<number> => {
    if (!isTauri()) {
      return 0;
    }

    return invoke<number>('process_pending_covers');
  },
};