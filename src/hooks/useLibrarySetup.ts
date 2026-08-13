import { useCallback, useEffect, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { platform } from '@tauri-apps/plugin-os';
import { downloadDir, join } from '@tauri-apps/api/path';
import { mkdir, exists } from '@tauri-apps/plugin-fs';
import { SettingsService } from '../services/settings.service';
import { isTauri } from '../utils/platform';

const ensureAndroidLibraryFolder = async () => {
  const downloadsPath = await downloadDir();
  const bookHivePath = await join(downloadsPath, 'BookHive');

  const folderExists = await exists(bookHivePath);

  if (!folderExists) {
    await mkdir(bookHivePath, { recursive: true });
  }

  return bookHivePath;
};

export const useLibrarySetup = () => {
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const didInit = useRef(false);

  useEffect(() => {
    // Evita doble ejecución en desarrollo con React StrictMode
    if (didInit.current) return;
    didInit.current = true;

    const initLibrary = async () => {
      try {
        setError(null);

        if (!isTauri()) {
          setNeedsSetup(true);
          return;
        }

        const currentPlatform = await platform();
        const status = await SettingsService.getLibraryStatus();

        // ===== ANDROID =====
        // En Android configuramos automáticamente la carpeta:
        // Descargas/BookHive
        if (currentPlatform === 'android') {
          if (!status.configured) {
            const bookHivePath = await ensureAndroidLibraryFolder();
            await SettingsService.saveLibraryPath(bookHivePath);
          }

          setNeedsSetup(false);
          return;
        }

        // ===== PC =====
        // En Windows/Linux/macOS mantenemos el comportamiento actual:
        // si no está configurada, mostramos la pantalla de setup.
        setNeedsSetup(!status.configured);
      } catch (err) {
        console.error('Error inicializando la biblioteca:', err);
        setError(err instanceof Error ? err.message : String(err));
        setNeedsSetup(true);
      } finally {
        setChecking(false);
      }
    };

    void initLibrary();
  }, []);

  const chooseFolder = useCallback(async () => {
    if (!isTauri()) {
      setError('Esta función solo está disponible dentro de Tauri.');
      return;
    }

    try {
      setError(null);
      setSaving(true);

      const currentPlatform = await platform();

      // ===== ANDROID =====
      // Si por alguna razón llega a ejecutarse el botón en Android,
      // igualmente creamos la carpeta BookHive en Descargas.
      if (currentPlatform === 'android') {
        const bookHivePath = await ensureAndroidLibraryFolder();
        await SettingsService.saveLibraryPath(bookHivePath);
        setNeedsSetup(false);
        return;
      }

      // ===== PC =====
      // En escritorio mantenemos el selector manual de carpeta.
      const defaultPath = await SettingsService.getDefaultLibraryPath();

      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Selecciona la carpeta donde se guardarán los libros',
        defaultPath: defaultPath ?? undefined,
      });

      if (!selected || typeof selected !== 'string') {
        return;
      }

      await SettingsService.saveLibraryPath(selected);
      setNeedsSetup(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    checking,
    needsSetup,
    saving,
    error,
    chooseFolder,
  };
};