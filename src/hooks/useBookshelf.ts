import { useCallback, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { BookshelfService } from '../services/bookshelf.service';
import { Folder } from '../types';
import { isTauri } from '../utils/platform';

type CoverUpdatedPayload = {
  bookId: string;
  imageUrl: string;
};

const updateBookInFolder = (
  folder: Folder,
  bookId: string,
  imageUrl: string
): Folder => {
  return {
    ...folder,
    children: folder.children.map((child) => {
      if ('title' in child) {
        if (child.id === bookId) {
          return {
            ...child,
            imageUrl,
          };
        }

        return child;
      }

      return updateBookInFolder(child, bookId, imageUrl);
    }),
  };
};

export const useBookshelf = () => {
  const [data, setData] = useState<Folder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await BookshelfService.syncLibrary();
      const folder = await BookshelfService.getBookshelf();

      setData(folder);

      void BookshelfService.processPendingCovers().catch((err) => {
        console.error('Error procesando portadas pendientes:', err);
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | null = null;

    listen<CoverUpdatedPayload>('book-cover-updated', (event) => {
      const { bookId, imageUrl } = event.payload;

      setData((prev) => {
        if (!prev) return prev;
        return updateBookInFolder(prev, bookId, imageUrl);
      });
    })
      .then((unlistenFn) => {
        unlisten = unlistenFn;
      })
      .catch((err) => {
        console.error('Error escuchando book-cover-updated:', err);
      });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refresh: load,
  };
};