import { Folder } from '../types';
import { mockBookshelf } from '../data/mockData';

export const BookshelfService = {
  getBookshelf: async (): Promise<Folder> => {
    // LÓGICA PARA TAURI EN EL FUTURO:
    // if (window.__TAURI__) {
    //   return await window.__TAURI__.invoke('get_bookshelf');
    // }
    
    // Mock por ahora:
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockBookshelf), 300);
    });
  }
};