import { useCallback, useEffect, useState } from 'react';
import {
  X,
  Folder as FolderIcon,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Book, FolderPickerItem } from '../../types';
import { BookshelfService } from '../../services/bookshelf.service';
import { clsx } from 'clsx';

const ROOT_ID = 'root';
const PAGE_SIZE = 50;

type MoveBookModalProps = {
  book: Book;
  onClose: () => void;
  onMoved: () => void;
};

type PickerNodeState = {
  nodes: FolderPickerItem[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  loaded: boolean;
  expanded: boolean;
};

const createDefaultNodeState = (): PickerNodeState => ({
  nodes: [],
  page: 0,
  hasMore: false,
  loading: false,
  loaded: false,
  expanded: false,
});

export const MoveBookModal = ({
  book,
  onClose,
  onMoved,
}: MoveBookModalProps) => {
  const [folderMap, setFolderMap] = useState<Record<string, PickerNodeState>>({
    [ROOT_ID]: {
      ...createDefaultNodeState(),
      expanded: true,
    },
  });

  const [selectedFolderId, setSelectedFolderId] = useState<string>(ROOT_ID);
  const [selectedFolderName, setSelectedFolderName] =
    useState<string>('Biblioteca');

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateNode = useCallback(
    (id: string, updater: (prev: PickerNodeState) => PickerNodeState) => {
      setFolderMap((prev) => ({
        ...prev,
        [id]: updater(prev[id] ?? createDefaultNodeState()),
      }));
    },
    []
  );

  const loadChildren = useCallback(
    async (parentId: string, page: number, reset = false) => {
      updateNode(parentId, (prev) => ({
        ...prev,
        loading: true,
      }));

      try {
        const response = await BookshelfService.getFolderPickerChildren(
          parentId === ROOT_ID ? null : parentId,
          page,
          PAGE_SIZE
        );

        updateNode(parentId, (prev) => ({
          ...prev,
          nodes: reset ? response.items : [...prev.nodes, ...response.items],
          page: response.page,
          hasMore: response.hasMore,
          loading: false,
          loaded: true,
        }));
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : String(err));
        updateNode(parentId, (prev) => ({
          ...prev,
          loading: false,
        }));
      }
    },
    [updateNode]
  );

  useEffect(() => {
    void loadChildren(ROOT_ID, 0, true);
  }, [loadChildren]);

  // BUG FIX: Ya no hacemos return si el estado no existe.
  // Simplemente usamos el estado por defecto.
  const toggleNode = (id: string) => {
    const currentState = folderMap[id] ?? createDefaultNodeState();
    const nextExpanded = !currentState.expanded;

    updateNode(id, (prev) => ({
      ...prev,
      expanded: nextExpanded,
    }));

    if (nextExpanded && !currentState.loaded && !currentState.loading) {
      void loadChildren(id, 0, false);
    }
  };

  const selectFolder = (id: string, name: string) => {
    setSelectedFolderId(id);
    setSelectedFolderName(name);
    setError(null);
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;

    setCreating(true);
    setError(null);

    try {
      const parentId = selectedFolderId === ROOT_ID ? null : selectedFolderId;
      const newFolderId = await BookshelfService.createFolder(parentId, name);

      // Expandir el padre y recargar sus hijos
      updateNode(selectedFolderId, (prev) => ({
        ...prev,
        expanded: true,
      }));

      await loadChildren(selectedFolderId, 0, true);

      setSelectedFolderId(newFolderId);
      setSelectedFolderName(name);
      setShowNewFolder(false);
      setNewFolderName('');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const handleMove = async () => {
    setMoving(true);
    setError(null);

    try {
      await BookshelfService.moveBook(
        book.id,
        selectedFolderId === ROOT_ID ? null : selectedFolderId
      );
      onMoved();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      setMoving(false);
    }
  };

  const renderNode = (node: FolderPickerItem, level: number) => {
    const state = folderMap[node.id];
    const isSelected = selectedFolderId === node.id;
    const isExpanded = state?.expanded ?? false;
    const isLoading = state?.loading ?? false;

    return (
      <div key={node.id}>
        {/* Folder row */}
        <div
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          className={clsx(
            'flex items-center gap-2 py-2 pr-3 rounded-lg cursor-pointer transition-colors',
            isSelected
              ? 'bg-app-accent/10 text-app-accent'
              : 'hover:bg-gray-100 text-gray-700'
          )}
          onClick={() => selectFolder(node.id, node.name)}
        >
          {/* Expand/Collapse button */}
          {node.hasChildren ? (
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          <FolderIcon
            className={clsx(
              'w-4 h-4 shrink-0',
              isSelected ? 'text-app-accent' : 'text-gray-400'
            )}
          />

          <span className="truncate text-sm">{node.name}</span>
        </div>

        {/* Children */}
        {isExpanded &&
          state?.nodes.map((child) => renderNode(child, level + 1))}

        {/* Load more */}
        {isExpanded && state?.hasMore && (
          <div style={{ paddingLeft: `${level * 20 + 36}px` }}>
            <button
              type="button"
              className="text-xs text-app-accent hover:underline py-1"
              onClick={() => loadChildren(node.id, state.page + 1, false)}
              disabled={isLoading}
            >
              {isLoading ? 'Cargando...' : 'Cargar más'}
            </button>
          </div>
        )}

        {/* Loading children indicator */}
        {isExpanded && isLoading && (!state?.nodes || state.nodes.length === 0) && (
          <div
            style={{ paddingLeft: `${level * 20 + 36}px` }}
            className="text-xs text-gray-400 py-1"
          >
            Cargando subcarpetas...
          </div>
        )}
      </div>
    );
  };

  const rootState = folderMap[ROOT_ID];

  return (
    <div
      className="fixed inset-0 z-100 bg-black/40 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900">Mover libro</h2>
            <p className="text-sm text-gray-500 truncate">{book.title}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Destination + new folder */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Destino seleccionado</p>
              <p className="text-sm font-medium text-gray-800 truncate">
                {selectedFolderName}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowNewFolder((prev) => !prev)}
              className="flex items-center gap-2 text-sm text-app-accent border border-app-accent/20 bg-app-accent/5 px-4 py-2 rounded-xl hover:bg-app-accent/10 transition-colors shrink-0"
            >
              <FolderPlus className="w-4 h-4" />
              Nueva carpeta
            </button>
          </div>

          {showNewFolder && (
            <div className="mt-4 flex items-center gap-3">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nombre de la nueva carpeta"
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleCreateFolder();
                  }
                }}
                autoFocus
              />

              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={creating || !newFolderName.trim()}
                className="px-4 py-2 bg-app-accent text-white text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
              >
                {creating ? 'Creando...' : 'Crear'}
              </button>
            </div>
          )}
        </div>

        {/* Folder tree */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Root */}
          <div
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
              selectedFolderId === ROOT_ID
                ? 'bg-app-accent/10 text-app-accent'
                : 'hover:bg-gray-100 text-gray-700'
            )}
            onClick={() => selectFolder(ROOT_ID, 'Biblioteca')}
          >
            <span className="w-4 shrink-0" />
            <FolderIcon
              className={clsx(
                'w-4 h-4 shrink-0',
                selectedFolderId === ROOT_ID
                  ? 'text-app-accent'
                  : 'text-gray-400'
              )}
            />
            <span className="text-sm font-medium">Biblioteca (raíz)</span>
          </div>

          {/* Root children */}
          {rootState?.loading && (!rootState?.nodes || rootState.nodes.length === 0) ? (
            <div className="px-3 py-2 text-sm text-gray-400">
              Cargando carpetas...
            </div>
          ) : (
            rootState?.nodes.map((node) => renderNode(node, 0))
          )}

          {/* Root load more */}
          {rootState?.hasMore && (
            <div className="ml-9">
              <button
                type="button"
                className="text-xs text-app-accent hover:underline py-1"
                onClick={() =>
                  loadChildren(ROOT_ID, rootState.page + 1, false)
                }
                disabled={rootState.loading}
              >
                {rootState.loading ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-red-400 text-sm text-gray-600 hover:bg-red-200 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleMove}
            disabled={moving}
            className="px-5 py-2 rounded-xl bg-app-accent border border-green-400 text-sm text-gray-600 hover:bg-green-200 transition-colors"
          >
            {moving ? 'Moviendo...' : 'Mover aquí'}
          </button>
        </div>
      </div>
    </div>
  );
};