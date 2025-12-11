import React, { useState, useMemo } from 'react';
import { X, Plus, Search, ChevronRight, User, Tag } from 'lucide-react';

interface SelectableItem {
  id: number | string;
  name: string;
}

interface SelectionModalProps {
  title: string;
  items: SelectableItem[];
  onClose: () => void;
  onSelect: (item: SelectableItem) => void;
  searchPlaceholder: string;
  renderItemIcon: () => React.ReactNode;
}

const SelectionModal: React.FC<SelectionModalProps> = ({
  title,
  items,
  onClose,
  onSelect,
  searchPlaceholder,
  renderItemIcon,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() =>
    items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [items, searchTerm]);

  return (
    <div className="absolute inset-0 bg-white z-10 flex flex-col">
      <header className="flex-shrink-0 flex items-center p-4 border-b">
        <div className="flex-1"></div>
        <h2 className="flex-1 text-lg font-bold text-center">{title}</h2>
        <div className="flex-1 flex justify-end items-center gap-2">
          <button className="p-1 text-slate-600 hover:text-slate-900">
              <Plus size={24} />
          </button>
          <button onClick={onClose} className="p-1 text-slate-600 hover:text-slate-900">
              <X size={24} />
          </button>
        </div>
      </header>
      
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-orange-500 outline-none"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ul>
          {filteredItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => onSelect(item)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 border-b"
              >
                <span className="font-medium">{item.name}</span>
                 <div className="flex items-center gap-2 text-orange-500">
                    {renderItemIcon()}
                    <ChevronRight size={20} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SelectionModal;