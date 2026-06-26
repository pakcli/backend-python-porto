import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Github, Folder, Info, Linkedin, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Copy } from 'lucide-react';
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


const getDependencyColor = (dep: PortfolioEntry, checkedCards?: Record<string, boolean>) => {
  const isDone = checkedCards && checkedCards[dep.id] !== undefined
    ? checkedCards[dep.id]
    : (dep.done || false);
  if (!isDone) return '#ef4444'; // Red for not done
  if (dep.source === 'proj') return '#10b981'; // Green
  if (dep.source === 'item' || dep.source === 'cert') return '#64748b'; // Gray
  if (dep.source === 'achv') return '#fbbf24'; // Gold
  return '#64748b'; // Default Slate
};


const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Undated';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${months[monthIndex]} ${year}`;
    }
  }
  return dateStr;
};

const SPELL_NAMES: Record<string, { formal: string; dota: string }> = {
  qqq: { formal: 'Sistem Core', dota: 'Cold Snap' },
  qqw: { formal: 'Sistem Scripting', dota: 'Ghost Walk' },
  eqq: { formal: 'Sistem Interface', dota: 'Ice Wall' },
  qww: { formal: 'Program Logic', dota: 'Tornado' },
  eqw: { formal: 'Full-Stack Synthesis', dota: 'Deafening Blast' },
  eeq: { formal: 'Visual Systems', dota: 'Forge Spirit' },
  www: { formal: 'Program Core', dota: 'EMP' },
  eww: { formal: 'Program Interface', dota: 'Alacrity' },
  eew: { formal: 'Creative Program', dota: 'Chaos Meteor' },
  eee: { formal: 'Media Core', dota: 'Sun Strike' }
};

const FlippableCard: React.FC<{
  isRevealed: boolean;
  thinnerCard: boolean;
  children: React.ReactNode;
}> = ({ isRevealed, thinnerCard, children }) => {
  return (
    <div className={`perspective-1000 w-full max-w-[512px] ${thinnerCard ? 'min-h-[105px] h-[105px]' : 'aspect-[4/3]'} relative`}>
      <div className={`w-full h-full preserve-3d transition-transform duration-700 relative ${isRevealed ? 'rotate-y-0' : 'rotate-y-180'}`}>
        {/* Front face: the actual portfolio card */}
        <div className="absolute inset-0 backface-hidden w-full h-full">
          {children}
        </div>
        {/* Back face: plain blank placeholder */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 w-full h-full">
          <div className="bg-[#0c0f13] border-2 border-dashed border-emerald-500/20 rounded-lg flex flex-col items-center justify-center p-5 shadow-[0_0_15px_rgba(0,0,0,0.5)] h-full w-full select-none hover:border-emerald-500/40 transition-colors duration-300 relative">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:20px_20px] rounded-lg pointer-events-none" />
            <div className="w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse mb-2">
              <span className="text-xl">🔮</span>
            </div>
            {!thinnerCard && (
              <>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-dota">Temporal Node</span>
                <span className="text-[9px] text-emerald-500/50 uppercase tracking-wider font-semibold mt-1">Pending Vision</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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
  const [dreamingShowAll, setDreamingShowAll] = useState<boolean>(() => {
    const saved = localStorage.getItem('dreamingShowAll');
    return saved !== null ? saved === 'true' : false;
  });
  const [dreamingIncludePast, setDreamingIncludePast] = useState<boolean>(() => {
    const saved = localStorage.getItem('dreamingIncludePast');
    return saved !== null ? saved === 'true' : false;
  });
  const [reverseTimeline, setReverseTimeline] = useState<boolean>(() => {
    const saved = localStorage.getItem('reverseTimeline');
    return saved !== null ? saved === 'true' : false;
  });
  const [matchReadySimEnabled, setMatchReadySimEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('matchReadySimEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [isMatchReadyPromptOpen, setIsMatchReadyPromptOpen] = useState(false);
  const [revealedCardIds, setRevealedCardIds] = useState<Record<string, boolean>>({});
  const [isDreamingSequenceActive, setIsDreamingSequenceActive] = useState(false);
  const [isAcceptingMatch, setIsAcceptingMatch] = useState(false);
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
  const [splitPanelSize, setSplitPanelSize] = useState<'25' | '50'>(() => {
    return (localStorage.getItem('splitPanelSize') as '25' | '50') || '50';
  });
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [clickToEdit, setClickToEdit] = useState<boolean>(() => {
    return localStorage.getItem('clickToEdit') === 'true';
  });
  const [isEditingInline, setIsEditingInline] = useState<boolean>(false);

  // Temporary view settings for Tegak Lurus panel modal (they follow/default to the sidebar HUD settings when opened)
  const [tempDreamingShowAll, setTempDreamingShowAll] = useState(dreamingShowAll);
  const [tempDreamingIncludePast, setTempDreamingIncludePast] = useState(dreamingIncludePast);
  const [tempReverseTimeline, setTempReverseTimeline] = useState(reverseTimeline);

  // Synchronize temporary Tegak Lurus settings with master sidebar settings when the modal opens
  useEffect(() => {
    if (isDreamingOpen) {
      setTempDreamingShowAll(dreamingShowAll);
      setTempDreamingIncludePast(dreamingIncludePast);
      setTempReverseTimeline(!reverseTimeline);
    }
  }, [isDreamingOpen, dreamingShowAll, dreamingIncludePast, reverseTimeline]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => { },
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
        const nextState = !isCurrentlyChecked;
        if (soundEnabled) {
          if (nextState) {
            if (entry?.source === 'achv') {
              sfx.playTreasure();
            } else {
              sfx.playDone();
            }
          } else {
            sfx.playTick();
          }
        }

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

  const handleSaveSuccess = (cardId: string, nextDoneState: boolean) => {
    setCheckedCards(prev => ({
      ...prev,
      [cardId]: nextDoneState,
    }));
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
    localStorage.setItem('matchReadySimEnabled', String(matchReadySimEnabled));
    localStorage.setItem('dreamingShowAll', String(dreamingShowAll));
    localStorage.setItem('dreamingIncludePast', String(dreamingIncludePast));
    localStorage.setItem('reverseTimeline', String(reverseTimeline));
    if (activeStatFilter === null) {
      localStorage.removeItem('activeStatFilter');
    } else {
      localStorage.setItem('activeStatFilter', activeStatFilter);
    }
  }, [sidebarPosition, sidebarCollapsed, mode, subFilters, orbs, activeCombo, soundEnabled, volume, activeStatFilter, formalMode, thinnerCard, isAddPopupOpen, checkedCards, statsMode, clickToEdit, matchReadySimEnabled, dreamingShowAll, dreamingIncludePast, reverseTimeline]);

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

  const handleSelectCombo = (combo: string) => {
    if (activeCombo === combo) {
      clearOrbs();
    } else {
      if (soundEnabled) sfx.playInvoke();
      const upperOrbs = combo.toUpperCase().split('') as OrbType[];
      setOrbs(upperOrbs);
      setActiveCombo(combo);
    }
  };

  // Sync external sfx state and volume
  useEffect(() => {
    sfx.toggle(soundEnabled);
    sfx.setVolume(volume);
  }, [soundEnabled, volume]);

  // Helper to extract planning entries (upcoming and optionally past)
  const getUpcomingEntriesList = (
    includePast = dreamingIncludePast,
    reverse = reverseTimeline,
    showAll = dreamingShowAll
  ) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    return entries.filter((entry) => {
      if (!entry.datestart) return false;
      if (!showAll) {
        const isDone = checkedCards[entry.id] !== undefined ? checkedCards[entry.id] : (entry.done || false);
        if (isDone) return false;
      }
      // Time range filter
      if (!includePast) {
        return entry.datestart >= todayStr;
      }
      return true;
    }).sort((a, b) => {
      const cmp = a.datestart.localeCompare(b.datestart);
      return reverse ? -cmp : cmp;
    });
  };

  const triggerDreamingVision = () => {
    if (soundEnabled) sfx.playGameReady();
    if (!matchReadySimEnabled) {
      setIsDreamingOpen(true);
    } else {
      setIsMatchReadyPromptOpen(true);
    }
  };

  const handleAcceptMatchReady = () => {
    if (soundEnabled) sfx.playTick();
    setIsAcceptingMatch(true);
    setTimeout(() => {
      setIsMatchReadyPromptOpen(false);
      setIsAcceptingMatch(false);
      setIsDreamingOpen(true);
      setIsDreamingSequenceActive(true);
    }, 500); // 0.5s delay
  };

  const calculateRevealDelay = (entryDate: string) => {
    const today = new Date();
    const target = new Date(entryDate);
    const diffTime = target.getTime() - today.getTime();
    const diffYears = Math.max(0, diffTime / (1000 * 60 * 60 * 24 * 365.25));
    return diffYears * 500; // 0.5s (500ms) per year
  };

  // Effect to handle card reveal delay timers based on future start dates
  useEffect(() => {
    let startTimeoutId: any = null;
    const activeTimers: any[] = [];

    if (isDreamingOpen) {
      const upcoming = getUpcomingEntriesList(
        tempDreamingIncludePast,
        tempReverseTimeline,
        tempDreamingShowAll
      );

      if (matchReadySimEnabled && isDreamingSequenceActive && upcoming.length > 0) {
        setRevealedCardIds({});

        // Initial 0.5s start delay
        startTimeoutId = setTimeout(() => {
          upcoming.forEach((entry) => {
            const delay = calculateRevealDelay(entry.datestart);
            const timerId = setTimeout(() => {
              setRevealedCardIds(prev => ({ ...prev, [entry.id]: true }));
            }, delay);
            activeTimers.push(timerId);
          });

          // Disable sequence active state after the last card has flipped
          const maxDelay = Math.max(...upcoming.map(e => calculateRevealDelay(e.datestart)));
          const endTimerId = setTimeout(() => {
            setIsDreamingSequenceActive(false);
          }, maxDelay + 100);
          activeTimers.push(endTimerId);

        }, 500); // 0.5s initial delay
      } else {
        // If animation disabled or inactive, mark all as revealed immediately
        const allRevealed: Record<string, boolean> = {};
        upcoming.forEach(entry => {
          allRevealed[entry.id] = true;
        });
        setRevealedCardIds(allRevealed);
      }
    } else {
      setRevealedCardIds({});
      setIsDreamingSequenceActive(false);
    }

    return () => {
      if (startTimeoutId) clearTimeout(startTimeoutId);
      activeTimers.forEach(timerId => clearTimeout(timerId));
    };
  }, [
    isDreamingOpen,
    isDreamingSequenceActive,
    matchReadySimEnabled,
    soundEnabled,
    entries,
    tempDreamingIncludePast,
    tempReverseTimeline,
    tempDreamingShowAll
  ]);

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

  // Filter entries for combination counts (ignoring activeCombo filter so counts don't zero out)
  const getEntriesForComboCounts = () => {
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

      // 2. Filter by Regex search query
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
          // If regex fails to compile, ignore filtering
        }
      }

      return true;
    });
  };

  const entriesForStats = getEntriesForStats();
  const entriesForComboCounts = getEntriesForComboCounts();

  // Filter entries incorporating the interactive stat card override
  const getFilteredEntries = () => {
    const list = entriesForStats.filter(entry => {
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
    if (reverseTimeline) {
      return [...list].reverse();
    }
    return list;
  };

  const filteredEntries = getFilteredEntries();

  const upcomingEntries = getUpcomingEntriesList();

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
    const sortedKey = combo.toLowerCase().split('').sort().join('');
    const match = SPELL_NAMES[sortedKey];
    const name = match ? (formalMode ? match.formal : match.dota) : 'Unknown Combo';
    
    if (!formalMode) {
      return `${name} (Combo ${combo.toUpperCase()})`;
    } else {
      const names = combo.toLowerCase().split('').map(char => {
        if (char === 'q') return 'Sistem';
        if (char === 'w') return 'Program';
        if (char === 'e') return 'Media';
        return char;
      });
      return `${name} (Combo ${names.join(' + ')})`;
    }
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

  const scrollToCurrentDate = () => {
    if (filteredEntries.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    let closestEntry = filteredEntries[0];
    let minDiff = Infinity;

    filteredEntries.forEach(entry => {
      if (!entry.datestart) return;
      const diff = Math.abs(new Date(entry.datestart).getTime() - new Date(today).getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closestEntry = entry;
      }
    });

    if (closestEntry) {
      const el = document.getElementById(`card-${closestEntry.id}`);
      if (el) {
        let scrollParent = el.parentElement;
        while (scrollParent && scrollParent !== document.body) {
          const style = window.getComputedStyle(scrollParent);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            break;
          }
          scrollParent = scrollParent.parentElement;
        }
        if (scrollParent && scrollParent !== document.body) {
          const elRect = el.getBoundingClientRect();
          const parentRect = scrollParent.getBoundingClientRect();
          const targetScrollTop = scrollParent.scrollTop + (elRect.top - parentRect.top) - (parentRect.height / 2) + (elRect.height / 2);
          scrollParent.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToCurrentDate();
    }, 400);
    return () => clearTimeout(timer);
  }, [reverseTimeline]);

  return (
    <div className="h-screen max-h-screen font-dota flex flex-col transition-colors duration-200 overflow-hidden bg-[#0b0d10]">
      {/* Floating Expand HUD Button when Sidebar is Collapsed */}
      {sidebarCollapsed && (
        <button
          onClick={() => {
            if (soundEnabled) sfx.playTick();
            setSidebarCollapsed(false);
          }}
          className={`fixed top-6 z-40 p-3 rounded-full bg-[#111418] border border-slate-800 hover:border-emerald-500/50 text-emerald-500 hover:text-emerald-400 transition-all shadow-lg hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] ${
            sidebarPosition === 'right' ? 'right-6' : 'left-6'
          }`}
          title="Expand Invoker HUD"
        >
          {sidebarPosition === 'right' ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
        </button>
      )}

      {/* Main Content Layout - Full-screen layout */}
      <main className={`flex-1 min-h-0 w-full px-6 py-6 flex flex-col lg:flex-row items-stretch ${
        sidebarCollapsed ? 'gap-0' : 'gap-8'
      } ${
        sidebarPosition === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'
      }`}>
        {/* Interactive HUD Sidebar (exactly 240px width, left/right toggleable & collapsible) */}
        <aside
          className={`w-full shrink-0 flex flex-col gap-5 h-full overflow-y-auto pr-1 scrollbar-thin transition-all duration-300 ease-in-out ${
            sidebarCollapsed
              ? 'w-0 lg:w-0 lg:min-w-0 lg:max-w-0 opacity-0 pointer-events-none'
              : 'w-full lg:w-[240px] lg:min-w-[240px] lg:max-w-[240px] opacity-100'
          }`}
        >
          {/* Logo Header */}
          <div className="flex items-center gap-3 pb-2 border-b border-slate-800/80 justify-between">
            {sidebarPosition === 'right' && (
              <button
                onClick={() => {
                  if (soundEnabled) sfx.playTick();
                  setSidebarCollapsed(true);
                }}
                className="p-1.5 hover:bg-slate-800/50 rounded-lg text-slate-400 hover:text-slate-200 transition-colors shrink-0 flex items-center justify-center"
                title="Collapse Sidebar"
              >
                <ChevronRight size={18} />
              </button>
            )}

            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-purple-500 to-orange-500 flex items-center justify-center shadow-lg text-white font-black text-lg select-none">
                🔮
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-black tracking-wide text-slate-100 font-dota whitespace-nowrap">
                  INVOKER PORTFOLIO
                </h1>
                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                  The Arch-Mage Dev Archives
                </p>
              </div>
            </div>

            {sidebarPosition === 'left' && (
              <button
                onClick={() => {
                  if (soundEnabled) sfx.playTick();
                  setSidebarCollapsed(true);
                }}
                className="p-1.5 hover:bg-slate-800/50 rounded-lg text-slate-400 hover:text-slate-200 transition-colors shrink-0 flex items-center justify-center"
                title="Collapse Sidebar"
              >
                <ChevronLeft size={18} />
              </button>
            )}
          </div>

          {/* Search Bar */}
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sidebarPosition={sidebarPosition}
            setSidebarPosition={setSidebarPosition}
            onAddClick={openAddModal}
            onResetView={scrollToCurrentDate}
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
            splitPanelSize={splitPanelSize}
            setSplitPanelSize={(s) => { setSplitPanelSize(s); localStorage.setItem('splitPanelSize', s); }}
            clickToEdit={clickToEdit}
            setClickToEdit={setClickToEdit}
            matchReadySimEnabled={matchReadySimEnabled}
            setMatchReadySimEnabled={setMatchReadySimEnabled}
            dreamingShowAll={dreamingShowAll}
            setDreamingShowAll={setDreamingShowAll}
            dreamingIncludePast={dreamingIncludePast}
            setDreamingIncludePast={setDreamingIncludePast}
            reverseTimeline={reverseTimeline}
            setReverseTimeline={setReverseTimeline}
            entriesForStats={entriesForComboCounts}
            onSelectCombo={handleSelectCombo}
          />
        </aside>

        {/* Right Side: Timeline Display (Fills the remaining main area) */}
        <section className="flex-1 min-w-0 h-full flex flex-col min-h-0">
          <div className="bg-[#0b0d10]/95 border-b border-slate-900/60 py-4 mb-4 flex items-center justify-between gap-4 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-black dark:text-slate-400 text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span>{isDreamingOpen && readViewMode === 'split' ? 'Tegak Lurus Planning' : 'Archives Timeline Feed'}</span>
                {activeCombo && !isDreamingOpen && (
                  <span className="normal-case text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
                    Active Filter: {getComboDisplayName(activeCombo)}
                  </span>
                )}
              </h2>
              {readViewMode === 'split' && selectedEntry && (
                <div className="flex items-center gap-1 p-0.5 bg-slate-950/80 border border-slate-800/80 rounded-lg">
                  <button
                    onClick={() => { setSplitPanelSize('25'); localStorage.setItem('splitPanelSize', '25'); }}
                    className={`px-2 py-0.5 text-[9px] font-black rounded transition-all ${
                      splitPanelSize === '25'
                        ? 'bg-[#15191e] text-emerald-400 border border-slate-700/50'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >25%</button>
                  <button
                    onClick={() => { setSplitPanelSize('50'); localStorage.setItem('splitPanelSize', '50'); }}
                    className={`px-2 py-0.5 text-[9px] font-black rounded transition-all ${
                      splitPanelSize === '50'
                        ? 'bg-[#15191e] text-purple-400 border border-slate-700/50'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >50%</button>
                </div>
              )}
              <span className="text-xs text-slate-500 font-semibold bg-slate-950 px-2 py-1 rounded border border-slate-800/80">
                Showing {isDreamingOpen && readViewMode === 'split' ? upcomingEntries.length : filteredEntries.length} entries
              </span>
            </div>

            <div className="flex items-center gap-2">
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
                  onClick={triggerDreamingVision}
                  className="relative overflow-hidden px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-950/75 to-teal-950/75 hover:from-emerald-900 hover:to-teal-900 border border-emerald-500/30 text-emerald-250 hover:text-white transition-all text-xs font-black tracking-wider uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] group shrink-0"
                >
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)]" />
                  <span className="relative z-10 flex items-center gap-1.5 font-dota">
                    🔮 Start Game
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Split view: timeline + detail panel side by side */}
          <div className="flex gap-4 min-h-0 flex-1 items-stretch overflow-hidden">
            {/* Timeline (shrinks when split panel is open) */}
            <div className={`transition-all duration-300 min-w-0 h-full overflow-y-auto pr-1 scrollbar-thin ${
              readViewMode === 'split' && selectedEntry
                ? splitPanelSize === '25' ? 'flex-1 min-w-0' : 'w-1/2 flex-1'
                : 'flex-1'
            }`}>
              {isDreamingOpen && readViewMode === 'split' && upcomingEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-emerald-900/30 rounded-xl bg-emerald-950/5 backdrop-blur-sm h-64 select-none">
                  <span className="text-3xl mb-3">🔮</span>
                  <p className="text-sm text-emerald-300 font-semibold font-dota">
                    No future timeline entries detected from today onwards.
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
                  thinnerCard={thinnerCard}
                  checkedCards={checkedCards}
                  onToggleChecked={toggleCardChecked}
                  nodeLineMode={nodeLineMode}
                  isSplitView={readViewMode === 'split' && !!selectedEntry}
                  selectedEntryId={selectedEntry?.id}
                  onDeselect={handleCloseModal}
                />
              )}
            </div>

            {/* Split view detail panel */}
            {readViewMode === 'split' && selectedEntry && (
              isEditingInline ? (
                <div className={`min-w-0 h-full flex flex-col min-h-0 overflow-hidden animate-fadeIn transition-all duration-300 ${
                  splitPanelSize === '25' ? 'w-1/4 min-w-[290px] flex-none' : 'w-1/2 flex-1'
                }`}>
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
                    checkedCards={checkedCards}
                    onSaveSuccess={handleSaveSuccess}
                  />
                </div>
              ) : (() => {
                const currentIdx = filteredEntries.findIndex(e => e.id === selectedEntry.id);
                const hasPrev = currentIdx > 0;
                const hasNext = currentIdx < filteredEntries.length - 1;
                const depIds = selectedEntry.dependencies || [];
                const validDeps = depIds.map(id => entries.find(e => e.id === id)).filter((e): e is PortfolioEntry => !!e);
                return (
                  <div className={`min-w-0 h-full flex flex-col min-h-0 overflow-hidden transition-all duration-300 ${splitPanelSize === '25' ? 'w-1/4 min-w-[290px] flex-none' : 'w-1/2 flex-1'}`}>
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
                            className={`p-1.5 rounded transition-all duration-200 border border-transparent ${historyIndex > 0
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
                            className={`p-1.5 rounded transition-all duration-200 border border-transparent ${historyIndex < history.length - 1
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
                                  const c = getDependencyColor(dep, checkedCards);
                                  return <path key={dep.id} d={`M 50 ${yS} C ${50 + dx2} ${yS}, ${370 - dx2} ${yE}, 370 ${yE}`} fill="none" stroke={isH ? c : 'rgba(148,163,184,0.18)'} strokeWidth={isH ? 2.5 : 1.2} className="transition-all duration-200" />;
                                })}
                                {validDeps.map((dep, idx) => {
                                  const N = validDeps.length; const svgH = Math.max(80, N * 32 + 32);
                                  const y = N === 1 ? svgH / 2 : 24 + idx * ((svgH - 48) / Math.max(N - 1, 1));
                                  const isH = hoveredDepId === dep.id;
                                  const c = getDependencyColor(dep, checkedCards);
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
                                  const y = svgH / 2; const c = getDependencyColor(selectedEntry, checkedCards);
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
                    className={`p-1.5 rounded transition-all duration-200 border border-transparent ${historyIndex > 0
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
                    className={`p-1.5 rounded transition-all duration-200 border border-transparent ${historyIndex < history.length - 1
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
                            const depColor = getDependencyColor(dep, checkedCards);

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
                            const depColor = getDependencyColor(dep, checkedCards);
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
                            const currentColor = getDependencyColor(selectedEntry, checkedCards);
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
        checkedCards={checkedCards}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Dreaming Modal Popup */}
      {isDreamingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          {/* Static cosmic dream background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0%,transparent_65%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.05)_0%,transparent_60%)] pointer-events-none" />

          <div className="bg-[#0c0e12]/95 border-2 border-emerald-500/40 rounded-2xl max-w-6xl w-full h-[85vh] flex flex-col shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden relative z-10">
            {/* Modal Header */}
            <div className="p-5 border-b border-emerald-500/20 flex flex-col md:flex-row items-center justify-between bg-emerald-950/10 gap-4 relative">
              {/* Left side: Toggle show all / only undone */}
              <div className="md:absolute md:left-5 md:top-1/2 md:-translate-y-1/2 z-10">
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-950/80 border border-slate-850 rounded-lg max-w-[200px] select-none">
                  <button
                    onClick={() => {
                      if (soundEnabled) sfx.playTick();
                      setTempDreamingShowAll(false);
                    }}
                    className={`px-3 py-1 text-[9px] font-bold rounded transition-all uppercase tracking-widest ${!tempDreamingShowAll
                        ? 'bg-[#15191e] text-emerald-450 shadow-sm border border-slate-800/50'
                        : 'text-slate-500 hover:text-slate-350'
                      }`}
                  >
                    Undone
                  </button>
                  <button
                    onClick={() => {
                      if (soundEnabled) sfx.playTick();
                      setTempDreamingShowAll(true);
                    }}
                    className={`px-3 py-1 text-[9px] font-bold rounded transition-all uppercase tracking-widest ${tempDreamingShowAll
                        ? 'bg-[#15191e] text-cyan-400 shadow-sm border border-slate-800/50'
                        : 'text-slate-500 hover:text-slate-350'
                      }`}
                  >
                    Show All
                  </button>
                </div>
              </div>

              {/* Center: Title align center */}
              <div className="flex-1 flex flex-col items-center text-center w-full">
                <h2 className="text-lg md:text-2xl font-black text-slate-100 uppercase tracking-[0.18em] font-dota">
                  Tegak Lurus Planning
                </h2>
              </div>

              {/* Right side: Close button */}
              <div className="absolute right-5 top-5 md:top-1/2 md:-translate-y-1/2 z-10">
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
            </div>

            {/* Modal Body: Scrollable list of cards in a chronological vertical timeline section */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-950/20">
              {(() => {
                const upcomingEntries = getUpcomingEntriesList(tempDreamingIncludePast, tempReverseTimeline, tempDreamingShowAll);
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                if (upcomingEntries.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-emerald-900/40 rounded-xl bg-emerald-950/5 backdrop-blur-sm mt-8 w-full">
                      <span className="text-3xl mb-3">🔮</span>
                      <p className="text-sm text-emerald-300 font-semibold font-dota">
                        No future timeline entries detected from today onwards.
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

                // Group entries by year
                const entriesByYear: Record<string, PortfolioEntry[]> = {};
                upcomingEntries.forEach(entry => {
                  const y = entry.datestart ? entry.datestart.substring(0, 4) : 'Undated';
                  if (!entriesByYear[y]) {
                    entriesByYear[y] = [];
                  }
                  entriesByYear[y].push(entry);
                });

                const isLatest = tempReverseTimeline;
                const sortedYears = Object.keys(entriesByYear).sort(
                  isLatest ? (a, b) => b.localeCompare(a) : (a, b) => a.localeCompare(b)
                );

                return (
                  <div className="w-full flex flex-col gap-8 py-2">
                    {sortedYears.map((y) => {
                      const yearEntries = entriesByYear[y];
                      return (
                        <div key={`year_section_${y}`} className="w-full flex flex-col gap-6">
                          {/* Year Header Divider */}
                          <div className="w-full flex items-center gap-4 select-none">
                            <span className="text-sm font-black text-emerald-400 font-dota tracking-widest">{y}</span>
                            <div className="flex-1 h-[2px] bg-gradient-to-r from-emerald-500/30 via-slate-800/50 to-transparent" />
                          </div>

                          {/* Cards List in this year section */}
                          <div className="grid grid-cols-1 min-[640px]:grid-cols-2 xl:grid-cols-3 min-[1650px]:grid-cols-[repeat(auto-fill,minmax(min(100%,480px),1fr))] gap-6 w-full">
                            {yearEntries.map((entry) => {
                              const cardProps = {
                                key: `dream_${entry.id}`,
                                entry,
                                onOpenFolder: handleOpenFolder,
                                onMore: handleMoreClick,
                                thinnerCard,
                                isChecked: checkedCards[entry.id] !== undefined ? checkedCards[entry.id] : (entry.done || false),
                                onToggleChecked: toggleCardChecked
                              };

                              const isRevealed = !matchReadySimEnabled || !isDreamingSequenceActive || !!revealedCardIds[entry.id];

                              const renderCard = () => {
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
                              };

                              const isDone = checkedCards[entry.id] !== undefined ? checkedCards[entry.id] : (entry.done || false);
                              const isOverdue = !isDone && !!entry.datestart && entry.datestart < todayStr;

                              return (
                                <div key={`dream_item_${entry.id}`} className="w-full flex flex-col items-start gap-2.5">
                                  {/* Date Badge — amber tint if overdue */}
                                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border select-none ${
                                    isOverdue
                                      ? 'text-amber-500/80 bg-amber-950/30 border-amber-900/40'
                                      : 'text-slate-400 bg-slate-900/60 border-slate-800/80'
                                  }`}>
                                    {isOverdue && <span className="mr-1 opacity-70">⏳</span>}
                                    {formatDate(entry.datestart)}
                                  </span>

                                  {/* Flippable Card Container — glowing border if overdue undone */}
                                  <div className={`w-full rounded-xl transition-all ${
                                    isOverdue
                                      ? 'ring-1 ring-orange-900/60 shadow-[0_0_14px_rgba(180,80,30,0.22)]'
                                      : ''
                                  }`}>
                                    <FlippableCard
                                      key={`dream_flip_${entry.id}`}
                                      isRevealed={isRevealed}
                                      thinnerCard={thinnerCard}
                                    >
                                      {renderCard()}
                                    </FlippableCard>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-emerald-500/20 flex items-center gap-4 bg-emerald-950/10">
              {/* Left: new toggles */}
              <div className="flex items-center gap-2">
                {/* Include Past toggle */}
                <div className="grid grid-cols-2 gap-0.5 p-0.5 bg-slate-950/80 border border-slate-800/80 rounded-lg select-none">
                  <button
                    onClick={() => { if (soundEnabled) sfx.playTick(); setTempDreamingIncludePast(false); }}
                    className={`px-2.5 py-1 text-[9px] font-bold rounded transition-all uppercase tracking-wider ${
                      !tempDreamingIncludePast
                        ? 'bg-[#15191e] text-cyan-400 shadow-sm border border-slate-800/50'
                        : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    Future Only
                  </button>
                  <button
                    onClick={() => { if (soundEnabled) sfx.playTick(); setTempDreamingIncludePast(true); }}
                    className={`px-2.5 py-1 text-[9px] font-bold rounded transition-all uppercase tracking-wider ${
                      tempDreamingIncludePast
                        ? 'bg-[#15191e] text-amber-400 shadow-sm border border-slate-800/50'
                        : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    + Past
                  </button>
                </div>


                {/* View Default | Reverse (same timeline) toggle */}
                <div className="grid grid-cols-2 gap-0.5 p-0.5 bg-slate-950/80 border border-slate-800/80 rounded-lg select-none">
                  <button
                    onClick={() => { if (soundEnabled) sfx.playTick(); setTempReverseTimeline(true); }}
                    className={`px-2.5 py-1 text-[9px] font-bold rounded transition-all uppercase tracking-wider ${
                      tempReverseTimeline
                        ? 'bg-[#15191e] text-blue-400 shadow-sm border border-slate-800/50'
                        : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    View Default
                  </button>
                  <button
                    onClick={() => { if (soundEnabled) sfx.playTick(); setTempReverseTimeline(false); }}
                    className={`px-2.5 py-1 text-[9px] font-bold rounded transition-all uppercase tracking-wider ${
                      !tempReverseTimeline
                        ? 'bg-[#15191e] text-rose-400 shadow-sm border border-slate-800/50'
                        : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    Reverse (same timeline)
                  </button>
                </div>
              </div>

              {/* Right: action buttons */}
              <div className="flex gap-2 ml-auto">
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
                  if (soundEnabled) sfx.playFail();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold transition-colors text-slate-400 font-sans"
              >
                Cancel
              </button>
              <button
                onClick={() => {
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

      {/* Dota 2 Match Ready Prompt */}
      {isMatchReadyPromptOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none font-dota">
          {/* Animated green cosmic background aura */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,transparent_60%)] pointer-events-none animate-pulse" />

          <div className="bg-[#0b0e12] border-2 border-emerald-500/40 rounded-sm max-w-lg w-full p-8 shadow-[0_0_50px_rgba(16,185,129,0.3)] flex flex-col gap-6 relative overflow-hidden text-center">
            {/* Top decorative gradient line */}
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-[0.25em] font-dota select-none">
                Your Vision is Ready
              </span>
              <h3 className="text-3xl font-black text-slate-100 uppercase tracking-widest font-dota my-1">
                ALl PLANNING
              </h3>
            </div>

            {/* Accept Match Button Container */}
            <div className="flex flex-col items-center justify-center py-4">
              <button
                disabled={isAcceptingMatch}
                onClick={handleAcceptMatchReady}
                className={`relative group overflow-hidden px-14 py-4 bg-gradient-to-b from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 border-t border-emerald-400 text-white font-extrabold uppercase tracking-widest text-lg shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] transition-all rounded active:translate-y-[1px] min-w-[220px] ${isAcceptingMatch ? 'opacity-90 cursor-wait' : 'cursor-pointer'
                  }`}
              >
                {isAcceptingMatch ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    CONNECTING
                  </span>
                ) : (
                  "ACCEPT"
                )}
              </button>
            </div>

            {/* Decline Match Button */}
            <div className="flex justify-center mt-2">
              <button
                disabled={isAcceptingMatch}
                onClick={() => {
                  if (soundEnabled) sfx.playFail();
                  setIsMatchReadyPromptOpen(false);
                }}
                className="text-[10px] text-slate-500 hover:text-slate-300 font-bold uppercase tracking-widest transition-colors flex items-center gap-1 hover:underline"
              >
                <span>🛈</span> Decline Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
