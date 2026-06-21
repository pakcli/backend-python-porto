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
  attachments?: string[];
  body: string;
  done?: boolean;
}

export type OrbType = 'Q' | 'W' | 'E';

export interface StatValue {
  done: number;
  upcoming: number;
}

export interface DashboardStats {
  total: StatValue;
  quas: StatValue;
  wex: StatValue;
  exort: StatValue;
  gold: StatValue;
  grey: StatValue;
}
