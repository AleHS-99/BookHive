import { useCallback, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { BookshelfService } from '../services/bookshelf.service';
import { SearchBook } from '../types';
import { isTauri } from '../utils/platform';

const SEARCH_PAGE_SIZE = 50;

type CoverUpdatedPayload = {
  bookId: string;
  imageUrl: string;
};

export const useBookSearch = () => {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  const [results, setResults] = useState<SearchBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const searchPage = useCallback(
    async (searchQuery: string, pageIndex: number, reset: boolean) => {
      const trimmed = searchQuery.trim();

      if (!trimmed) {
        setActiveQuery('');
        setResults([]);
        setTotal(0);
        setPage(0);
        setHasMore(false);
        return;
      }

      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError(null);

      try {
        const response = await BookshelfService.searchBooks(
          trimmed,
          pageIndex,
          SEARCH_PAGE_SIZE
        );

        setResults((prev) =>
          reset ? response.items : [...prev, ...response.items]
        );

        setPage(response.page);
        setHasMore(response.hasMore);
        setTotal(response.total);
        setActiveQuery(trimmed);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  const submitSearch = useCallback(() => {
    void searchPage(query, 0, true);
  }, [query, searchPage]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setActiveQuery('');
    setResults([]);
    setTotal(0);
    setPage(0);
    setHasMore(false);
    setError(null);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  const loadMore = useCallback(() => {
    if (!activeQuery || !hasMore || loading || loadingMore) {
      return;
    }

    void searchPage(activeQuery, page + 1, false);
  }, [activeQuery, hasMore, loading, loadingMore, page, searchPage]);

  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | null = null;

    listen<CoverUpdatedPayload>('book-cover-updated', (event) => {
      const { bookId, imageUrl } = event.payload;

      setResults((prev) =>
        prev.map((item) =>
          item.id === bookId
            ? {
                ...item,
                imageUrl,
              }
            : item
        )
      );
    })
      .then((unlistenFn) => {
        unlisten = unlistenFn;
      })
      .catch((err) => {
        console.error('Error escuchando book-cover-updated en búsqueda:', err);
      });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  return {
    query,
    setQuery,
    activeQuery,
    results,
    loading,
    loadingMore,
    error,
    total,
    hasMore,
    submitSearch,
    clearSearch,
    loadMore,
  };
};