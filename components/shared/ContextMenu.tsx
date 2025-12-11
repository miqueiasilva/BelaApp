import React, { useEffect, useRef } from 'react';

interface MenuOption {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
}

interface ContextMenuProps {
  x: number;
  y: number;
  options: MenuOption[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-md shadow-lg p-1 border border-slate-200 w-56"
      style={{ top: y, left: x }}
    >
      <ul className="space-y-1">
        {options.map((option, index) => (
          <li key={index}>
            <button
              onClick={() => {
                option.onClick();
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left text-slate-700 hover:bg-slate-100 rounded-md transition-colors ${option.className || ''}`}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ContextMenu;
