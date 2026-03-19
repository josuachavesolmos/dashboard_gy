import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TabData, RawRow } from '../types';
import { groupBy, sumBy, avgBy, topN, parseDate } from '../utils/dataProcessors';
import { fmt } from '../utils/formatters';
import { donutOpts, hbarOpts, vbarOpts, areaOpts, treemapOpts, COLORS } from '../utils/chartConfig';
import EmptyState from './EmptyState';
import KPIRow, { KPI } from './KPIRow';
import ChartCard from './ChartCard';

interface QuoteTabProps {
  data: TabData;
  onFilter: (filtered: RawRow[]) => void;
}

export default function QuoteTab({ data, onFilter }: QuoteTabProps) {
  const [filters, setFilters] = useState({ status: '', segment: '', customer: '', responsible: '', from: '', to: '' });
  const onFilterRef = useRef(onFilter);
  onFilterRef.current = onFilter;

  const uniqueValues = useMemo(() => {
    const raw = data.raw;
    return {
      status: [...new Set(raw.map(r => r['Status']))].filter(Boolean).sort(),
      segment: [...new Set(raw.map(r => r['Segment']))].filter(Boolean).sort(),
      customer: [...new Set(raw.map(r => r['Customer']))].filter(Boolean).sort(),
      responsible: [...new Set(raw.map(r => (r['Responsible'] || '').split('@')[0].replace(/\./g, ' ').trim()))].filter(Boolean).sort(),
    };
  }, [data.raw]);

  const filtered = useMemo(() => {
    let d = [...data.raw];
    if (filters.status) d = d.filter(r => r['Status'] === filters.status);
    if (filters.segment) d = d.filter(r => r['Segment'] === filters.segment);
    if (filters.customer) d = d.filter(r => r['Customer'] === filters.customer);
    if (filters.responsible) d = d.filter(r => (r['Responsible'] || '').split('@')[0].replace(/\./g, ' ').trim() === filters.responsible);
    if (filters.from) d = d.filter(r => { const x = parseDate(r['Quote Date']); return x && x >= new Date(filters.from); });
    if (filters.to) d = d.filter(r => { const x = parseDate(r['Quote Date']); return x && x <= new Date(filters.to + 'T23:59:59'); });
    return d;
  }, [data.raw, filters]);

  useEffect(() => { onFilterRef.current(filtered); }, [filtered]);

  /* ── KPIs ── */
  const kpis = useMemo((): KPI[] => {
    const d = filtered;
    const total = d.length;
    const rev = sumBy(d, 'Sum Total Base Currency');
    const weighted = sumBy(d, 'Weighted Probability Sum');
    const cmr = avgBy(d, 'CMR Total');
    const acc = d.filter(r => r['Status'] === 'Accepted').length;
    const dec = d.filter(r => r['Status'] === 'Accepted' || r['Status'] === 'Rejected').length;
    const wr = dec > 0 ? (acc / dec * 100) : 0;
    return [
      { label: 'Total Quotes', value: total, format: 'int', sub: `${d.filter(r => r['Status'] === 'Draft').length} drafts pending`, accent: 'var(--brand)' },
      { label: 'Total Revenue', value: rev, format: 'cur', sub: 'Base currency (NOK)', accent: 'var(--success)' },
      { label: 'Weighted Pipeline', value: weighted, format: 'cur', sub: 'Probability-adjusted', accent: 'var(--info)' },
      { label: 'Avg CMR', value: cmr, format: 'pct', sub: 'Contribution margin', accent: 'var(--warning)' },
      { label: 'Win Rate', value: wr, format: 'pct', sub: `${acc} won / ${dec} decided`, accent: 'var(--warm)' },
    ];
  }, [filtered]);

  /* ── Chart 1: Sales Funnel ── */
  const funnelOpts = useMemo((): ApexCharts.ApexOptions => {
    const so = ['Draft', 'Sent', 'Accepted', 'Rejected'];
    const sc = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'];
    const sv = so.map(s => filtered.filter(r => r['Status'] === s).length);
    return {
      chart: { type: 'bar', height: '100%' },
      series: [{ data: sv }],
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '55%', distributed: true } },
      colors: sc,
      xaxis: { categories: so },
      yaxis: { labels: { style: { fontSize: '12px', fontWeight: 600 } } },
      dataLabels: {
        enabled: true,
        formatter: (v: number) => `${v} quotes`,
        style: { fontSize: '12px', fontWeight: '600' },
      },
      legend: { show: false },
      grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
      tooltip: {
        y: {
          formatter: (v: number) => `${v} quotes (${filtered.length > 0 ? (v / filtered.length * 100).toFixed(1) : 0}%)`,
        },
      },
    };
  }, [filtered]);

  /* ── Chart 2: Revenue by Segment (Treemap) ── */
  const segmentOpts = useMemo((): ApexCharts.ApexOptions => {
    const sg = groupBy(filtered, 'Segment');
    const se = topN(Object.fromEntries(Object.entries(sg).map(([k, v]) => [k, sumBy(v, 'Sum Total Base Currency')])));
    return treemapOpts(se);
  }, [filtered]);

  /* ── Chart 3: Top 10 Clients ── */
  const clientsOpts = useMemo((): ApexCharts.ApexOptions => {
    const cg = groupBy(filtered, 'Customer');
    const ce = topN(Object.fromEntries(Object.entries(cg).map(([k, v]) => [k, sumBy(v, 'Sum Total Base Currency')])));
    return hbarOpts(ce.map(e => e[0]), ce.map(e => e[1]), true);
  }, [filtered]);

  /* ── Chart 4: Pipeline by Probability ── */
  const probabilityOpts = useMemo((): ApexCharts.ApexOptions => {
    const pg = groupBy(filtered, 'Probability');
    const pl = Object.keys(pg).sort((a, b) => +a - +b);
    return vbarOpts(
      pl.map(p => p + '%'),
      [
        { name: 'Weighted', data: pl.map(p => sumBy(pg[p], 'Weighted Probability Sum')) },
        { name: 'Total', data: pl.map(p => sumBy(pg[p], 'Sum Total Base Currency')) },
      ],
    );
  }, [filtered]);

  /* ── Chart 5: Top Products ── */
  const productsOpts = useMemo((): ApexCharts.ApexOptions => {
    const prg = groupBy(filtered, 'Axess Product');
    const pre = topN(Object.fromEntries(Object.entries(prg).map(([k, v]) => [k, sumBy(v, 'Sum Total Base Currency')])));
    return hbarOpts(
      pre.map(e => e[0].length > 38 ? e[0].substring(0, 38) + '\u2026' : e[0]),
      pre.map(e => e[1]),
      true,
    );
  }, [filtered]);

  /* ── Chart 6: Revenue by Responsible ── */
  const responsibleOpts = useMemo((): ApexCharts.ApexOptions => {
    const rg = groupBy(filtered, 'Responsible');
    const re = topN(Object.fromEntries(Object.entries(rg).map(([k, v]) => [k.split('@')[0].replace(/\./g, ' ').trim(), sumBy(v, 'Sum Total Base Currency')])));
    return hbarOpts(re.map(e => e[0]), re.map(e => e[1]), true);
  }, [filtered]);

  /* ── Chart 7: Quotes Timeline (Area) ── */
  const timelineOpts = useMemo((): ApexCharts.ApexOptions => {
    const byM: Record<string, number> = {};
    filtered.forEach(r => {
      const dt = parseDate(r['Quote Date']);
      if (dt) {
        const k = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
        byM[k] = (byM[k] || 0) + 1;
      }
    });
    const tl = Object.keys(byM).sort();
    return areaOpts(tl, tl.map(k => byM[k]), 'Quotes');
  }, [filtered]);

  const timelineMonths = useMemo(() => {
    const byM: Record<string, number> = {};
    filtered.forEach(r => {
      const dt = parseDate(r['Quote Date']);
      if (dt) {
        const k = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
        byM[k] = (byM[k] || 0) + 1;
      }
    });
    return Object.keys(byM).length;
  }, [filtered]);

  /* ── Chart 8: CMR by Segment ── */
  const cmrOpts = useMemo((): ApexCharts.ApexOptions => {
    const sg = groupBy(filtered, 'Segment');
    const cmrs = Object.entries(sg)
      .map(([k, v]) => [k, avgBy(v, 'CMR Total')] as [string, number])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    return {
      chart: { type: 'bar', height: '100%' },
      series: [{ data: cmrs.map(e => e[1]) }],
      plotOptions: { bar: { borderRadius: 5, columnWidth: '55%', distributed: true } },
      colors: cmrs.map((_, i) => COLORS[i % COLORS.length]),
      xaxis: { categories: cmrs.map(e => e[0]), labels: { style: { fontSize: '10px' } } },
      yaxis: { labels: { formatter: (v: number) => v.toFixed(1) + '%' } },
      dataLabels: { enabled: false },
      legend: { show: false },
      tooltip: { y: { formatter: (v: number) => v.toFixed(1) + '%' } },
    };
  }, [filtered]);

  /* ── Chart 9: Win Rate by Segment ── */
  const winrateOpts = useMemo((): ApexCharts.ApexOptions => {
    const sg = groupBy(filtered, 'Segment');
    const wrSegs = Object.entries(sg)
      .map(([k, v]) => {
        const a = v.filter(r => r['Status'] === 'Accepted').length;
        const dec = v.filter(r => r['Status'] === 'Accepted' || r['Status'] === 'Rejected').length;
        return [k, dec > 0 ? (a / dec * 100) : 0, dec] as [string, number, number];
      })
      .filter(e => e[2] > 0)
      .sort((a, b) => b[1] - a[1]);
    return {
      chart: { type: 'bar', height: '100%' },
      series: [{ data: wrSegs.map(e => e[1]) }],
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '60%', distributed: true } },
      colors: wrSegs.map(e => e[1] >= 50 ? '#10b981' : '#f59e0b'),
      xaxis: {
        categories: wrSegs.map(e => e[0]),
        max: 100,
        labels: { formatter: (v: string) => Number(v).toFixed(0) + '%' },
      },
      yaxis: { labels: { style: { fontSize: '11px' }, maxWidth: 160 } },
      dataLabels: {
        enabled: true,
        formatter: (v: number) => v.toFixed(1) + '%',
        style: { fontSize: '11px', fontWeight: '500' },
      },
      legend: { show: false },
      tooltip: {
        y: {
          formatter: (v: number, opts: any) => {
            const idx = opts.dataPointIndex;
            return `${v.toFixed(1)}% (${wrSegs[idx]?.[2] ?? 0} decided)`;
          },
        },
      },
      grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    };
  }, [filtered]);

  /* ── Render ── */
  if (data.raw.length === 0) {
    return (
      <EmptyState
        icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
        title="Quote Log"
        description="Upload the QuoteLog Excel file to visualize your sales pipeline, revenue metrics, and contribution margins."
      />
    );
  }

  const resetFilters = () => setFilters({ status: '', segment: '', customer: '', responsible: '', from: '', to: '' });

  return (
    <div>
      <div className="filter-group">
        <label>From</label>
        <input type="date" className="filter-input" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        <label>To</label>
        <input type="date" className="filter-input" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
        <label>Status</label>
        <select className="filter-input" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All</option>
          {uniqueValues.status.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <label>Segment</label>
        <select className="filter-input" value={filters.segment} onChange={e => setFilters(f => ({ ...f, segment: e.target.value }))}>
          <option value="">All</option>
          {uniqueValues.segment.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <label>Customer</label>
        <select className="filter-input" value={filters.customer} onChange={e => setFilters(f => ({ ...f, customer: e.target.value }))}>
          <option value="">All</option>
          {uniqueValues.customer.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <label>Responsible</label>
        <select className="filter-input" value={filters.responsible} onChange={e => setFilters(f => ({ ...f, responsible: e.target.value }))}>
          <option value="">All</option>
          {uniqueValues.responsible.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <button className="filter-reset" onClick={resetFilters}>Clear All</button>
      </div>

      <KPIRow kpis={kpis} />

      <div className="chart-grid">
        <ChartCard title="Sales Funnel" tag="by Status" total={`${filtered.length} total`} options={funnelOpts} />
        <ChartCard title="Revenue by Segment" options={segmentOpts} />
        <ChartCard title="Top 10 Clients" tag="by Revenue" options={clientsOpts} />
        <ChartCard title="Pipeline by Probability" options={probabilityOpts} />
        <ChartCard title="Top Products" tag="by Revenue" options={productsOpts} />
        <ChartCard title="Revenue by Responsible" options={responsibleOpts} />
        <ChartCard title="Quotes Timeline" total={`${timelineMonths} months`} options={timelineOpts} wide />
        <ChartCard title="CMR % by Segment" options={cmrOpts} />
        <ChartCard title="Win Rate by Segment" options={winrateOpts} />
      </div>
    </div>
  );
}
