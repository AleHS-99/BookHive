import { MoreVertical, FileText, BookOpen } from 'lucide-react';
import { Book } from '../../types';
import { clsx } from 'clsx';

const getPadding = (level: number) => {
  if (level <= 0) return 'pl-4';
  if (level === 1) return 'pl-8';
  if (level === 2) return 'pl-12';
  return 'pl-16';
};

const getCoverSrc = (url?: string): string | undefined => {
  if (!url) return undefined;

  if (url.startsWith('cover:')) {
    return url;
  }

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  return undefined;
};

export const BookItem = ({
  book,
  level,
}: {
  book: Book;
  level: number;
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

      <div className="flex-1">
        <h3 className="font-medium text-sm text-gray-900">{book.title}</h3>
        <p className="text-xs text-gray-500">{book.author}</p>
      </div>

      <button className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200">
        <MoreVertical className="w-4 h-4" />
      </button>
    </div>
  );
};