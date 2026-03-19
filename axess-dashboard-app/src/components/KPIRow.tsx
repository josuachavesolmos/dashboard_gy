import React, { useEffect, useRef } from 'react';
import { fmt, fmtCur } from '../utils/formatters';

export interface KPI {
  label: string;
  value: number;
  format: 'int' | 'cur' | 'pct' | 'days';
  sub?: string;
  accent: string;
}

interface KPIRowProps {
  kpis: KPI[];
}

function formatValue(value: number, format: string): string {
  if (format === 'cur') return fmtCur(value);
  if (format === 'pct') return value.toFixed(1) + '%';
  if (format === 'days') return value.toFixed(1) + 'd';
  return fmt(value, 0);
}

function AnimatedValue({ target, format }: { target: number; format: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || isNaN(target)) {
      if (ref.current) ref.current.textContent = '\u2014';
      return;
    }

    const el = ref.current;
    const start = performance.now();
    const duration = 900;

    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const current = target * eased;
      el.textContent = formatValue(current, format);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = formatValue(target, format);
    }

    requestAnimationFrame(tick);
  }, [target, format]);

  return <div className="kpi-value" ref={ref}>{'\u2014'}</div>;
}

export default function KPIRow({ kpis }: KPIRowProps) {
  return (
    <div className="kpi-row">
      {kpis.map((kpi, i) => (
        <div className="kpi-card" key={i} style={{ '--kpi-accent': kpi.accent } as React.CSSProperties}>
          <div className="kpi-label">{kpi.label}</div>
          <AnimatedValue target={kpi.value} format={kpi.format} />
          {kpi.sub && <div className="kpi-sub">{kpi.sub}</div>}
        </div>
      ))}
    </div>
  );
}
