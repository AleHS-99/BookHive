import { useEffect, useRef, useState } from 'react';
import { Tags, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

export const CategoryFilter = ({
  categories,
  active,
  onSelect,
}: {
  categories: string[];
  active: string | null;
  onSelect: (category: string | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors',
          active
            ? 'border-app-accent/40 bg-app-accent/10 text-app-accent'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
        )}
      >
        <Tags className="w-4 h-4" />
        <span className="hidden sm:inline max-w-28 truncate">
          {active ?? 'Categorías'}
        </span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-56 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1">
          {active && (
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
            >
              Todas
            </button>
          )}

          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                onSelect(category);
                setOpen(false);
              }}
              className={clsx(
                'w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors',
                category === active
                  ? 'text-app-accent font-medium'
                  : 'text-gray-700'
              )}
            >
              {category}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};