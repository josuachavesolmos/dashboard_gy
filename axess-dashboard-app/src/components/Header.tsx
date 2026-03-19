import React, { useRef } from 'react';
import { TabType } from '../types';

interface HeaderProps {
  loading: Record<TabType, boolean>;
  loaded: Record<TabType, boolean>;
  onFileUpload: (file: File, type: TabType) => void;
  spConnected: boolean;
  spConfigured: boolean;
  lastUpdate: Date | null;
}

export default function Header({ loading, loaded, onFileUpload, spConnected, spConfigured, lastUpdate }: HeaderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, type: TabType) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file, type);
    e.target.value = '';
  };

  return (
    <header className="header">
      <div className="header-brand">
        <h1>AXESS</h1>
        <div className="divider" />
        <span>Operations Dashboard</span>
      </div>
      <div className="header-actions" role="toolbar" aria-label="File uploads">
        {spConfigured && (
          <div className={`sp-status ${spConnected ? 'connected' : ''}`}>
            <span className="dot" />
            {spConnected
              ? `SharePoint${lastUpdate ? ` \u00b7 ${lastUpdate.toLocaleTimeString()}` : ''}`
              : 'SharePoint disconnected'}
          </div>
        )}
        {(['quote', 'personnel', 'master'] as TabType[]).map(type => (
          <label
            key={type}
            className={`upload-btn ${loaded[type] ? 'loaded' : ''} ${loading[type] ? 'processing' : ''}`}
          >
            <span className="indicator" />
            {type === 'quote' ? 'Quote Log' : type === 'personnel' ? 'Personnel' : 'Master Project'}
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
