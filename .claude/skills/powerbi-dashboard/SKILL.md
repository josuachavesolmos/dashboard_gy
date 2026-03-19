---
name: powerbi-dashboard
description: Expert skill for generating Power BI-style interactive dashboards with modern charts and dynamic data visualization. Creates production-grade single-file HTML dashboards using ApexCharts, animated KPI cards, cross-filtering, dark/light themes, and responsive sidebar layouts. Use this skill whenever the user needs dashboards, analytics pages, data visualization, KPI displays, reporting interfaces, or business intelligence views — even if they don't mention "Power BI" explicitly. Also use when modernizing or upgrading existing dashboards, creating executive reports, or building any data-driven UI.
---

# Power BI Dashboard Generator

Expert guide for creating executive-grade data dashboards that rival Power BI quality — all in a single HTML file with zero backend dependencies.

## Core Philosophy

The best dashboards tell a story with data. Every pixel should serve the user's decision-making process. Power BI succeeds because it combines dense information with clean visual hierarchy. Replicate that by:

- Leading with KPIs (the numbers executives look at first)
- Using charts that match the data shape (don't force a pie chart on time-series data)
- Providing interactive filtering so users can explore without switching views
- Maintaining visual consistency so the eye can scan without friction

## Architecture: Single-File HTML

All dashboards are self-contained HTML files. This ensures portability — anyone can open the file in a browser without servers, builds, or dependencies.

### Library Stack

```html
<!-- Data processing (Excel/CSV) -->
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>

<!-- Charting (ApexCharts — modern, interactive, Power BI-quality) -->
<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>

<!-- Typography (premium feel) -->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Why ApexCharts over Chart.js?** ApexCharts renders SVG (crisper at any resolution), has built-in animations, zoom/pan, rich tooltips, and chart types like treemap and radialBar that make dashboards feel modern. Its defaults look professional out of the box.

## Layout Pattern: Sidebar + Content

Power BI uses a sidebar for navigation. Replicate this:

```
┌──────┬────────────────────────────────────┐
│      │  Topbar: title + uploads + actions  │
│ Side │────────────────────────────────────│
│ bar  │  Filters                            │
│      │  KPI Cards (5 across)               │
│ Nav  │  Chart Grid (2 columns)             │
│      │                                     │
│      │                                     │
└──────┴────────────────────────────────────┘
```

### Sidebar Specs
- Width: 240px expanded, 64px collapsed
- Background: dark (matches brand)
- Nav items: icon + label + badge count
- Active item: left accent border (3px, brand color glow)
- Bottom: collapse toggle, dark mode toggle
- Smooth transition: 0.3s ease

### Topbar Specs
- Height: 56px
- Left: section title (dynamic based on active tab)
- Right: upload buttons (pill-shaped), export action
- Sticky at top

## Design Tokens

Use CSS custom properties for theming. Define both light and dark modes:

```css
:root {
  --bg: #f0f2f5;
  --card: #ffffff;
  --card-border: rgba(0,0,0,0.06);
  --text-primary: #1a1a2e;
  --text-secondary: #6b7280;
  --accent: #1a4548;          /* Brand primary */
  --accent-glow: #4aacb0;     /* Brand highlight */
  --accent-light: #e6f3f4;
  --sidebar-bg: #1a1a2e;
  --radius: 12px;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.08);
}

[data-theme="dark"] {
  --bg: #0f1117;
  --card: #1a1d23;
  --card-border: rgba(255,255,255,0.06);
  --text-primary: #e5e7eb;
  --text-secondary: #9ca3af;
  --sidebar-bg: #0d0f14;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.3);
}
```

## KPI Cards

Each KPI card has:
1. Colored accent line at top (3px, different per card)
2. Label (small, uppercase, muted)
3. Value (large, bold, animated counter on load)
4. Subtitle (context: "3 drafts pending", "Base currency NOK")

**Animated counter**: Use `requestAnimationFrame` with easeOutCubic to count from 0 to the target value over 800ms. This gives a polished feel when data loads.

```javascript
function animateValue(el, end, duration = 800, formatter = v => v) {
  const start = 0;
  const startTime = performance.now();
  const update = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = formatter(start + (end - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
```

## Chart Selection Guide

Match chart type to data shape:

| Data Shape | Chart Type | ApexCharts Type |
|---|---|---|
| Categories + values (≤8) | Horizontal bar | `bar` (horizontal) |
| Categories + values (>8) | Treemap | `treemap` |
| Parts of whole | Donut | `donut` |
| Single percentage | Radial gauge | `radialBar` |
| Time series | Area with gradient | `area` |
| Comparison (2 series) | Grouped bar | `bar` (grouped) |
| Funnel/pipeline | Horizontal bar (ordered) | `bar` (horizontal) |
| Distribution | Bar with conditional colors | `bar` |

## ApexCharts Configuration Patterns

### Global Defaults
```javascript
window.Apex = {
  chart: { fontFamily: "'DM Sans', sans-serif", foreColor: '#6b7280', toolbar: { show: false } },
  grid: { borderColor: 'var(--border)', strokeDashArray: 3 },
  tooltip: { theme: 'light', style: { fontSize: '12px' } },
  states: { hover: { filter: { type: 'darken', value: 0.9 } } }
};
```

### Chart Factory
```javascript
function mk(id, options) {
  if (charts[id]) charts[id].destroy();
  const el = document.getElementById(id);
  if (!el) return null;
  el.innerHTML = '';
  charts[id] = new ApexCharts(el, options);
  charts[id].render();
  return charts[id];
}
```

### Theme-Aware Charts
When toggling dark/light mode, update all charts:
```javascript
function updateChartsTheme(isDark) {
  const opts = {
    chart: { foreColor: isDark ? '#9ca3af' : '#6b7280' },
    grid: { borderColor: isDark ? '#2d3139' : '#e5e7eb' },
    tooltip: { theme: isDark ? 'dark' : 'light' }
  };
  Object.values(charts).forEach(c => c && c.updateOptions(opts, false, false));
}
```

## Animation Patterns

### Staggered Card Entrance
```css
.kpi-card, .chart-card {
  opacity: 0;
  transform: translateY(16px);
  animation: fadeSlideUp 0.5s ease forwards;
}
.kpi-card:nth-child(1) { animation-delay: 0.05s; }
.kpi-card:nth-child(2) { animation-delay: 0.10s; }
/* ... stagger by 0.05s */

@keyframes fadeSlideUp {
  to { opacity: 1; transform: translateY(0); }
}
```

### Chart Load Animation
ApexCharts has built-in animations. Configure:
```javascript
chart: { animations: { enabled: true, easing: 'easeinout', speed: 600, dynamicAnimation: { speed: 400 } } }
```

## Data Processing

### Excel File Handling
Use SheetJS to read .xlsx files. Key patterns:
- `XLSX.read(arrayBuffer, { type: 'array', cellDates: true })` — parse with date detection
- `XLSX.utils.sheet_to_json(ws, { defval: '' })` — convert to array of objects
- Always handle both `cellDates: true` and fallback to `false` for robustness

### Filtering Architecture
Maintain a `state` object with `raw` and `filtered` arrays per data source:
```javascript
const state = {
  quote: { raw: [], filtered: [] },
  personnel: { raw: [], filtered: [] },
  master: { raw: [], filtered: [] }
};
```

Filter functions read UI inputs, apply predicates, update `filtered`, then re-render KPIs and charts.

## Responsive Breakpoints

```
≥1400px  Full layout (sidebar + 5 KPI cols + 2 chart cols)
≥1024px  Sidebar collapses to icons, 3 KPI cols
≥768px   No sidebar, tab bar instead, 2 KPI cols, 1 chart col
≤480px   Single column everything, compact KPIs
```

## Dark Mode Implementation

1. Store preference in `localStorage`
2. Apply via `data-theme` attribute on `<html>` or `<body>`
3. All colors reference CSS variables
4. Charts update via `updateOptions()` on theme change
5. Transition: `transition: background 0.3s, color 0.3s` on body

## File Structure for Reference

```
powerbi-dashboard/
├── SKILL.md (this file)
└── references/
    └── chart_recipes.md   — Copy-paste ApexCharts configs for common patterns
```

Read `references/chart_recipes.md` when you need specific ApexCharts configuration examples for donut, treemap, radialBar, heatmap, or mixed charts.
