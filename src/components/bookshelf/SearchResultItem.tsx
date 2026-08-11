import { useState } from 'react';
import { MoreVertical, FileText, BookOpen, Folder } from 'lucide-react';
import { Book, SearchBook } from '../../types';
import { getCoverSrc } from '../../utils/cover';
import { ContextMenu } from '../ui/ContextMenu';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { BookshelfService } from '../../services/bookshelf.service';

export const SearchResultItem = ({
  book,
  onMoveBook,
  onViewProperties,
  onDeleted,
}: {
  book: SearchBook;
  onMoveBook?: (book: Book) => void;
  onViewProperties?: (book: Book) => void;
  onDeleted?: () => void;
}) => {
  const coverSrc = getCoverSrc(book.imageUrl);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleOpenExternal = async () => {
    try {
      await BookshelfService.openBookExternal(book.id);
    } catch (err) {
      console.error('Error abriendo libro:', err);
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);

    try {
      await BookshelfService.deleteBook(book.id);
      setShowDeleteConfirm(false);
      onDeleted?.();
    } catch (err) {
      console.error('Error eliminando libro:', err);
      setDeleteError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 py-3 px-4 hover:bg-gray-100 border-b border-gray-100 transition-colors">
        {/* Cover */}
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={book.title}
            className="w-10 h-14 rounded object-cover shadow-sm"
          />
        ) : book.format === 'pdf' ? (
          <div className="w-10 h-14 rounded bg-red-50 border border-red-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-red-500" />
          </div>
        ) : (
          <div className="w-10 h-14 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-gray-400" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-gray-900 truncate">
            {book.title}
          </h3>
          <p className="text-xs text-gray-500 truncate">
            {book.author || 'Autor desconocido'}
          </p>
          {book.folderName && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <Folder className="w-3 h-3" />
              {book.folderName}
            </p>
          )}
        </div>

        <ContextMenu
          trigger={<MoreVertical className="w-4 h-4" />}
          items={[
            {
              label: 'Abrir con app externa',
              onClick: () => void handleOpenExternal(),
            },
            {
              label: 'Mover a carpeta',
              onClick: () => onMoveBook?.(book as Book),
            },
            {
              label: 'Propiedades',
              onClick: () => onViewProperties?.(book as Book),
            },
            {
              label: 'Eliminar',
              onClick: () => setShowDeleteConfirm(true),
              danger: true,
            },
          ]}
        />
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Eliminar libro"
          message={
            <div className="space-y-2">
              <p>
                ¿Estás seguro de que quieres eliminar{' '}
                <span className="font-medium">"{book.title}"</span>?
              </p>
              <p className="text-xs text-red-500 font-medium">
                El archivo será eliminado permanentemente del disco. Esta
                acción es irreversible.
              </p>
            </div>
          }
          confirmLabel="Eliminar"
          danger
          loading={deleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
};