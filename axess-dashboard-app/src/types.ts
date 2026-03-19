export type RawRow = Record<string, any>;

export interface TabData {
  raw: RawRow[];
  filtered: RawRow[];
}

export interface DataState {
  quote: TabData;
  personnel: TabData;
  master: TabData;
}

export type TabType = 'quote' | 'personnel' | 'master';

export interface SharePointConfig {
  clientId: string;
  tenantId: string;
  siteId: string;
  driveId: string;
  files: {
    quote: string;
    personnel: string;
    master: string;
  };
  pollInterval: number;
}
