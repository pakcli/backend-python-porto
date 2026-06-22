import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { OrbType, DashboardStats } from '../types';

interface HUDProps {
  mode: 'all' | 'proj' | 'items';
  setMode: (mode: 'all' | 'proj' | 'items') => void;
  subFilters: { cert: boolean; achv: boolean; item: boolean };
  setSubFilters: React.Dispatch<React.SetStateAction<{ cert: boolean; achv: boolean; item: boolean }>>;
  orbs: OrbType[];
  onClear: () => void;
  onInvoke: () => void;
  activeCombo: string;
  stats: DashboardStats;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  volume: number;
  setVolume: (vol: number) => void;
  activeStatFilter: string | null;
  setActiveStatFilter: (filter: string | null) => void;
  formalMode: boolean;
  setFormalMode: (formal: boolean) => void;
  thinnerCard: boolean;
  setThinnerCard: (thinner: boolean) => void;
  statsMode: 'done' | 'upcoming' | 'combined';
  setStatsMode: (mode: 'done' | 'upcoming' | 'combined') => void;
  nodeLineMode: 'focus' | 'focus-no-offset' | 'all';
  setNodeLineMode: (mode: 'focus' | 'focus-no-offset' | 'all') => void;
  readViewMode: 'popup' | 'split';
  setReadViewMode: (mode: 'popup' | 'split') => void;
  clickToEdit: boolean;
  setClickToEdit: (val: boolean) => void;
}

export const InvokerHUD: React.FC<HUDProps> = ({
  mode,
  setMode,
  subFilters,
  setSubFilters,
  orbs,
  onClear,
  onInvoke,
  activeCombo,
  stats,
  soundEnabled,
  setSoundEnabled,
  volume,
  setVolume,
  activeStatFilter,
  setActiveStatFilter,
  formalMode,
  setFormalMode,
  thinnerCard,
  setThinnerCard,
  statsMode,
  setStatsMode,
  nodeLineMode,
  setNodeLineMode,
  readViewMode,
  setReadViewMode,
  clickToEdit,
  setClickToEdit,
}) => {
  const [keybindsExpanded, setKeybindsExpanded] = useState(false);

  const getOrbShadowAndBorder = (orb: OrbType) => {
    switch (orb) {
      case 'Q':
        return 'shadow-[0_0_15px_#00d0ff] border border-cyan-400/50 text-cyan-50';
      case 'W':
        return 'shadow-[0_0_15px_#d000ff] border border-fuchsia-400/50 text-fuchsia-50';
      case 'E':
        return 'shadow-[0_0_15px_#ff6a00] border border-amber-400/50 text-amber-50';
    }
  };

  const getOrbGradient = (orb: OrbType) => {
    switch (orb) {
      case 'Q':
        return 'from-cyan-300 via-cyan-500 to-blue-600';
      case 'W':
        return 'from-fuchsia-300 via-fuchsia-500 to-purple-600';
      case 'E':
        return 'from-amber-300 via-orange-500 to-red-600';
    }
  };

  const getOrbLabel = (orb: OrbType) => {
    switch (orb) {
      case 'Q': return formalMode ? 'Sistem' : 'Quas';
      case 'W': return formalMode ? 'Program' : 'Wex';
      case 'E': return formalMode ? 'Media / Visual' : 'Exort';
    }
  };

  const handleSubFilterToggle = (key: 'cert' | 'achv' | 'item') => {
    setSubFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStatClick = (type: string) => {
    if (activeStatFilter === type) {
      setActiveStatFilter(null); // Reset filter
    } else {
      setActiveStatFilter(type);
    }
  };

  const getUpcomingBadgeStyle = (type: 'total' | 'quas' | 'wex' | 'exort' | 'gold' | 'grey') => {
    switch (type) {
      case 'total':
        return 'text-slate-400 bg-slate-800/40 border border-slate-700/30';
      case 'quas':
        return 'text-cyan-400/80 bg-cyan-950/30 border border-cyan-500/20';
      case 'wex':
        return 'text-fuchsia-400/80 bg-fuchsia-950/30 border border-fuchsia-500/20';
      case 'exort':
        return 'text-orange-400/80 bg-orange-950/30 border border-orange-500/20';
      case 'gold':
        return 'text-amber-400/80 bg-amber-950/30 border border-amber-500/20';
      case 'grey':
        return 'text-slate-400 bg-slate-800/40 border border-slate-700/30';
    }
  };

  const renderStatValue = (val: { done: number; upcoming: number }, type: 'total' | 'quas' | 'wex' | 'exort' | 'gold' | 'grey') => {
    if (statsMode === 'done') {
      return <span className="text-2xl font-black text-white">{val.done}</span>;
    }
    if (statsMode === 'upcoming') {
      return <span className="text-2xl font-black text-white">{val.upcoming}</span>;
    }
    return (
      <span className="text-2xl font-black text-white flex items-center gap-1.5 justify-center">
        <span>{val.done}</span>
        {val.upcoming > 0 && (
          <span className={`px-2 py-0.5 text-xs font-black rounded-full select-none leading-none ${getUpcomingBadgeStyle(type)}`}>
            +{val.upcoming}
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="bg-[#111418] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-5 select-none">
      {/* 1. Title Header (without volume) */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="text-emerald-500 animate-spin" style={{ animationDuration: '6s' }} size={20} />
          <h2 className="text-xs font-black tracking-wide text-slate-200 flex items-center gap-1.5 font-dota whitespace-nowrap">
            ⚡ THE ARCH-MAGE HUD ⚡
          </h2>
        </div>
      </div>

      {/* 1b. Mode Selector */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 whitespace-nowrap">
          Mode Selector
        </label>
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/80 border border-slate-800/80 rounded-lg">
          {(['all', 'proj', 'items'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-1.5 text-xs font-bold rounded-md capitalize transition-all ${mode === m
                ? 'bg-[#15191e] text-cyan-400 shadow-sm border border-slate-800/50'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              {m === 'proj' ? 'Proj' : m}
            </button>
          ))}
        </div>
      </div>

      {/* Sub Checkboxes (Items Mode only) */}
      {mode === 'items' && (
        <div className="animate-fadeIn">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 whitespace-nowrap">
            Active Item Filters
          </label>
          <div className="flex flex-col gap-2 p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
            {(['cert', 'achv', 'item'] as const).map((key) => {
              const labelMap = { cert: 'Certifications', achv: 'Achievements', item: 'Hardware Items' };
              return (
                <label key={key} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-400 hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={subFilters[key]}
                    onChange={() => handleSubFilterToggle(key)}
                    className="w-3.5 h-3.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/20 bg-slate-900"
                  />
                  <span>{labelMap[key]}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Dashboard Statistics (Interactive/Toggleable) */}
      <div>
        <div className="flex justify-between items-center mb-2 h-5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
            HUD Statistics
          </label>
          <button
            onClick={() => setActiveStatFilter(null)}
            className={`text-[8px] text-red-500 hover:underline font-bold whitespace-nowrap transition-all duration-200 ${
              activeStatFilter ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-0 pointer-events-none scale-95'
            }`}
          >
            Clear Filter
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
          <div
            onClick={() => handleStatClick('total')}
            className={`p-2.5 rounded-lg flex flex-col items-center justify-center text-center border transition-all cursor-pointer ${activeStatFilter === 'total'
              ? 'bg-[#1e252f] border-blue-500 shadow-md ring-1 ring-blue-500/10'
              : 'bg-[#15191e] border-slate-800/80 hover:border-blue-500/30 hover:bg-blue-950/10'
              }`}
          >
            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Total Cards</span>
            {renderStatValue(stats.total, 'total')}
          </div>

          <div
            onClick={() => handleStatClick('quas')}
            className={`p-2.5 rounded-lg flex flex-col items-center justify-center text-center border transition-all cursor-pointer ${activeStatFilter === 'quas'
              ? 'bg-[#1e252f] border-cyan-500 shadow-[0_0_10px_rgba(0,208,255,0.25)] ring-1 ring-cyan-500/20'
              : 'bg-[#15191e] border-slate-800/80 hover:border-cyan-500/30 hover:bg-cyan-950/10'
              }`}
          >
            <span className="text-[10px] text-cyan-400 font-medium flex items-center gap-1 justify-center whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-pulse shrink-0" />
              {formalMode ? 'Sistem' : 'Quas (Q)'}
            </span>
            {renderStatValue(stats.quas, 'quas')}
          </div>

          <div
            onClick={() => handleStatClick('wex')}
            className={`p-2.5 rounded-lg flex flex-col items-center justify-center text-center border transition-all cursor-pointer ${activeStatFilter === 'wex'
              ? 'bg-[#1e252f] border-fuchsia-500 shadow-[0_0_10px_rgba(208,0,255,0.25)] ring-1 ring-fuchsia-500/20'
              : 'bg-[#15191e] border-slate-800/80 hover:border-fuchsia-500/30 hover:bg-fuchsia-950/10'
              }`}
          >
            <span className="text-[10px] text-fuchsia-400 font-medium flex items-center gap-1 justify-center whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 inline-block animate-pulse shrink-0" />
              {formalMode ? 'Program' : 'Wex (W)'}
            </span>
            {renderStatValue(stats.wex, 'wex')}
          </div>

          <div
            onClick={() => handleStatClick('exort')}
            className={`p-2.5 rounded-lg flex flex-col items-center justify-center text-center border transition-all cursor-pointer ${activeStatFilter === 'exort'
              ? 'bg-[#1e252f] border-orange-500 shadow-[0_0_10px_rgba(255,106,0,0.25)] ring-1 ring-orange-500/20'
              : 'bg-[#15191e] border-slate-800/80 hover:border-orange-500/30 hover:bg-orange-950/10'
              }`}
          >
            <span className="text-[10px] text-orange-400 font-medium flex items-center gap-1 justify-center whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block animate-pulse shrink-0" />
              {formalMode ? 'Media / Visual' : 'Exort (E)'}
            </span>
            {renderStatValue(stats.exort, 'exort')}
          </div>

          <div
            onClick={() => handleStatClick('gold')}
            className={`p-2.5 rounded-lg flex flex-col items-center justify-center text-center border transition-all cursor-pointer ${activeStatFilter === 'gold'
              ? 'bg-[#1e252f] border-amber-400 shadow-[0_0_10px_rgba(255,215,0,0.25)] ring-1 ring-amber-400/20'
              : 'bg-[#15191e] border-slate-800/80 hover:border-amber-400/30 hover:bg-amber-950/10'
              }`}
          >
            <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1 justify-center whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block animate-pulse shrink-0" />
              Gold (Achv)
            </span>
            {renderStatValue(stats.gold, 'gold')}
          </div>

          <div
            onClick={() => handleStatClick('grey')}
            className={`p-2.5 rounded-lg flex flex-col items-center justify-center text-center border transition-all cursor-pointer ${activeStatFilter === 'grey'
              ? 'bg-[#1e252f] border-slate-500 shadow-md ring-1 ring-slate-500/10'
              : 'bg-[#15191e] border-slate-800/80 hover:border-slate-500/30 hover:bg-slate-900/10'
              }`}
          >
            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Item</span>
            {renderStatValue(stats.grey, 'grey')}
          </div>
        </div>
      </div>

      {/* 3. Keybind Legend (Expandable) */}
      <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg">
        <button
          onClick={() => setKeybindsExpanded(!keybindsExpanded)}
          className="w-full flex items-center justify-between text-[10px] text-slate-400 font-bold focus:outline-none"
        >
          <div className="flex items-center gap-1.5">
            <HelpCircle size={14} />
            <span>Keyboard Binds</span>
          </div>
          {keybindsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {keybindsExpanded && (
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-400 font-medium mt-2 animate-fadeIn">
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span>Q: {formalMode ? 'Sistem' : 'Quas'}</span>
              <kbd className="px-1.5 bg-slate-800 rounded text-[9px]">Q</kbd>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span>W: {formalMode ? 'Program' : 'Wex'}</span>
              <kbd className="px-1.5 bg-slate-800 rounded text-[9px]">W</kbd>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span>E: {formalMode ? 'Media / Visual' : 'Exort'}</span>
              <kbd className="px-1.5 bg-slate-800 rounded text-[9px]">E</kbd>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span>R: Invoke</span>
              <kbd className="px-1.5 bg-slate-800 rounded text-[9px]">R</kbd>
            </div>
            <div className="flex justify-between col-span-2 pt-0.5">
              <span>Space: Clear Queue</span>
              <kbd className="px-1.5 bg-slate-800 rounded text-[9px]">Space</kbd>
            </div>
          </div>
        )}
      </div>

      {/* 4. Invoker - Active Orbs Queue & Buttons */}
      <div>
        <div className="flex justify-between items-center mb-2 h-5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
            Active Orbs
          </label>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
            activeCombo ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          }`}>
            Combo: {activeCombo || 'none'}
          </span>
        </div>
        <div className="flex justify-center gap-3 p-3 bg-slate-950/40 rounded-lg min-h-[64px] items-center border border-slate-800">
          {[0, 1, 2].map((idx) => {
            const orb = orbs[idx];
            return (
              <div
                key={idx}
                className={`w-11 h-11 rounded-full flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden ${orb
                  ? getOrbShadowAndBorder(orb)
                  : 'border-2 border-dashed border-slate-800 text-slate-600'
                  }`}
              >
                {orb ? (
                  <>
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${getOrbGradient(orb)} animate-spin`}
                      style={{ animationDuration: '6s' }}
                    />
                    <div className="relative z-10 flex flex-col items-center justify-center text-white select-none">
                      <span className="text-xs font-black leading-none">{orb}</span>
                      <span className={`font-medium tracking-tight mt-0.5 opacity-90 leading-none ${
                        formalMode && orb === 'E' ? 'text-[5.5px]' : 'text-[7px]'
                      }`}>
                        {getOrbLabel(orb)}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-[10px]">-</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoke & Clear Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onClear}
          className="flex-1 py-2 text-xs font-bold rounded-lg border border-slate-800 hover:bg-[#1a1f26] text-slate-400 transition-colors"
        >
          CLEAR (Space)
        </button>
        <button
          onClick={onInvoke}
          disabled={orbs.length < 3}
          className={`flex-1 py-2 text-xs font-bold rounded-lg text-white transition-all shadow-md ${orbs.length === 3
            ? 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.4)] invoke-btn-glow'
            : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-800'
            }`}
        >
          INVOKE (R)
        </button>
      </div>

      {/* Volume Slider (at the bottom) */}
      <div className="pt-3 border-t border-slate-800 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span className="whitespace-nowrap">Master Volume</span>
          <span className="text-[10px] text-slate-400 font-bold">{Math.round(volume * 100)}%</span>
        </div>
        <div className="flex items-center gap-2.5 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 hover:bg-[#1a1f26] rounded transition-colors text-slate-400"
            title="Toggle SFX"
          >
            {soundEnabled && volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={soundEnabled ? volume : 0}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVolume(val);
              if (val > 0 && !soundEnabled) {
                setSoundEnabled(true);
              }
            }}
            className="flex-1 h-1 rounded-lg appearance-none cursor-pointer accent-emerald-500 bg-slate-800"
          />
        </div>
      </div>

      {/* Theme/Mode Switcher */}
      <div className="pt-3 border-t border-slate-800 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span>HUD Mode</span>
          <span className="text-slate-400 font-bold capitalize">{formalMode ? 'Formal' : 'Dota 2'}</span>
        </div>
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 border border-slate-800/80 rounded-lg">
          <button
            onClick={() => setFormalMode(true)}
            className={`py-1.5 text-[10px] font-bold rounded capitalize transition-all ${
              formalMode
                ? 'bg-[#15191e] text-emerald-450 shadow-sm border border-slate-800/50'
                : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            Formal
          </button>
          <button
            onClick={() => setFormalMode(false)}
            className={`py-1.5 text-[10px] font-bold rounded capitalize transition-all ${
              !formalMode
                ? 'bg-[#15191e] text-cyan-400 shadow-sm border border-slate-800/50'
                : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            Dota 2
          </button>
        </div>
      </div>

      {/* HUD Statistics Mode Switcher */}
      <div className="pt-3 border-t border-slate-800 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span>HUD Stats Mode</span>
          <span className="text-slate-400 font-bold capitalize">
            {statsMode === 'combined' ? 'Done + Upcoming' : statsMode}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/80 border border-slate-800/80 rounded-lg">
          {(['done', 'upcoming', 'combined'] as const).map((sm) => (
            <button
              key={sm}
              onClick={() => setStatsMode(sm)}
              className={`py-1.5 text-[9px] font-bold rounded capitalize transition-all ${
                statsMode === sm
                  ? 'bg-[#15191e] text-emerald-450 shadow-sm border border-slate-800/50'
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              {sm === 'combined' ? 'Done + x' : sm}
            </button>
          ))}
        </div>
      </div>

      {/* Thinner Card Switcher */}
      <div className="pt-3 border-t border-slate-800 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span>Thinner Card Mode</span>
          <span className="text-slate-400 font-bold capitalize">{thinnerCard ? 'Thinner (4:1)' : 'Standard (4:3)'}</span>
        </div>
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 border border-slate-800/80 rounded-lg">
          <button
            onClick={() => setThinnerCard(false)}
            className={`py-1.5 text-[10px] font-bold rounded capitalize transition-all ${
              !thinnerCard
                ? 'bg-[#15191e] text-emerald-450 shadow-sm border border-slate-800/50'
                : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            Standard
          </button>
          <button
            onClick={() => setThinnerCard(true)}
            className={`py-1.5 text-[10px] font-bold rounded capitalize transition-all ${
              thinnerCard
                ? 'bg-[#15191e] text-cyan-400 shadow-sm border border-slate-800/50'
                : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            Thinner
          </button>
        </div>
      </div>

      {/* Node Lines Mode Switcher */}
      <div className="pt-3 border-t border-slate-800 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span>Node Lines</span>
          <span className="text-slate-400 font-bold capitalize">
            {nodeLineMode === 'focus' ? 'Focus' : nodeLineMode === 'focus-no-offset' ? 'Clean' : 'Show All'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/80 border border-slate-800/80 rounded-lg">
          <button
            onClick={() => setNodeLineMode('focus')}
            className={`py-1.5 text-[9px] font-bold rounded capitalize transition-all ${
              nodeLineMode === 'focus'
                ? 'bg-[#15191e] text-fuchsia-400 shadow-sm border border-slate-800/50'
                : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            Focus
          </button>
          <button
            onClick={() => setNodeLineMode('focus-no-offset')}
            className={`py-1.5 text-[9px] font-bold rounded capitalize transition-all ${
              nodeLineMode === 'focus-no-offset'
                ? 'bg-[#15191e] text-purple-400 shadow-sm border border-slate-800/50'
                : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            Clean
          </button>
          <button
            onClick={() => setNodeLineMode('all')}
            className={`py-1.5 text-[9px] font-bold rounded capitalize transition-all ${
              nodeLineMode === 'all'
                ? 'bg-[#15191e] text-cyan-400 shadow-sm border border-slate-800/50'
                : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            Show All
          </button>
        </div>
      </div>

      {/* Read View Toggle */}
      <div className="pt-3 border-t border-slate-800 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span>Read View</span>
          <span className="text-slate-400 font-bold capitalize">{readViewMode === 'split' ? 'Split' : 'Popup'}</span>
        </div>
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 border border-slate-800/80 rounded-lg">
          <button
            onClick={() => setReadViewMode('popup')}
            className={`py-1.5 text-[10px] font-bold rounded capitalize transition-all ${
              readViewMode === 'popup'
                ? 'bg-[#15191e] text-emerald-400 shadow-sm border border-slate-800/50'
                : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            Popup
          </button>
          <button
            onClick={() => setReadViewMode('split')}
            className={`py-1.5 text-[10px] font-bold rounded capitalize transition-all ${
              readViewMode === 'split'
                ? 'bg-[#15191e] text-purple-400 shadow-sm border border-slate-800/50'
                : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            Split
          </button>
        </div>
      </div>

      {/* Click to Edit Toggle */}
      <div className="pt-3 border-t border-slate-800 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span>Click on Card</span>
          <span className="text-slate-400 font-bold capitalize">{clickToEdit ? 'Direct Edit' : 'Read View'}</span>
        </div>
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 border border-slate-800/80 rounded-lg">
          <button
            onClick={() => setClickToEdit(false)}
            className={`py-1.5 text-[10px] font-bold rounded capitalize transition-all ${
              !clickToEdit
                ? 'bg-[#15191e] text-emerald-400 shadow-sm border border-slate-800/50'
                : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            Read View
          </button>
          <button
            onClick={() => setClickToEdit(true)}
            className={`py-1.5 text-[10px] font-bold rounded capitalize transition-all ${
              clickToEdit
                ? 'bg-[#15191e] text-amber-500 shadow-sm border border-slate-800/50'
                : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            Direct Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvokerHUD;
