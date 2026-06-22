import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Github, Folder, Info, Eye, Linkedin, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Copy } from 'lucide-react';
import { PortfolioEntry, OrbType, DashboardStats } from './types';
import SearchBar from './components/SearchBar';
import InvokerHUD from './components/InvokerHUD';
import Timeline from './components/Timeline';
import AddInstanceModal from './components/AddInstanceModal';
import ProjectCard from './components/ProjectCard';
import CertCard from './components/CertCard';
import ItemCard from './components/ItemCard';
import AchievementCard from './components/AchievementCard';
import sfx from './lib/sfx';

const getDependencyColor = (dep: PortfolioEntry) => {
  if (dep.source === 'achv') return '#fbbf24'; // Gold
  if (dep.source === 'item') return '#64748b'; // Slate
  const skill = (dep.skill || '').toLowerCase();
  if (skill.includes('q')) return '#06b6d4'; // Cyan
  if (skill.includes('w')) return '#d946ef'; // Fuchsia
  if (skill.includes('e')) return '#f97316'; // Orange
  return '#64748b'; // Default Slate
};

export const App: React.FC = () => {
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>(() => {
    return (localStorage.getItem('sidebarPosition') as 'left' | 'right') || 'left';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [mode, setMode] = useState<'all' | 'proj' | 'items'>(() => {
    return (localStorage.getItem('mode') as 'all' | 'proj' | 'items') || 'all';
  });
  const [subFilters, setSubFilters] = useState<{ cert: boolean; achv: boolean; item: boolean }>(() => {
    try {
      const saved = localStorage.getItem('subFilters');
      return saved ? JSON.parse(saved) : { cert: true, achv: true, item: true };
    } catch (e) {
      return { cert: true, achv: true, item: true };
    }
  });
  const [orbs, setOrbs] = useState<OrbType[]>(() => {
    try {
      const saved = localStorage.getItem('orbs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [activeCombo, setActiveCombo] = useState(() => {
    return localStorage.getItem('activeCombo') || '';
  });
  const [selectedEntry, setSelectedEntry] = useState<PortfolioEntry | null>(null);
  const [hoveredDepId, setHoveredDepId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('soundEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('volume');
    return saved !== null ? parseFloat(saved) : 0.5;
  });
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(() => {
    return localStorage.getItem('activeStatFilter') || null;
  });
  const [formalMode, setFormalMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('formalMode');
    return saved !== null ? saved === 'true' : true;
  });
  const [thinnerCard, setThinnerCard] = useState<boolean>(() => {
    return localStorage.getItem('thinnerCard') === 'true';
  });
  const [isAddPopupOpen, setIsAddPopupOpen] = useState<boolean>(() => {
    return localStorage.getItem('isAddPopupOpen') === 'true';
  });
  const [editEntry, setEditEntry] = useState<PortfolioEntry | null>(null);
  const [isDreamingOpen, setIsDreamingOpen] = useState(false);
  const [checkedCards, setCheckedCards] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('checkedCards');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [statsMode, setStatsMode] = useState<'done' | 'upcoming' | 'combined'>(() => {
    const saved = localStorage.getItem('statsMode');
    if (saved === 'current') return 'done';
    return (saved as 'done' | 'upcoming' | 'combined') || 'combined';
  });
  const [nodeLineMode, setNodeLineMode] = useState<'focus' | 'focus-no-offset' | 'all'>(() => {
    return (localStorage.getItem('nodeLineMode') as 'focus' | 'focus-no-offset' | 'all') || 'all';
  });
  const [readViewMode, setReadViewMode] = useState<'popup' | 'split'>(() => {
    return (localStorage.getItem('readViewMode') as 'popup' | 'split') || 'popup';
  });
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [clickToEdit, setClickToEdit] = useState<boolean>(() => {
    return localStorage.getItem('clickToEdit') === 'true';
  });
  const [isEditingInline, setIsEditingInline] = useState<boolean>(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  const toggleCardChecked = (cardId: string) => {
    const entry = entries.find(e => e.id === cardId);
    const title = entry ? entry.title : 'this instance';
    const isCurrentlyChecked = checkedCards[cardId] !== undefined ? checkedCards[cardId] : (entry?.done || false);
    
    const message = isCurrentlyChecked
      ? `Are you sure you want to mark "${title}" as incomplete?`
      : `Are you sure you want to mark "${title}" as done?`;
      
    setConfirmModal({
      isOpen: true,
      message,
      onConfirm: async () => {
        if (soundEnabled) sfx.playTick();
        const nextState = !isCurrentlyChecked;

        // Optimistically update frontend local state
        setCheckedCards(prev => ({
          ...prev,
          [cardId]: nextState,
        }));

        try {
          const res = await fetch('/api/entries/toggle-done', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: cardId, done: nextState }),
          });
          const result = await res.json();
          if (!res.ok) {
            alert(`Error: ${result.error || 'Failed to update status on server'}`);
            // Rollback optimistic update
            setCheckedCards(prev => ({
              ...prev,
              [cardId]: isCurrentlyChecked,
            }));
          }
        } catch (err) {
          alert(`Network error: ${err}`);
          // Rollback optimistic update
          setCheckedCards(prev => ({
            ...prev,
            [cardId]: isCurrentlyChecked,
          }));
        }
      }
    });
  };

  const handleDuplicateEntry = async (cardId: string) => {
    try {
      if (soundEnabled) sfx.playTick();
      const res = await fetch('/api/entries/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: cardId }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(`Error: ${result.error || 'Failed to duplicate instance'}`);
      } else {
        // Close modal/edit panels on success
        setIsEditingInline(false);
        setIsAddPopupOpen(false);
        setEditEntry(null);
      }
    } catch (err) {
      alert(`Network error: ${err}`);
    }
  };

  // Save settings and preferences to localStorage on change
  useEffect(() => {
    localStorage.setItem('sidebarPosition', sidebarPosition);
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
    localStorage.setItem('mode', mode);
    localStorage.setItem('subFilters', JSON.stringify(subFilters));
    localStorage.setItem('orbs', JSON.stringify(orbs));
    localStorage.setItem('activeCombo', activeCombo);
    localStorage.setItem('soundEnabled', String(soundEnabled));
    localStorage.setItem('volume', String(volume));
    localStorage.setItem('formalMode', String(formalMode));
    localStorage.setItem('thinnerCard', String(thinnerCard));
    localStorage.setItem('isAddPopupOpen', String(isAddPopupOpen));
    localStorage.setItem('checkedCards', JSON.stringify(checkedCards));
    localStorage.setItem('statsMode', statsMode);
    localStorage.setItem('clickToEdit', String(clickToEdit));
    if (activeStatFilter === null) {
      localStorage.removeItem('activeStatFilter');
    } else {
      localStorage.setItem('activeStatFilter', activeStatFilter);
    }
  }, [sidebarPosition, sidebarCollapsed, mode, subFilters, orbs, activeCombo, soundEnabled, volume, activeStatFilter, formalMode, thinnerCard, isAddPopupOpen, checkedCards, statsMode, clickToEdit]);

  // Initial fetch and WebSocket listener
  useEffect(() => {
    // Initial fetch
    fetch('/api/entries')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEntries(data);
        }
      })
      .catch(err => console.error('Failed to fetch initial entries:', err));

    // Connect to WebSocket with auto-reconnect
    let ws: WebSocket | null = null;
    let timer: number;

    const connectWS = () => {
      const isHttps = window.location.protocol === 'https:';
      const wsProto = isHttps ? 'wss:' : 'ws:';
      const wsUrl = `${wsProto}//${window.location.host}/ws`;
      
      console.log(`[WS] Connecting to ${wsUrl}`);
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === 'dashboard_update' && Array.isArray(payload.data)) {
            console.log('[WS] Received update with', payload.data.length, 'entries');
            setEntries(payload.data);
          }
        } catch (err) {
          console.error('[WS] Error processing message:', err);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Connection closed, retrying in 3 seconds...');
        timer = window.setTimeout(connectWS, 3000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      clearTimeout(timer);
    };
  }, []);

  // Keyboard Event Listener for Orbs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if typing in search bar or input elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      if (key === 'Q') {
        e.preventDefault();
        addOrb('Q');
      } else if (key === 'W') {
        e.preventDefault();
        addOrb('W');
      } else if (key === 'E') {
        e.preventDefault();
        addOrb('E');
      } else if (key === 'R') {
        e.preventDefault();
        invokeCombo();
      } else if (e.key === ' ') {
        e.preventDefault();
        clearOrbs();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orbs, soundEnabled]); // dependency on orbs and soundEnabled to have latest states in handler

  const addOrb = (orb: OrbType) => {
    if (soundEnabled) {
      if (orb === 'Q') sfx.playQuas();
      else if (orb === 'W') sfx.playWex();
      else if (orb === 'E') sfx.playExort();
    }
    setOrbs(prev => {
      const next = [...prev, orb];
      if (next.length > 3) {
        next.shift();
      }
      return next;
    });
  };

  const clearOrbs = () => {
    if (soundEnabled) sfx.playTick();
    setOrbs([]);
    setActiveCombo('');
  };

  const invokeCombo = () => {
    if (orbs.length < 3) return;
    if (soundEnabled) sfx.playInvoke();
    
    // Create sorted lower-case combination key (e.g. qqw, qwe)
    const combo = orbs.map(o => o.toLowerCase()).sort().join('');
    setActiveCombo(combo);
  };

  // Sync external sfx state and volume
  useEffect(() => {
    sfx.toggle(soundEnabled);
    sfx.setVolume(volume);
  }, [soundEnabled, volume]);

  const handleOpenFolder = async (folderPath: string) => {
    if (soundEnabled) sfx.playTick();
    try {
      const res = await fetch('/api/open-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderPath }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(`Error: ${result.error || 'Failed to open directory'}`);
      }
    } catch (err) {
      alert(`Connection failed: ${err}`);
    }
  };

  // Filter entries except for the interactive stat filter (to compute stats)
  const getEntriesForStats = () => {
    return entries.filter(entry => {
      // 1. Filter by category Mode
      if (mode === 'proj' && entry.source !== 'proj') {
        return false;
      }
      if (mode === 'items') {
        const matchesSub = 
          (entry.source === 'cert' && subFilters.cert) ||
          (entry.source === 'achv' && subFilters.achv) ||
          (entry.source === 'item' && subFilters.item);
        if (!matchesSub) return false;
      }

      // 2. Filter by Invoked Combo
      if (activeCombo) {
        const sortedEntrySkill = (entry.skill || '').split('').sort().join('');
        const sortedActiveCombo = activeCombo.split('').sort().join('');
        if (sortedEntrySkill !== sortedActiveCombo) {
          return false;
        }
      }

      // 3. Filter by Regex search query
      if (searchQuery.trim() !== '') {
        try {
          const regex = new RegExp(searchQuery, 'i');
          const titleMatch = regex.test(entry.title);
          const bodyMatch = regex.test(entry.body);
          const sourceMatch = regex.test(entry.source);
          const skillMatch = regex.test(entry.skill || '');
          if (!titleMatch && !bodyMatch && !sourceMatch && !skillMatch) {
            return false;
          }
        } catch (e) {
          // If regex fails to compile, ignore filtering or show nothing
        }
      }

      return true;
    });
  };

  const entriesForStats = getEntriesForStats();

  // Filter entries incorporating the interactive stat card override
  const getFilteredEntries = () => {
    return entriesForStats.filter(entry => {
      if (activeStatFilter) {
        const skillStr = entry.skill?.toLowerCase() || '';
        if (activeStatFilter === 'quas' && !skillStr.includes('q')) return false;
        if (activeStatFilter === 'wex' && !skillStr.includes('w')) return false;
        if (activeStatFilter === 'exort' && !skillStr.includes('e')) return false;
        if (activeStatFilter === 'gold' && entry.source !== 'achv') return false;
        if (activeStatFilter === 'grey' && entry.skill) return false;
      }
      return true;
    });
  };

  const filteredEntries = getFilteredEntries();

  const upcomingEntries = (() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const maxDate = new Date();
    maxDate.setFullYear(year + 5);
    const maxYear = maxDate.getFullYear();
    const maxMonth = String(maxDate.getMonth() + 1).padStart(2, '0');
    const maxDay = String(maxDate.getDate()).padStart(2, '0');
    const maxDateStr = `${maxYear}-${maxMonth}-${maxDay}`;

    return entries.filter((entry) => {
      if (!entry.datestart) return false;
      return entry.datestart >= todayStr && entry.datestart <= maxDateStr;
    }).sort((a, b) => a.datestart.localeCompare(b.datestart));
  })();

  // Compute stats on the items before applying the specific stat override
  const stats: DashboardStats = (() => {
    let quasDone = 0;
    let quasUpcoming = 0;
    let wexDone = 0;
    let wexUpcoming = 0;
    let exortDone = 0;
    let exortUpcoming = 0;
    let goldDone = 0;
    let goldUpcoming = 0;
    let greyDone = 0;
    let greyUpcoming = 0;
    let totalDone = 0;
    let totalUpcoming = 0;

    entriesForStats.forEach(item => {
      const isChecked = checkedCards[item.id] !== undefined ? checkedCards[item.id] : (item.done || false);
      if (isChecked) {
        totalDone++;
      } else {
        totalUpcoming++;
      }

      if (item.source === 'achv') {
        if (isChecked) goldDone++;
        else goldUpcoming++;
      }
      if (!item.skill) {
        if (isChecked) greyDone++;
        else greyUpcoming++;
      } else {
        const s = item.skill.toLowerCase();
        if (s.includes('q')) {
          if (isChecked) quasDone++;
          else quasUpcoming++;
        }
        if (s.includes('w')) {
          if (isChecked) wexDone++;
          else wexUpcoming++;
        }
        if (s.includes('e')) {
          if (isChecked) exortDone++;
          else exortUpcoming++;
        }
      }
    });

    return {
      total: { done: totalDone, upcoming: totalUpcoming },
      quas: { done: quasDone, upcoming: quasUpcoming },
      wex: { done: wexDone, upcoming: wexUpcoming },
      exort: { done: exortDone, upcoming: exortUpcoming },
      gold: { done: goldDone, upcoming: goldUpcoming },
      grey: { done: greyDone, upcoming: greyUpcoming },
    };
  })();

  const getComboDisplayName = (combo: string) => {
    if (!combo) return '';
    if (!formalMode) return `Combo ${combo.toUpperCase()}`;
    const names = combo.toLowerCase().split('').map(char => {
      if (char === 'q') return 'Sistem';
      if (char === 'w') return 'Program';
      if (char === 'e') return 'Media / Visual';
      return char;
    });
    return `Combo ${names.join(' + ')}`;
  };

  const navigateToEntry = (entry: PortfolioEntry | null, actionType: 'click' | 'prev-next' | 'history' = 'click') => {
    if (soundEnabled) {
      sfx.playTick();
    }

    const wasEditing = !!editEntry;

    if (entry === null) {
      setIsEditingInline(false);
      setEditEntry(null);
      setSelectedEntry(null);
      return;
    }

    setSelectedEntry(entry);
    if (wasEditing) {
      setEditEntry(entry);
      if (readViewMode === 'split') {
        setIsEditingInline(true);
      }
    } else {
      setIsEditingInline(false);
    }

    if (actionType === 'history') {
      return;
    }

    // Add to history stack
    const nextHistory = history.slice(0, historyIndex + 1);
    // Avoid duplicate adjacent entries
    if (nextHistory[nextHistory.length - 1] !== entry.id) {
      nextHistory.push(entry.id);
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    }
  };

  const handleHistoryBack = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const prevId = history[prevIdx];
      const prevEntry = entries.find(e => e.id === prevId);
      if (prevEntry) {
        setHistoryIndex(prevIdx);
        navigateToEntry(prevEntry, 'history');
      }
    }
  };

  const handleHistoryForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const nextId = history[nextIdx];
      const nextEntry = entries.find(e => e.id === nextId);
      if (nextEntry) {
        setHistoryIndex(nextIdx);
        navigateToEntry(nextEntry, 'history');
      }
    }
  };

  const handleMoreClick = (entry: PortfolioEntry) => {
    if (clickToEdit) {
      if (soundEnabled) sfx.playTick();
      setEditEntry(entry);
      if (readViewMode === 'split') {
        setSelectedEntry(entry);
        setIsEditingInline(true);
      } else {
        setIsAddPopupOpen(true);
      }
    } else {
      setIsEditingInline(false);
      navigateToEntry(entry, 'click');
    }
  };

  const handleCloseModal = () => {
    setIsEditingInline(false);
    setEditEntry(null);
    navigateToEntry(null);
  };

  const openAddModal = () => {
    setEditEntry(null);
    setIsEditingInline(false);
    setIsAddPopupOpen(true);
  };

  return (
    <div className="h-screen max-h-screen font-dota flex flex-col transition-colors duration-200 overflow-hidden bg-[#0b0d10]">
      {/* Floating Expand HUD Button when Sidebar is Collapsed */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className={`fixed top-6 z-40 p-3 rounded-full bg-[#111418] border border-slate-800 hover:border-emerald-500/50 text-emerald-500 hover:text-emerald-400 transition-all shadow-lg hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] ${
            sidebarPosition === 'right' ? 'right-6' : 'left-6'
          }`}
          title="Expand Invoker HUD & Search"
        >
          <Eye size={22} />
        </button>
      )}

      {/* Main Content Layout - Full-screen layout */}
      <main className={`flex-1 min-h-0 w-full px-6 py-6 flex flex-col lg:flex-row gap-8 items-stretch ${
        sidebarPosition === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'
      }`}>
        {/* Interactive HUD Sidebar (exactly 240px width, left/right toggleable & collapsible) */}
        {!sidebarCollapsed && (
          <aside className="w-full lg:w-[240px] lg:min-w-[240px] lg:max-w-[240px] shrink-0 flex flex-col gap-5 h-full overflow-y-auto pr-1 scrollbar-thin">
            {/* Logo Header */}
            <div className="flex items-center gap-3 pb-2 border-b border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-purple-500 to-orange-500 flex items-center justify-center shadow-lg text-white font-black text-lg select-none">
                🔮
              </div>
              <div>
                <h1 className="text-sm font-black tracking-wide text-slate-100 font-dota whitespace-nowrap">
                  INVOKER PORTFOLIO
                </h1>
                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                  The Arch-Mage Dev Archives
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sidebarPosition={sidebarPosition}
              setSidebarPosition={setSidebarPosition}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
              onAddClick={openAddModal}
            />

            {/* Interactive HUD */}
              <InvokerHUD
               mode={mode}
               setMode={setMode}
               subFilters={subFilters}
               setSubFilters={setSubFilters}
               orbs={orbs}
               onClear={clearOrbs}
               onInvoke={invokeCombo}
               activeCombo={activeCombo}
               stats={stats}
               soundEnabled={soundEnabled}
               setSoundEnabled={setSoundEnabled}
               volume={volume}
               setVolume={setVolume}
               activeStatFilter={activeStatFilter}
               setActiveStatFilter={setActiveStatFilter}
               formalMode={formalMode}
               setFormalMode={setFormalMode}
               thinnerCard={thinnerCard}
               setThinnerCard={setThinnerCard}
               statsMode={statsMode}
               setStatsMode={setStatsMode}
               nodeLineMode={nodeLineMode}
               setNodeLineMode={(m) => { setNodeLineMode(m); localStorage.setItem('nodeLineMode', m); }}
               readViewMode={readViewMode}
               setReadViewMode={(m) => { setReadViewMode(m); localStorage.setItem('readViewMode', m); }}
               clickToEdit={clickToEdit}
               setClickToEdit={setClickToEdit}
             />
          </aside>
        )}

        {/* Right Side: Timeline Display (Fills the remaining main area) */}
        <section className="flex-1 min-w-0 h-full flex flex-col min-h-0">
          <div className="bg-[#0b0d10]/95 border-b border-slate-900/60 py-4 mb-4 flex items-center justify-between gap-4 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-black dark:text-slate-400 text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span>{isDreamingOpen && readViewMode === 'split' ? 'Dreaming Oracle: 5 Years Soon' : 'Archives Timeline Feed'}</span>
                {activeCombo && !isDreamingOpen && (
                  <span className="normal-case text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
                    Active Filter: {getComboDisplayName(activeCombo)}
                  </span>
                )}
              </h2>
              <span className="text-xs text-slate-500 font-semibold bg-slate-950 px-2 py-1 rounded border border-slate-800/80">
                Showing {isDreamingOpen && readViewMode === 'split' ? upcomingEntries.length : filteredEntries.length} entries
              </span>
            </div>
            
            {isDreamingOpen && readViewMode === 'split' ? (
              <button
                onClick={() => {
                  if (soundEnabled) sfx.playTick();
                  setIsDreamingOpen(false);
                }}
                className="px-4 py-2 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-200 hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm font-dota uppercase tracking-wider shrink-0"
              >
                Close Vision
              </button>
            ) : (
              <button
                onClick={() => {
                  if (soundEnabled) sfx.playInvoke();
                  setIsDreamingOpen(true);
                }}
                className="relative overflow-hidden px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-950/75 to-teal-950/75 hover:from-emerald-900 hover:to-teal-900 border border-emerald-500/30 text-emerald-250 hover:text-white transition-all text-xs font-black tracking-wider uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] group shrink-0"
              >
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)]" />
                <span className="relative z-10 flex items-center gap-1.5 font-dota">
                  🔮 Dreaming (5 Years Soon)
                </span>
              </button>
            )}
          </div>

          {/* Split view: timeline + detail panel side by side */}
          <div className="flex gap-4 min-h-0 flex-1 items-stretch">
            {/* Timeline (shrinks when split panel is open) */}
            <div className={`transition-all duration-300 min-w-0 h-full overflow-y-auto pr-1 scrollbar-thin ${readViewMode === 'split' && selectedEntry ? 'w-1/2 flex-1' : 'flex-1'}`}>
              {isDreamingOpen && readViewMode === 'split' && upcomingEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-emerald-900/30 rounded-xl bg-emerald-950/5 backdrop-blur-sm h-64 select-none">
                  <span className="text-3xl mb-3">🔮</span>
                  <p className="text-sm text-emerald-300 font-semibold font-dota">
                    No future timeline entries in the next 5 years.
                  </p>
                  <p className="text-xs text-emerald-400/50 mt-1 max-w-xs font-sans">
                    Click below to add a project or certification with a future start date.
                  </p>
                  <button
                    onClick={() => {
                      if (soundEnabled) sfx.playTick();
                      openAddModal();
                    }}
                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 hover:border-emerald-500/50 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                  >
                    + Add Upcoming Dream
                  </button>
                </div>
              ) : (
                <Timeline
                  entries={isDreamingOpen && readViewMode === 'split' ? upcomingEntries : filteredEntries}
                  onOpenFolder={handleOpenFolder}
                  onMore={handleMoreClick}
                  thinnerCard={readViewMode === 'split' && !!selectedEntry ? true : thinnerCard}
                  checkedCards={checkedCards}
                  onToggleChecked={toggleCardChecked}
                  nodeLineMode={nodeLineMode}
                  isSplitView={readViewMode === 'split' && !!selectedEntry}
                />
              )}
            </div>

            {/* Split view detail panel */}
            {readViewMode === 'split' && selectedEntry && (
              isEditingInline ? (
                <div className="w-1/2 flex-1 min-w-0 h-full flex flex-col min-h-0 animate-fadeIn">
                  <AddInstanceModal
                    isOpen={true}
                    onClose={() => {
                      setIsEditingInline(false);
                      setEditEntry(null);
                    }}
                    formalMode={formalMode}
                    editEntry={editEntry}
                    entries={entries}
                    isInline={true}
                    history={history}
                    historyIndex={historyIndex}
                    onHistoryBack={handleHistoryBack}
                    onHistoryForward={handleHistoryForward}
                    filteredEntries={filteredEntries}
                    onNavigateToEntry={(entry) => navigateToEntry(entry, 'prev-next')}
                    onDuplicate={handleDuplicateEntry}
                  />
                </div>
              ) : (() => {
                const currentIdx = filteredEntries.findIndex(e => e.id === selectedEntry.id);
                const hasPrev = currentIdx > 0;
                const hasNext = currentIdx < filteredEntries.length - 1;
                const depIds = selectedEntry.dependencies || [];
                const validDeps = depIds.map(id => entries.find(e => e.id === id)).filter((e): e is PortfolioEntry => !!e);
                return (
                  <div className="w-1/2 flex-1 min-w-0 h-full flex flex-col min-h-0">
                    <div className="bg-[#12161b] border border-slate-800 rounded-xl flex flex-col shadow-2xl overflow-hidden h-full">
                      {/* Split Panel Header */}
                      <div className="p-4 border-b border-slate-800 bg-[#15191e] flex items-start justify-between gap-3 shrink-0">
                        <div className="min-w-0">
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wider mr-2">
                            {selectedEntry.source}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">
                            {selectedEntry.datestart} {selectedEntry.dateend ? `→ ${selectedEntry.dateend}` : '→ Present'}
                          </span>
                          <h2 className="text-base font-black text-slate-100 mt-1 truncate">{selectedEntry.title}</h2>
                        </div>
                        <button
                          onClick={handleCloseModal}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors shrink-0"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Nav Bar with Explorer Back/Forward and Page Prev/Next */}
                      <div className="px-4 py-2 border-b border-slate-800/60 bg-[#13171c] flex items-center justify-between gap-2 shrink-0">
                        {/* Left: File Explorer Back/Forward History */}
                        <div className="flex items-center gap-1">
                          <button
                            disabled={historyIndex <= 0}
                            onClick={handleHistoryBack}
                            className={`p-1.5 rounded transition-all duration-200 border border-transparent ${
                              historyIndex > 0
                                ? 'text-slate-350 hover:text-emerald-450 hover:bg-slate-800 hover:border-slate-700'
                                : 'text-slate-700 cursor-not-allowed'
                            }`}
                            title="Go Back (History)"
                          >
                            <ArrowLeft size={14} />
                          </button>
                          <button
                            disabled={historyIndex >= history.length - 1}
                            onClick={handleHistoryForward}
                            className={`p-1.5 rounded transition-all duration-200 border border-transparent ${
                              historyIndex < history.length - 1
                                ? 'text-slate-350 hover:text-emerald-450 hover:bg-slate-800 hover:border-slate-700'
                                : 'text-slate-700 cursor-not-allowed'
                            }`}
                            title="Go Forward (History)"
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>

                        {/* Right: Sequential Timeline Page Prev/Next */}
                        <div className="flex items-center gap-2">
                          <button
                            disabled={!hasPrev}
                            onClick={() => { if (hasPrev) navigateToEntry(filteredEntries[currentIdx - 1], 'prev-next'); }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-bold transition-colors ${hasPrev ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 cursor-not-allowed'}`}
                            title="Previous Item in Timeline"
                          >
                            <ChevronLeft size={14} />
                            Prev
                          </button>
                          <span className="text-[10px] text-slate-500 font-semibold tabular-nums select-none bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                            {currentIdx >= 0 ? `${currentIdx + 1} / ${filteredEntries.length}` : '- / -'}
                          </span>
                          <button
                            disabled={!hasNext}
                            onClick={() => { if (hasNext) navigateToEntry(filteredEntries[currentIdx + 1], 'prev-next'); }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-bold transition-colors ${hasNext ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 cursor-not-allowed'}`}
                            title="Next Item in Timeline"
                          >
                            Next
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="flex-1 overflow-y-auto p-5 prose prose-invert max-w-none text-slate-300 text-sm">
                        {validDeps.length > 0 && (
                          <div className="mb-5 p-3 rounded-xl border border-slate-800 bg-[#0d1013]/60 relative select-none">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                              <span>Connection Network</span>
                              <span className="text-[9px] text-slate-600 font-medium normal-case">Hover • Click to navigate</span>
                            </div>
                            <div className="relative w-full" style={{ height: `${Math.max(80, validDeps.length * 32 + 32)}px` }}>
                              <svg className="w-full h-full" viewBox={`0 0 500 ${Math.max(80, validDeps.length * 32 + 32)}`} preserveAspectRatio="xMidYMid meet">
                                {validDeps.map((dep, idx) => {
                                  const N = validDeps.length; const svgH = Math.max(80, N * 32 + 32);
                                  const yS = N === 1 ? svgH / 2 : 24 + idx * ((svgH - 48) / Math.max(N - 1, 1));
                                  const yE = svgH / 2; const dx2 = (370 - 50) / 2;
                                  const isH = hoveredDepId === dep.id;
                                  const c = getDependencyColor(dep);
                                  return <path key={dep.id} d={`M 50 ${yS} C ${50 + dx2} ${yS}, ${370 - dx2} ${yE}, 370 ${yE}`} fill="none" stroke={isH ? c : 'rgba(148,163,184,0.18)'} strokeWidth={isH ? 2.5 : 1.2} className="transition-all duration-200" />;
                                })}
                                {validDeps.map((dep, idx) => {
                                  const N = validDeps.length; const svgH = Math.max(80, N * 32 + 32);
                                  const y = N === 1 ? svgH / 2 : 24 + idx * ((svgH - 48) / Math.max(N - 1, 1));
                                  const isH = hoveredDepId === dep.id;
                                  const c = getDependencyColor(dep);
                                  const lbl = dep.title.length > 20 ? dep.title.slice(0, 19) + '…' : dep.title;
                                  return (
                                    <g key={dep.id} className="cursor-pointer" onMouseEnter={() => setHoveredDepId(dep.id)} onMouseLeave={() => setHoveredDepId(null)} onClick={() => navigateToEntry(dep, 'click')}>
                                      <circle cx={50} cy={y} r={isH ? 12 : 0} fill={c} opacity={0.25} className="transition-all duration-200" />
                                      <circle cx={50} cy={y} r={7} fill={c} stroke={isH ? '#fff' : 'rgba(0,0,0,0.5)'} strokeWidth={1.5} className="transition-all duration-200" />
                                      <text x={64} y={y + 4} fontSize={9} fill={isH ? '#e2e8f0' : '#64748b'} fontFamily="ui-monospace,monospace" fontWeight={isH ? 700 : 500} className="pointer-events-none select-none">{lbl}</text>
                                    </g>
                                  );
                                })}
                                {(() => {
                                  const N = validDeps.length; const svgH = Math.max(80, N * 32 + 32);
                                  const y = svgH / 2; const c = getDependencyColor(selectedEntry);
                                  const lbl = selectedEntry.title.length > 12 ? selectedEntry.title.slice(0, 11) + '…' : selectedEntry.title;
                                  return (
                                    <g>
                                      <circle cx={370} cy={y} r={16} fill={c} opacity={0.15} />
                                      <circle cx={370} cy={y} r={10} fill={c} stroke="rgba(0,0,0,0.6)" strokeWidth={2} />
                                      <circle cx={370} cy={y} r={3} fill="#fff" />
                                      <text x={386} y={y + 4} fontSize={9} fill="#cbd5e1" fontFamily="ui-monospace,monospace" fontWeight={700} className="pointer-events-none select-none">{lbl}</text>
                                    </g>
                                  );
                                })()}
                              </svg>
                            </div>
                          </div>
                        )}

                        {selectedEntry.imgPath && (
                          selectedEntry.imgPath.toLowerCase().endsWith('.pdf') ? (
                            <div className="w-full h-[300px] rounded-lg overflow-hidden border border-slate-800 bg-slate-950 mb-4">
                              <iframe src={`${selectedEntry.imgPath}#toolbar=0`} className="w-full h-full border-none" title={selectedEntry.title} />
                            </div>
                          ) : (
                            <div className="w-full h-36 rounded-lg overflow-hidden border border-slate-800 mb-4 bg-slate-900/50">
                              <img src={selectedEntry.imgPath} alt={selectedEntry.title} className="w-full h-full object-cover" />
                            </div>
                          )
                        )}

                        {selectedEntry.body ? (
                          <ReactMarkdown className="markdown-content space-y-3 text-sm">{selectedEntry.body}</ReactMarkdown>
                        ) : (
                          <p className="text-xs italic text-slate-400 flex items-center gap-1"><Info size={14} /><span>No archive description provided.</span></p>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="p-3 border-t border-slate-800 flex flex-wrap justify-end gap-2 bg-[#15191e] shrink-0">
                        <button onClick={() => handleOpenFolder(selectedEntry.folderPath)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold transition-colors">
                          <Folder size={12} /><span>Folder</span>
                        </button>
                        {selectedEntry.github && (
                          <a href={selectedEntry.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold transition-colors border border-transparent">
                            <Github size={12} /><span>GitHub</span>
                          </a>
                        )}
                        <button onClick={() => handleDuplicateEntry(selectedEntry.id)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition-colors shadow-sm">
                          <Copy size={12} /><span>Duplicate</span>
                        </button>
                        <button onClick={() => { setEditEntry(selectedEntry); setIsEditingInline(true); }} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold transition-colors">Edit</button>
                        <button onClick={handleCloseModal} className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[11px] font-bold transition-colors text-slate-400">Close</button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </section>
      </main>

      {/* Details Markdown Modal (Popup mode only) */}
      {selectedEntry && readViewMode === 'popup' && (() => {
        const currentIdx = filteredEntries.findIndex(e => e.id === selectedEntry.id);
        const hasPrev = currentIdx > 0;
        const hasNext = currentIdx < filteredEntries.length - 1;
        return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#12161b] border-2 border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#15191e]">
              <div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wider mr-2">
                  {selectedEntry.source}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  {selectedEntry.datestart} {selectedEntry.dateend ? `→ ${selectedEntry.dateend}` : '→ Present'}
                </span>
                <h2 className="text-lg font-black text-slate-100 mt-1">
                  {selectedEntry.title}
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav Bar with Explorer Back/Forward and Page Prev/Next */}
            <div className="px-4 py-2 border-b border-slate-800/60 bg-[#13171c] flex items-center justify-between gap-2 shrink-0">
              {/* Left: File Explorer Back/Forward History */}
              <div className="flex items-center gap-1">
                <button
                  disabled={historyIndex <= 0}
                  onClick={handleHistoryBack}
                  className={`p-1.5 rounded transition-all duration-200 border border-transparent ${
                    historyIndex > 0
                      ? 'text-slate-350 hover:text-emerald-450 hover:bg-slate-800 hover:border-slate-700'
                      : 'text-slate-700 cursor-not-allowed'
                  }`}
                  title="Go Back (History)"
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  disabled={historyIndex >= history.length - 1}
                  onClick={handleHistoryForward}
                  className={`p-1.5 rounded transition-all duration-200 border border-transparent ${
                    historyIndex < history.length - 1
                      ? 'text-slate-350 hover:text-emerald-450 hover:bg-slate-800 hover:border-slate-700'
                      : 'text-slate-700 cursor-not-allowed'
                  }`}
                  title="Go Forward (History)"
                >
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Right: Sequential Timeline Page Prev/Next */}
              <div className="flex items-center gap-2">
                <button
                  disabled={!hasPrev}
                  onClick={() => { if (hasPrev) navigateToEntry(filteredEntries[currentIdx - 1], 'prev-next'); }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-bold transition-colors ${hasPrev ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 cursor-not-allowed'}`}
                  title="Previous Item in Timeline"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>
                <span className="text-[10px] text-slate-500 font-semibold tabular-nums select-none bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                  {currentIdx >= 0 ? `${currentIdx + 1} / ${filteredEntries.length}` : '- / -'}
                </span>
                <button
                  disabled={!hasNext}
                  onClick={() => { if (hasNext) navigateToEntry(filteredEntries[currentIdx + 1], 'prev-next'); }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-bold transition-colors ${hasNext ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 cursor-not-allowed'}`}
                  title="Next Item in Timeline"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Modal Body / Markdown Content */}
            <div className="flex-1 overflow-y-auto p-6 prose prose-invert max-w-none text-slate-300">
              {(() => {
                const depIds = selectedEntry.dependencies || [];
                const validDeps = depIds
                  .map(id => entries.find(e => e.id === id))
                  .filter((e): e is PortfolioEntry => !!e);

                if (validDeps.length === 0) return null;

                return (
                  <div className="mb-6 p-4 rounded-xl border border-slate-800 bg-[#0d1013]/60 relative select-none">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                      <span>Connection Network</span>
                      <span className="text-[9px] text-slate-650 font-medium normal-case">Hover to identify • Click to navigate</span>
                    </div>
                    <div className="relative w-full" style={{ height: `${Math.max(100, validDeps.length * 36 + 40)}px` }}>
                      <svg className="w-full h-full" viewBox={`0 0 500 ${Math.max(100, validDeps.length * 36 + 40)}`} preserveAspectRatio="xMidYMid meet">
                        {/* Draw Wires */}
                        {validDeps.map((dep, idx) => {
                          const N = validDeps.length;
                          const svgH = Math.max(100, N * 36 + 40);
                          const yStart = N === 1 ? svgH / 2 : 28 + idx * ((svgH - 56) / Math.max(N - 1, 1));
                          const yEnd = svgH / 2;
                          const xStart = 50;
                          const xEnd = 370;
                          const dx = (xEnd - xStart) / 2;
                          const pathD = `M ${xStart} ${yStart} C ${xStart + dx} ${yStart}, ${xEnd - dx} ${yEnd}, ${xEnd} ${yEnd}`;
                          const isHovered = hoveredDepId === dep.id;
                          const depColor = getDependencyColor(dep);
                          
                          return (
                            <path
                              key={`wire-${dep.id}`}
                              d={pathD}
                              fill="none"
                              stroke={isHovered ? depColor : "rgba(148, 163, 184, 0.18)"}
                              strokeWidth={isHovered ? 2.5 : 1.2}
                              className="transition-all duration-350 ease-out"
                            />
                          );
                        })}

                        {/* Draw Left Nodes (Dependencies) */}
                        {validDeps.map((dep, idx) => {
                          const N = validDeps.length;
                          const svgH = Math.max(100, N * 36 + 40);
                          const y = N === 1 ? svgH / 2 : 28 + idx * ((svgH - 56) / Math.max(N - 1, 1));
                          const x = 50;
                          const depColor = getDependencyColor(dep);
                          const isHovered = hoveredDepId === dep.id;
                          // Truncate title to ~22 chars for the label
                          const label = dep.title.length > 22 ? dep.title.slice(0, 21) + '…' : dep.title;

                          return (
                            <g
                              key={`node-dep-${dep.id}`}
                              className="cursor-pointer group"
                              onMouseEnter={() => setHoveredDepId(dep.id)}
                              onMouseLeave={() => setHoveredDepId(null)}
                              onClick={() => navigateToEntry(dep, 'click')}>
                              {/* Outer Glow on Hover */}
                              <circle
                                cx={x}
                                cy={y}
                                r={isHovered ? 12 : 0}
                                fill={depColor}
                                opacity={0.25}
                                className="transition-all duration-200"
                              />
                              {/* Inner Circle */}
                              <circle
                                cx={x}
                                cy={y}
                                r={7}
                                fill={depColor}
                                stroke={isHovered ? "#ffffff" : "rgba(0,0,0,0.5)"}
                                strokeWidth={1.5}
                                className="transition-all duration-200"
                              />
                              {/* Label to the right of the node */}
                              <text
                                x={x + 14}
                                y={y + 4}
                                fontSize={10}
                                fill={isHovered ? '#e2e8f0' : '#64748b'}
                                fontFamily="ui-monospace, monospace"
                                fontWeight={isHovered ? 700 : 500}
                                className="transition-all duration-200 pointer-events-none select-none"
                              >
                                {label}
                              </text>
                            </g>
                          );
                        })}

                        {/* Draw Right Node (Current Card) */}
                        {(() => {
                          const N = validDeps.length;
                          const svgH = Math.max(100, N * 36 + 40);
                          const x = 370;
                          const y = svgH / 2;
                          const currentColor = getDependencyColor(selectedEntry);
                          const label = selectedEntry.title.length > 14 ? selectedEntry.title.slice(0, 13) + '…' : selectedEntry.title;
                          return (
                            <g className="cursor-default">
                              {/* Glow */}
                              <circle
                                cx={x}
                                cy={y}
                                r={16}
                                fill={currentColor}
                                opacity={0.15}
                              />
                              <circle
                                cx={x}
                                cy={y}
                                r={10}
                                fill={currentColor}
                                stroke="rgba(0,0,0,0.6)"
                                strokeWidth={2}
                              />
                              {/* Central dot */}
                              <circle
                                cx={x}
                                cy={y}
                                r={3}
                                fill="#ffffff"
                              />
                              {/* Label to the right of the current node */}
                              <text
                                x={x + 16}
                                y={y + 4}
                                fontSize={10}
                                fill="#cbd5e1"
                                fontFamily="ui-monospace, monospace"
                                fontWeight={700}
                                className="pointer-events-none select-none"
                              >
                                {label}
                              </text>
                            </g>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                );
              })()}

              {selectedEntry.imgPath && (
                selectedEntry.imgPath.toLowerCase().endsWith('.pdf') ? (
                  <div className="w-full mb-6">
                    <div className="w-full h-[450px] rounded-lg overflow-hidden border border-slate-800 bg-slate-950 mb-3">
                      <iframe
                        src={`${selectedEntry.imgPath}#toolbar=0`}
                        className="w-full h-full border-none"
                        title={selectedEntry.title}
                      />
                    </div>
                    <div className="p-3 rounded-lg border border-slate-800 bg-[#15191e]/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-red-950/30 border border-red-900/40 flex items-center justify-center text-red-500 font-bold text-xs select-none">
                          PDF
                        </div>
                        <div className="truncate max-w-[200px] sm:max-w-sm">
                          <p className="text-[11px] font-bold text-slate-200 truncate" title={selectedEntry.imgPath.split('/').pop()}>
                            {selectedEntry.imgPath.split('/').pop()}
                          </p>
                        </div>
                      </div>
                      <a
                        href={selectedEntry.imgPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-red-650 hover:bg-red-600 text-white rounded text-xs font-bold transition-colors"
                      >
                        Open Full PDF
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 rounded-lg overflow-hidden border border-slate-800 mb-6 bg-slate-900/50">
                    <img src={selectedEntry.imgPath} alt={selectedEntry.title} className="w-full h-full object-cover" />
                  </div>
                )
              )}
              
              {selectedEntry.body ? (
                <ReactMarkdown className="markdown-content space-y-4">
                  {selectedEntry.body}
                </ReactMarkdown>
              ) : (
                <p className="text-xs italic text-slate-400 flex items-center gap-1">
                  <Info size={14} />
                  <span>No detailed archive description provided in index.md.</span>
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-[#15191e]">
              <button
                onClick={() => handleOpenFolder(selectedEntry.folderPath)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                <Folder size={14} />
                <span>Open Local Folder</span>
              </button>
              {selectedEntry.github && (
                <a
                  href={selectedEntry.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors border border-transparent"
                >
                  <Github size={14} />
                  <span>View GitHub</span>
                </a>
              )}
              {selectedEntry.linkedin && (
                <a
                  href={selectedEntry.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-900/45 hover:bg-blue-800/60 border border-blue-800/30 text-blue-205 rounded-lg text-xs font-bold transition-colors"
                >
                  <Linkedin size={14} />
                  <span>LinkedIn</span>
                </a>
              )}
              <button
                onClick={() => handleDuplicateEntry(selectedEntry.id)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                <Copy size={14} />
                <span>Duplicate</span>
              </button>
              <button
                onClick={() => {
                  setEditEntry(selectedEntry);
                  setIsAddPopupOpen(true);
                  navigateToEntry(null);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                Edit
              </button>
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold transition-colors text-slate-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Add New Instance Modal */}
      <AddInstanceModal
        isOpen={isAddPopupOpen}
        onClose={() => {
          setIsAddPopupOpen(false);
          setEditEntry(null);
        }}
        formalMode={formalMode}
        editEntry={editEntry}
        entries={entries}
        history={history}
        historyIndex={historyIndex}
        onHistoryBack={handleHistoryBack}
        onHistoryForward={handleHistoryForward}
        filteredEntries={filteredEntries}
        onNavigateToEntry={(entry) => navigateToEntry(entry, 'prev-next')}
        onDuplicate={handleDuplicateEntry}
      />

      {/* Dreaming Modal Popup */}
      {isDreamingOpen && readViewMode === 'popup' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          {/* Static cosmic dream background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0%,transparent_65%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.05)_0%,transparent_60%)] pointer-events-none" />
          
          <div className="bg-[#0c0e12]/95 border-2 border-emerald-500/40 rounded-2xl max-w-6xl w-full h-[85vh] flex flex-col shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden relative z-10">
            {/* Modal Header */}
            <div className="p-5 border-b border-emerald-500/20 flex justify-between items-center bg-emerald-950/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg text-white font-black text-lg select-none">
                  🔮
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-100 uppercase tracking-widest font-dota flex items-center gap-2">
                    <span>Dreaming Oracle: 5 Years Soon</span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-350 border border-emerald-500/30 uppercase tracking-widest font-bold">
                      Chronological Vision
                    </span>
                  </h2>
                  <p className="text-[10px] text-emerald-400/80 uppercase tracking-wider font-semibold mt-0.5">
                    Portfolio entries projected from past origins to upcoming futures (Earliest to Latest)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (soundEnabled) sfx.playTick();
                  setIsDreamingOpen(false);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors border border-transparent hover:border-slate-700/50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Scrollable list of cards in ascending order of datestart */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-950/20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 justify-items-center">
                {(() => {
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = String(today.getMonth() + 1).padStart(2, '0');
                  const day = String(today.getDate()).padStart(2, '0');
                  const todayStr = `${year}-${month}-${day}`;

                  const maxDate = new Date();
                  maxDate.setFullYear(year + 5);
                  const maxYear = maxDate.getFullYear();
                  const maxMonth = String(maxDate.getMonth() + 1).padStart(2, '0');
                  const maxDay = String(maxDate.getDate()).padStart(2, '0');
                  const maxDateStr = `${maxYear}-${maxMonth}-${maxDay}`;

                  const upcomingEntries = entries.filter((entry) => {
                    if (!entry.datestart) return false;
                    return entry.datestart >= todayStr && entry.datestart <= maxDateStr;
                  }).sort((a, b) => a.datestart.localeCompare(b.datestart));

                  if (upcomingEntries.length === 0) {
                    return (
                      <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border border-dashed border-emerald-900/40 rounded-xl bg-emerald-950/5 backdrop-blur-sm mt-8">
                        <span className="text-3xl mb-3">🔮</span>
                        <p className="text-sm text-emerald-300 font-semibold font-dota">
                          No future timeline entries detected in the next 5 years.
                        </p>
                        <p className="text-xs text-emerald-400/70 mt-1 max-w-md">
                          Today's date is <span className="text-cyan-400 font-mono">{todayStr}</span>. Click below to add a course or project with a future date to seed your dreams!
                        </p>
                        <button
                          onClick={() => {
                            if (soundEnabled) sfx.playTick();
                            openAddModal();
                          }}
                          className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        >
                          <span>+ Add Upcoming Dream</span>
                        </button>
                      </div>
                    );
                  }

                  return upcomingEntries.map((entry) => {
                    const cardProps = {
                      key: `dream_${entry.id}`,
                      entry,
                      onOpenFolder: handleOpenFolder,
                      onMore: handleMoreClick,
                      thinnerCard,
                      isChecked: checkedCards[entry.id] !== undefined ? checkedCards[entry.id] : (entry.done || false),
                      onToggleChecked: toggleCardChecked
                    };
                    switch (entry.source) {
                      case 'proj':
                        return <ProjectCard {...cardProps} />;
                      case 'cert':
                        return <CertCard {...cardProps} />;
                      case 'item':
                        return <ItemCard {...cardProps} />;
                      case 'achv':
                        return <AchievementCard {...cardProps} />;
                      default:
                        return null;
                    }
                  });
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-emerald-500/20 flex justify-between items-center bg-emerald-950/10">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Invoker Portfolio Engine v1.0.0
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (soundEnabled) sfx.playTick();
                    openAddModal();
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  <span>+ Add Instance</span>
                </button>
                <button
                  onClick={() => {
                    if (soundEnabled) sfx.playTick();
                    setIsDreamingOpen(false);
                  }}
                  className="px-5 py-2 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-200 hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Close Vision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12161b] border-2 border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="text-xl">🔮</div>
            <p className="text-sm font-semibold text-slate-200 font-sans leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex gap-3 justify-center mt-2">
              <button
                onClick={() => {
                  if (soundEnabled) sfx.playTick();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold transition-colors text-slate-400 font-sans"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (soundEnabled) sfx.playTick();
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm font-sans"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
