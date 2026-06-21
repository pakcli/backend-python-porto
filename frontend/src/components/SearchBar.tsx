import React, { useState } from 'react';
import { Search, AlertTriangle, ArrowLeftRight, Eye, EyeOff, Plus } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sidebarPosition: 'left' | 'right';
  setSidebarPosition: (pos: 'left' | 'right') => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  onAddClick: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  sidebarPosition,
  setSidebarPosition,
  sidebarCollapsed,
  setSidebarCollapsed,
  onAddClick,
}) => {
  const [isValidRegex, setIsValidRegex] = useState(true);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (val.trim() === '') {
      setIsValidRegex(true);
      return;
    }

    try {
      new RegExp(val);
      setIsValidRegex(true);
    } catch (err) {
      setIsValidRegex(false);
    }
  };

  return (
    <div className="bg-[#111418] border border-slate-800 rounded-xl p-4 shadow-md flex items-center justify-between gap-4 transition-colors">
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Regex Search (e.g. ^yolo | filter.* | .*hackathon)..."
          className={`w-full pl-10 pr-10 py-2 text-sm rounded-lg border focus:outline-none transition-all ${
            searchQuery === ''
              ? 'bg-slate-900 border-slate-800 focus:border-slate-650 focus:ring-1 focus:ring-slate-700/10 text-slate-200'
              : isValidRegex
              ? 'bg-slate-900/60 border-emerald-500/40 text-slate-100 focus:ring-1 focus:ring-emerald-500/10'
              : 'bg-slate-900/60 border-red-500/40 text-slate-100 focus:ring-1 focus:ring-red-500/10'
          }`}
        />
        {searchQuery && !isValidRegex && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-red-500" title="Invalid Regex Pattern">
            <AlertTriangle size={18} />
          </div>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
        {/* ADD New Instance Button */}
        <button
          onClick={onAddClick}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-400 hover:shadow-[0_0_12px_rgba(16,185,129,0.2)] flex items-center justify-center transition-all"
          title="Add New Instance"
        >
          <Plus size={20} className="text-emerald-500" />
        </button>

        {/* Toggle Sidebar Side */}
        <button
          onClick={() => setSidebarPosition(sidebarPosition === 'left' ? 'right' : 'left')}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title={sidebarPosition === 'left' ? 'Move HUD to Right' : 'Move HUD to Left'}
        >
          <ArrowLeftRight size={20} />
        </button>

        {/* Toggle Sidebar Collapse */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`p-2 rounded-lg border transition-colors ${
            sidebarCollapsed
              ? 'bg-slate-900 border-red-900/50 text-red-500 hover:text-red-400 hover:border-red-500/50'
              : 'bg-slate-900 border-slate-800 text-emerald-500 hover:text-emerald-400 hover:border-slate-700'
          }`}
          title={sidebarCollapsed ? 'Expand HUD' : 'Collapse/Hide HUD'}
        >
          {sidebarCollapsed ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
