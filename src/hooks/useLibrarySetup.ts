import { useCallback, useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { SettingsService } from '../services/settings.service';
import { isTauri } from '../utils/platform';

export const useLibrarySetup = () => {
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const status = await SettingsService.getLibraryStatus();
        setNeedsSetup(!status.configured);
      } catch (err) {
        console.error(err);
        setNeedsSetup(true);
      } finally {
        setChecking(false);
      }
    };

    check();
  }, []);

  const chooseFolder = useCallback(async () => {
    if (!isTauri()) {
      setError('Esta función solo está disponible dentro de Tauri.');
      return;
    }

    try {
      setError(null);
      setSaving(true);

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