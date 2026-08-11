import { useCallback, useEffect, useRef, useState } from 'react';
import { LectulandiaService } from '../services/lectulandia.service';
import { DiscoverBook, DiscoverCategory } from '../types';

type View = 'home' | 'search' | 'category';

export const useLectulandia = () => {
  // Estado de vistas
  const [view, setView] = useState<View>('home');
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<DiscoverCategory | null>(
    null
  );

  // Datos del home
  const [novelties, setNovelties] = useState<DiscoverBook[]>([]);
  const [mostRead, setMostRead] = useState<DiscoverBook[]>([]);
  const [loadingHome, setLoadingHome] = useState(true);
  const [homeError, setHomeError] = useState<string | null>(null);

  // Categorías
  const [categories, setCategories] = useState<DiscoverCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Resultados (búsqueda o categoría)
  const [items, setItems] = useState<DiscoverBook[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<number>(0);

  // Cargar home al montar
  useEffect(() => {
    const loadHome = async () => {
      setLoadingHome(true);
      setHomeError(null);

      try {
        const home = await LectulandiaService.getHome();
        setNovelties(home.novelties);
        setMostRead(home.mostRead);
      } catch (err) {
        console.error('Error cargando home de Lectulandia:', err);
        setHomeError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoadingHome(false);
      }
    };

    void loadHome();
  }, []);

  // Cargar categorías al montar
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);

      try {
        const cats = await LectulandiaService.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Error cargando categorías:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    void loadCategories();
  }, []);

  // Búsqueda
  const submitSearch = useCallback(async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;

    const requestId = ++abortRef.current;

    setView('search');
    setQuery(q);
    setActiveCategory(null);
    setLoading(true);
    setError(null);
    setItems([]);
    setPage(1);

    try {
      const result = await LectulandiaService.search(q, 1);

      if (requestId !== abortRef.current) return;

      setItems(result.items);
      setHasMore(result.hasMore);
      setPage(1);
    } catch (err) {
      if (requestId !== abortRef.current) return;

      console.error('Error buscando:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (requestId === abortRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Seleccionar categoría
  const selectCategory = useCallback(async (category: DiscoverCategory | null) => {
    if (!category) {
      setView('home');
      setActiveCategory(null);
      setItems([]);
      return;
    }

    const requestId = ++abortRef.current;

    setView('category');
    setActiveCategory(category);
    setQuery('');
    setLoading(true);
    setError(null);
    setItems([]);
    setPage(1);

    try {
      const result = await LectulandiaService.getCategoryBooks(category.path, 1);

      if (requestId !== abortRef.current) return;

      setItems(result.items);
      setHasMore(result.hasMore);
      setPage(1);
    } catch (err) {
      if (requestId !== abortRef.current) return;

      console.error('Error cargando categoría:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (requestId === abortRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Cargar más
  const loadMore = useCallback(async () => {
    if (loadingMore || loading) return;

    const nextPage = page + 1;
    const requestId = abortRef.current;

    setLoadingMore(true);

    try {
      let result;

      if (view === 'search' && query) {
        result = await LectulandiaService.search(query, nextPage);
      } else if (view === 'category' && activeCategory) {
        result = await LectulandiaService.getCategoryBooks(
          activeCategory.path,
          nextPage
        );
      } else {
        return;
      }

      if (requestId !== abortRef.current) return;

      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch (err) {
      if (requestId !== abortRef.current) return;

      console.error('Error cargando más:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (requestId === abortRef.current) {
        setLoadingMore(false);
      }
    }
  }, [view, query, activeCategory, page, loading, loadingMore]);

  // Volver al home
  const goHome = useCallback(() => {
    ++abortRef.current;
    setView('home');
    setQuery('');
    setActiveCategory(null);
    setItems([]);
    setError(null);
  }, []);

  return {
    // Vistas
    view,
    query,
    setQuery,
    activeCategory,

    // Home
    novelties,
    mostRead,
    loadingHome,
    homeError,

    // Categorías
    categories,
    loadingCategories,

    // Resultados
    items,
    hasMore,
    loading,
    loadingMore,
    error,

    // Acciones
    submitSearch,
    selectCategory,
    loadMore,
    goHome,
  };
};