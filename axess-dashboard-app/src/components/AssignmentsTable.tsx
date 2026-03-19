import React, { useState, useMemo } from 'react';
import { RawRow } from '../types';
import { excelDate } from '../utils/dataProcessors';
import { COLORS } from '../utils/chartConfig';

interface AssignmentsTableProps {
  data: RawRow[];
}

interface RowData {
  technician: string;
  client: string;
  installation: string;
  days: number;
  classification: string;
  startDate: Date | null;
  endDate: Date | null;
  available: number;
  isFirstOfTech: boolean;
}

type SortKey = 'technician' | 'client' | 'installation' | 'days' | 'classification' | 'available';
type SortDir = 'asc' | 'desc';

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

export default function AssignmentsTable({ data }: AssignmentsTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('technician');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Build client color map
  const clientColorMap = useMemo(() => {
    const clients = [...new Set(data.map(r => (r['Client'] || '').toString().trim()).filter(Boolean))].sort();
    const map: Record<string, string> = {};
    clients.forEach((c, i) => {
      map[c] = COLORS[i % COLORS.length];
    });
    return map;
  }, [data]);

  // Calculate global range for availability
  const { rangeStart, rangeEnd } = useMemo(() => {
    let minD = new Date();
    let maxD = new Date();
    let hasAny = false;
    data.forEach(r => {
      const s = excelDate(r['Start Date']);
      const e = excelDate(r['End Date']);
      if (s && e) {
        if (!hasAny || s < minD) minD = new Date(s);
        if (!hasAny || e > maxD) maxD = new Date(e);
        hasAny = true;
      }
    });
    const rs = new Date(minD);
    rs.setDate(rs.getDate() - 7);
    const re = new Date(maxD);
    re.setDate(re.getDate() + 14);
    return { rangeStart: rs, rangeEnd: re };
  }, [data]);

  // Group assignments by technician and compute availability
  const techAvailMap = useMemo(() => {
    const techMap: Record<string, { start: Date; end: Date }[]> = {};
    data.forEach(r => {
      const name = (r['Technician Name'] || '').toString().trim();
      if (!name) return;
      const s = excelDate(r['Start Date']);
      const e = excelDate(r['End Date']);
      if (!s || !e) return;
      if (!techMap[name]) techMap[name] = [];
      techMap[name].push({ start: s, end: e });
    });
    const availMap: Record<string, number> = {};
    Object.entries(techMap).forEach(([name, assignments]) => {
      availMap[name] = calcAvail(assignments, rangeStart, rangeEnd);
    });
    return availMap;
  }, [data, rangeStart, rangeEnd]);

  // Build flat rows with technician grouping
  const rows = useMemo((): RowData[] => {
    const techMap: Record<string, RawRow[]> = {};
    data.forEach(r => {
      const name = (r['Technician Name'] || '').toString().trim();
      if (!name) return;
      if (!techMap[name]) techMap[name] = [];
      techMap[name].push(r);
    });

    const allRows: RowData[] = [];
    const techNames = Object.keys(techMap).sort();

    techNames.forEach(tech => {
      const entries = techMap[tech];
      entries.forEach((r, idx) => {
        const s = excelDate(r['Start Date']);
        const e = excelDate(r['End Date']);
        const days = s && e ? Math.max(0, Math.round((e.getTime() - s.getTime()) / 864e5)) : 0;
        allRows.push({
          technician: tech,
          client: (r['Client'] || '').toString().trim(),
          installation: (r['Installation'] || '').toString().trim(),
          days,
          classification: (r['Support Classification'] || '').toString().trim(),
          startDate: s,
          endDate: e,
          available: techAvailMap[tech] ?? 0,
          isFirstOfTech: idx === 0,
        });
      });
    });

    return allRows;
  }, [data, techAvailMap]);

  // Filter by search
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      r =>
        r.technician.toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q) ||
        r.installation.toLowerCase().includes(q) ||
        r.classification.toLowerCase().includes(q)
    );
  }, [rows, search]);

  // Sort rows - maintain technician grouping
  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    const dir = sortDir === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'technician':
          cmp = a.technician.localeCompare(b.technician);
          break;
        case 'client':
          cmp = a.client.localeCompare(b.client);
          break;
        case 'installation':
          cmp = a.installation.localeCompare(b.installation);
          break;
        case 'days':
          cmp = a.days - b.days;
          break;
        case 'classification':
          cmp = a.classification.localeCompare(b.classification);
          break;
        case 'available':
          cmp = a.available - b.available;
          break;
      }
      return cmp * dir;
    });

    // Re-compute isFirstOfTech after sorting
    const seen = new Set<string>();
    return sorted.map(r => ({
      ...r,
      isFirstOfTech: !seen.has(r.technician) && (seen.add(r.technician), true),
    }));
  }, [filteredRows, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return '\u2195';
    return sortDir === 'asc' ? '\u2191' : '\u2193';
  };

  if (!data.length) return null;

  return (
    <div className="pt-section">
      <div className="pt-header">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
          Assignments Summary
          <span className="pt-count">{sortedRows.length} rows</span>
        </h3>
        <input
          type="text"
          className="pt-search"
          placeholder="Search technician, client..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="pt-wrap">
        <div className="pt-scroll">
          <table className="pt-table">
            <thead>
              <tr>
                <th
                  className={sortKey === 'technician' ? 'sorted' : ''}
                  onClick={() => handleSort('technician')}
                >
                  Technician <span className="sort-icon">{sortIcon('technician')}</span>
                </th>
                <th
                  className={sortKey === 'client' ? 'sorted' : ''}
                  onClick={() => handleSort('client')}
                >
                  Project (Client) <span className="sort-icon">{sortIcon('client')}</span>
                </th>
                <th
                  className={sortKey === 'installation' ? 'sorted' : ''}
                  onClick={() => handleSort('installation')}
                >
                  Installation <span className="sort-icon">{sortIcon('installation')}</span>
                </th>
                <th
                  className={sortKey === 'days' ? 'sorted' : ''}
                  onClick={() => handleSort('days')}
                >
                  Days <span className="sort-icon">{sortIcon('days')}</span>
                </th>
                <th
                  className={sortKey === 'classification' ? 'sorted' : ''}
                  onClick={() => handleSort('classification')}
                >
                  Classification <span className="sort-icon">{sortIcon('classification')}</span>
                </th>
                <th
                  className={sortKey === 'available' ? 'sorted' : ''}
                  onClick={() => handleSort('available')}
                >
                  Available <span className="sort-icon">{sortIcon('available')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r, i) => {
                const availClass = r.available > 30 ? 'high' : r.available > 0 ? 'low' : 'zero';
                return (
                  <tr key={i}>
                    <td className="td-tech">
                      {r.isFirstOfTech ? r.technician : '\u2192'}
                    </td>
                    <td>
                      <div className="td-client">
                        <span
                          className="dot"
                          style={{ background: clientColorMap[r.client] || COLORS[0] }}
                        />
                        {r.client}
                      </div>
                    </td>
                    <td>{r.installation}</td>
                    <td className="td-days">{r.days}</td>
                    <td>
                      {r.classification ? (
                        <span className="pt-badge">{r.classification}</span>
                      ) : (
                        '\u2014'
                      )}
                    </td>
                    <td className={`td-avail ${availClass}`}>{r.available}d</td>
                  </tr>
                );
              })}
              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)' }}>
                    No matching assignments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
