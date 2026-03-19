# ApexCharts Recipes for Power BI-Style Dashboards

Quick-reference configurations for common chart patterns. Each recipe is ready to use with the `mk(id, options)` factory function.

## Table of Contents
1. [Donut Chart](#donut)
2. [Horizontal Bar](#horizontal-bar)
3. [Vertical Bar (Grouped)](#vertical-bar-grouped)
4. [Area Chart with Gradient](#area-gradient)
5. [Treemap](#treemap)
6. [RadialBar (Gauge)](#radialbar)
7. [Mixed Bar (Stacked)](#stacked-bar)
8. [Heatmap](#heatmap)
9. [Theme Configuration](#theme-config)

---

## Donut {#donut}

Best for: parts of a whole (status distribution, segment breakdown)

```javascript
function donutOpts(labels, series, colors) {
  return {
    chart: { type: 'donut', height: '100%' },
    series: series,
    labels: labels,
    colors: colors || COLORS,
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            name: { fontSize: '13px', fontWeight: 600 },
            value: { fontSize: '22px', fontWeight: 700, formatter: v => fmt(+v) },
            total: {
              show: true,
              label: 'Total',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              formatter: w => fmt(w.globals.seriesTotals.reduce((a, b) => a + b, 0))
            }
          }
        }
      }
    },
    dataLabels: { enabled: false },
    legend: { position: 'bottom', fontSize: '12px', markers: { size: 6, shape: 'circle' } },
    stroke: { width: 2, colors: ['var(--card)'] },
    tooltip: {
      y: { formatter: (v, { seriesIndex, w }) => {
        const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
        return `${fmt(v)} (${(v / total * 100).toFixed(1)}%)`;
      }}
    }
  };
}
```

## Horizontal Bar {#horizontal-bar}

Best for: ranked lists (top clients, products, responsible persons)

```javascript
function hbarOpts(categories, data, multiColor = true) {
  return {
    chart: { type: 'bar', height: '100%' },
    series: [{ data }],
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 6,
        barHeight: '65%',
        distributed: multiColor,
        dataLabels: { position: 'top' }
      }
    },
    colors: multiColor ? COLORS : [COLORS[0]],
    dataLabels: {
      enabled: true,
      textAnchor: 'start',
      offsetX: 5,
      style: { fontSize: '11px', fontWeight: 600, colors: ['var(--text-secondary)'] },
      formatter: v => fmt(v)
    },
    xaxis: { categories, labels: { formatter: v => fmt(v) } },
    yaxis: { labels: { style: { fontSize: '12px' }, maxWidth: 160 } },
    grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    legend: { show: false },
    tooltip: { y: { formatter: v => fmt(v) } }
  };
}
```

## Vertical Bar (Grouped) {#vertical-bar-grouped}

Best for: comparing 2+ series across categories (PO vs Invoiced, Weighted vs Total)

```javascript
function barOpts(categories, datasets) {
  return {
    chart: { type: 'bar', height: '100%', stacked: false },
    series: datasets.map((ds, i) => ({
      name: ds.name,
      data: ds.data
    })),
    colors: datasets.map((_, i) => COLORS[i]),
    plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: { categories, labels: { style: { fontSize: '11px' }, rotate: -45, rotateAlways: categories.length > 6 } },
    yaxis: { labels: { formatter: v => fmt(v) } },
    legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px' },
    tooltip: { shared: true, intersect: false, y: { formatter: v => fmt(v) } }
  };
}
```

## Area Chart with Gradient {#area-gradient}

Best for: time series (quotes timeline, work orders by period)

```javascript
function areaOpts(categories, data, label, color) {
  color = color || COLORS[0];
  return {
    chart: { type: 'area', height: '100%', zoom: { enabled: true, type: 'x' } },
    series: [{ name: label, data }],
    colors: [color],
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.5 },
    xaxis: { categories, labels: { rotate: -45, style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: v => fmt(v) } },
    tooltip: { x: { show: true } },
    markers: { size: 0, hover: { size: 5 } }
  };
}
```

## Treemap {#treemap}

Best for: hierarchical data, segment revenue (very Power BI)

```javascript
function treemapOpts(data, color) {
  return {
    chart: { type: 'treemap', height: '100%' },
    series: [{ data: data.map(([label, value]) => ({ x: label, y: value })) }],
    colors: COLORS,
    plotOptions: {
      treemap: {
        distributed: true,
        enableShades: false,
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: true,
      style: { fontSize: '13px', fontWeight: 600 },
      formatter: (text, { value }) => [text, fmt(value)],
      offsetY: -4
    },
    tooltip: {
      y: { formatter: v => fmtCur(v) }
    }
  };
}
```

## RadialBar (Gauge) {#radialbar}

Best for: single percentage values (win rate, completion rate, utilization)

```javascript
function radialOpts(value, label, color) {
  color = color || COLORS[0];
  return {
    chart: { type: 'radialBar', height: '100%' },
    series: [Math.min(100, Math.max(0, value))],
    colors: [color],
    plotOptions: {
      radialBar: {
        hollow: { size: '65%' },
        track: { background: 'var(--border)', strokeWidth: '100%' },
        dataLabels: {
          name: { fontSize: '13px', color: 'var(--text-secondary)', offsetY: 20 },
          value: {
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            offsetY: -10,
            formatter: v => v.toFixed(1) + '%'
          }
        }
      }
    },
    labels: [label],
    stroke: { lineCap: 'round' }
  };
}
```

## Stacked Bar {#stacked-bar}

Best for: composition over categories

```javascript
function stackedBarOpts(categories, datasets) {
  return {
    chart: { type: 'bar', height: '100%', stacked: true, stackType: '100%' },
    series: datasets.map((ds, i) => ({ name: ds.name, data: ds.data })),
    colors: datasets.map((_, i) => COLORS[i]),
    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
    dataLabels: { enabled: false },
    xaxis: { categories },
    yaxis: { labels: { formatter: v => v + '%' } },
    legend: { position: 'top', fontSize: '12px' },
    tooltip: { y: { formatter: v => fmt(v) } }
  };
}
```

## Theme Configuration {#theme-config}

Apply to all charts based on current theme:

```javascript
function getThemeOverrides(isDark) {
  return {
    chart: {
      foreColor: isDark ? '#9ca3af' : '#6b7280',
      background: 'transparent'
    },
    grid: { borderColor: isDark ? '#2d3139' : '#e5e7eb' },
    tooltip: { theme: isDark ? 'dark' : 'light' },
    xaxis: { labels: { style: { colors: isDark ? '#9ca3af' : '#6b7280' } } },
    yaxis: { labels: { style: { colors: isDark ? '#9ca3af' : '#6b7280' } } }
  };
}
```
