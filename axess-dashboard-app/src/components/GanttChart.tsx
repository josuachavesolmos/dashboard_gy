import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { RawRow } from '../types';
import { excelDate } from '../utils/dataProcessors';
import { COLORS } from '../utils/chartConfig';

interface GanttChartProps {
  data: RawRow[];
}

type ZoomLevel = 'day' | 'week' | 'month' | 'year';

const PPD: Record<ZoomLevel, number> = { day: 36, week: 11.5, month: 4, year: 1.7 };

function calcAvail(assignments: { start: Date; end: Date }[], rs: Date, re: Date): number {
  if (!assignments.length) return Math.round((re.getTime() - rs.getTime()) / 864e5);
  const sorted = [...assignments].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged = [{ s: sorted[0].start.getTime(), e: sorted[0].end.getTime() }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const si = sorted[i].start.getTime();
    const ei = sorted[i].end.getTime();
    if (si <= last.e) {
      last.e = Math.max(last.e, ei);
    } else {
      merged.push({ s: si, e: ei });
    }
  }
  const busy = merged.reduce((sum, m) => sum + Math.round((m.e - m.s) / 864e5), 0);
  return Math.max(0, Math.round((re.getTime() - rs.getTime()) / 864e5) - busy);
}

function fmtD(d: Date): string {
  return d.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtMY(d: Date): string {
  return d.toLocaleDateString('en', { month: 'long', year: 'numeric' });
}

interface TechData {
  name: string;
  assignments: {
    client: string;
    installation: string;
    start: Date;
    end: Date;
    status: string;
    days: number;
  }[];
  avail: number;
}

export default function GanttChart({ data }: GanttChartProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [offset, setOffset] = useState(0);

  const namesRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Parse and group data by technician
  const { techs, rangeStart, rangeEnd, clientList, clientColorMap } = useMemo(() => {
    const techMap: Record<string, TechData['assignments']> = {};
    const clientsSet = new Set<string>();

    data.forEach(r => {
      const techName = (r['Technician Name'] || '').toString().trim();
      if (!techName) return;
      const s = excelDate(r['Start Date']);
      const e = excelDate(r['End Date']);
      if (!s || !e) return;
      const client = (r['Client'] || '').toString().trim() || '(blank)';
      const installation = (r['Installation'] || '').toString().trim() || '';
      const status = (r['Status'] || '').toString().trim() || '';
      const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 864e5));
      clientsSet.add(client);
      if (!techMap[techName]) techMap[techName] = [];
      techMap[techName].push({ client, installation, start: s, end: e, status, days });
    });

    // Determine global date range
    let minDate = new Date();
    let maxDate = new Date();
    let hasAny = false;
    Object.values(techMap).forEach(arr =>
      arr.forEach(a => {
        if (!hasAny || a.start < minDate) minDate = new Date(a.start);
        if (!hasAny || a.end > maxDate) maxDate = new Date(a.end);
        hasAny = true;
      })
    );

    // Extend range with some padding
    const rs = new Date(minDate);
    rs.setDate(rs.getDate() - 7);
    const re = new Date(maxDate);
    re.setDate(re.getDate() + 14);

    const cList = [...clientsSet].sort();
    const cMap: Record<string, string> = {};
    cList.forEach((c, i) => {
      cMap[c] = COLORS[i % COLORS.length];
    });

    // Build tech list sorted by name
    const techsList: TechData[] = Object.entries(techMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, assignments]) => ({
        name,
        assignments,
        avail: calcAvail(
          assignments.map(a => ({ start: a.start, end: a.end })),
          rs,
          re
        ),
      }));

    return { techs: techsList, rangeStart: rs, rangeEnd: re, clientList: cList, clientColorMap: cMap };
  }, [data]);

  // Calculate the visible range based on zoom and offset
  const { viewStart, viewEnd, totalDays } = useMemo(() => {
    const now = new Date();
    let vs: Date;
    let ve: Date;

    if (zoom === 'day') {
      // Show ~14 days
      vs = new Date(now);
      vs.setDate(vs.getDate() - 7 + offset * 14);
      ve = new Date(vs);
      ve.setDate(ve.getDate() + 14);
    } else if (zoom === 'week') {
      // Show ~8 weeks
      vs = new Date(now);
      vs.setDate(vs.getDate() - 28 + offset * 56);
      ve = new Date(vs);
      ve.setDate(ve.getDate() + 56);
    } else if (zoom === 'month') {
      // Show ~3 months
      vs = new Date(now.getFullYear(), now.getMonth() - 1 + offset * 3, 1);
      ve = new Date(vs.getFullYear(), vs.getMonth() + 3, 0);
    } else {
      // Show full range
      vs = new Date(rangeStart);
      ve = new Date(rangeEnd);
      if (offset !== 0) {
        const shift = offset * 365;
        vs.setDate(vs.getDate() + shift);
        ve.setDate(ve.getDate() + shift);
      }
    }

    const td = Math.max(1, Math.round((ve.getTime() - vs.getTime()) / 864e5));
    return { viewStart: vs, viewEnd: ve, totalDays: td };
  }, [zoom, offset, rangeStart, rangeEnd]);

  // Range display string
  const rangeDisplay = useMemo(() => {
    return `${fmtMY(viewStart)} \u2014 ${fmtMY(viewEnd)}`;
  }, [viewStart, viewEnd]);

  // Synchronized scrolling
  const handleBodyScroll = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;
    if (headerRef.current) headerRef.current.scrollLeft = body.scrollLeft;
    if (namesRef.current) namesRef.current.scrollTop = body.scrollTop;
  }, []);

  // Build the Gantt via innerHTML for performance
  useEffect(() => {
    const namesEl = namesRef.current;
    const headerEl = headerRef.current;
    const bodyEl = bodyRef.current;
    if (!namesEl || !headerEl || !bodyEl) return;

    const ppd = PPD[zoom];
    const totalW = totalDays * ppd;
    const vsTime = viewStart.getTime();
    const veTime = viewEnd.getTime();

    // --- Build header ---
    let headerHTML = `<div class="gt-header-row" style="width:${totalW}px">`;

    if (zoom === 'day') {
      const d = new Date(viewStart);
      let prevMonth = -1;
      for (let i = 0; i < totalDays; i++) {
        const wd = d.getDay();
        const isWknd = wd === 0 || wd === 6;
        const isMoStart = d.getMonth() !== prevMonth;
        prevMonth = d.getMonth();
        const moLabel = isMoStart
          ? `<span class="gt-mo-label">${d.toLocaleDateString('en', { month: 'short' })}</span>`
          : '';
        headerHTML += `<div class="gt-hcell${isWknd ? ' wknd' : ''}${isMoStart ? ' mo-start' : ''}" style="width:${ppd}px">${moLabel}${d.getDate()}</div>`;
        d.setDate(d.getDate() + 1);
      }
    } else if (zoom === 'week') {
      const d = new Date(viewStart);
      // Align to Monday
      while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
      let prevMonth = -1;
      while (d.getTime() < veTime) {
        const weekEnd = new Date(d);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const w = 7 * ppd;
        const isMoStart = d.getMonth() !== prevMonth;
        prevMonth = d.getMonth();
        const moLabel = isMoStart
          ? `<span class="gt-mo-label">${d.toLocaleDateString('en', { month: 'short', year: '2-digit' })}</span>`
          : '';
        headerHTML += `<div class="gt-hcell${isMoStart ? ' mo-start' : ''}" style="width:${w}px">${moLabel}${d.getDate()}</div>`;
        d.setDate(d.getDate() + 7);
      }
    } else if (zoom === 'month') {
      const d = new Date(viewStart.getFullYear(), viewStart.getMonth(), 1);
      while (d.getTime() < veTime) {
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const w = daysInMonth * ppd;
        headerHTML += `<div class="gt-hcell mo-start" style="width:${w}px">${d.toLocaleDateString('en', { month: 'short', year: '2-digit' })}</div>`;
        d.setMonth(d.getMonth() + 1);
      }
    } else {
      // Year zoom - show months
      const d = new Date(viewStart.getFullYear(), viewStart.getMonth(), 1);
      while (d.getTime() < veTime) {
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const w = daysInMonth * ppd;
        const isJan = d.getMonth() === 0;
        headerHTML += `<div class="gt-hcell${isJan ? ' mo-start' : ''}" style="width:${w}px">${isJan ? `<span class="gt-mo-label">${d.getFullYear()}</span>` : ''}${d.toLocaleDateString('en', { month: 'short' })}</div>`;
        d.setMonth(d.getMonth() + 1);
      }
    }
    headerHTML += '</div>';
    headerEl.innerHTML = headerHTML;

    // --- Build names panel ---
    let namesHTML = '';
    techs.forEach(t => {
      const availClass = t.avail > 30 ? 'has-avail' : '';
      namesHTML += `<div class="gt-name-row"><div class="gt-name" title="${t.name}">${t.name}</div><div class="gt-avail ${availClass}">${t.avail}d avail</div></div>`;
    });
    namesEl.innerHTML = namesHTML;

    // --- Build body rows ---
    let bodyHTML = '';
    const todayTime = new Date().getTime();
    const todayX = ((todayTime - vsTime) / 864e5) * ppd;
    const showTodayLine = todayTime >= vsTime && todayTime <= veTime;

    techs.forEach(t => {
      bodyHTML += `<div class="gt-row" style="width:${totalW}px">`;

      // Grid lines for month boundaries
      if (zoom === 'month' || zoom === 'year') {
        const d = new Date(viewStart.getFullYear(), viewStart.getMonth(), 1);
        while (d.getTime() < veTime) {
          const x = ((d.getTime() - vsTime) / 864e5) * ppd;
          if (x > 0) {
            bodyHTML += `<div class="gt-grid-line" style="left:${x}px"></div>`;
          }
          d.setMonth(d.getMonth() + 1);
        }
      }

      // Today line
      if (showTodayLine) {
        bodyHTML += `<div class="gt-today-line" style="left:${todayX}px"></div>`;
      }

      // Bars
      t.assignments.forEach(a => {
        const aStart = Math.max(a.start.getTime(), vsTime);
        const aEnd = Math.min(a.end.getTime(), veTime);
        if (aEnd <= aStart) return; // out of view
        const x = ((aStart - vsTime) / 864e5) * ppd;
        const w = Math.max(2, ((aEnd - aStart) / 864e5) * ppd);
        const color = clientColorMap[a.client] || COLORS[0];
        const tooltip = `${a.client} \u2022 ${a.installation}\n${fmtD(a.start)} \u2192 ${fmtD(a.end)} (${a.days}d)\n${a.status}`;
        const barLabel = w > 60 ? a.client : '';
        bodyHTML += `<div class="gt-bar" style="left:${x}px;width:${w}px;background:${color}" title="${tooltip.replace(/"/g, '&quot;')}"><span class="gt-bar-text">${barLabel}</span></div>`;
      });

      bodyHTML += '</div>';
    });
    bodyEl.innerHTML = bodyHTML;
  }, [techs, zoom, viewStart, viewEnd, totalDays, clientColorMap]);

  // Navigation handlers
  const goPrev = () => setOffset(o => o - 1);
  const goToday = () => setOffset(0);
  const goNext = () => setOffset(o => o + 1);

  if (!data.length) return null;

  return (
    <div className="gt-container">
      {/* Toolbar */}
      <div className="gt-toolbar">
        <div className="gt-zoom-group">
          {(['day', 'week', 'month', 'year'] as ZoomLevel[]).map(z => (
            <button
              key={z}
              className={`gt-zoom-btn${zoom === z ? ' active' : ''}`}
              onClick={() => { setZoom(z); setOffset(0); }}
            >
              {z}
            </button>
          ))}
        </div>
        <div className="gt-nav">
          <button className="gt-nav-btn" onClick={goPrev}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Prev
          </button>
          <button className="gt-nav-btn" onClick={goToday}>Today</button>
          <button className="gt-nav-btn" onClick={goNext}>
            Next
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
        <span className="gt-range">{rangeDisplay}</span>
      </div>

      {/* Legend */}
      <div className="gt-legend">
        {clientList.map(c => (
          <div className="gt-legend-item" key={c}>
            <span className="gt-legend-dot" style={{ background: clientColorMap[c] }} />
            {c}
          </div>
        ))}
      </div>

      {/* Gantt wrapper */}
      <div className="gt-wrapper">
        {/* Left panel: names */}
        <div className="gt-left">
          <div className="gt-left-hdr">Technician</div>
          <div className="gt-left-body" ref={namesRef} />
        </div>

        {/* Right panel: timeline */}
        <div className="gt-right">
          <div className="gt-right-hdr" ref={headerRef} />
          <div className="gt-right-body" ref={bodyRef} onScroll={handleBodyScroll} />
        </div>
      </div>
    </div>
  );
}
