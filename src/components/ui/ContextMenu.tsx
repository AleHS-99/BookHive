import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

export type ContextMenuItem = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
};

type ContextMenuProps = {
  trigger: ReactNode;
  items: ContextMenuItem[];
  buttonClassName?: string;
};

export const ContextMenu = ({
  trigger,
  items,
  buttonClassName,
}: ContextMenuProps) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();

      const menuWidth = 224; // w-56 = 14rem = 224px
      const menuHeight = items.length * 40 + 8; // approximate

      let top = rect.bottom + 4;
      let left = rect.right - menuWidth;

      // Si se sale por abajo, mostrar hacia arriba
      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 4;
      }

      // Si se sale por la izquierda
      if (left < 8) {
        left = 8;
      }

      // Si se sale por la derecha
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }

      setPosition({ top, left });
    }

    setOpen((prev) => !prev);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={clsx(
          'text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200',
          buttonClassName
        )}
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
      >
        {trigger}
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-200 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1"
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            {items.map((item, index) => (
              <button
                key={index}
                type="button"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);

                  if (!item.disabled) {
                    item.onClick?.();
                  }
                }}
                className={clsx(
                  'w-full text-left px-4 py-2 text-sm transition-colors',
                  item.disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : item.danger
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};