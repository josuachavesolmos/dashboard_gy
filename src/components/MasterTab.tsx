import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TabData, RawRow } from '../types';
import { groupBy, sumBy, topN } from '../utils/dataProcessors';
import { donutOpts, hbarOpts, vbarOpts, areaOpts, COLORS } from '../utils/chartConfig';
import EmptyState from './EmptyState';
import KPIRow, { KPI } from './KPIRow';
import ChartCard from './ChartCard';

interface MasterTabProps {
  data: TabData;
  onFilter: (filtered: RawRow[]) => void;
}

// Helper: derive status from Recent Updates or Status field
const getS = (r: RawRow): string =>
  (r['Recent Updates'] || r['Status'] || '').toString().trim();

// Helper: derive responsible from either variant of the column name
const getR = (r: RawRow): string =>
  (r['Responsible/ Project Manager'] || r['Responsible/ Project Manager '] || '').toString().trim();

export default function MasterTab({ data, onFilter }: MasterTabProps) {
  const [filters, setFilters] = useState({ status: '', installation: '', client: '', responsible: '', period: '' });
  const onFilterRef = useRef(onFilter);
  onFilterRef.current = onFilter;

  const uniqueValues = useMemo(() => {
    const raw = data.raw;
    return {
      status: [...new Set(raw.map(r => getS(r)))].filter(Boolean).sort(),
      installation: [...new Set(raw.map(r => (r['Installation'] || '').toString().trim()))].filter(Boolean).sort(),
      client: [...new Set(raw.map(r => (r['Client'] || '').toString().trim()))].filter(Boolean).sort(),
      responsible: [...new Set(raw.map(r => getR(r)))].filter(Boolean).sort(),
      period: [...new Set(raw.map(r => (r['PERIOD'] || '').toString()))].filter(Boolean).sort(),
    };
  }, [data.raw]);

  const filtered = useMemo(() => {
    let d = [...data.raw];
    if (filters.status) d = d.filter(r => getS(r) === filters.status);
    if (filters.installation) d = d.filter(r => (r['Installation'] || '').toString().trim() === filters.installation);
    if (filters.client) d = d.filter(r => (r['Client'] || '').toString().trim() === filters.client);
    if (filters.responsible) d = d.filter(r => getR(r) === filters.responsible);
    if (filters.period) d = d.filter(r => (r['PERIOD'] || '').toString() === filters.period);
    return d;
  }, [data.raw, filters]);

  useEffect(() => { onFilterRef.current(filtered); }, [filtered]);

  /* ── KPIs ── */
  const kpis = useMemo((): KPI[] => {
    const d = filtered;
    const total = d.length;
    const po = sumBy(d, 'PO Value');
    const inv = d.reduce((s, r) => s + (parseFloat(r['Invoice Value']) || 0), 0);
    const cmrs = d.map(r => parseFloat(r['CMR'])).filter(v => !isNaN(v) && v !== 0);
    const acmr = cmrs.length ? (cmrs.reduce((a, b) => a + b, 0) / cmrs.length * 100) : 0;
    const done = d.filter(r => {
      const s = getS(r).toLowerCase();
      return s.includes('invoic') || s.includes('complete');
    }).length;
    const cr = total > 0 ? (done / total * 100) : 0;
    return [
      { label: 'Work Orders', value: total, format: 'int', accent: 'var(--brand)' },
      { label: 'Total PO Value', value: po, format: 'cur', accent: 'var(--info)' },
      { label: 'Total Invoiced', value: inv, format: 'cur', accent: 'var(--success)' },
      { label: 'Avg CMR', value: acmr, format: 'pct', accent: 'var(--warning)' },
      { label: 'Completion', value: cr, format: 'pct', sub: `${done} invoiced`, accent: 'var(--warm)' },
    ];
  }, [filtered]);

  /* ── Chart 1: Work Order Status (Donut) ── */
  const statusOpts = useMemo((): ApexCharts.ApexOptions => {
    const mapped = filtered.map(r => ({ ...r, _s: getS(r) || '(blank)' }));
    const sg = groupBy(mapped, '_s');
    const sl = Object.keys(sg).sort((a, b) => sg[b].length - sg[a].length);
    return donutOpts(sl, sl.map(s => sg[s].length));
  }, [filtered]);

  /* ── Chart 2: Revenue by Installation (hbar top 10) ── */
  const installOpts = useMemo((): ApexCharts.ApexOptions => {
    const ig: Record<string, number> = {};
    filtered.forEach(r => {
      const i = (r['Installation'] || '').toString().trim() || '(blank)';
      ig[i] = (ig[i] || 0) + (parseFloat(r['PO Value']) || 0);
    });
    const ie = topN(ig, 10);
    return hbarOpts(ie.map(e => e[0]), ie.map(e => e[1]), true);
  }, [filtered]);

  /* ── Chart 3: Top Responsible (hbar top 8) ── */
  const respOpts = useMemo((): ApexCharts.ApexOptions => {
    const rg: Record<string, number> = {};
    filtered.forEach(r => {
      const rr = getR(r) || '(blank)';
      rg[rr] = (rg[rr] || 0) + (parseFloat(r['PO Value']) || 0);
    });
    const re = topN(rg, 8);
    return hbarOpts(re.map(e => e[0]), re.map(e => e[1]), true);
  }, [filtered]);

  /* ── Chart 4: PO Value vs Invoiced (vbar) ── */
  const poInvOpts = useMemo((): ApexCharts.ApexOptions => {
    const ipo: Record<string, number> = {};
    const iinv: Record<string, number> = {};
    filtered.forEach(r => {
      const i = (r['Installation'] || '').toString().trim() || '(blank)';
      ipo[i] = (ipo[i] || 0) + (parseFloat(r['PO Value']) || 0);
      iinv[i] = (iinv[i] || 0) + (parseFloat(r['Invoice Value']) || 0);
    });
    const ti = Object.entries(ipo).sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0]);
    return vbarOpts(ti, [
      { name: 'PO Value', data: ti.map(i => ipo[i] || 0) },
      { name: 'Invoiced', data: ti.map(i => iinv[i] || 0) },
    ]);
  }, [filtered]);

  /* ── Chart 5: Work Orders by Period (Area) ── */
  const periodOpts = useMemo((): ApexCharts.ApexOptions => {
    const prg = groupBy(filtered, 'PERIOD');
    const prl = Object.keys(prg).filter(p => p !== '(blank)').sort();
    return areaOpts(prl, prl.map(p => prg[p].length), 'Work Orders', COLORS[3]);
  }, [filtered]);

  /* ── Render ── */
  if (data.raw.length === 0) {
    return (
      <EmptyState
        icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
        title="Master Project Sheet"
        description="Upload the Guyana Master Project Sheet to view work order tracking, billing status, and project financials."
      />
    );
  }

  const resetFilters = () => setFilters({ status: '', installation: '', client: '', responsible: '', period: '' });

  return (
    <div>
      <div className="filter-group">
        <label>Status</label>
        <select className="filter-input" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All</option>
          {uniqueValues.status.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <label>Installation</label>
        <select className="filter-input" value={filters.installation} onChange={e => setFilters(f => ({ ...f, installation: e.target.value }))}>
          <option value="">All</option>
          {uniqueValues.installation.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <label>Client</label>
        <select className="filter-input" value={filters.client} onChange={e => setFilters(f => ({ ...f, client: e.target.value }))}>
          <option value="">All</option>
          {uniqueValues.client.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <label>Responsible</label>
        <select className="filter-input" value={filters.responsible} onChange={e => setFilters(f => ({ ...f, responsible: e.target.value }))}>
          <option value="">All</option>
          {uniqueValues.responsible.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <label>Period</label>
        <select className="filter-input" value={filters.period} onChange={e => setFilters(f => ({ ...f, period: e.target.value }))}>
          <option value="">All</option>
          {uniqueValues.period.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <button className="filter-reset" onClick={resetFilters}>Clear All</button>
      </div>

      <KPIRow kpis={kpis} />

      <div className="chart-grid">
        <ChartCard title="Work Order Status" options={statusOpts} />
        <ChartCard title="Revenue by Installation" options={installOpts} />
        <ChartCard title="Top Responsible" tag="by PO Value" options={respOpts} />
        <ChartCard title="PO Value vs Invoiced" options={poInvOpts} />
        <ChartCard title="Work Orders by Period" options={periodOpts} wide />
      </div>
    </div>
  );
}
