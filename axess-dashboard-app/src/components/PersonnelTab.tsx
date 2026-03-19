import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TabData, RawRow } from '../types';
import { groupBy, topN, excelDate } from '../utils/dataProcessors';
import { donutOpts, hbarOpts, vbarOpts, COLORS } from '../utils/chartConfig';
import EmptyState from './EmptyState';
import KPIRow, { KPI } from './KPIRow';
import ChartCard from './ChartCard';
import GanttChart from './GanttChart';
import AssignmentsTable from './AssignmentsTable';

interface PersonnelTabProps {
  data: TabData;
  onFilter: (filtered: RawRow[]) => void;
}

type ViewMode = 'gantt' | 'charts';

export default function PersonnelTab({ data, onFilter }: PersonnelTabProps) {
  const [filters, setFilters] = useState({ status: '', client: '', installation: '', classification: '', from: '', to: '' });
  const [view, setView] = useState<ViewMode>('gantt');
  const onFilterRef = useRef(onFilter);
  onFilterRef.current = onFilter;

  const uniqueValues = useMemo(() => {
    const raw = data.raw;
    return {
      status: [...new Set(raw.map(r => (r['Status'] || '').toString().trim()))].filter(Boolean).sort(),
      client: [...new Set(raw.map(r => (r['Client'] || '').toString().trim()))].filter(Boolean).sort(),
      installation: [...new Set(raw.map(r => (r['Installation'] || '').toString().trim()))].filter(Boolean).sort(),
      classification: [...new Set(raw.map(r => (r['Support Classification'] || '').toString().trim()))].filter(Boolean).sort(),
    };
  }, [data.raw]);

  const filtered = useMemo(() => {
    let d = [...data.raw];
    if (filters.status) d = d.filter(r => (r['Status'] || '').toString().trim() === filters.status);
    if (filters.client) d = d.filter(r => (r['Client'] || '').toString().trim() === filters.client);
    if (filters.installation) d = d.filter(r => (r['Installation'] || '').toString().trim() === filters.installation);
    if (filters.classification) d = d.filter(r => (r['Support Classification'] || '').toString().trim() === filters.classification);
    if (filters.from) d = d.filter(r => { const x = excelDate(r['Start Date']); return x && x >= new Date(filters.from); });
    if (filters.to) d = d.filter(r => { const x = excelDate(r['End Date']); return x && x <= new Date(filters.to + 'T23:59:59'); });
    return d;
  }, [data.raw, filters]);

  useEffect(() => { onFilterRef.current(filtered); }, [filtered]);

  // KPIs: Total Assignments, Unique Technicians, Total Man-Days, Avg Duration, Offshore Rate
  const kpis = useMemo((): KPI[] => {
    const d = filtered;
    const total = d.length;
    const techs = new Set(d.map(r => (r['Technician Name'] || '').toString().trim())).size;
    let totalDays = 0;
    let cnt = 0;
    d.forEach(r => {
      const s = excelDate(r['Start Date']);
      const e = excelDate(r['End Date']);
      if (s && e) {
        totalDays += Math.max(0, Math.round((e.getTime() - s.getTime()) / 864e5));
        cnt++;
      }
    });
    const avg = cnt > 0 ? (totalDays / cnt) : 0;
    const off = d.filter(r => (r['Status'] || '').toString().trim() === 'Offshore').length;
    const pct = total > 0 ? (off / total * 100) : 0;
    return [
      { label: 'Total Assignments', value: total, format: 'int', accent: 'var(--brand)' },
      { label: 'Unique Technicians', value: techs, format: 'int', accent: 'var(--info)' },
      { label: 'Total Man-Days', value: totalDays, format: 'int', accent: 'var(--success)' },
      { label: 'Avg Duration', value: avg, format: 'days', accent: 'var(--warning)' },
      { label: 'Offshore Rate', value: pct, format: 'pct', accent: 'var(--warm)', sub: `${off} of ${total}` },
    ];
  }, [filtered]);

  // --- Charts (only computed when in charts view for perf) ---

  // Chart: Status Distribution (donut)
  const statusOpts = useMemo(() => {
    if (view !== 'charts') return null;
    const sg = groupBy(filtered, 'Status');
    const sl = Object.keys(sg).sort((a, b) => sg[b].length - sg[a].length);
    return donutOpts(sl, sl.map(s => sg[s].length));
  }, [filtered, view]);

  // Chart: Support Classification (donut)
  const classOpts = useMemo(() => {
    if (view !== 'charts') return null;
    const cg = groupBy(filtered, 'Support Classification');
    const cl = Object.keys(cg).sort((a, b) => cg[b].length - cg[a].length);
    return donutOpts(cl, cl.map(c => cg[c].length));
  }, [filtered, view]);

  // Chart: Personnel by Installation (hbar top 12)
  const installOpts = useMemo(() => {
    if (view !== 'charts') return null;
    const ig = groupBy(filtered, 'Installation');
    const ie = Object.entries(ig)
      .map(([k, v]) => [k, v.length] as [string, number])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
    return hbarOpts(ie.map(e => e[0]), ie.map(e => e[1]), true);
  }, [filtered, view]);

  // Chart: Personnel by Client (vbar)
  const clientOpts = useMemo(() => {
    if (view !== 'charts') return null;
    const clg = groupBy(filtered, 'Client');
    const cle = Object.entries(clg)
      .map(([k, v]) => [k, v.length] as [string, number])
      .sort((a, b) => b[1] - a[1]);
    return vbarOpts(
      cle.map(e => e[0]),
      [{ name: 'Assignments', data: cle.map(e => e[1]) }]
    );
  }, [filtered, view]);

  // Chart: Top Competencies (hbar top 10)
  const compOpts = useMemo(() => {
    if (view !== 'charts') return null;
    const cpg = groupBy(filtered, 'Competency');
    const cpe = Object.entries(cpg)
      .map(([k, v]) => [k, v.length] as [string, number])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    return hbarOpts(
      cpe.map(e => e[0].length > 38 ? e[0].substring(0, 38) + '\u2026' : e[0]),
      cpe.map(e => e[1]),
      true
    );
  }, [filtered, view]);

  // Chart: Man-Days by Client (hbar)
  const mandaysOpts = useMemo(() => {
    if (view !== 'charts') return null;
    const cd: Record<string, number> = {};
    filtered.forEach(r => {
      const cl = (r['Client'] || '').toString().trim() || '(blank)';
      const s = excelDate(r['Start Date']);
      const e = excelDate(r['End Date']);
      if (s && e) {
        cd[cl] = (cd[cl] || 0) + Math.max(0, Math.round((e.getTime() - s.getTime()) / 864e5));
      }
    });
    const de = topN(cd);
    return hbarOpts(de.map(e => e[0]), de.map(e => e[1]), true);
  }, [filtered, view]);

  if (data.raw.length === 0) {
    return (
      <EmptyState
        icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        title="Personnel Planner"
        description="Upload the Personnel Planner Excel file to visualize technician assignments, utilization, and workforce distribution."
      />
    );
  }

  const resetFilters = () => setFilters({ status: '', client: '', installation: '', classification: '', from: '', to: '' });

  return (
    <div>
      {/* Filters bar */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>From</label>
          <input
            type="date"
            className="filter-input"
            value={filters.from}
            onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
          />
        </div>
        <div className="filter-group">
          <label>To</label>
          <input
            type="date"
            className="filter-input"
            value={filters.to}
            onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
          />
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select
            className="filter-input"
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">All</option>
            {uniqueValues.status.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Client</label>
          <select
            className="filter-input"
            value={filters.client}
            onChange={e => setFilters(f => ({ ...f, client: e.target.value }))}
          >
            <option value="">All</option>
            {uniqueValues.client.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Installation</label>
          <select
            className="filter-input"
            value={filters.installation}
            onChange={e => setFilters(f => ({ ...f, installation: e.target.value }))}
          >
            <option value="">All</option>
            {uniqueValues.installation.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Classification</label>
          <select
            className="filter-input"
            value={filters.classification}
            onChange={e => setFilters(f => ({ ...f, classification: e.target.value }))}
          >
            <option value="">All</option>
            {uniqueValues.classification.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button className="filter-reset" onClick={resetFilters}>Clear All</button>
      </div>

      {/* KPIs */}
      <KPIRow kpis={kpis} />

      {/* View toggle */}
      <div className="p-view-toggle">
        <button
          className={`p-view-btn${view === 'gantt' ? ' active' : ''}`}
          onClick={() => setView('gantt')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="4" rx="1" />
            <rect x="3" y="10" width="12" height="4" rx="1" />
            <rect x="3" y="16" width="15" height="4" rx="1" />
          </svg>
          Gantt Calendar
        </button>
        <button
          className={`p-view-btn${view === 'charts' ? ' active' : ''}`}
          onClick={() => setView('charts')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Charts
        </button>
      </div>

      {/* Gantt View */}
      {view === 'gantt' && (
        <>
          <GanttChart data={filtered} />
          <AssignmentsTable data={filtered} />
        </>
      )}

      {/* Charts View */}
      {view === 'charts' && statusOpts && classOpts && installOpts && clientOpts && compOpts && mandaysOpts && (
        <div className="chart-grid">
          <ChartCard title="Status Distribution" options={statusOpts} />
          <ChartCard title="Support Classification" options={classOpts} />
          <ChartCard title="Personnel by Installation" options={installOpts} />
          <ChartCard title="Personnel by Client" options={clientOpts} />
          <ChartCard title="Top Competencies" options={compOpts} />
          <ChartCard title="Man-Days by Client" options={mandaysOpts} />
        </div>
      )}
    </div>
  );
}
