import { invoke } from '@tauri-apps/api/core';
import { AppSettings, LibraryStatus } from '../types';
import { isTauri } from '../utils/platform';

export const SettingsService = {
  async getLibraryStatus(): Promise<LibraryStatus> {
    if (!isTauri()) {
      return {
        configured: true,
        library_path: null,
        is_empty: true,
      };
    }

    return invoke<LibraryStatus>('get_library_status');
  },

  async saveLibraryPath(path: string): Promise<AppSettings> {
    if (!isTauri()) {
      throw new Error('La selección de carpeta solo está disponible en Tauri.');
    }

    return invoke<AppSettings>('save_library_path', { path });
  },

  async getDefaultLibraryPath(): Promise<string | null> {
    if (!isTauri()) {
      return null;
    }

    try {
      return await invoke<string>('get_default_library_path');
    } catch {
      return null;
    }
  },
};