import { invoke } from '@tauri-apps/api/core';
import {
  DiscoverBook,
  DiscoverCategory,
  DiscoverHome,
  DiscoverPage,
} from '../types';
import { isTauri } from '../utils/platform';

export const LectulandiaService = {
  getHome: async (): Promise<DiscoverHome> => {
    if (!isTauri()) {
      return { novelties: [], mostRead: [] };
    }
    return invoke<DiscoverHome>('discover_home');
  },

  getCategories: async (): Promise<DiscoverCategory[]> => {
    if (!isTauri()) return [];
    return invoke<DiscoverCategory[]>('discover_categories');
  },

  search: async (
    query: string,
    page: number
  ): Promise<DiscoverPage<DiscoverBook>> => {
    if (!isTauri()) {
      return { items: [], page, hasMore: false };
    }
    return invoke<DiscoverPage<DiscoverBook>>('discover_search', {
      query,
      page,
    });
  },

  getCategoryBooks: async (
    path: string,
    page: number
  ): Promise<DiscoverPage<DiscoverBook>> => {
    if (!isTauri()) {
      return { items: [], page, hasMore: false };
    }
    return invoke<DiscoverPage<DiscoverBook>>('discover_category_books', {
      path,
      page,
    });
  },

  downloadBook: async (bookUrl: string): Promise<{
    fileName: string;
    bytes: number;
    savedPath: string;
  }> => {
    if (!isTauri()) {
      throw new Error('Descarga solo disponible en Tauri.');
    }
    return invoke('discover_download_book', { bookUrl });
  },
};