import { MoreVertical } from 'lucide-react';
import { Book } from '../../types';
import { clsx } from 'clsx';

export const BookItem = ({ book, level }: { book: Book, level: number }) => {
  return (
    <div className={clsx("flex items-center gap-4 py-3 pr-4 hover:bg-gray-100 rounded-lg transition-colors", `pl-${level * 4 + 4}`)}>
      {/* Book Cover */}
      {book.imageUrl ? (
        <img src={book.imageUrl} alt={book.title} className="w-10 h-14 rounded object-cover shadow-sm" />
      ) : (
        <div className="w-10 h-14 rounded bg-gray-300 flex items-center justify-center text-xs text-gray-500">No Img</div>
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