import { useCallback, useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { BookshelfService } from '../services/bookshelf.service';
import { Book, Folder, FolderPaginationState } from '../types';
import { isTauri } from '../utils/platform';

const PAGE_SIZE = 50;

type CoverUpdatedPayload = {
  bookId: string;
  imageUrl: string;
};

const updateBookInNodes = (
  nodes: (Folder | Book)[],
  bookId: string,
  imageUrl: string
): (Folder | Book)[] => {
  return nodes.map((node) => {
    if ('title' in node) {
      if (node.id === bookId) {
        return {
          ...node,
          imageUrl,
        };
      }

      return node;
    }

    return {
      ...node,
      children: updateBookInNodes(node.children, bookId, imageUrl),
    };
  });
};

const updateFolderInNodes = (
  nodes: (Folder | Book)[],
  folderId: string,
  updater: (folder: Folder) => Folder
): (Folder | Book)[] => {
  return nodes.map((node) => {
    if ('title' in node) {
      return node;
    }

    if (node.id === folderId) {
      return updater(node);
    }

    return {
      ...node,
      children: updateFolderInNodes(node.children, folderId, updater),
    };
  });
};

export const useBookshelf = () => {
  const [items, setItems] = useState<(Folder | Book)[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const [folderPagination, setFolderPagination] = useState<
    Record<string, FolderPaginationState>
  >({});

  const processingCoversRef = useRef(false);

  const processCovers = useCallback(async () => {
    if (!isTauri() || processingCoversRef.current) {
      return;
    }

    processingCoversRef.current = true;

    try {
      await BookshelfService.processPendingCovers();
    } catch (err) {
      console.error('Error procesando covers:', err);
    } finally {
      processingCoversRef.current = false;
    }
  }, []);

  const loadRootPage = useCallback(
    async (pageIndex: number, reset = false) => {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError(null);

      try {
        await BookshelfService.syncLibrary();

        const result = await BookshelfService.getFolderPage(
          null,
          pageIndex,
          PAGE_SIZE
        );

        setItems((prev) =>
          reset ? result.items : [...prev, ...result.items]
        );

        setPage(result.page);
        setHasMore(result.hasMore);
        setTotal(result.total);

        if (reset) {
          void processCovers();
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [processCovers]
  );

  const refresh = useCallback(() => {
    setFolderPagination({});
    return loadRootPage(0, true);
  }, [loadRootPage]);

  const loadMoreRoot = useCallback(() => {
    if (!hasMore || loading || loadingMore) {
      return;
    }

    return loadRootPage(page + 1, false);
  }, [hasMore, loading, loadingMore, page, loadRootPage]);

  const loadChildren = useCallback(
    async (folderId: string, pageIndex: number) => {
      setFolderPagination((prev) => ({
        ...prev,
        [folderId]: {
          page: pageIndex,
          hasMore: prev[folderId]?.hasMore ?? true,
          loading: true,
        },
      }));

      try {
        const result = await BookshelfService.getFolderPage(
          folderId,
          pageIndex,
          PAGE_SIZE
        );

        setItems((prev) =>
          updateFolderInNodes(prev, folderId, (folder) => ({
            ...folder,
            children:
              pageIndex === 0
                ? result.items
                : [...folder.children, ...result.items],
          }))
        );

        setFolderPagination((prev) => ({
          ...prev,
          [folderId]: {
            page: result.page,
            hasMore: result.hasMore,
            loading: false,
          },
        }));
      } catch (err) {
        console.error(err);

        setFolderPagination((prev) => ({
          ...prev,
          [folderId]: {
            page: pageIndex,
            hasMore: false,
            loading: false,
          },
        }));
      }
    },
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | null = null;

    listen<CoverUpdatedPayload>('book-cover-updated', (event) => {
      const { bookId, imageUrl } = event.payload;

      setItems((prev) => updateBookInNodes(prev, bookId, imageUrl));
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
    items,
    loading,
    loadingMore,
    error,
    total,
    hasMore,
    folderPagination,
    refresh,
    loadMoreRoot,
    loadChildren,
  };
};