import { NavLink } from 'react-router-dom';
import { BookOpen, Heart, Bookmark, List } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { id: 'bookshelf', label: 'Bookshelf', icon: BookOpen, path: '/bookshelf' },
  { id: 'favorites', label: 'Favorites', icon: Heart, path: '/favorites' },
  { id: 'reading', label: 'Reading Now', icon: Bookmark, path: '/reading' },
  { id: 'to-read', label: 'To Read', icon: List, path: '/to-read' },
];

export const MobileBottomNav = () => {
  return (
    <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around py-3">
      {navItems.map((item) => (
        <NavLink
          key={item.id}
          to={item.path}
          className={({ isActive }) => clsx(
            "flex flex-col items-center gap-1 text-xs transition-colors",
            isActive ? "text-app-accent" : "text-gray-400"
          )}
        >
          <item.icon className="w-6 h-6" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};