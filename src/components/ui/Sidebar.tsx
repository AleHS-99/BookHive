import { NavLink, Link } from 'react-router-dom';
import {
  BookOpen,
  Heart,
  Bookmark,
  MessageSquare,
  BarChart2,
  Settings,
} from 'lucide-react';
import { NavItem } from '../../types';
import { clsx } from 'clsx';

const navItems: NavItem[] = [
  { id: 'bookshelf', label: 'Bookshelf', icon: BookOpen, path: '/bookshelf' },
  { id: 'favorites', label: 'Favorites', icon: Heart, path: '/favorites' },
  { id: 'reading', label: 'Reading Now', icon: Bookmark, path: '/reading' },
  { id: 'to-read', label: 'To Read', icon: Bookmark, path: '/to-read' },
  { id: 'quotes', label: 'Quotes', icon: MessageSquare, path: '/quotes' },
  { id: 'stats', label: 'Stats', icon: BarChart2, path: '/stats' },
];

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export const Sidebar = ({ isOpen = false, onClose = () => {} }: SidebarProps) => {
  return (
    <>
      {/* Backdrop móvil */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-[#1C1C1E] h-screen text-gray-300 shrink-0 transform transition-transform duration-300 md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="p-6 flex items-center gap-2 text-2xl font-bold text-app-accent">
          <BookOpen className="w-8 h-8" />
          <span>Book<span className='text-amber-400'>Hive</span></span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                  isActive
                    ? 'bg-[#2C2C2E] text-app-accent font-medium'
                    : 'hover:bg-[#2C2C2E]/50 text-gray-400 hover:text-white'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Settings */}
        <div className="p-6 border-t border-gray-800">
          <Link
            to="/settings"
            onClick={onClose}
            className="flex items-center gap-3 hover:bg-[#2C2C2E] p-2 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-app-accent flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>

            <span className="flex-1 text-white font-medium text-sm">
              Opciones
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
};