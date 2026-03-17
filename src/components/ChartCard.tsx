import React, { useRef, useEffect, useId } from 'react';
import ApexCharts from 'apexcharts';

interface ChartCardProps {
  title: string;
  tag?: string;
  total?: string;
  options: ApexCharts.ApexOptions;
  wide?: boolean;
}

export default function ChartCard({ title, tag, total, options, wide }: ChartCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ApexCharts | null>(null);
  const uniqueId = useId();

  useEffect(() => {
    if (!containerRef.current || !options) return;

    // Destroy previous chart
    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch {}
      chartRef.current = null;
    }

    containerRef.current.innerHTML = '';

    const chart = new ApexCharts(containerRef.current, {
      ...options,
      chart: {
        ...(options.chart || {}),
        fontFamily: "'DM Sans',-apple-system,sans-serif",
        toolbar: { show: false },
        animations: { enabled: true, easing: 'easeinout', speed: 600, dynamicAnimation: { speed: 400 } },
      },
      states: { hover: { filter: { type: 'darken', value: 0.92 } } },
    });

    chart.render();
    chartRef.current = chart;

    return () => {
      if (chartRef.current) {
        try { chartRef.current.destroy(); } catch {}
        chartRef.current = null;
      }
    };
  }, [options]);

  // Listen for theme changes and update chart colors
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (chartRef.current) {
        const dk = document.documentElement.getAttribute('data-theme') === 'dark';
        chartRef.current.updateOptions({
          chart: { foreColor: dk ? '#9ca3af' : '#6b7280' },
          grid: { borderColor: dk ? '#2d3139' : '#e5e7eb' },
          tooltip: { theme: dk ? 'dark' : 'light' },
        }, false, false);
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`chart-card ${wide ? 'wide' : ''}`}>
      <div className="chart-title">
        <h3>
          {title}
          {tag && <span className="chart-tag">{tag}</span>}
        </h3>
        {total && <span className="chart-total">{total}</span>}
      </div>
      <div className="chart-body" ref={containerRef} />
    </div>
  );
}
