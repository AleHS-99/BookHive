import { MoreVertical, FileText, BookOpen, Folder } from 'lucide-react';
import { SearchBook } from '../../types';
import { getCoverSrc } from '../../utils/cover';

export const SearchResultItem = ({ book }: { book: SearchBook }) => {
  const coverSrc = getCoverSrc(book.imageUrl);

  return (
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

      {/* Actions */}
      <button className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200">
        <MoreVertical className="w-4 h-4" />
      </button>
    </div>
  );
};