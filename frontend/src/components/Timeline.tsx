import React, { useState, useEffect, useRef } from 'react';
import { PortfolioEntry } from '../types';
import ProjectCard from './ProjectCard';
import CertCard from './CertCard';
import ItemCard from './ItemCard';
import AchievementCard from './AchievementCard';
import { Flame } from 'lucide-react';

interface TimelineProps {
  entries: PortfolioEntry[];
  onOpenFolder: (path: string) => void;
  onMore: (entry: PortfolioEntry) => void;
  thinnerCard?: boolean;
  checkedCards: Record<string, boolean>;
  onToggleChecked: (id: string) => void;
  nodeLineMode: 'focus' | 'focus-no-offset' | 'all';
  isSplitView?: boolean;
  selectedEntryId?: string;
  onDeselect?: () => void;
}

interface Connection {
  id: string;
  fromId: string;  // dependent entry (has dependencies)
  toId: string;    // dependency entry (pointed to)
  d: string;
  color: string;
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
  portIndexBottom: number;  // port slot at bottom of fromId card
  portCountBottom: number;  // total port slots at bottom of fromId card
  portIndexTop: number;     // port slot at top of toId card
  portCountTop: number;     // total port slots at top of toId card
}

const getMonthYearLabel = (dateStr: string) => {
  if (!dateStr) return 'Undated';
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${months[monthIndex]} ${year}`;
    }
  }
  return dateStr;
};

const getDependencyColor = (dep: PortfolioEntry, checkedCards: Record<string, boolean>) => {
  const isDone = checkedCards[dep.id] !== undefined ? checkedCards[dep.id] : (dep.done || false);
  if (!isDone) return '#ef4444'; // Red for not done

  if (dep.source === 'proj') return '#10b981'; // Green
  if (dep.source === 'item' || dep.source === 'cert') return '#64748b'; // Gray
  if (dep.source === 'achv') return '#fbbf24'; // Gold
  return '#64748b'; // Default Slate
};

export const Timeline: React.FC<TimelineProps> = ({
  entries,
  onOpenFolder,
  onMore,
  thinnerCard,
  checkedCards,
  onToggleChecked,
  nodeLineMode,
  isSplitView,
  selectedEntryId,
  onDeselect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [hoverDisabled, setHoverDisabled] = useState(false);

  const handleMoreClick = (entry: PortfolioEntry) => {
    // Immediately disable hover before any swap starts
    setHoverDisabled(true);
    setHoveredCardId(null);

    // Re-enable hover after the swap animation is finished
    setTimeout(() => {
      setHoverDisabled(false);
    }, 500);

    onMore(entry);
  };

  const handleHeaderClick = (label: string) => {
    if (onDeselect) {
      onDeselect();
    }
    const scrollTarget = () => {
      const el = document.getElementById(`separator-${label.replace(/\s+/g, '-')}`);
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
    };

    // Staggered scroll triggers to follow layout resizing transitions
    scrollTarget();
    setTimeout(scrollTarget, 100);
    setTimeout(scrollTarget, 250);
    setTimeout(scrollTarget, 400);
  };

  const updateConnections = () => {
    if (!containerRef.current) return;
    const parentRect = containerRef.current.getBoundingClientRect();
    const newConnections: Connection[] = [];

    // Pre-compute port counts per card edge
    // bottomPortCount[id] = how many deps does this card have (outgoing from bottom)
    // topPortCount[id]    = how many other cards point TO this card (incoming at top)
    const bottomPortCounts: Record<string, number> = {};
    const topPortCounts: Record<string, number> = {};
    const topPortIndexMap: Record<string, number> = {}; // running index for top ports

    entries.forEach(entry => {
      const validDeps = (entry.dependencies || []).filter(id => entries.find(e => e.id === id));
      if (validDeps.length > 0) {
        bottomPortCounts[entry.id] = validDeps.length;
        validDeps.forEach(depId => {
          topPortCounts[depId] = (topPortCounts[depId] || 0) + 1;
        });
      }
    });

    entries.forEach(entry => {
      const depIds = entry.dependencies || [];
      let bottomPortIndex = 0;

      depIds.forEach(depId => {
        const depEntry = entries.find(e => e.id === depId);
        if (!depEntry) return;

        const elA = document.getElementById(`card-${entry.id}`);
        const elB = document.getElementById(`card-${depEntry.id}`);

        if (elA && elB) {
          const rectA = elA.getBoundingClientRect();
          const rectB = elB.getBoundingClientRect();

          const totalBottom = bottomPortCounts[entry.id] || 1;
          const totalTop = topPortCounts[depEntry.id] || 1;
          const topIdx = topPortIndexMap[depEntry.id] || 0;
          topPortIndexMap[depEntry.id] = topIdx + 1;

          // Space ports evenly across 60% of card width, centered
          const portSpanFraction = 0.6;
          const portSpanA = rectA.width * portSpanFraction;
          const portOffsetA = totalBottom === 1
            ? 0
            : (bottomPortIndex / (totalBottom - 1) - 0.5) * portSpanA;

          const portSpanB = rectB.width * portSpanFraction;
          const portOffsetB = totalTop === 1
            ? 0
            : (topIdx / (totalTop - 1) - 0.5) * portSpanB;

          const isMainBelow = rectA.top > rectB.top;

          const xStart = (rectA.left - parentRect.left) + rectA.width / 2 + portOffsetA;
          const yStart = isMainBelow
            ? (rectA.top - parentRect.top)
            : (rectA.bottom - parentRect.top);

          const xEnd = (rectB.left - parentRect.left) + rectB.width / 2 + portOffsetB;
          const yEnd = isMainBelow
            ? (rectB.bottom - parentRect.top)
            : (rectB.top - parentRect.top);

          const dy = Math.abs(yEnd - yStart) * 0.5;
          const cpStart = isMainBelow ? (yStart - dy) : (yStart + dy);
          const cpEnd = isMainBelow ? (yEnd + dy) : (yEnd - dy);
          // S-curve bezier
          const d = `M ${xStart} ${yStart} C ${xStart} ${cpStart}, ${xEnd} ${cpEnd}, ${xEnd} ${yEnd}`;

          newConnections.push({
            id: `${entry.id}-${depEntry.id}`,
            fromId: entry.id,
            toId: depEntry.id,
            d,
            color: getDependencyColor(depEntry, checkedCards),
            xStart,
            yStart,
            xEnd,
            yEnd,
            portIndexBottom: bottomPortIndex,
            portCountBottom: totalBottom,
            portIndexTop: topIdx,
            portCountTop: totalTop,
          });

          bottomPortIndex++;
        }
      });
    });

    setConnections(newConnections);
  };

  useEffect(() => {
    const timer = setTimeout(updateConnections, 120);

    const resizeObserver = new ResizeObserver(() => {
      updateConnections();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    resizeObserver.observe(document.body);
    window.addEventListener('scroll', updateConnections, true);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updateConnections, true);
    };
  }, [entries, thinnerCard, selectedEntryId]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed dark:border-slate-800 border-slate-200 rounded-xl bg-slate-500/5 backdrop-blur-sm">
        <Flame className="text-slate-400 dark:text-slate-600 mb-3" size={36} />
        <p className="text-sm dark:text-slate-400 text-slate-500 font-semibold font-dota">
          No matches found in the archives.
        </p>
        <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">
          Adjust the search terms or change your invoked orb combinations.
        </p>
      </div>
    );
  }

  // Focus Mode active filtering: show only the selected entry and its dependencies/dependents
  const isFocusActiveMode = nodeLineMode === 'focus' && !!selectedEntryId;
  const relatedIds = new Set<string>();
  if (isFocusActiveMode && selectedEntryId) {
    relatedIds.add(selectedEntryId);
    
    // Find all entries that the selected entry depends on
    const selectedEntry = entries.find(e => e.id === selectedEntryId);
    if (selectedEntry && selectedEntry.dependencies) {
      selectedEntry.dependencies.forEach(depId => relatedIds.add(depId));
    }
    
    // Find all entries that depend on the selected entry
    entries.forEach(e => {
      if (e.dependencies && e.dependencies.includes(selectedEntryId)) {
        relatedIds.add(e.id);
      }
    });
  }

  const visibleEntries = isFocusActiveMode
    ? entries.filter(e => relatedIds.has(e.id))
    : entries;

  // Group chronologically
  const groups: { label: string; items: PortfolioEntry[] }[] = [];
  let currentLabel = '';
  let currentGroup: PortfolioEntry[] = [];

  visibleEntries.forEach((entry) => {
    const label = getMonthYearLabel(entry.datestart);
    if (label !== currentLabel) {
      if (currentGroup.length > 0) {
        groups.push({ label: currentLabel, items: currentGroup });
      }
      currentLabel = label;
      currentGroup = [entry];
    } else {
      currentGroup.push(entry);
    }
  });

  if (currentGroup.length > 0) {
    groups.push({ label: currentLabel, items: currentGroup });
  }

  const renderCard = (entry: PortfolioEntry) => {
    const cardProps = {
      entry,
      onOpenFolder,
      onMore: handleMoreClick,
      thinnerCard,
      isChecked: checkedCards[entry.id] !== undefined ? checkedCards[entry.id] : (entry.done || false),
      onToggleChecked,
    };

    let cardElement: React.ReactNode = null;
    switch (entry.source) {
      case 'proj': cardElement = <ProjectCard {...cardProps} />; break;
      case 'cert': cardElement = <CertCard {...cardProps} />; break;
      case 'item': cardElement = <ItemCard {...cardProps} />; break;
      case 'achv': cardElement = <AchievementCard {...cardProps} />; break;
    }

    if (!cardElement) return null;

    // Overdue = past date + not done yet
    const todayStr = new Date().toISOString().slice(0, 10);
    const isDoneEntry = checkedCards[entry.id] !== undefined ? checkedCards[entry.id] : (entry.done || false);
    const isOverdue = !isDoneEntry && !!entry.datestart && entry.datestart < todayStr;

    // Focus mode visual roles
    // Focus Mode (focus) is only active if split view is not open (standalone) and no selected entry is active.
    // Clean Mode (focus-no-offset) remains active (preserving hover dimming).
    const isFocusActive = nodeLineMode === 'focus-no-offset' || (nodeLineMode === 'focus' && !isSplitView && !selectedEntryId);
    const isFocused = isFocusActive && hoveredCardId === entry.id;
    const isDependencyOfFocused = isFocusActive && !!hoveredCardId &&
      connections.some(c => c.fromId === hoveredCardId && c.toId === entry.id);
    const isDependentOfFocused = isFocusActive && !!hoveredCardId &&
      connections.some(c => c.toId === hoveredCardId && c.fromId === entry.id);

    // Paper-stack layout transforms:
    // - Focused: stays left, full opacity, subtle glow ring
    // - Dependencies of focused (what it needs): shift right a little, full opacity, colored border highlight
    // - Dependents of focused (what needs it): shift right slightly, full opacity
    // - Unrelated: pushed far right, very dim
    let wrapperStyle: React.CSSProperties = {
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, filter 0.3s ease',
      position: 'relative',
    };

    if (isFocusActive && hoveredCardId) {
      if (isFocused) {
        wrapperStyle.transform = 'translateX(0px)';
        wrapperStyle.opacity = 1;
        wrapperStyle.zIndex = 20;
      } else if (isDependencyOfFocused) {
        // Aligned to left with focused card (like last time)
        wrapperStyle.transform = 'translateX(0px)';
        wrapperStyle.opacity = 1;
        wrapperStyle.zIndex = 15;
      } else if (isDependentOfFocused) {
        // Aligned to left with focused card (like last time)
        wrapperStyle.transform = 'translateX(0px)';
        wrapperStyle.opacity = 1;
        wrapperStyle.zIndex = 14;
      } else {
        // Unrelated: pushed far right and dimmed
        wrapperStyle.transform = nodeLineMode === 'focus' ? 'translateX(80px)' : 'translateX(0px)';
        wrapperStyle.opacity = 0.18;
        wrapperStyle.filter = 'grayscale(0.5)';
        wrapperStyle.zIndex = 1;
      }
    }

    return (
      <div
        key={entry.id}
        id={`card-${entry.id}`}
        style={wrapperStyle}
        onMouseEnter={() => {
          if (!hoverDisabled) {
            setHoveredCardId(entry.id);
          }
        }}
        onMouseLeave={() => {
          if (!hoverDisabled) {
            setHoveredCardId(null);
          }
        }}
      >
        {/* Dependency role indicator ring (focus mode only) */}
        {isDependencyOfFocused && (
          <div className="absolute -inset-[2px] rounded-lg pointer-events-none z-10"
            style={{
              boxShadow: `inset 0 0 0 2px rgba(148,163,184,0.35), 0 0 14px rgba(148,163,184,0.12)`,
            }}
          />
        )}
        {/* Overdue ring: past + not done */}
        {isOverdue && (
          <div
            className="absolute -inset-[1px] rounded-lg pointer-events-none z-10"
            style={{
              boxShadow: 'inset 0 0 0 1px rgba(180,80,30,0.45), 0 0 12px rgba(180,80,30,0.18)',
            }}
          />
        )}
        {cardElement}
      </div>
    );
  };

  // Determine which connections to show based on mode + hover
  const visibleConnections = connections.filter(conn => {
    if (nodeLineMode === 'all') return true;
    // focus mode: only show lines connected to the hovered card
    if (!hoveredCardId) return false;
    return conn.fromId === hoveredCardId || conn.toId === hoveredCardId;
  });

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-8 pb-16 relative"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const clickedCard = target.closest('[id^="card-"]');
        if (!clickedCard && onDeselect) {
          onDeselect();
        }
      }}
    >
      {/* SVG Connections Overlay */}
      {connections.length > 0 && (
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
          {connections.map((conn) => {
            let opacity = 0.1;
            const isRelated = hoveredCardId
              ? conn.fromId === hoveredCardId || conn.toId === hoveredCardId
              : false;

            if (nodeLineMode === 'focus' && isSplitView && selectedEntryId) {
              const isRelatedToSelected = conn.fromId === selectedEntryId || conn.toId === selectedEntryId;
              opacity = isRelatedToSelected ? 0.7 : 0;
            } else {
              const isVisible = visibleConnections.some(c => c.id === conn.id);

              // In "all" mode: dim unrelated when hovering; in "focus" mode: hide unless related
              opacity = (nodeLineMode === 'focus' || nodeLineMode === 'focus-no-offset')
                ? (isVisible ? 0.7 : 0)
                : (hoveredCardId ? (isRelated ? 0.75 : 0.08) : 0.1);
            }

            return (
              <g key={conn.id} style={{ transition: 'opacity 0.25s ease' }} opacity={opacity}>
                {/* Bezier wire */}
                <path
                  d={conn.d}
                  fill="none"
                  stroke={conn.color}
                  strokeWidth={isRelated ? 1.8 : 1.2}
                />

                {/* Bottom socket (on dependent card — outgoing port) */}
                <circle
                  cx={conn.xStart}
                  cy={conn.yStart}
                  r={4}
                  fill="#12161b"
                  stroke={conn.color}
                  strokeWidth={1.5}
                />

                {/* Top socket (on dependency card — incoming port) */}
                <circle
                  cx={conn.xEnd}
                  cy={conn.yEnd}
                  r={4}
                  fill="#12161b"
                  stroke={conn.color}
                  strokeWidth={1.5}
                />
              </g>
            );
          })}
        </svg>
      )}

      {groups.map((group, groupIdx) => (
        <div key={groupIdx} className="flex flex-col gap-4 animate-fadeIn">
          {/* Timeline separator line and date label */}
          <div
            id={`separator-${group.label.replace(/\s+/g, '-')}`}
            className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity select-none group/sep"
            onClick={() => handleHeaderClick(group.label)}
            title={isFocusActiveMode ? "Click to exit Focus and jump here" : "Jump to here"}
          >
            <span className="text-xs font-black dark:text-slate-400 text-slate-500 bg-slate-100 dark:bg-slate-900 border dark:border-slate-800 border-slate-200 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm font-dota group-hover/sep:border-slate-500/50 transition-colors">
              {group.label}
            </span>
            <div className="flex-1 h-[1px] dark:bg-slate-850 bg-slate-200 group-hover/sep:bg-slate-550/45 transition-colors" style={{ background: 'linear-gradient(90deg, rgba(148, 163, 184, 0.2) 0%, rgba(148, 163, 184, 0) 100%)' }} />
          </div>

          <div className={
            isSplitView
              ? "grid grid-cols-2 gap-4"
              : "grid grid-cols-1 min-[540px]:grid-cols-[repeat(auto-fill,512px)] gap-6"
          }>
            {group.items.map(renderCard)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;

