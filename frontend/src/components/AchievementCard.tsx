import React from 'react';
import { Trophy, Folder, FileText } from 'lucide-react';
import { PortfolioEntry } from '../types';
import PdfThumbnail from './PdfThumbnail';

interface CardProps {
  entry: PortfolioEntry;
  onOpenFolder: (path: string) => void;
  onMore: (entry: PortfolioEntry) => void;
  thinnerCard?: boolean;
  isChecked?: boolean;
  onToggleChecked?: (id: string) => void;
}

const getOrbColors = (skillStr: string | undefined) => {
  const defaultColor = '#334155'; // slate-700
  const colors: Record<string, string> = {
    q: '#00d0ff', // Quas Blue
    w: '#d000ff', // Wex Purple
    e: '#ff6a00', // Exort Orange
  };
  if (!skillStr || skillStr.length !== 3) {
    return [defaultColor, defaultColor, defaultColor];
  }
  const chars = skillStr.toLowerCase().split('');
  return [
    colors[chars[0]] || defaultColor,
    colors[chars[1]] || defaultColor,
    colors[chars[2]] || defaultColor,
  ];
};

export const AchievementCard: React.FC<CardProps> = ({ entry, onOpenFolder, onMore, thinnerCard, isChecked = false, onToggleChecked }) => {
  const [color1, color2, color3] = getOrbColors(entry.skill);

  return (
    <div 
      onClick={() => onMore(entry)}
      className={`bg-[#121418]/90 border-[3px] border-[#d4af50]/80 rounded-xl hover:border-slate-200/60 transition-all duration-300 achievement-card-glow shadow-[0_0_20px_rgba(212,175,80,0.25)] group relative overflow-hidden max-w-[512px] w-full flex flex-col justify-between mx-auto md:mx-0 cursor-pointer ${
        thinnerCard ? 'aspect-[4/1] p-3' : 'aspect-[4/3] p-5'
      }`}
    >
      {/* Decorative background trophy icon */}
      <div className="absolute -right-4 -bottom-4 opacity-5 dark:opacity-[0.03]">
        <Trophy size={100} />
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <div className={`flex gap-3 items-center shrink-0 ${thinnerCard ? 'mb-1.5' : 'mb-3'}`}>
          {/* Category Label Badge (far left) */}
          <span className="text-[10px] tracking-wider font-extrabold px-2.5 py-0.5 rounded bg-amber-500/5 text-[#d4af50] dark:text-[#d4af50]/90 border border-[#d4af50]/20 whitespace-nowrap shrink-0">
            ACHIEVEMENT
          </span>
          
          {/* Center Details Block (title only, bigger) */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black dark:text-slate-100 text-slate-800 transition-colors line-clamp-1">
              {entry.title}
            </h3>
          </div>

          {/* 3-Circle Orb Combo Icon (far right) */}
          <div className="w-8 h-7 relative shrink-0">
            <div className="absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color1, boxShadow: `0 0 8px ${color1}` }} />
            <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color2, boxShadow: `0 0 8px ${color2}` }} />
            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color3, boxShadow: `0 0 8px ${color3}` }} />
          </div>
        </div>

        {/* Date block: moved above thumbnail, aligned left */}
        <div className={`text-[10px] font-semibold dark:text-slate-400 text-slate-500 ${thinnerCard ? 'mb-1' : 'mb-2.5'}`}>
          {entry.datestart} {entry.dateend ? `→ ${entry.dateend}` : '→ Present'}
        </div>

        {entry.imgPath ? (
          <div className={`w-full flex-1 min-h-0 rounded overflow-hidden border border-amber-500/20 dark:border-slate-800 bg-slate-900/50 flex items-center justify-center ${
            thinnerCard ? 'mb-1.5' : 'mb-3'
          }`}>
            {entry.imgPath.toLowerCase().endsWith('.pdf') ? (
              <PdfThumbnail src={entry.imgPath} title={entry.title} />
            ) : (
              <img 
                src={entry.imgPath} 
                alt={entry.title} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            )}
          </div>
        ) : (
          <div className={`w-full flex-1 min-h-0 rounded border border-dashed dark:border-slate-800 border-slate-200 flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs ${
            thinnerCard ? 'mb-1.5' : 'mb-3'
          }`}>
            No image preview available
          </div>
        )}
      </div>

      <div className={`flex items-center justify-between text-xs relative z-10 border-t dark:border-slate-800/50 border-slate-100 shrink-0 ${
        thinnerCard ? 'pt-1.5' : 'pt-2'
      }`}>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onMore(entry); }} 
            className={`flex items-center gap-1 dark:bg-slate-800 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-slate-200 text-slate-700 rounded border dark:border-transparent border-amber-200 transition-colors ${
              thinnerCard ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs'
            }`}
          >
            <FileText size={12} />
            <span>More</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onOpenFolder(entry.folderPath); }} 
            className={`flex items-center gap-1 dark:bg-slate-800 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-slate-200 text-slate-700 rounded border dark:border-transparent border-amber-200 transition-colors ${
              thinnerCard ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs'
            }`}
          >
            <Folder size={12} />
            <span>Folder</span>
          </button>
        </div>

        {onToggleChecked && (
          <label 
            onClick={(e) => e.stopPropagation()} 
            className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer select-none font-semibold uppercase tracking-wider ml-2"
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                e.stopPropagation();
                onToggleChecked(entry.id);
              }}
              className="w-3.5 h-3.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 bg-slate-900 cursor-pointer"
            />
            <span>Done</span>
          </label>
        )}
      </div>
    </div>
  );
};

export default AchievementCard;
