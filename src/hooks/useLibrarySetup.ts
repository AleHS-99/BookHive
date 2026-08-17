// src/hooks/useLibrarySetup.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { platform } from '@tauri-apps/plugin-os';
import { downloadDir, join } from '@tauri-apps/api/path';
import { mkdir, exists } from '@tauri-apps/plugin-fs';
import { SettingsService } from '../services/settings.service';
import { StorageService } from '../services/storage.service';
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
        if (currentPlatform === 'android') {
          if (!status.configured) {
            const bookHivePath = await ensureAndroidLibraryFolder();
            await SettingsService.saveLibraryPath(bookHivePath);
          }
          setNeedsSetup(false);
          return;
        }

        // ===== PC =====
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
      if (currentPlatform === 'android') {
        const bookHivePath = await ensureAndroidLibraryFolder();
        await SettingsService.saveLibraryPath(bookHivePath);
        setNeedsSetup(false);
        return;
      }

      // ===== PC =====
      // Usamos StorageService.pickFolder() que maneja PC y Android
      const folderId = await StorageService.pickFolder();
      
      if (folderId) {
        await SettingsService.saveLibraryPath(folderId);
        setNeedsSetup(false);
      }
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