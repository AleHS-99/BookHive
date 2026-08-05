import { Menu } from 'lucide-react';
import { BookOpen } from 'lucide-react';

type MobileTopBarProps = {
  onMenuClick: () => void;
};

export const MobileTopBar = ({ onMenuClick }: MobileTopBarProps) => {
  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button className="text-gray-600" 
          onClick={onMenuClick}>
            <Menu className="w-6 h-6" />
          </button>
        <div className="flex items-center gap-1 text-lg font-bold text-app-accent">
          <BookOpen className="w-5 h-5" />
          <span>Book<span className='text-amber-400'>Hive</span></span>
        </div>
      </div>
    </header>
  );
};