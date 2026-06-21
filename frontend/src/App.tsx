import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Github, Folder, Info, Eye, Linkedin } from 'lucide-react';
import { PortfolioEntry, OrbType, DashboardStats } from './types';
import SearchBar from './components/SearchBar';
import InvokerHUD from './components/InvokerHUD';
import Timeline from './components/Timeline';
import AddInstanceModal from './components/AddInstanceModal';
import sfx from './lib/sfx';

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
    if (activeStatFilter === null) {
      localStorage.removeItem('activeStatFilter');
    } else {
      localStorage.setItem('activeStatFilter', activeStatFilter);
    }
  }, [sidebarPosition, sidebarCollapsed, mode, subFilters, orbs, activeCombo, soundEnabled, volume, activeStatFilter, formalMode, thinnerCard, isAddPopupOpen]);

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

  // Compute stats on the items before applying the specific stat override
  const stats: DashboardStats = (() => {
    let quas = 0;
    let wex = 0;
    let exort = 0;
    let gold = 0;
    let grey = 0;

    entriesForStats.forEach(item => {
      if (item.source === 'achv') {
        gold++;
      }
      if (!item.skill) {
        grey++;
      } else {
        const s = item.skill.toLowerCase();
        if (s.includes('q')) quas++;
        if (s.includes('w')) wex++;
        if (s.includes('e')) exort++;
      }
    });

    return {
      total: entriesForStats.length,
      quas,
      wex,
      exort,
      gold,
      grey,
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

  const handleMoreClick = (entry: PortfolioEntry) => {
    if (soundEnabled) sfx.playTick();
    setSelectedEntry(entry);
  };

  const handleCloseModal = () => {
    if (soundEnabled) sfx.playTick();
    setSelectedEntry(null);
  };

  return (
    <div className="min-h-screen font-dota flex flex-col transition-colors duration-200">
      {/* Floating Expand HUD Button when Sidebar is Collapsed */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className={`fixed top-6 z-40 p-3 rounded-full bg-[#111418] border border-slate-800 hover:border-emerald-500/50 text-emerald-500 hover:text-emerald-400 transition-all shadow-lg hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-bounce ${
            sidebarPosition === 'right' ? 'right-6' : 'left-6'
          }`}
          title="Expand Invoker HUD & Search"
        >
          <Eye size={22} />
        </button>
      )}

      {/* Main Content Layout - Full-screen layout */}
      <main className={`flex-1 w-full px-6 py-6 flex flex-col gap-8 items-start ${
        sidebarPosition === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'
      }`}>
        {/* Interactive HUD Sidebar (exactly 350px width, left/right toggleable & collapsible) */}
        {!sidebarCollapsed && (
          <aside className="w-full lg:w-[240px] lg:min-w-[240px] lg:max-w-[240px] lg:sticky lg:top-6 shrink-0 flex flex-col gap-5">
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
              onAddClick={() => setIsAddPopupOpen(true)}
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
             />
          </aside>
        )}

        {/* Right Side: Timeline Display (Fills the remaining main area) */}
        <section className="flex-1 min-w-0 min-h-screen">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-black dark:text-slate-400 text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <span>Archives Timeline Feed</span>
              {activeCombo && (
                <span className="normal-case text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold animate-fadeIn">
                  Active Filter: {getComboDisplayName(activeCombo)}
                </span>
              )}
            </h2>
            <span className="text-xs text-slate-400 font-semibold">
              Showing {filteredEntries.length} entries
            </span>
          </div>

          <Timeline
            entries={filteredEntries}
            onOpenFolder={handleOpenFolder}
            onMore={handleMoreClick}
            thinnerCard={thinnerCard}
          />
        </section>
      </main>

      {/* Details Markdown Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#12161b] border-2 border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden scale-in">
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

            {/* Modal Body / Markdown Content */}
            <div className="flex-1 overflow-y-auto p-6 prose prose-invert max-w-none text-slate-300">
              {selectedEntry.imgPath && (
                <div className="w-full h-48 rounded-lg overflow-hidden border border-slate-800 mb-6 bg-slate-900/50">
                  <img src={selectedEntry.imgPath} alt={selectedEntry.title} className="w-full h-full object-cover" />
                </div>
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
                onClick={handleCloseModal}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold transition-colors text-slate-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Instance Modal */}
      <AddInstanceModal
        isOpen={isAddPopupOpen}
        onClose={() => setIsAddPopupOpen(false)}
        formalMode={formalMode}
      />
    </div>
  );
};

export default App;
