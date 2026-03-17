import React, { useState, useCallback, useEffect } from 'react';
import { app } from '@microsoft/teams-js';
import { DataState, TabType, RawRow } from './types';
import { readFileAsWorkbook, processQuoteWorkbook, processPersonnelWorkbook, processMasterWorkbook } from './utils/excelProcessors';
import { isSharePointConfigured } from './services/authConfig';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import MobileNav from './components/MobileNav';
import QuoteTab from './components/QuoteTab';
import PersonnelTab from './components/PersonnelTab';
import MasterTab from './components/MasterTab';

const emptyTab = { raw: [] as RawRow[], filtered: [] as RawRow[] };

export default function App() {
  const [data, setData] = useState<DataState>({
    quote: { ...emptyTab },
    personnel: { ...emptyTab },
    master: { ...emptyTab },
  });
  const [activeTab, setActiveTab] = useState<TabType>('quote');
  const [loading, setLoading] = useState<Record<TabType, boolean>>({ quote: false, personnel: false, master: false });
  const [spConnected, setSpConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('ax-theme') as 'light' | 'dark') || 'light';
  });

  // Sidebar collapsed
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('ax-collapsed') === 'true';
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ax-theme', theme);
  }, [theme]);

  // Apply collapsed class to body
  useEffect(() => {
    document.body.classList.toggle('collapsed', collapsed);
    localStorage.setItem('ax-collapsed', String(collapsed));
    // Trigger resize after sidebar animation for charts
    const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
    return () => clearTimeout(timer);
  }, [collapsed]);

  // Try to initialize Teams SDK
  useEffect(() => {
    (async () => {
      try {
        await app.initialize();
      } catch {
        // Not in Teams — standalone mode
      }
    })();
  }, []);

  const handleFileUpload = useCallback(async (file: File, type: TabType) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      const wb = await readFileAsWorkbook(file);
      let rows: RawRow[];
      if (type === 'quote') rows = processQuoteWorkbook(wb);
      else if (type === 'personnel') rows = processPersonnelWorkbook(wb);
      else rows = processMasterWorkbook(wb);

      setData(prev => ({
        ...prev,
        [type]: { raw: rows, filtered: rows },
      }));
      setLastUpdate(new Date());
    } catch (err: any) {
      alert('Error processing file: ' + err.message);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  }, []);

  const updateFiltered = useCallback((type: TabType, filtered: RawRow[]) => {
    setData(prev => ({
      ...prev,
      [type]: { ...prev[type], filtered },
    }));
  }, []);

  const handleQuoteFilter = useCallback((filtered: RawRow[]) => updateFiltered('quote', filtered), [updateFiltered]);
  const handlePersonnelFilter = useCallback((filtered: RawRow[]) => updateFiltered('personnel', filtered), [updateFiltered]);
  const handleMasterFilter = useCallback((filtered: RawRow[]) => updateFiltered('master', filtered), [updateFiltered]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed(c => !c);
  }, []);

  const spConfigured = isSharePointConfigured();

  return (
    <>
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          quote: data.quote.filtered.length,
          personnel: data.personnel.filtered.length,
          master: data.master.filtered.length,
        }}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className="wrapper">
        <Topbar
          activeTab={activeTab}
          loading={loading}
          loaded={{
            quote: data.quote.raw.length > 0,
            personnel: data.personnel.raw.length > 0,
            master: data.master.raw.length > 0,
          }}
          onFileUpload={handleFileUpload}
          spConnected={spConnected}
          spConfigured={spConfigured}
          lastUpdate={lastUpdate}
        />
        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="content">
          <section className={`tab-section ${activeTab === 'quote' ? 'active' : ''}`}>
            <QuoteTab data={data.quote} onFilter={handleQuoteFilter} />
          </section>
          <section className={`tab-section ${activeTab === 'personnel' ? 'active' : ''}`}>
            <PersonnelTab data={data.personnel} onFilter={handlePersonnelFilter} />
          </section>
          <section className={`tab-section ${activeTab === 'master' ? 'active' : ''}`}>
            <MasterTab data={data.master} onFilter={handleMasterFilter} />
          </section>
        </main>
      </div>
    </>
  );
}
