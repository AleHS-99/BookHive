import { Search, Filter, Plus } from 'lucide-react';
import { useBookshelf } from '../hooks/useBookshelf';
import { TreeNode } from '../components/bookshelf/TreeNode';

export const BookshelfPage = () => {
  const { data, loading } = useBookshelf();

  return (
    <div className="max-w-7xl mx-auto relative h-full">
      {/* Header */}
      <div className="flex items-center justify-between py-6 pt-4 md:pt-8">
        <div className="flex-1 md:flex-none flex items-center gap-4 w-full md:w-auto md:ml-8">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search books..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-app-accent/50 text-sm"
            />
          </div>
          <button className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bookshelf Tree View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading bookshelf...</div>
        ) : (
          data?.children.map(child => <TreeNode key={child.id} node={child} />)
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 md:bottom-8 left-1/2 md:left-1/2 z-10 hidden md:block">
        <button className="flex items-center gap-2 bg-[#FEF3C7] text-[#92400E] px-5 py-3 rounded-xl shadow-lg hover:bg-[#FDE68A] transition-colors font-medium">
          <Plus className="w-5 h-5" />
          New Group
        </button>
      </div>
    </div>
  );
};