import { useEffect, useState } from 'react';
import {
  X,
  BookOpen,
  FileText,
  Globe,
  Calendar,
  Building2,
  File,
  Folder,
  Hash,
  Info,
} from 'lucide-react';
import { BookProperties } from '../../types';
import { BookshelfService } from '../../services/bookshelf.service';
import { getCoverSrc } from '../../utils/cover';
import { formatBytes, formatDate } from '../../utils/format';
import { clsx } from 'clsx';

type BookPropertiesModalProps = {
  bookId: string;
  onClose: () => void;
  onUpdated: () => void;
};

type Section = 'info' | 'metadata' | 'rename';

export const BookPropertiesModal = ({
  bookId,
  onClose,
  onUpdated,
}: BookPropertiesModalProps) => {
  const [props, setProps] = useState<BookProperties | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [section, setSection] = useState<Section>('info');

  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSuccess, setRenameSuccess] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await BookshelfService.getBookProperties(bookId);
      setProps(data);
      setNewName(data.fileName);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [bookId]);

  const handleRename = async () => {
    if (!props) return;

    const trimmed = newName.trim();

    if (!trimmed) {
      setRenameError('El nombre no puede estar vacío.');
      return;
    }

    if (trimmed === props.fileName) {
      return;
    }

    setRenaming(true);
    setRenameError(null);
    setRenameSuccess(false);

    try {
      await BookshelfService.renameBookFile(bookId, trimmed);
      setRenameSuccess(true);
      await load();
      onUpdated();
    } catch (err) {
      console.error(err);
      setRenameError(err instanceof Error ? err.message : String(err));
    } finally {
      setRenaming(false);
    }
  };

  const coverSrc = getCoverSrc(props?.imageUrl);
  const isEpub = props?.format === 'epub';

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start gap-4 px-6 py-4 border-b border-gray-100">
          {/* Cover */}
          <div className="shrink-0">
            {coverSrc ? (
              <img
                src={coverSrc}
                alt={props?.title}
                className="w-20 h-28 rounded object-cover shadow"
              />
            ) : isEpub ? (
              <div className="w-20 h-28 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
            ) : (
              <div className="w-20 h-28 rounded bg-red-50 border border-red-100 flex items-center justify-center">
                <FileText className="w-8 h-8 text-red-500" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-lg truncate">
              {loading ? 'Cargando...' : props?.title}
            </h2>
            {props?.author && (
              <p className="text-sm text-gray-500 truncate">{props.author}</p>
            )}
            {props && (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={clsx(
                    'inline-block px-2 py-0.5 rounded-full text-xs font-medium uppercase',
                    isEpub
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-red-50 text-red-700'
                  )}
                >
                  {props.format}
                </span>

                {props.isMissing && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                    Missing
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {props && (
          <div className="flex border-b border-gray-100 px-6">
            <button
              type="button"
              onClick={() => setSection('info')}
              className={clsx(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                section === 'info'
                  ? 'border-app-accent text-app-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              Información
            </button>
            <button
              type="button"
              onClick={() => setSection('metadata')}
              className={clsx(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                section === 'metadata'
                  ? 'border-app-accent text-app-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              Metadatos
            </button>
            <button
              type="button"
              onClick={() => setSection('rename')}
              className={clsx(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                section === 'rename'
                  ? 'border-app-accent text-app-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              Renombrar archivo
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Cargando...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : !props ? null : section === 'info' ? (
            <div className="space-y-3">
              <InfoRow
                icon={<File className="w-4 h-4" />}
                label="Archivo"
                value={props.fileName}
              />
              <InfoRow
                icon={<Folder className="w-4 h-4" />}
                label="Carpeta"
                value={props.folderName ?? 'Biblioteca (raíz)'}
              />
              <InfoRow
                icon={<Hash className="w-4 h-4" />}
                label="Tamaño"
                value={formatBytes(props.fileSize)}
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Modificado"
                value={formatDate(props.fileModifiedAt)}
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Agregado"
                value={formatDate(props.createdAt)}
              />
              <InfoRow
                icon={<Hash className="w-4 h-4" />}
                label="Ruta relativa"
                value={props.relativePath}
                mono
              />
            </div>
          ) : section === 'metadata' ? (
            <div className="space-y-3">
              <InfoRow
                icon={<BookOpen className="w-4 h-4" />}
                label="Título (metadatos)"
                value={props.title}
              />
              <InfoRow
                icon={<Info className="w-4 h-4" />}
                label="Autor"
                value={props.author || '—'}
              />
              <InfoRow
                icon={<Globe className="w-4 h-4" />}
                label="Idioma"
                value={props.language || '—'}
              />
              <InfoRow
                icon={<Building2 className="w-4 h-4" />}
                label="Editorial"
                value={props.publisher || '—'}
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Fecha de publicación"
                value={props.publishedDate || '—'}
              />

              <div className="pt-2">
                <p className="text-xs text-gray-400 mb-1">Descripción</p>
                {props.description ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {props.description}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    Sin descripción disponible.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 text-xs text-gray-400">
                <p>
                  Estado de metadatos:{' '}
                  <span className="font-medium">
                    {props.metadataStatus}
                  </span>
                </p>
                <p>
                  Estado de portada:{' '}
                  <span className="font-medium">{props.coverStatus}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Cambia el nombre del archivo en disco. La extensión (
                <span className="font-mono">
                  .{props.fileName.split('.').pop()}
                </span>
                ) no se puede modificar.
              </p>

              {renameError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {renameError}
                </div>
              )}

              {renameSuccess && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                  Archivo renombrado correctamente.
                </div>
              )}

              <input
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setRenameError(null);
                  setRenameSuccess(false);
                }}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/50 font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleRename();
                  }
                }}
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleRename}
                  disabled={
                    renaming ||
                    !newName.trim() ||
                    newName.trim() === props.fileName
                  }
                  className="px-5 py-2 bg-app-accent text-white text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {renaming ? 'Renombrando...' : 'Renombrar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
    <div className="text-gray-400 mt-0.5 shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p
        className={clsx(
          'text-sm text-gray-800 wrap-break-words',
          mono && 'font-mono text-xs'
        )}
      >
        {value}
      </p>
    </div>
  </div>
);