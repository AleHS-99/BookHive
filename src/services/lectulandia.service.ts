import { invoke } from '@tauri-apps/api/core';
import {
  DiscoverBook,
  DiscoverBookDetail,
  DiscoverCategory,
  DiscoverHome,
  DiscoverPage,
  DownloadResult,
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

  getBookDetail: async (url: string): Promise<DiscoverBookDetail> => {
    if (!isTauri()) {
      throw new Error('Detalle solo disponible en Tauri.');
    }
    return invoke<DiscoverBookDetail>('discover_book_detail', { url });
  },

  downloadBook: async (downloadPageUrl: string): Promise<DownloadResult> => {
    if (!isTauri()) {
      throw new Error('Descarga solo disponible en Tauri.');
    }
    return invoke<DownloadResult>('discover_download_book', {
      downloadPageUrl,
    });
  },
};