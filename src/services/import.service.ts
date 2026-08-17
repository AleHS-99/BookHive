// src/services/import.service.ts
import { StorageService } from './storage.service';
import { platform } from '@tauri-apps/plugin-os';
import { readFile as fsReadFile, remove as fsRemove } from '@tauri-apps/plugin-fs';
import { 
  writeFile as scopedWriteFile
} from 'tauri-plugin-scoped-storage-api';

export const ImportService = {
  /**
   * Importar múltiples archivos a una carpeta destino
   */
  async importFiles(filePaths: string[], targetFolderId: string | null): Promise<number> {
    const currentPlatform = await platform();
    const isAndroid = currentPlatform === 'android';
    let imported = 0;
    
    // En Android, si no hay carpeta destino, usamos la raíz
    const destId = targetFolderId || (isAndroid ? '' : '');
    
    for (const filePath of filePaths) {
      try {
        let data: Uint8Array;
        let fileName: string;
        
        if (isAndroid) {
          // En Android, el filePath es una URI o ruta del sistema
          // Leemos el archivo usando fsReadFile (que funciona en Android con URLs)
          data = await fsReadFile(filePath);
          // Extraemos el nombre del archivo
          const parts = filePath.split('/');
          fileName = parts[parts.length - 1] || `file_${Date.now()}`;
          
          // Escribir en la carpeta destino
          await scopedWriteFile(destId, fileName, data);
        } else {
          // En PC
          data = await fsReadFile(filePath);
          fileName = filePath.split('/').pop() || `file_${Date.now()}`;
          
          // Escribir en la carpeta destino usando StorageService
          await StorageService.writeFile(destId, fileName, data);
          
          // Eliminar el archivo original (mover)
          try {
            await fsRemove(filePath);
          } catch (err) {
            console.warn(`No se pudo eliminar el archivo original: ${filePath}`, err);
          }
        }
        
        imported++;
      } catch (err) {
        console.error(`Error importando archivo ${filePath}:`, err);
      }
    }
    
    return imported;
  }
};