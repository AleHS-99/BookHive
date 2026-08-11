import { useCallback, useEffect, useState } from 'react';
import {
  X,
  Folder as FolderIcon,
  ChevronRight,
  ChevronDown,
  FileText,
  BookOpen,
  Loader2,
  Import,
} from 'lucide-react';
import { FolderPickerItem } from '../../types';
import { BookshelfService } from '../../services/bookshelf.service';
import { clsx } from 'clsx';

const ROOT_ID = 'root';
const PAGE_SIZE = 50;

type AddBooksModalProps = {
  filePaths: string[];
  onClose: () => void;
  onImported: () => void;
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

export const AddBooksModal = ({
  filePaths,
  onClose,
  onImported,
}: AddBooksModalProps) => {
  const [folderMap, setFolderMap] = useState<Record<string, PickerNodeState>>({
    [ROOT_ID]: {
      ...createDefaultNodeState(),
      expanded: true,
    },
  });

  const [selectedFolderId, setSelectedFolderId] = useState<string>(ROOT_ID);
  const [selectedFolderName, setSelectedFolderName] =
    useState<string>('Biblioteca (raíz)');

  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    setSuccess(null);
  };

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const count = await BookshelfService.importBooks(
        filePaths,
        selectedFolderId === ROOT_ID ? null : selectedFolderId
      );

      setSuccess(
        `Se importaron ${count} libro${count === 1 ? '' : 's'} correctamente.`
      );

      // Esperar un momento para que el usuario vea el mensaje
      setTimeout(() => {
        onImported();
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      setImporting(false);
    }
  };

  const renderNode = (node: FolderPickerItem, level: number) => {
    const state = folderMap[node.id];
    const isSelected = selectedFolderId === node.id;
    const isExpanded = state?.expanded ?? false;
    const isLoading = state?.loading ?? false;

    return (
      <div key={node.id}>
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

        {isExpanded &&
          state?.nodes.map((child) => renderNode(child, level + 1))}

        {isExpanded && state?.hasMore && (
          <button
            type="button"
            style={{ paddingLeft: `${level * 20 + 36}px` }}
            className="text-xs text-app-accent hover:underline py-1"
            onClick={() => loadChildren(node.id, state.page + 1, false)}
            disabled={isLoading}
          >
            {isLoading ? 'Cargando...' : 'Cargar más'}
          </button>
        )}
      </div>
    );
  };

  const rootState = folderMap[ROOT_ID];

  // Extraer solo el nombre del archivo de la ruta completa
  const getFileName = (filePath: string): string => {
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || filePath;
  };

  const isEpub = (filePath: string): boolean => {
    return filePath.toLowerCase().endsWith('.epub');
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-app-accent/10 flex items-center justify-center">
              <Import className="w-5 h-5 text-app-accent" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Añadir libros</h2>
              <p className="text-sm text-gray-500">
                {filePaths.length} archivo{filePaths.length === 1 ? '' : 's'} seleccionado{filePaths.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Selected files */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase">
              Archivos seleccionados
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {filePaths.map((filePath, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                >
                  {isEpub(filePath) ? (
                    <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span className="text-sm text-gray-700 truncate">
                    {getFileName(filePath)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Destination selector */}
          <div className="mb-2">
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase">
              Destino: <span className="text-gray-600">{selectedFolderName}</span>
            </p>
          </div>

          {/* Folder tree */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            {/* Root */}
            <div
              className={clsx(
                'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
                selectedFolderId === ROOT_ID
                  ? 'bg-app-accent/10 text-app-accent'
                  : 'hover:bg-gray-100 text-gray-700'
              )}
              onClick={() => selectFolder(ROOT_ID, 'Biblioteca (raíz)')}
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

            {rootState?.hasMore && (
              <button
                type="button"
                className="ml-9 text-xs text-app-accent hover:underline py-1"
                onClick={() => loadChildren(ROOT_ID, rootState.page + 1, false)}
                disabled={rootState.loading}
              >
                {rootState.loading ? 'Cargando...' : 'Cargar más'}
              </button>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              {success}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-5 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={importing || filePaths.length === 0}
            className="px-5 py-2 rounded-xl bg-app-accent border border-green-200 text-sm text-gray-600 hover:bg-green-50 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Import className="w-4 h-4" />
                Importar {filePaths.length} libro{filePaths.length === 1 ? '' : 's'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};