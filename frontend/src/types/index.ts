export interface PortfolioEntry {
  id: string;
  source: 'proj' | 'cert' | 'item' | 'achv';
  title: string;
  datestart: string;
  dateend?: string;
  skill?: string;
  github?: string;
  linkedin?: string;
  folderPath: string;
  imgPath?: string;
  body: string;
}

export type OrbType = 'Q' | 'W' | 'E';

export interface DashboardStats {
  total: number;
  quas: number;
  wex: number;
  exort: number;
  gold: number;
  grey: number;
}
