import React, { useState, useEffect, useRef } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

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

  const handleCollapse = () => {
    setIsExpanded(false);
    setSearchQuery('');
    setIsValidRegex(true);
  };

  // Focus input automatically when search is expanded
  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  // Click outside listener to collapse search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setSearchQuery('');
        setIsValidRegex(true);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setSearchQuery]);

  return (
    <div ref={searchRef} className="bg-[#111418] border border-slate-800 rounded-xl p-3 shadow-md transition-all">
      {isExpanded || searchQuery ? (
        <div className="flex items-center gap-2.5 w-full">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Regex Search..."
              className={`w-full pl-10 pr-16 py-2 text-sm rounded-lg border focus:outline-none transition-all ${
                searchQuery === ''
                  ? 'bg-slate-900 border-slate-800 focus:border-slate-650 focus:ring-1 focus:ring-slate-700/10 text-slate-200'
                  : isValidRegex
                  ? 'bg-slate-900/60 border-emerald-500/40 text-slate-100 focus:ring-1 focus:ring-emerald-500/10'
                  : 'bg-slate-900/60 border-red-500/40 text-slate-100 focus:ring-1 focus:ring-red-500/10'
              }`}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
              {searchQuery && !isValidRegex && (
                <span title="Invalid Regex Pattern">
                  <AlertTriangle size={16} className="text-red-500" />
                </span>
              )}
              <button
                onClick={handleCollapse}
                className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-350 transition-colors"
                title="Close Search"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider font-sans">Close</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {/* ADD New Instance Button */}
            <button
              onClick={onAddClick}
              className="p-2 w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-400 hover:shadow-[0_0_12px_rgba(16,185,129,0.2)] flex items-center justify-center transition-all"
              title="Add New Instance"
            >
              <Plus size={20} className="text-emerald-500" />
            </button>

            {/* Toggle Sidebar Side */}
            <button
              onClick={() => setSidebarPosition(sidebarPosition === 'left' ? 'right' : 'left')}
              className="p-2 w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center"
              title={sidebarPosition === 'left' ? 'Move HUD to Right' : 'Move HUD to Left'}
            >
              <ArrowLeftRight size={18} />
            </button>

            {/* Toggle Sidebar Collapse */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`p-2 w-9 h-9 rounded-lg border transition-colors flex items-center justify-center ${
                sidebarCollapsed
                  ? 'bg-slate-900 border-red-900/50 text-red-500 hover:text-red-400 hover:border-red-500/50'
                  : 'bg-slate-900 border-slate-800 text-emerald-500 hover:text-emerald-400 hover:border-slate-700'
              }`}
              title={sidebarCollapsed ? 'Expand HUD' : 'Collapse/Hide HUD'}
            >
              {sidebarCollapsed ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center w-full">
          {/* Row of 4 neat buttons */}
          <div className="flex gap-2.5 w-full justify-between">
            {/* Search Toggle Button */}
            <button
              onClick={() => setIsExpanded(true)}
              className="p-2 w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center"
              title="Search Archives"
            >
              <Search size={18} />
            </button>

            {/* ADD New Instance Button */}
            <button
              onClick={onAddClick}
              className="p-2 w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-400 hover:shadow-[0_0_12px_rgba(16,185,129,0.2)] flex items-center justify-center transition-all"
              title="Add New Instance"
            >
              <Plus size={20} className="text-emerald-500" />
            </button>

            {/* Toggle Sidebar Side */}
            <button
              onClick={() => setSidebarPosition(sidebarPosition === 'left' ? 'right' : 'left')}
              className="p-2 w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center"
              title={sidebarPosition === 'left' ? 'Move HUD to Right' : 'Move HUD to Left'}
            >
              <ArrowLeftRight size={18} />
            </button>

            {/* Toggle Sidebar Collapse */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`p-2 w-9 h-9 rounded-lg border transition-colors flex items-center justify-center ${
                sidebarCollapsed
                  ? 'bg-slate-900 border-red-900/50 text-red-500 hover:text-red-400 hover:border-red-500/50'
                  : 'bg-slate-900 border-slate-800 text-emerald-500 hover:text-emerald-400 hover:border-slate-700'
              }`}
              title={sidebarCollapsed ? 'Expand HUD' : 'Collapse/Hide HUD'}
            >
              {sidebarCollapsed ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
