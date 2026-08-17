// src/services/storage.service.ts
import { platform } from '@tauri-apps/plugin-os';
import { 
  readFile as fsReadFile,
  writeFile as fsWriteFile,
  readDir as fsReadDir,
  mkdir as fsMkdir,
  rename as fsRename,
  remove as fsRemove,
  DirEntry as FsDirEntry
} from '@tauri-apps/plugin-fs';
import { open as dialogOpen } from '@tauri-apps/plugin-dialog';
import { 
  pickFolder as scopedPickFolder,
  readDir as scopedReadDir,
  readFile as scopedReadFile,
  writeFile as scopedWriteFile,
  mkdir as scopedMkdir,
  removeFile as scopedRemoveFile,
  removeDir as scopedRemoveDir,
  exists as scopedExists,
  readTextFile as scopedReadTextFile,
  writeTextFile as scopedWriteTextFile,
  stat as scopedStat,
  copy as scopedCopy,
  FolderHandle,
  DirEntry
} from 'tauri-plugin-scoped-storage-api';

// Mapa para almacenar información de carpetas
const folderCache: Record<string, FolderHandle> = {};

export const StorageService = {
  /**
   * Seleccionar carpeta - funciona en PC y Android
   */
  async pickFolder(): Promise<string | null> {
    const currentPlatform = await platform();
    
    if (currentPlatform === 'android') {
      try {
        const result = await scopedPickFolder();
        if (result && result.id) {
          folderCache[result.id] = result;
          return result.id;
        }
        return null;
      } catch (err) {
        console.error('Error picking folder on Android:', err);
        return null;
      }
    }
    
    // En PC usamos el diálogo tradicional para carpetas
    const selected = await dialogOpen({
      directory: true,
      multiple: false,
      title: 'Selecciona la carpeta donde se guardarán los libros'
    });
    
    return typeof selected === 'string' ? selected : null;
  },

  /**
   * Seleccionar archivos - funciona en PC y Android
   */
  async pickFiles(): Promise<string[] | null> {
    
    // En ambas plataformas usamos el mismo diálogo
    // En Android, el diálogo nativo maneja la selección de archivos
    const selected = await dialogOpen({
      multiple: true,
      filters: [
        {
          name: 'Libros',
          extensions: ['epub', 'pdf']
        }
      ],
      title: 'Selecciona los libros que quieres añadir'
    });
    
    if (selected && Array.isArray(selected) && selected.length > 0) {
      return selected as string[];
    }
    
    return null;
  },

  /**
   * Leer contenido de una carpeta
   */
  async readDir(pathOrId: string): Promise<DirEntry[] | FsDirEntry[]> {
    const currentPlatform = await platform();
    
    if (currentPlatform === 'android') {
      return await scopedReadDir(pathOrId);
    }
    
    return await fsReadDir(pathOrId);
  },

  /**
   * Leer archivo binario
   */
  async readFile(pathOrId: string, fileName: string): Promise<Uint8Array> {
    const currentPlatform = await platform();
    
    if (currentPlatform === 'android') {
      return await scopedReadFile(pathOrId, fileName);
    }
    
    const fullPath = `${pathOrId}/${fileName}`;
    return await fsReadFile(fullPath);
  },

  /**
   * Leer archivo de texto
   */
  async readTextFile(pathOrId: string, fileName: string): Promise<string> {
    const currentPlatform = await platform();
    
    if (currentPlatform === 'android') {
      return await scopedReadTextFile(pathOrId, fileName);
    }
    
    const fullPath = `${pathOrId}/${fileName}`;
    const data = await fsReadFile(fullPath);
    return new TextDecoder().decode(data);
  },

  /**
   * Escribir archivo binario
   */
  async writeFile(pathOrId: string, fileName: string, data: Uint8Array): Promise<void> {
    const currentPlatform = await platform();
    
    if (currentPlatform === 'android') {
      await scopedWriteFile(pathOrId, fileName, data);
      return;
    }
    
    const fullPath = `${pathOrId}/${fileName}`;
    await fsWriteFile(fullPath, data);
  },

  /**
   * Escribir archivo de texto
   */
  async writeTextFile(pathOrId: string, fileName: string, content: string): Promise<void> {
    const currentPlatform = await platform();
    
    if (currentPlatform === 'android') {
      await scopedWriteTextFile(pathOrId, fileName, content);
      return;
    }
    
    const fullPath = `${pathOrId}/${fileName}`;
    await fsWriteFile(fullPath, new TextEncoder().encode(content));
  },

  /**
   * Crear carpeta
   */
  async createFolder(pathOrId: string, name: string): Promise<string> {
    const currentPlatform = await platform();
    
    if (currentPlatform === 'android') {
      await scopedMkdir(pathOrId, name);
      return `${pathOrId}/${name}`;
    }
    
    const fullPath = `${pathOrId}/${name}`;
    await fsMkdir(fullPath);
    return fullPath;
  },

  /**
   * Mover archivo (copia + elimina original en Android)
   */
  async moveFile(sourcePath: string, destFolderId: string, fileName: string): Promise<void> {
    const currentPlatform = await platform();
    
    if (currentPlatform === 'android') {
      // Leer el archivo origen
      const data = await fsReadFile(sourcePath);
      // Escribir en la carpeta destino
      await scopedWriteFile(destFolderId, fileName, data);
      // Eliminar el original
      try {
        await fsRemove(sourcePath);
      } catch (err) {
        console.warn('No se pudo eliminar el archivo original:', err);
      }
      return;
    }
    
    // En PC, usar rename si está en el mismo sistema
    try {
      const destPath = `${destFolderId}/${fileName}`;
      await fsRename(sourcePath, destPath);
    } catch {
      // Fallback: copiar y eliminar
      const data = await fsReadFile(sourcePath);
      const destPath = `${destFolderId}/${fileName}`;
      await fsWriteFile(destPath, data);
      await fsRemove(sourcePath);
    }
  },

  /**
   * Copiar archivo
   */
  async copyFile(sourceFolderId: string, sourcePath: string, destFolderId: string, destPath: string): Promise<void> {
    const currentPlatform = await platform();
    
    if (currentPlatform === 'android') {
      await scopedCopy(sourceFolderId, sourcePath, destFolderId, destPath);
      return;
    }
    
    const fullSource = `${sourceFolderId}/${sourcePath}`;
    const fullDest = `${destFolderId}/${destPath}`;
    const data = await fsReadFile(fullSource);
    await fsWriteFile(fullDest, data);
  },

  /**
   * Eliminar archivo
   */
  async removeFile(pathOrId: string, fileName: string): Promise<void> {
    const currentPlatform = await platform();
    
    if (currentPlatform === 'android') {
      await scopedRemoveFile(pathOrId, fileName);
      return;
    }
    
    const fullPath = `${pathOrId}/${fileName}`;
    await fsRemove(fullPath);
  },

  /**
   * Eliminar carpeta
   */
  async removeFolder(pathOrId: string): Promise<void> {
    const currentPlatform = await platform();
    
    if (currentPlatform === 'android') {
      await scopedRemoveDir(pathOrId, pathOrId, true);
      return;
    }
    
    await fsRemove(pathOrId);
  },

  /**
   * Verificar si un archivo existe
   */
  async exists(pathOrId: string, fileName: string): Promise<boolean> {
    const currentPlatform = await platform();
    
    if (currentPlatform === 'android') {
      return await scopedExists(pathOrId, fileName);
    }
    
    try {
      const fullPath = `${pathOrId}/${fileName}`;
      await fsReadFile(fullPath);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Obtener información de un archivo
   */
  async stat(pathOrId: string, fileName: string) {
    const currentPlatform = await platform();
    
    if (currentPlatform === 'android') {
      return await scopedStat(pathOrId, fileName);
    }
    
    const fullPath = `${pathOrId}/${fileName}`;
    const { stat } = await import('@tauri-apps/plugin-fs');
    return await stat(fullPath);
  },

  /**
   * Obtener información de una carpeta (Android)
   */
  async getFolderInfo(folderId: string): Promise<FolderHandle | null> {
    const currentPlatform = await platform();
    
    if (currentPlatform === 'android') {
      try {
        const { getFolderInfo } = await import('tauri-plugin-scoped-storage-api');
        return await getFolderInfo(folderId);
      } catch {
        return null;
      }
    }
    
    return null;
  },

  /**
   * Olvidar carpeta (Android)
   */
  async forgetFolder(folderId: string): Promise<void> {
    const currentPlatform = await platform();
    
    if (currentPlatform === 'android') {
      try {
        const { forgetFolder } = await import('tauri-plugin-scoped-storage-api');
        await forgetFolder(folderId);
        delete folderCache[folderId];
      } catch {
        // Ignorar errores
      }
    }
  },

  /**
   * Verificar si estamos en Android
   */
  async isAndroid(): Promise<boolean> {
    const currentPlatform = await platform();
    return currentPlatform === 'android';
  }
};