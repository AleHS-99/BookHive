import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DiscoverBook } from '../../types';
import { BookCard } from './BookCard';

export const BookCarousel = ({
  title,
  subtitle,
  books,
  onBookClick,
}: {
  title: string;
  subtitle?: string;
  books: DiscoverBook[];
  onBookClick?: (book: DiscoverBook) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    const el = ref.current;
    if (el) {
      el.scrollBy({
        left: dir * el.clientWidth * 0.8,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section>
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="p-1.5 rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            className="p-1.5 rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        {books.length === 0 ? (
          <p className="text-sm text-gray-400 py-8">
            No hay libros disponibles.
          </p>
        ) : (
          books.map((book) => (
            <BookCard key={book.id} book={book} onClick={onBookClick} />
          ))
        )}
      </div>
    </section>
  );
};