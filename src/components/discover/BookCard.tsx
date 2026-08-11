import { useState } from 'react';
import { clsx } from 'clsx';
import { DiscoverBook } from '../../types';
import { BookOpen } from 'lucide-react';

export const BookCard = ({
  book,
  fluid = false,
  onClick,
}: {
  book: DiscoverBook;
  fluid?: boolean;
  onClick?: (book: DiscoverBook) => void;
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const hasCover = book.coverUrl && !imageError;

  return (
    <button
      type="button"
      onClick={() => onClick?.(book)}
      className={clsx(
        'group text-left',
        fluid ? 'w-full' : 'w-32 md:w-36 shrink-0'
      )}
    >
      <div
        className={clsx(
          'aspect-[2/3] rounded-lg shadow-md overflow-hidden transition-all group-hover:scale-[1.04] group-hover:shadow-lg relative bg-gray-100'
        )}
      >
        {hasCover ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            <img
              src={book.coverUrl}
              alt={book.title}
              className={clsx(
                'w-full h-full object-cover transition-opacity',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {/* Overlay con título al hacer hover */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-xs font-semibold leading-tight line-clamp-2">
                {book.title}
              </p>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-gray-400">
            <BookOpen className="w-8 h-8 mb-2" />
            <p className="text-xs text-center line-clamp-2">{book.title}</p>
          </div>
        )}
      </div>

      {/* Título debajo de la card */}
      <div className="mt-2">
        <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2">
          {book.title}
        </p>
        {book.author && (
          <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
            {book.author}
          </p>
        )}
      </div>
    </button>
  );
};