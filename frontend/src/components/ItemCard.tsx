import React from 'react';
import { Cpu, Folder, FileText } from 'lucide-react';
import { PortfolioEntry } from '../types';

interface CardProps {
  entry: PortfolioEntry;
  onOpenFolder: (path: string) => void;
  onMore: (entry: PortfolioEntry) => void;
  thinnerCard?: boolean;
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

export const ItemCard: React.FC<CardProps> = ({ entry, onOpenFolder, onMore, thinnerCard }) => {
  const [color1, color2, color3] = getOrbColors(entry.skill);

  return (
    <div className={`bg-[#12161b]/95 border border-slate-800 rounded-lg hover:border-slate-650 transition-all duration-300 shadow-md group relative overflow-hidden max-w-[512px] w-full flex flex-col justify-between mx-auto md:mx-0 ${
      thinnerCard ? 'aspect-[4/1] p-3' : 'aspect-[4/3] p-5'
    }`}>
      {/* Decorative icon background */}
      <div className="absolute -right-6 -bottom-6 opacity-5 dark:opacity-[0.03] group-hover:scale-110 transition-transform">
        <Cpu size={120} />
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <div className={`flex gap-3 items-start shrink-0 ${thinnerCard ? 'mb-1.5' : 'mb-3'}`}>
          {/* 3-Circle Orb Combo Icon */}
          <div className="w-8 h-7 relative shrink-0">
            <div className="absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color1, boxShadow: `0 0 8px ${color1}` }} />
            <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color2, boxShadow: `0 0 8px ${color2}` }} />
            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color3, boxShadow: `0 0 8px ${color3}` }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2">
              <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800 group-hover:text-amber-500 dark:group-hover:text-exort transition-colors truncate">
                {entry.title}
              </h3>
              <span className="text-[8px] tracking-wider font-semibold px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/10 whitespace-nowrap">
                ITEM
              </span>
            </div>
            <div className="text-[10px] dark:text-slate-400 text-slate-500">
              {entry.datestart} {entry.dateend ? `→ ${entry.dateend}` : '→ Present'}
            </div>
          </div>
        </div>

        {entry.imgPath ? (
          <div className={`w-full flex-1 min-h-0 rounded overflow-hidden border dark:border-slate-800 border-slate-200 bg-slate-900/50 flex items-center justify-center ${
            thinnerCard ? 'mb-1.5' : 'mb-3'
          }`}>
            <img 
              src={entry.imgPath} 
              alt={entry.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className={`w-full flex-1 min-h-0 rounded border border-dashed dark:border-slate-800 border-slate-200 flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs ${
            thinnerCard ? 'mb-1.5' : 'mb-3'
          }`}>
            No image preview available
          </div>
        )}
      </div>

      <div className={`flex gap-2 text-xs relative z-10 border-t dark:border-slate-800/50 border-slate-100 shrink-0 ${
        thinnerCard ? 'pt-1.5' : 'pt-2'
      }`}>
        <button 
          onClick={() => onMore(entry)} 
          className={`flex items-center gap-1 dark:bg-slate-800 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-slate-200 text-slate-300 rounded transition-colors ${
            thinnerCard ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs'
          }`}
        >
          <FileText size={12} />
          <span>More</span>
        </button>
        <button 
          onClick={() => onOpenFolder(entry.folderPath)} 
          className={`flex items-center gap-1 dark:bg-slate-800 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-slate-200 text-slate-300 rounded transition-colors ${
            thinnerCard ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs'
          }`}
        >
          <Folder size={12} />
          <span>Folder</span>
        </button>
      </div>
    </div>
  );
};

export default ItemCard;
