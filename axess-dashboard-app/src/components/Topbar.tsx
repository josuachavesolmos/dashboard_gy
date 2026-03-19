import React from 'react';
import { TabType } from '../types';

interface TopbarProps {
  activeTab: TabType;
  loading: Record<TabType, boolean>;
  loaded: Record<TabType, boolean>;
  onFileUpload: (file: File, type: TabType) => void;
  spConnected: boolean;
  spConfigured: boolean;
  lastUpdate: Date | null;
}

const TAB_TITLES: Record<TabType, string> = {
  quote: 'Quote Log',
  personnel: 'Personnel Planner',
  master: 'Master Project',
};

export default function Topbar({ activeTab, loading, loaded, onFileUpload, spConnected, spConfigured, lastUpdate }: TopbarProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, type: TabType) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file, type);
    e.target.value = '';
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2>{TAB_TITLES[activeTab]}</h2>
        <span>Operations Dashboard</span>
      </div>
      <div className="topbar-right">
        {spConfigured && (
          <div className={`sp-status ${spConnected ? 'connected' : ''}`}>
            <span className="sp-dot" />
            {spConnected
              ? `SharePoint${lastUpdate ? ` \u00b7 ${lastUpdate.toLocaleTimeString()}` : ''}`
              : 'SP disconnected'}
          </div>
        )}
        {(['quote', 'personnel', 'master'] as TabType[]).map(type => (
          <label
            key={type}
            className={`upload-pill ${loaded[type] ? 'loaded' : ''} ${loading[type] ? 'processing' : ''}`}
          >
            <span className="pill-dot" />
            <span className="pill-text">
              {type === 'quote' ? 'Quote Log' : type === 'personnel' ? 'Personnel' : 'Master Project'}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleChange(e, type)}
              aria-label={`Upload ${type} file`}
            />
          </label>
        ))}
      </div>
    </header>
  );
}
