import { invoke } from '@tauri-apps/api/core';
import { Folder } from '../types';
import { mockBookshelf } from '../data/mockData';
import { isTauri } from '../utils/platform';

export const BookshelfService = {
  syncLibrary: async (): Promise<void> => {
    if (!isTauri()) {
      return;
    }

    await invoke('sync_library');
  },

  getBookshelf: async (): Promise<Folder> => {
    if (!isTauri()) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockBookshelf), 300);
      });
    }

    return invoke<Folder>('get_library_tree');
  },
  processPendingCovers: async (): Promise<number> => {
    if (!isTauri()) {
      return 0;
    }

    return invoke<number>('process_pending_covers');
  },
};