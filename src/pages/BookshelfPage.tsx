import { Search, Filter, Plus, RefreshCw, X } from 'lucide-react';
import { useBookshelf } from '../hooks/useBookshelf';
import { useBookSearch } from '../hooks/useBookSearch';
import { TreeNode } from '../components/bookshelf/TreeNode';
import { SearchResultItem } from '../components/bookshelf/SearchResultItem';

export const BookshelfPage = () => {
  const bookshelf = useBookshelf();
  const search = useBookSearch();

  const isSearching = search.activeQuery.trim().length > 0;

  return (
    <div className="max-w-7xl mx-auto relative h-full">
      {/* Header */}
      <div className="flex items-center justify-between py-6 pt-4 md:pt-8">
        <div className="flex-1 md:flex-none flex items-center gap-4 w-full md:w-auto md:ml-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              search.submitSearch();
            }}
            className="relative flex-1 md:w-64"
          >
            <button
              type="submit"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Search className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={search.query}
              onChange={(e) => search.setQuery(e.target.value)}
              placeholder="Search books..."
              className="w-full pl-10 pr-10 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-app-accent/50 text-sm"
            />

            {search.query && (
              <button
                type="button"
                onClick={search.clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          <button className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl">
            <Filter className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              void bookshelf.refresh();

              if (search.activeQuery.trim()) {
                search.submitSearch();
              }
            }}
            disabled={bookshelf.loading || search.loading}
            className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl disabled:opacity-50"
          >
            <RefreshCw
              className={
                bookshelf.loading || search.loading
                  ? 'w-5 h-5 animate-spin'
                  : 'w-5 h-5'
              }
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isSearching ? (
          <>
            {/* Search Results */}
            {search.loading ? (
              <div className="p-8 text-center text-gray-400">
                Buscando libros...
              </div>
            ) : search.error ? (
              <div className="p-8 text-center text-red-500">
                <p className="font-medium mb-2">Error buscando libros</p>
                <p className="text-sm">{search.error}</p>
              </div>
            ) : search.results.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-gray-600 font-medium">
                  No hay resultados
                </p>

                <p className="text-sm text-gray-400 mt-2">
                  No se encontraron libros para: “{search.activeQuery}”
                </p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
                  {search.total} resultado{search.total === 1 ? '' : 's'} para “
                  {search.activeQuery}”
                </div>

                {search.results.map((book) => (
                  <SearchResultItem key={book.id} book={book} />
                ))}

                {search.hasMore && (
                  <div className="p-4 border-t border-gray-100">
                    <button
                      onClick={search.loadMore}
                      disabled={search.loadingMore}
                      className="w-full py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {search.loadingMore ? 'Cargando...' : 'Cargar más'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {/* Normal Lazy Bookshelf */}
            {bookshelf.loading ? (
              <div className="p-8 text-center text-gray-400">
                Loading bookshelf...
              </div>
            ) : bookshelf.error ? (
              <div className="p-8 text-center text-red-500">
                <p className="font-medium mb-2">Error cargando la biblioteca</p>
                <p className="text-sm">{bookshelf.error}</p>
              </div>
            ) : bookshelf.items.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-gray-600 font-medium">
                  Tu biblioteca está vacía
                </p>

                <p className="text-sm text-gray-400 mt-2">
                  Agrega archivos .epub o .pdf dentro de la carpeta seleccionada
                  y presiona Actualizar.
                </p>

                <button
                  onClick={bookshelf.refresh}
                  className="mt-6 inline-flex items-center gap-2 bg-app-accent text-white px-5 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  <RefreshCw className="w-5 h-5" />
                  Actualizar
                </button>
              </div>
            ) : (
              <>
                {bookshelf.items.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    onLoadChildren={bookshelf.loadChildren}
                    folderPagination={bookshelf.folderPagination}
                  />
                ))}

                {bookshelf.hasMore && (
                  <div className="p-4 border-t border-gray-100">
                    <button
                      onClick={bookshelf.loadMoreRoot}
                      disabled={bookshelf.loadingMore}
                      className="w-full py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {bookshelf.loadingMore ? 'Cargando...' : 'Cargar más'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 md:bottom-8 left-1/2 md:left-1/2 z-10 hidden md:block">
        <button className="flex items-center gap-2 bg-[#FEF3C7] text-[#92400E] px-5 py-3 rounded-xl shadow-lg hover:bg-[#FDE68A] transition-colors font-medium">
          <Plus className="w-5 h-5" />
          New Group
        </button>
      </div>
    </div>
  );
};