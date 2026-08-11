import { useState, useEffect } from 'react';
import { X, Folder, Pencil, Trash2, FolderPlus, AlertTriangle } from 'lucide-react';
import { BookshelfService } from '../../services/bookshelf.service';

type FolderActionsModalProps = {
  folderId: string;
  folderName: string;
  onClose: () => void;
  onUpdated: () => void;
};

type Section = 'menu' | 'rename' | 'create-sub' | 'delete-confirm';

export const FolderActionsModal = ({
  folderId,
  folderName,
  onClose,
  onUpdated,
}: FolderActionsModalProps) => {
  const [section, setSection] = useState<Section>('menu');
  const [newName, setNewName] = useState(folderName);
  const [subFolderName, setSubFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Summary para eliminación
  const [summary, setSummary] = useState<{ subfolders: number; books: number } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);

  // Obtener summary cuando se abre la sección de eliminar
  useEffect(() => {
    if (section === 'delete-confirm') {
      setLoadingSummary(true);
      setError(null);

      BookshelfService.getFolderSummary(folderId)
        .then(setSummary)
        .catch((err) => {
          console.error(err);
          setError(err instanceof Error ? err.message : String(err));
        })
        .finally(() => setLoadingSummary(false));
    }
  }, [section, folderId]);

  const handleRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === folderName) return;

    setLoading(true);
    setError(null);

    try {
      await BookshelfService.renameFolder(folderId, trimmed);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const handleCreateSubFolder = async () => {
    const trimmed = subFolderName.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      await BookshelfService.createFolder(folderId, trimmed);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    const hasContent = summary && (summary.subfolders > 0 || summary.books > 0);

    try {
      await BookshelfService.deleteFolder(folderId, hasContent ? true : false);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const hasContent = summary && (summary.subfolders > 0 || summary.books > 0);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <Folder className="w-5 h-5 text-app-accent shrink-0" />
            <h2 className="font-bold text-gray-900 truncate">{folderName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
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

        {/* Content */}
        <div className="px-6 py-4">
          {section === 'menu' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setSection('rename');
                  setError(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <Pencil className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Renombrar carpeta</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSection('create-sub');
                  setError(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <FolderPlus className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Crear subcarpeta</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSection('delete-confirm');
                  setError(null);
                  setSummary(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors text-left"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">Eliminar carpeta</span>
              </button>
            </div>
          )}

          {section === 'rename' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Nuevo nombre para la carpeta:
              </p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleRename();
                  if (e.key === 'Escape') setSection('menu');
                }}
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSection('menu')}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRename}
                  disabled={loading || !newName.trim() || newName.trim() === folderName}
                  className="px-4 py-2 bg-app-accent text-white text-sm rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Renombrando...' : 'Renombrar'}
                </button>
              </div>
            </div>
          )}

          {section === 'create-sub' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Nombre de la nueva subcarpeta dentro de "{folderName}":
              </p>
              <input
                type="text"
                value={subFolderName}
                onChange={(e) => setSubFolderName(e.target.value)}
                placeholder="Nombre de la subcarpeta"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreateSubFolder();
                  if (e.key === 'Escape') setSection('menu');
                }}
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSection('menu')}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateSubFolder}
                  disabled={loading || !subFolderName.trim()}
                  className="px-4 py-2 bg-app-accent text-white text-sm rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </div>
          )}

          {section === 'delete-confirm' && (
            <div className="space-y-4">
              {loadingSummary ? (
                <p className="text-sm text-gray-400">Verificando contenido...</p>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-700 font-medium">
                        ¿Estás seguro de que quieres eliminar la carpeta{' '}
                        <span className="font-bold">"{folderName}"</span>?
                      </p>
                    </div>
                  </div>

                  {hasContent && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <p className="text-sm text-red-700 font-medium">
                        ⚠️ Esta carpeta contiene:
                      </p>
                      <ul className="text-sm text-red-600 mt-1 list-disc list-inside">
                        {summary!.subfolders > 0 && (
                          <li>{summary!.subfolders} subcarpeta(s)</li>
                        )}
                        {summary!.books > 0 && (
                          <li>{summary!.books} libro(s)</li>
                        )}
                      </ul>
                      <p className="text-xs text-red-500 mt-2 font-medium">
                        Esta acción es IRREVERSIBLE. Todos los archivos serán
                        eliminados permanentemente del disco.
                      </p>
                    </div>
                  )}

                  {!hasContent && (
                    <p className="text-xs text-gray-400">
                      Esta carpeta está vacía. Se eliminará sin afectar otros
                      archivos.
                    </p>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSection('menu')}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading
                        ? 'Eliminando...'
                        : hasContent
                          ? `Eliminar ${summary!.books + summary!.subfolders} elemento(s)`
                          : 'Eliminar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};