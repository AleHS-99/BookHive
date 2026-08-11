import { useState } from 'react';
import { ArrowLeft, Loader2, Search, X, ChevronDown, RefreshCw } from 'lucide-react';
import { useLectulandia } from '../hooks/useLectulandia';
import { BookCarousel } from '../components/discover/BookCarousel';
import { BookCard } from '../components/discover/BookCard';
import { DiscoverBook } from '../types';
import { clsx } from 'clsx';

export const LectulandiaPage = () => {
  const lectulandia = useLectulandia();
  const [showCategories, setShowCategories] = useState(false);
  const [selectedBook, setSelectedBook] = useState<DiscoverBook | null>(null);

  const {
    view,
    query,
    setQuery,
    activeCategory,
    novelties,
    mostRead,
    loadingHome,
    homeError,
    categories,
    loadingCategories,
    items,
    hasMore,
    loading,
    loadingMore,
    error,
    submitSearch,
    selectCategory,
    loadMore,
    goHome,
  } = lectulandia;

  const handleBookClick = (book: DiscoverBook) => {
    setSelectedBook(book);
    // TODO: abrir modal de detalle / descarga
  };

  return (
    <div className="max-w-7xl mx-auto h-full">
      <div className="py-6 pt-4 md:pt-8 space-y-8">
        {/* Header: buscador + filtro de categorías */}
        <div className="flex items-center gap-3">
          {view !== 'home' && (
            <button
              type="button"
              onClick={goHome}
              className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
              aria-label="Volver al inicio"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Buscador */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitSearch(query);
            }}
            className="relative flex-1 max-w-xl"
          >
            <button
              type="submit"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Buscar en Lectulandia"
            >
              <Search className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en Lectulandia..."
              className="w-full pl-10 pr-10 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/50"
            />

            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Filtro de categorías */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCategories((v) => !v)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors',
                activeCategory
                  ? 'bg-app-accent/10 border-app-accent/30 text-app-accent'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {activeCategory ? activeCategory.name : 'Categorías'}
              <ChevronDown className="w-4 h-4" />
            </button>

            {showCategories && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowCategories(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-30 w-64 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl py-1">
                  <button
                    type="button"
                    onClick={() => {
                      void selectCategory(null);
                      setShowCategories(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 font-medium"
                  >
                    Todas
                  </button>

                  {loadingCategories ? (
                    <div className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cargando...
                    </div>
                  ) : (
                    categories.map((cat) => (
                      <button
                        key={cat.path}
                        type="button"
                        onClick={() => {
                          void selectCategory(cat);
                          setShowCategories(false);
                        }}
                        className={clsx(
                          'w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors',
                          activeCategory?.path === cat.path
                            ? 'text-app-accent font-medium bg-app-accent/5'
                            : 'text-gray-700'
                        )}
                      >
                        {cat.name}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Error global */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                if (view === 'search' && query) {
                  void submitSearch(query);
                } else if (view === 'category' && activeCategory) {
                  void selectCategory(activeCategory);
                }
              }}
              className="flex items-center gap-1 text-red-700 font-medium hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              Reintentar
            </button>
          </div>
        )}

        {/* HOME: carruseles */}
        {view === 'home' && (
          <>
            {loadingHome ? (
              <div className="space-y-10">
                {[1, 2].map((section) => (
                  <div key={section}>
                    <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
                    <div className="flex gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="w-32 md:w-36 shrink-0">
                          <div className="aspect-[2/3] rounded-lg bg-gray-200 animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded mt-2 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : homeError ? (
              <div className="p-10 text-center">
                <p className="text-gray-600 font-medium">
                  Error cargando Lectulandia
                </p>
                <p className="text-sm text-gray-400 mt-2">{homeError}</p>
              </div>
            ) : (
              <div className="space-y-10">
                <BookCarousel
                  title="Las últimas novedades"
                  subtitle="Recién agregados a Lectulandia"
                  books={novelties}
                  onBookClick={handleBookClick}
                />

                <BookCarousel
                  title="Los más leídos de la semana"
                  subtitle="Lo que todos están leyendo"
                  books={mostRead}
                  onBookClick={handleBookClick}
                />
              </div>
            )}
          </>
        )}

        {/* BÚSQUEDA / CATEGORÍA: grid + cargar más */}
        {view !== 'home' && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {view === 'search'
                  ? `Resultados para "${query}"`
                  : activeCategory?.name}
              </h2>
              {!loading && (
                <p className="text-xs text-gray-400">
                  {items.length} libro{items.length === 1 ? '' : 's'} encontrado{items.length === 1 ? '' : 's'}
                </p>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i}>
                    <div className="aspect-[2/3] rounded-lg bg-gray-200 animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded mt-2 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-gray-600 font-medium">
                  No se encontraron libros
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Intenta con otro término o categoría.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {items.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      fluid
                      onClick={handleBookClick}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={() => void loadMore()}
                      disabled={loadingMore}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {loadingMore && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {loadingMore ? 'Cargando...' : 'Cargar más'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};