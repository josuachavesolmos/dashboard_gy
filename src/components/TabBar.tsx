import React from 'react';
import { TabType } from '../types';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts: Record<TabType, number>;
}

const tabs: { key: TabType; label: string }[] = [
  { key: 'quote', label: 'Quote Log' },
  { key: 'personnel', label: 'Personnel Planner' },
  { key: 'master', label: 'Master Project' },
];

export default function TabBar({ activeTab, onTabChange, counts }: TabBarProps) {
  return (
    <nav className="tab-bar" role="tablist" aria-label="Dashboard sections">
      {tabs.map(t => (
        <button
          key={t.key}
          className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === t.key}
          onClick={() => onTabChange(t.key)}
        >
          {t.label}
          <span className="count">{counts[t.key] || '\u2014'}</span>
        </button>
      ))}
    </nav>
  );
}
