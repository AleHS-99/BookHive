import { MoreVertical, FileText, BookOpen } from 'lucide-react';
import { Book } from '../../types';
import { clsx } from 'clsx';
import { getCoverSrc } from '../../utils/cover';
import { ContextMenu } from '../ui/ContextMenu';

const getPadding = (level: number) => {
  if (level <= 0) return 'pl-4';
  if (level === 1) return 'pl-8';
  if (level === 2) return 'pl-12';
  return 'pl-16';
};

export const BookItem = ({
  book,
  level,
  onMoveBook,
  onViewProperties,
}: {
  book: Book;
  level: number;
  onMoveBook?: (book: Book) => void;
  onViewProperties?: (book: Book) => void;
}) => {
  const coverSrc = getCoverSrc(book.imageUrl);

  return (
    <div
      className={clsx(
        'flex items-center gap-4 py-3 pr-4 hover:bg-gray-100 rounded-lg transition-colors',
        getPadding(level)
      )}
    >
      {/* Book Cover */}
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
      <div className="flex-1">
        <h3 className="font-medium text-sm text-gray-900">{book.title}</h3>
        <p className="text-xs text-gray-500">{book.author}</p>
      </div>

      {/* Context Menu */}
      <ContextMenu
        trigger={<MoreVertical className="w-4 h-4" />}
        items={[
          {
            label: 'Mover a carpeta',
            onClick: () => onMoveBook?.(book),
          },
          {
            label: 'Propiedades',
            onClick: () => onViewProperties?.(book),
          },
        ]}
      />
    </div>
  );
};