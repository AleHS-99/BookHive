import { useState } from 'react';
import {
  Folder as FolderIcon,
  ChevronRight,
  ChevronDown,
  MoreVertical,
} from 'lucide-react';
import { Book, Folder, FolderPaginationState } from '../../types';
import { BookItem } from './BookItem';
import { clsx } from 'clsx';

interface TreeNodeProps {
  node: Folder | Book;
  level?: number;
  onLoadChildren: (folderId: string, page: number) => void;
  folderPagination: Record<string, FolderPaginationState>;
  onMoveBook?: (book: Book) => void;
  onViewProperties?: (book: Book) => void;
  onFolderActions?: (folderId: string, folderName: string) => void;
  onDeleted?: () => void;
}

export const TreeNode = ({
  node,
  level = 0,
  onLoadChildren,
  folderPagination,
  onMoveBook,
  onViewProperties,
  onFolderActions,
  onDeleted,
}: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Si es un libro
  if ('title' in node) {
    return (
      <BookItem
        book={node}
        level={level}
        onMoveBook={onMoveBook}
        onViewProperties={onViewProperties}
        onDeleted={onDeleted}
      />
    );
  }

  // Si es una carpeta
  const folder = node;
  const pagination = folderPagination[folder.id];
  const hasChildren = folder.count > 0;

  const paddingClasses = ['pl-2', 'pl-4', 'pl-8', 'pl-12'];

  const toggleFolder = () => {
    if (!hasChildren) return;

    const next = !isExpanded;
    setIsExpanded(next);

    if (next && folder.children.length === 0 && !pagination?.loading) {
      onLoadChildren(folder.id, 0);
    }
  };

  return (
    <div className="w-full">
      {/* Folder Header */}
      <div
        className={clsx(
          'flex items-center gap-3 py-4 pr-4 bg-white hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors group',
          paddingClasses[level] ?? 'pl-4'
        )}
        onClick={toggleFolder}
      >
        <button
          type="button"
          className="text-gray-400 hover:text-gray-700 p-1 hover:bg-gray-200 rounded-full transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            toggleFolder();
          }}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <FolderIcon
          className={clsx(
            'w-5 h-5',
            isExpanded ? 'text-app-accent' : 'text-gray-400'
          )}
        />

        <div className="flex-1 flex items-center justify-between">
          <span className="font-medium text-gray-700">{folder.name}</span>

          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{folder.count}</span>

            <button
              type="button"
              className="text-gray-300 group-hover:text-gray-600 p-1 rounded-full group-hover:bg-gray-200 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onFolderActions?.(folder.id, folder.name);
              }}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading children */}
      {isExpanded && folder.children.length === 0 && pagination?.loading && (
        <div
          className={clsx(
            'py-3 text-sm text-gray-400',
            paddingClasses[level + 1] ?? 'pl-8'
          )}
        >
          Cargando...
        </div>
      )}

      {/* Children */}
      {isExpanded &&
        folder.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            level={level + 1}
            onLoadChildren={onLoadChildren}
            folderPagination={folderPagination}
            onMoveBook={onMoveBook}
            onViewProperties={onViewProperties}
            onFolderActions={onFolderActions}
            onDeleted={onDeleted}
          />
        ))}

      {/* Load more children */}
      {isExpanded && pagination?.hasMore && (
        <div
          className={clsx(
            'py-2 border-b border-gray-100',
            paddingClasses[level + 1] ?? 'pl-8'
          )}
        >
          <button
            type="button"
            onClick={() => onLoadChildren(folder.id, pagination.page + 1)}
            disabled={pagination.loading}
            className="text-sm text-app-accent hover:underline disabled:opacity-50"
          >
            {pagination.loading ? 'Cargando...' : 'Cargar más'}
          </button>
        </div>
      )}
    </div>
  );
};