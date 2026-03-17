import React from 'react';
import { TabType } from '../types';

interface MobileNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { key: TabType; label: string }[] = [
  { key: 'quote', label: 'Quote Log' },
  { key: 'personnel', label: 'Personnel' },
  { key: 'master', label: 'Master Project' },
];

export default function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  return (
    <nav className="mob-nav">
      {tabs.map(t => (
        <button
          key={t.key}
          className={`mob-tab ${activeTab === t.key ? 'active' : ''}`}
          onClick={() => onTabChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
