import { useState } from 'react';
import { Folder as FolderIcon, ChevronRight, ChevronDown, MoreVertical } from 'lucide-react';
import { Folder, Book } from '../../types';
import { BookItem } from './BookItem';
import { clsx } from 'clsx';

interface TreeNodeProps {
  node: Folder | Book;
  level?: number;
}

export const TreeNode = ({ node, level = 0 }: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Expand first 2 levels by default
  
  // If it's a Book
  if ('title' in node) {
    return <BookItem book={node} level={level} />;
  }
  console.log(node);

  // It's a Folder
  const folder = node;
  const paddingClasses = ["pl-2", "pl-4", "pl-8", "pl-12"];


  return (
    <div className="w-full">
      {/* Folder Header */}
      <div 
        className={clsx(
          "flex items-center gap-3 py-4 pr-4 bg-white hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors group",
          paddingClasses[level] ?? "pl-4"
        )}
        onClick={() => folder.children.length > 0 && setIsExpanded(!isExpanded)}
      >
        <button className="text-gray-400 hover:text-gray-700 p-1 hover:bg-gray-200 rounded-full transition-transform">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        
        <FolderIcon className={clsx("w-5 h-5", isExpanded ? "text-app-accent" : "text-gray-400")} />
        
        <div className="flex-1 flex items-center justify-between">
          <span className="font-medium text-gray-700">{folder.name}</span>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{folder.count}</span>
            <button className="text-gray-300 group-hover:text-gray-600 p-1 rounded-full group-hover:bg-gray-200 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Children (Recursive) */}
      {isExpanded && folder.children.map(child => (
        <TreeNode key={child.id} node={child} level={level + 1} />
      ))}
    </div>
  );
};