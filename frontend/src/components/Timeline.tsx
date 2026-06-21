import React from 'react';
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

export const Timeline: React.FC<TimelineProps> = ({ entries, onOpenFolder, onMore, thinnerCard }) => {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed dark:border-slate-800 border-slate-200 rounded-xl bg-slate-500/5 backdrop-blur-sm animate-fadeIn">
        <Flame className="text-slate-400 dark:text-slate-600 mb-3 animate-pulse" size={36} />
        <p className="text-sm dark:text-slate-400 text-slate-500 font-semibold font-dota">
          No matches found in the archives.
        </p>
        <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">
          Adjust the search terms or change your invoked orb combinations.
        </p>
      </div>
    );
  }

  // Group chronologically
  const groups: { label: string; items: PortfolioEntry[] }[] = [];
  let currentLabel = '';
  let currentGroup: PortfolioEntry[] = [];

  entries.forEach((entry) => {
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
    switch (entry.source) {
      case 'proj':
        return <ProjectCard key={entry.id} entry={entry} onOpenFolder={onOpenFolder} onMore={onMore} thinnerCard={thinnerCard} />;
      case 'cert':
        return <CertCard key={entry.id} entry={entry} onOpenFolder={onOpenFolder} onMore={onMore} thinnerCard={thinnerCard} />;
      case 'item':
        return <ItemCard key={entry.id} entry={entry} onOpenFolder={onOpenFolder} onMore={onMore} thinnerCard={thinnerCard} />;
      case 'achv':
        return <AchievementCard key={entry.id} entry={entry} onOpenFolder={onOpenFolder} onMore={onMore} thinnerCard={thinnerCard} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      {groups.map((group, groupIdx) => (
        <div key={groupIdx} className="flex flex-col gap-4 animate-fadeIn">
          {/* Timeline separator line and date label */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-black dark:text-slate-400 text-slate-500 bg-slate-100 dark:bg-slate-900 border dark:border-slate-800 border-slate-200 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm font-dota">
              {group.label}
            </span>
            <div className="flex-1 h-[1px] dark:bg-slate-850 bg-slate-200" style={{ background: 'linear-gradient(90deg, rgba(148, 163, 184, 0.2) 0%, rgba(148, 163, 184, 0) 100%)' }} />
          </div>

          {/* Cards List in this Group */}
          <div className="grid grid-cols-1 min-[540px]:grid-cols-[repeat(auto-fill,512px)] gap-6">
            {group.items.map(renderCard)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;
