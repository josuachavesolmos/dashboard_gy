export const COLORS = ['#2a9d8f','#e76f51','#3b82f6','#f59e0b','#8b5cf6','#10b981','#ec4899','#264653','#e9c46a','#06b6d4','#f43f5e','#84cc16','#14b8a6','#a855f7','#fb923c'];

export function isDark(): boolean {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function themeOpts() {
  const dk = isDark();
  return {
    chart: { foreColor: dk ? '#9ca3af' : '#6b7280', background: 'transparent' },
    grid: { borderColor: dk ? '#2d3139' : '#e5e7eb' },
    tooltip: { theme: dk ? 'dark' : 'light' },
  };
}

function cardBg() {
  return isDark() ? '#1a1d23' : '#ffffff';
}

export function donutOpts(labels: string[], series: number[]): ApexCharts.ApexOptions {
  const t = themeOpts();
  return {
    ...t,
    chart: { ...t.chart, type: 'donut', height: '100%' },
    series,
    labels,
    colors: COLORS.slice(0, labels.length),
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: { fontSize: '13px', fontWeight: '600' },
            value: { fontSize: '22px', fontWeight: '700', formatter: (v: string) => { const n = Number(v); if(isNaN(n)) return v; if(Math.abs(n)>=1e6) return (n/1e6).toFixed(1)+'M'; if(Math.abs(n)>=1e3) return (n/1e3).toFixed(1)+'K'; return String(n); } },
            total: {
              show: true,
              label: 'Total',
              fontSize: '12px',
              formatter: (w: any) => {
                const sum = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                if(sum>=1e6) return (sum/1e6).toFixed(1)+'M';
                if(sum>=1e3) return (sum/1e3).toFixed(1)+'K';
                return String(sum);
              },
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    legend: { position: 'bottom', fontSize: '11px', markers: { size: 5, shape: 'circle' as any }, itemMargin: { horizontal: 8, vertical: 4 } },
    stroke: { width: 2, colors: [cardBg()] },
  };
}

export function hbarOpts(categories: string[], data: number[], distributed = true): ApexCharts.ApexOptions {
  const t = themeOpts();
  return {
    ...t,
    chart: { ...t.chart, type: 'bar', height: '100%' },
    series: [{ data }],
    plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '60%', distributed } },
    colors: distributed ? COLORS : [COLORS[0]],
    dataLabels: { enabled: true, textAnchor: 'start' as any, offsetX: 5, style: { fontSize: '11px', fontWeight: '500' }, formatter: (v: number) => { if(Math.abs(v)>=1e6) return (v/1e6).toFixed(1)+'M'; if(Math.abs(v)>=1e3) return (v/1e3).toFixed(1)+'K'; return String(v); } },
    xaxis: { categories, labels: { formatter: (v: string) => { const n = Number(v); if(isNaN(n)) return v; if(Math.abs(n)>=1e6) return (n/1e6).toFixed(1)+'M'; if(Math.abs(n)>=1e3) return (n/1e3).toFixed(1)+'K'; return v; } } },
    yaxis: { labels: { style: { fontSize: '11px' }, maxWidth: 160 } },
    grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    legend: { show: false },
    tooltip: { y: { formatter: (v: number) => { if(Math.abs(v)>=1e6) return (v/1e6).toFixed(1)+'M'; if(Math.abs(v)>=1e3) return (v/1e3).toFixed(1)+'K'; return String(v); } } },
  };
}

export function vbarOpts(categories: string[], datasets: { name: string; data: number[] }[]): ApexCharts.ApexOptions {
  const t = themeOpts();
  return {
    ...t,
    chart: { ...t.chart, type: 'bar', height: '100%' },
    series: datasets,
    colors: datasets.map((_, i) => COLORS[i]),
    plotOptions: { bar: { borderRadius: 5, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: { categories, labels: { style: { fontSize: '10px' }, rotate: -45, rotateAlways: categories.length > 6 } },
    yaxis: { labels: { formatter: (v: number) => { if(Math.abs(v)>=1e6) return (v/1e6).toFixed(1)+'M'; if(Math.abs(v)>=1e3) return (v/1e3).toFixed(1)+'K'; return String(v); } } },
    legend: { show: datasets.length > 1, position: 'top', horizontalAlign: 'left' as any, fontSize: '11px' },
    tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => { if(Math.abs(v)>=1e6) return (v/1e6).toFixed(1)+'M'; if(Math.abs(v)>=1e3) return (v/1e3).toFixed(1)+'K'; return String(v); } } },
  };
}

export function areaOpts(categories: string[], data: number[], label: string, color?: string): ApexCharts.ApexOptions {
  const t = themeOpts();
  return {
    ...t,
    chart: { ...t.chart, type: 'area', height: '100%', zoom: { enabled: true, type: 'x' } },
    series: [{ name: label, data }],
    colors: [color || COLORS[0]],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.5 },
    xaxis: { categories, labels: { rotate: -45, style: { fontSize: '10px' } } },
    yaxis: { labels: { formatter: (v: number) => { if(Math.abs(v)>=1e6) return (v/1e6).toFixed(1)+'M'; if(Math.abs(v)>=1e3) return (v/1e3).toFixed(1)+'K'; return String(v); } } },
    markers: { size: 0, hover: { size: 5 } },
  };
}

export function treemapOpts(data: [string, number][]): ApexCharts.ApexOptions {
  const t = themeOpts();
  return {
    ...t,
    chart: { ...t.chart, type: 'treemap', height: '100%' },
    series: [{ data: data.map(e => ({ x: e[0], y: Math.round(e[1]) })) }],
    colors: COLORS,
    plotOptions: { treemap: { distributed: true, enableShades: false, borderRadius: 4 } },
    dataLabels: { enabled: true, style: { fontSize: '12px', fontWeight: '600' }, formatter: (t: string, op: any) => [t, '$' + (op.value >= 1e6 ? (op.value/1e6).toFixed(1)+'M' : op.value >= 1e3 ? (op.value/1e3).toFixed(1)+'K' : op.value)], offsetY: -4 },
    tooltip: { y: { formatter: (v: number) => '$' + (v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(1)+'K' : v) } },
  };
}
