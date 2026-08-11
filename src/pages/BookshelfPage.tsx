import { useCallback, useState } from 'react';
import { Search, Plus, RefreshCw, X } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useBookshelf } from '../hooks/useBookshelf';
import { useBookSearch } from '../hooks/useBookSearch';
import { TreeNode } from '../components/bookshelf/TreeNode';
import { SearchResultItem } from '../components/bookshelf/SearchResultItem';
import { MoveBookModal } from '../components/bookshelf/MoveBookModal';
import { BookPropertiesModal } from '../components/bookshelf/BookPropertiesModal';
import { FolderActionsModal } from '../components/bookshelf/FolderActionsModal';
import { AddBooksModal } from '../components/bookshelf/AddBooksModal';
import { Book } from '../types';
import { isTauri } from '../utils/platform';

export const BookshelfPage = () => {
  const bookshelf = useBookshelf();
  const search = useBookSearch();

  // Estado para modal de mover libro
  const [moveBookTarget, setMoveBookTarget] = useState<Book | null>(null);

  // Estado para modal de propiedades
  const [propertiesBookId, setPropertiesBookId] = useState<string | null>(null);

  // Estado para modal de acciones de carpeta
  const [folderActionsTarget, setFolderActionsTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Estado para modal de añadir libros
  const [addBookFiles, setAddBookFiles] = useState<string[] | null>(null);

  // Handler para el botón "+"
  const handleAddBooks = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Libros',
            extensions: ['epub', 'pdf'],
          },
        ],
        title: 'Selecciona los libros que quieres añadir',
      });

      if (selected && Array.isArray(selected) && selected.length > 0) {
        setAddBookFiles(selected as string[]);
      }
    } catch (err) {
      console.error('Error abriendo diálogo de archivos:', err);
    }
  }, []);

  const closeAddBooks = useCallback(() => {
    setAddBookFiles(null);
  }, []);

  const handleBooksImported = useCallback(() => {
    void bookshelf.refresh();

    if (search.activeQuery.trim()) {
      search.submitSearch();
    }
  }, [bookshelf, search]);

  const handleBookDeleted = useCallback(() => {
    void bookshelf.refresh();
    if (search.activeQuery.trim()) {
      search.submitSearch();
    }
  }, [bookshelf, search]);

  const openFolderActions = useCallback((folderId: string, folderName: string) => {
    setFolderActionsTarget({ id: folderId, name: folderName });
  }, []);

  const closeFolderActions = useCallback(() => {
    setFolderActionsTarget(null);
  }, []);

  const handleFolderUpdated = useCallback(() => {
    void bookshelf.refresh();
  }, [bookshelf]);

  // Handlers para mover libro
  const openMoveBook = useCallback((book: Book) => {
    setMoveBookTarget(book);
  }, []);

  const closeMoveBook = useCallback(() => {
    setMoveBookTarget(null);
  }, []);

  const handleMoved = useCallback(() => {
    setMoveBookTarget(null);
    void bookshelf.refresh();
    if (search.activeQuery.trim()) {
      search.submitSearch();
    }
  }, [bookshelf, search]);

  // Handlers para propiedades
  const openProperties = useCallback((book: Book) => {
    setPropertiesBookId(book.id);
  }, []);

  const closeProperties = useCallback(() => {
    setPropertiesBookId(null);
  }, []);

  const handlePropertiesUpdated = useCallback(() => {
    void bookshelf.refresh();
    if (search.activeQuery.trim()) {
      search.submitSearch();
    }
  }, [bookshelf, search]);

  // Handler para refresh
  const handleRefresh = useCallback(() => {
    void bookshelf.refresh();
    if (search.activeQuery.trim()) {
      search.submitSearch();
    }
  }, [bookshelf, search]);

  const isSearching = search.activeQuery.trim().length > 0;
  const isRefreshing = bookshelf.loading || search.loading;

  return (
    <div className="max-w-7xl mx-auto relative h-full">
      {/* Header */}
      <div className="flex items-center justify-between py-6 pt-4 md:pt-8">
        <div className="flex-1 flex items-center gap-4 w-full md:w-auto">
          {/* Search form */}
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
              aria-label="Buscar"
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
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Add books button */}
          <button
            onClick={handleAddBooks}
            className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            aria-label="Añadir libros"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl disabled:opacity-50"
            aria-label="Actualizar"
          >
            <RefreshCw
              className={isRefreshing ? 'w-5 h-5 animate-spin' : 'w-5 h-5'}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isSearching ? (
          <>
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
                <p className="text-gray-600 font-medium">No hay resultados</p>
                <p className="text-sm text-gray-400 mt-2">
                  No se encontraron libros para: "{search.activeQuery}"
                </p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
                  {search.total} resultado{search.total === 1 ? '' : 's'} para "
                  {search.activeQuery}"
                </div>

                {search.results.map((book) => (
                  <SearchResultItem
                    key={book.id}
                    book={book}
                    onMoveBook={openMoveBook}
                    onViewProperties={openProperties}
                    onDeleted={handleBookDeleted}
                  />
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
                  y presiona Actualizar, o usa el botón + para añadir libros.
                </p>
                <button
                  onClick={handleRefresh}
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
                    onMoveBook={openMoveBook}
                    onViewProperties={openProperties}
                    onFolderActions={openFolderActions}
                    onDeleted={handleBookDeleted}
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

      {/* Move Book Modal */}
      {moveBookTarget && (
        <MoveBookModal
          book={moveBookTarget}
          onClose={closeMoveBook}
          onMoved={handleMoved}
        />
      )}

      {/* Book Properties Modal */}
      {propertiesBookId && (
        <BookPropertiesModal
          bookId={propertiesBookId}
          onClose={closeProperties}
          onUpdated={handlePropertiesUpdated}
        />
      )}

      {/* Folder Actions Modal */}
      {folderActionsTarget && (
        <FolderActionsModal
          folderId={folderActionsTarget.id}
          folderName={folderActionsTarget.name}
          onClose={closeFolderActions}
          onUpdated={handleFolderUpdated}
        />
      )}

      {/* Add Books Modal */}
      {addBookFiles && (
        <AddBooksModal
          filePaths={addBookFiles}
          onClose={closeAddBooks}
          onImported={handleBooksImported}
        />
      )}
    </div>
  );
};