import React from 'react';
import { Trophy, Folder, FileText } from 'lucide-react';
import { PortfolioEntry } from '../types';
import PdfThumbnail from './PdfThumbnail';
import CardTitle from './CardTitle';

interface CardProps {
  entry: PortfolioEntry;
  onOpenFolder: (path: string) => void;
  onMore: (entry: PortfolioEntry) => void;
  thinnerCard?: boolean;
  isChecked?: boolean;
  onToggleChecked?: (id: string) => void;
  hasUnfinishedProjectDeps?: boolean;
  showOrbs?: boolean;
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
  // Find character frequencies to determine rendering order
  const count: Record<string, number> = {};
  for (const char of skillStr) {
    count[char] = (count[char] || 0) + 1;
  }
  const chars = Array.from(skillStr);
  let orderedChars = [...chars];

  // If there's a dominant character (count >= 2), we place it first to represent major type
  const entriesList = Object.entries(count);
  const dominant = entriesList.find(([_, val]) => val >= 2);
  if (dominant) {
    const domChar = dominant[0];
    const rest = chars.filter(c => c !== domChar);
    orderedChars = [domChar, domChar, ...rest];
  } else {
    // If no dominant one, use blue ('q') first
    const nonQ = chars.filter(c => c !== 'q');
    orderedChars = ['q', ...nonQ];
  }
  
  return [
    colors[orderedChars[0]] || defaultColor,
    colors[orderedChars[1]] || defaultColor,
    colors[orderedChars[2]] || defaultColor,
  ];
};

export const AchievementCard: React.FC<CardProps> = ({ 
  entry, 
  onOpenFolder, 
  onMore, 
  thinnerCard, 
  isChecked = false, 
  onToggleChecked,
  hasUnfinishedProjectDeps = false,
  showOrbs = true
}) => {
  const [color1, color2, color3] = getOrbColors(entry.skill);

  const borderAndGlowClasses = (hasUnfinishedProjectDeps || !isChecked)
    ? 'border-slate-400/80 achievement-card-silver-glow shadow-[0_0_20px_rgba(148,163,184,0.15)]'
    : 'dota-immortal-glow border-[#a3761a] hover:border-[#e4ae39] shadow-[0_0_20px_rgba(228,174,57,0.15)] pt-4';

  const badgeClasses = isChecked && !hasUnfinishedProjectDeps
    ? 'bg-amber-500/5 text-[#e4ae39] border-[#e4ae39]/30'
    : 'bg-slate-500/5 text-slate-400 border-slate-550/20';

  return (
    <div 
      onClick={() => onMore(entry)}
      className={`bg-[#121418]/90 border-[3px] rounded-xl transition-all duration-300 group relative overflow-hidden max-w-[512px] w-full flex flex-col justify-between mx-auto md:mx-0 cursor-pointer ${borderAndGlowClasses} ${
        thinnerCard ? 'min-h-[105px] py-3.5 px-4' : 'h-[396px] p-5'
      }`}
    >
      {/* Dota 2 Immortal Top Bar Indicator */}
      {isChecked && !hasUnfinishedProjectDeps && <div className="absolute top-0 left-0 right-0 dota-immortal-topbar z-20" />}

      {/* Decorative background trophy icon */}
      <div className="absolute -right-4 -bottom-4 opacity-5 dark:opacity-[0.03]">
        <Trophy size={100} />
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <div className={`flex gap-3 items-center shrink-0 ${thinnerCard ? 'mb-1.5' : 'mb-3'}`}>
          {/* Category Label Badge (far left) */}
          <span className={`text-[10px] tracking-wider font-extrabold px-2 py-0.5 rounded border whitespace-nowrap shrink-0 uppercase ${badgeClasses}`}>
            {isChecked && !hasUnfinishedProjectDeps ? 'IMMORTAL' : 'ACHIEVEMENT'}
          </span>
          
          {/* Center Details Block (title only, bigger) */}
          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-black transition-colors flex items-center min-w-0 w-full ${isChecked && !hasUnfinishedProjectDeps ? 'text-white' : 'dark:text-slate-100 text-slate-800'}`}>
              <CardTitle title={entry.title} />
            </h3>
          </div>

          {/* 3-Circle Orb Combo Icon (far right) */}
          {showOrbs && entry.skill && entry.skill.trim().length === 3 ? (
            <div className="w-8 h-7 relative shrink-0">
              <div className="absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color1, boxShadow: `0 0 8px ${color1}` }} />
              <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color2, boxShadow: `0 0 8px ${color2}` }} />
              <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color3, boxShadow: `0 0 8px ${color3}` }} />
            </div>
          ) : (
            <div className="w-8 h-7 shrink-0" />
          )}
        </div>

        {/* Date block: moved above thumbnail, aligned left */}
        <div className={`text-[10px] font-semibold dark:text-slate-400 text-slate-500 ${thinnerCard ? 'mb-1' : 'mb-2.5'}`}>
          {entry.datestart} {entry.dateend ? `→ ${entry.dateend}` : '→ Present'}
        </div>

        {/* Rarity & Slot Info for Immortal */}
        {isChecked && !hasUnfinishedProjectDeps && !thinnerCard && (
          <div className="text-[10px] font-bold text-slate-400 flex gap-4 mb-2.5">
            <span>Rarity: <span className="dota-immortal-text">Immortal</span></span>
            <span>Slot: <span className="text-slate-350">Achievement</span></span>
          </div>
        )}

        {!thinnerCard && (
          entry.imgPath ? (
            <div className={`w-full flex-1 min-h-0 rounded overflow-hidden bg-slate-900/50 flex items-center justify-center mb-3 border ${
              isChecked && !hasUnfinishedProjectDeps ? 'border-[#a3761a]/30' : 'border-amber-500/20 dark:border-slate-800'
            }`}>
              {entry.imgPath.toLowerCase().endsWith('.pdf') ? (
                <PdfThumbnail src={entry.imgPath} title={entry.title} />
              ) : (
                <img 
                  src={entry.imgPath} 
                  alt={entry.title} 
                  className="w-full h-full object-cover animate-fadeIn"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
            </div>
          ) : (
            <div className="w-full flex-1 min-h-0 rounded border border-dashed dark:border-slate-800 border-slate-200 flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs mb-3">
              No image preview available
            </div>
          )
        )}

        {/* Dota 2 Style Modifiers Section */}
        {isChecked && !hasUnfinishedProjectDeps && !thinnerCard && (
          <div className="mb-2.5 text-[10px] border-t border-[#a3761a]/25 pt-2 bg-black/20 p-2 rounded">
            <div className="font-extrabold uppercase text-slate-400 tracking-wider mb-1 flex items-center gap-1.5 select-none">
              <span>Modifiers</span>
              <div className="h-[1px] flex-1 bg-[#a3761a]/20" />
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-400">
              <div className="flex items-center gap-1">
                <span>💫</span>
                <span>Animation: Orbs combo</span>
              </div>
              <div className="flex items-center gap-1">
                <span>✨</span>
                <span>Ambient Effects: Golden Glow</span>
              </div>
              <div className="flex items-center gap-1">
                <span>☄️</span>
                <span>Custom Effects: Invoker HUD</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🔊</span>
                <span>Sound: Mastery Fanfare</span>
              </div>
            </div>
          </div>
        )}

        {/* Dota 2 Flavor Text */}
        {isChecked && !hasUnfinishedProjectDeps && !thinnerCard && (
          <div className="text-[10px] italic text-slate-500 font-medium font-serif mb-3 leading-snug border-t border-[#a3761a]/20 pt-1.5">
            "A testament of absolute focus, completed with master-class precision under the vigilant eyes of the Arsenal Magus."
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

        <div className="flex items-center gap-3 ml-auto">


          {onToggleChecked && (
            <label 
              onClick={(e) => e.stopPropagation()} 
              className={`flex items-center gap-1.5 text-[10px] cursor-pointer select-none font-semibold uppercase tracking-wider ml-1 ${
                isChecked && !hasUnfinishedProjectDeps ? 'text-[#e4ae39] hover:text-amber-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleChecked(entry.id);
                }}
                className="w-3.5 h-3.5 rounded border-slate-700 text-amber-500 focus:ring-[#e4ae39]/20 bg-slate-900 cursor-pointer"
              />
            </label>
          )}
        </div>
      </div>
      {/* Gold Bottom Bar for Immortal Card */}
      {isChecked && !hasUnfinishedProjectDeps && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#a3761a] via-[#e4ae39] to-[#a3761a]" />}
    </div>
  );
};

export default AchievementCard;
