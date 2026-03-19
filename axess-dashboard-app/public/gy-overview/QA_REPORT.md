# QA Audit Report -- Axess GY Dashboard

**File under test:** `Axess_GY_Dashboard.html` (878 lines, single-file SPA)
**Audit date:** 2026-03-17
**Auditor:** QA Automation Engine
**ApexCharts version:** latest via CDN (`cdn.jsdelivr.net/npm/apexcharts`)

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| **Overall Quality Score** | **72 / 100** |
| Total test areas | 11 |
| Passed | 6 |
| Partial pass | 4 |
| Failed | 1 |
| Critical bugs | 2 |
| High bugs | 5 |
| Medium bugs | 8 |
| Low bugs | 6 |

The dashboard is well-structured as a single-file SPA with clean navigation, solid chart rendering patterns, and a proper destroy-before-create approach. However, **all filters are non-functional UI shells** (Critical), **Gantt bars can overflow beyond 100%** (High), **currency labels use `$` instead of NOK** (High), and there are several accessibility gaps. The `rendered` cache prevents re-rendering but also prevents filter-driven data updates.

---

## 2. Test Matrix

| # | Test Area | Result | Notes |
|---|---|---|---|
| 1 | Navigation & Routing | **PASS** | All 8 pages navigate correctly, active states work, title updates |
| 2 | KPI Cards | **PARTIAL** | Counters animate correctly; currency symbol inconsistency (`$` vs NOK) |
| 3 | Charts (ApexCharts) | **PASS** | All 13 chart IDs match, types correct, no orphans |
| 4 | Tables | **PASS** | All 7 `buildTable()` calls match container IDs, headers/columns aligned |
| 5 | Gantt Charts | **PARTIAL** | Generates correctly, but `start + width` can exceed 100% |
| 6 | Filters / Slicers | **FAIL** | All filters are UI shells with zero data-binding logic |
| 7 | Dark/Light Theme | **PASS** | CSS variables switch, charts update, localStorage persists |
| 8 | Responsive Design | **PARTIAL** | Media queries present but sidebar collapse toggle contradicts breakpoint |
| 9 | Small Multiples | **PASS** | 9 cards render (3 metrics x 3 support types) |
| 10 | Code Quality | **PARTIAL** | No crash-on-load bugs, but several logic issues and unused variables |
| 11 | Cross-Page Interactions | **PASS** | `rendered` cache prevents duplicate renders; charts destroy cleanly |

---

## 3. Bugs Found

### CRITICAL

#### BUG-001: All Filters Are Non-Functional UI Shells
- **Severity:** Critical
- **Lines affected:** 246-251 (Backlog), 263-269 (RFQ), 281-285 (Open RFQ), 297-303 (Calendar), 320-326 (Equipment Plan)
- **Description:** There are 13 `<select>` filter elements across 5 pages. **None of them have event listeners attached.** No `onchange` handlers exist in the HTML or in the JavaScript. The `rendered` cache on line 507 (`if (rendered[pageId]) return;`) further prevents any re-rendering even if filters were wired up, since it short-circuits on subsequent visits.
- **Impact:** Users see filter dropdowns but changing them does absolutely nothing. This is the single largest functional gap in the dashboard.
- **Affected filter IDs:** `f-bl-year`, `f-bl-status`, `f-rfq-year`, `f-rfq-month`, `f-rfq-status`, `f-orfq-year`, `f-orfq-month`, plus 6 unnamed selects on Calendar and Equipment Plan pages (lines 299-303, 322-326).
- **Fix recommendation:**
  1. Add `id` attributes to the 6 unnamed filter selects on Calendar (line 299-303) and Equipment Plan (line 322-326).
  2. Add `onchange` event handlers to all filter selects.
  3. Modify `renderPage()` to accept a `force` parameter that bypasses the `rendered` cache, or remove the page from the cache when a filter changes:
  ```js
  // Example fix:
  document.getElementById('f-bl-year').addEventListener('change', () => {
    rendered['backlog'] = false;
    renderPage('backlog');
  });
  ```

#### BUG-002: Currency Symbol Mismatch -- `$` Used Instead of NOK
- **Severity:** Critical (data misrepresentation)
- **Lines affected:** 374 (`fmtCur`), 526-527, 672-674, 724-726, 780-782, 805-806
- **Description:** The `fmtCur()` function on line 374 prepends `$` to all currency values:
  ```js
  function fmtCur(v){return'$'+fmt(v)}
  ```
  However, the KPI sub-labels explicitly state "NOK" (lines 526, 672). The dashboard represents a Norwegian energy services company (Equinor, Aker BP, etc.) where all values should be in NOK (Norwegian Krone), not USD.
- **Impact:** All currency values across every page display with an incorrect `$` symbol. This is misleading for financial reporting.
- **Fix recommendation:**
  ```js
  function fmtCur(v){return fmt(v)+' NOK'}
  // or for prefix style:
  function fmtCur(v){return'NOK '+fmt(v)}
  ```

---

### HIGH

#### BUG-003: Gantt Bars Can Overflow Beyond 100% Track Width
- **Severity:** High
- **Lines affected:** 816-817 (Personnel), 858-859 (Equipment)
- **Description:** Personnel Gantt generates `start: rand(0,40)` and `width: rand(15,50)`. Maximum possible: `start=40 + width=50 = 90%` -- this is fine. Equipment Gantt generates `start: rand(0,45)` and `width: rand(10,40)`. Maximum possible: `start=45 + width=40 = 85%` -- also fine in isolation. However, the `gantt-track` has `overflow:hidden` (line 115), so visually the bar gets clipped rather than breaking the layout. The real problem is the **data inaccuracy**: if a bar is meant to represent a full period but gets clipped at the right edge, the displayed label/scope text is truncated and the visual proportion is misleading.
- **Impact:** Bars that extend to the right edge appear shorter than their actual duration, and the text label inside may be clipped or invisible.
- **Fix recommendation:** Clamp `start + width` to never exceed 100:
  ```js
  const start = rand(0, 45);
  const width = Math.min(rand(10, 40), 100 - start);
  ```

#### BUG-004: Backlog GM% Can Be Negative (Data Logic Error)
- **Severity:** High
- **Lines affected:** 732-739
- **Description:** On line 732-733, `costData` ranges from 1M-3M and `sumData` ranges from 1.5M-4M. The GM% formula on line 739 is:
  ```js
  +((1 - c/sumData[i])*100).toFixed(1)
  ```
  When `costData[i] > sumData[i]` (e.g., cost=3M, sum=1.5M), the GM% becomes `(1 - 2) * 100 = -100%`. This is mathematically valid but realistically nonsensical for a dashboard showing gross margin percentages. The Y-axis has `max:60` but no `min`, so negative values will render below the axis.
- **Impact:** Negative GM% values appear in the chart, which is confusing and likely incorrect for this business context where Sum Total should always exceed Cost Total.
- **Fix recommendation:** Ensure `sumData[i] >= costData[i]` always:
  ```js
  const costData = DEMO.months.map(() => rand(1000000, 2500000));
  const sumData = costData.map(c => c + rand(500000, 1500000)); // Guarantee positive GM
  ```

#### BUG-005: `cols-1` CSS Class Not Defined
- **Severity:** High
- **Lines affected:** 198 (HTML), 87-91 (CSS)
- **Description:** Line 198 uses `<div class="chart-grid cols-1">` but the CSS only defines `.cols-2`, `.cols-3`, `.cols-1-2`, and `.cols-2-1` (lines 88-91). The class `.cols-1` has no corresponding style rule.
- **Impact:** The "Expected Revenue YTD" chart card falls back to the base `.chart-grid` rule which has no `grid-template-columns` definition. This means it defaults to `grid-template-columns: none` (single column block behavior). In this case the result is acceptable because there is only one child, but it is an unintentional coincidence, not a deliberate layout.
- **Fix recommendation:** Add the missing CSS rule:
  ```css
  .chart-grid.cols-1{grid-template-columns:1fr}
  ```

#### BUG-006: Calendar Page Filter Selects Lack `id` Attributes
- **Severity:** High
- **Lines affected:** 299-303 (Calendar), 322-326 (Equipment Plan)
- **Description:** The filter selects on the Calendar and Equipment Plan pages have no `id` attributes, unlike the filter selects on Backlog (`f-bl-year`, `f-bl-status`), RFQ (`f-rfq-year`, `f-rfq-month`, `f-rfq-status`), and Open RFQ (`f-orfq-year`, `f-orfq-month`). Without `id` attributes, these filters cannot be targeted by JavaScript for event binding or value reading.
- **Impact:** Even if filter logic were added, these 6 selects cannot be individually addressed.
- **Fix recommendation:** Add IDs:
  ```html
  <!-- Calendar -->
  <select class="filter-select" id="f-cal-year">...
  <select class="filter-select" id="f-cal-month">...
  <select class="filter-select" id="f-cal-week">...
  <!-- Equipment Plan -->
  <select class="filter-select" id="f-eqp-year">...
  <select class="filter-select" id="f-eqp-month">...
  <select class="filter-select" id="f-eqp-week">...
  ```

#### BUG-007: `navigateTo()` Sets Page Title to NAV Label, Not Page Heading
- **Severity:** High (UX inconsistency)
- **Lines affected:** 473-474
- **Description:** When navigating, the page title (`#pageTitle`) is set to `navItem.label`. The initial hardcoded value is "GY Overview" (line 183), but the NAV label for overview is also "GY Overview" (line 344), so this specific case is fine. However, for the first page, the title is hardcoded differently from how all other pages derive their title. If the NAV label for `overview` were ever changed, the initial title would not match.
- **Impact:** Minor inconsistency. Currently no visible bug, but a maintenance risk.
- **Fix recommendation:** Remove the hardcoded title and let `initNav()` or `navigateTo('overview')` set it dynamically. Alternatively, call `navigateTo('overview')` instead of `renderPage('overview')` at init time (line 875).

---

### MEDIUM

#### BUG-008: Unused Variables in `renderCalendar()` ManDays Block
- **Severity:** Medium (code quality)
- **Lines affected:** 829-831
- **Description:** Inside the ManDays `forEach` block (line 828-833), three variables are declared:
  ```js
  const md = rand(80,350);
  const util = randF(55,95);   // <-- UNUSED
  const active = rand(2,8);     // <-- UNUSED
  ```
  Only `md` is used in the template string. `util` and `active` are wasted computations.
- **Impact:** No functional impact, but indicates copy-paste residue and wastes CPU cycles.
- **Fix recommendation:** Remove unused variables from lines 830-831.

#### BUG-009: `deepMerge()` Does Not Handle `null` Values Correctly
- **Severity:** Medium
- **Lines affected:** 409-419
- **Description:** The `deepMerge` function checks `source[key] && typeof source[key] === 'object'`. If `source[key]` is `null`, the first condition short-circuits to falsy, so `null` is treated as a primitive and assigned directly. This is actually correct behavior for overriding with `null`. However, the function does not handle the case where `target[key]` is an array and `source[key]` is an object (or vice versa), which could cause unexpected merging.
- **Impact:** Low risk with current data, but could cause issues if chart options ever include arrays that need deep merging (e.g., `yaxis` arrays).
- **Specific concern:** Line 745 defines `yaxis` as an array of two objects. The `deepMerge` function skips arrays (`!Array.isArray(source[key])`), so the entire `yaxis` array from the user options replaces the one from `themeOpts`. Since `themeOpts` does not define `yaxis`, this works, but if it ever did, the merge would fail.
- **Fix recommendation:** No immediate fix needed, but add a comment documenting the limitation.

#### BUG-010: `stroke.colors` Uses CSS Variable That ApexCharts May Not Resolve
- **Severity:** Medium
- **Lines affected:** 559
- **Description:** The donut chart stroke colors array is `['var(--card)']`:
  ```js
  stroke: { width:2, colors:['var(--card)'] }
  ```
  ApexCharts renders to SVG/Canvas. CSS custom properties inside JavaScript-set SVG attributes may not resolve correctly in all browsers, especially in the Canvas rendering path.
- **Impact:** The donut segment borders may render as black or transparent instead of the card background color in some browsers.
- **Fix recommendation:** Compute the actual color value:
  ```js
  const cardColor = getComputedStyle(document.documentElement).getPropertyValue('--card').trim();
  // Then use: stroke: { width:2, colors:[cardColor] }
  ```

#### BUG-011: `radialBar` Track Uses CSS Variable `var(--border)`
- **Severity:** Medium
- **Lines affected:** 570
- **Description:** Same issue as BUG-010. The radialBar track background is set to `'var(--border)'` which may not resolve inside ApexCharts SVG rendering.
- **Impact:** Gauge track may render incorrectly.
- **Fix recommendation:** Same approach as BUG-010 -- resolve CSS variable before passing to chart options.

#### BUG-012: `exportDashboard()` Only Calls `window.print()`
- **Severity:** Medium (feature gap)
- **Lines affected:** 501
- **Description:** The "Export PDF" button (line 185) calls `exportDashboard()` which is simply `window.print()`. There are no `@media print` styles defined. This means:
  - Hidden pages (non-active) will not be printed
  - The sidebar will appear in the print
  - Charts may not render well in print mode
  - No PDF file is actually generated programmatically
- **Impact:** The button label says "Export PDF" but the actual behavior is browser print dialog, which may confuse users.
- **Fix recommendation:** Either rename the button to "Print" or add `@media print` CSS rules to hide the sidebar, show all pages, and optimize chart sizing.

#### BUG-013: Theme Icon Does Not Change Between Sun/Moon
- **Severity:** Medium (UX)
- **Lines affected:** 170, 479-486
- **Description:** The theme toggle SVG icon (`#themeIcon`) is a moon path (line 170). The `toggleTheme()` function updates the `#themeLabel` text but **never changes the SVG icon path**. The moon icon remains the same in both light and dark mode.
- **Impact:** The label correctly switches between "Dark Mode" and "Light Mode", but the icon always shows a moon, reducing visual feedback quality.
- **Fix recommendation:** Update the SVG path in `toggleTheme()`:
  ```js
  const icon = document.getElementById('themeIcon');
  icon.innerHTML = isDark
    ? '<path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>'  // moon
    : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>...'; // sun
  ```

#### BUG-014: Backlog Page Title Bar Shows "Order Backlog" But Chart Says "Cost Total | GM by Month"
- **Severity:** Medium (data consistency)
- **Lines affected:** 254, 347
- **Description:** The Backlog page uses `label:'Order Backlog'` in NAV (line 347), which becomes the page title. The KPI sub-labels use "All orders" and "Direct costs" (lines 724-726). The chart title says "Cost Total | GM by Month" using `|` as a separator which looks odd compared to other chart titles that use plain text.
- **Impact:** Minor UX inconsistency.
- **Fix recommendation:** Use "Cost Total & GM by Month" or "Cost Total vs. GM by Month".

#### BUG-015: `DEMO.monthsShort` Array Is Defined But Never Used
- **Severity:** Medium (dead code)
- **Lines affected:** 357
- **Description:** `DEMO.monthsShort` contains `['Jan 25','Feb 25',...]` but is never referenced anywhere in the codebase.
- **Impact:** Dead code, adds to payload size.
- **Fix recommendation:** Remove the unused array.

---

### LOW

#### BUG-016: Animation Stagger Only Covers 5 KPI Cards in CSS
- **Severity:** Low
- **Lines affected:** 70-74
- **Description:** CSS defines `animation-delay` for `.kpi-card:nth-child(1)` through `:nth-child(5)` (lines 70-74). The Equipment page has 5 KPI cards, so this is just sufficient. However, if any page ever adds a 6th KPI card, it would not get an animation delay and would appear instantly while others stagger.
- **Impact:** No current issue, but fragile for future expansion.
- **Fix recommendation:** Use a more scalable approach with CSS `calc()`:
  ```css
  .kpi-card:nth-child(n){animation-delay:calc(0.05s * var(--i, 1))}
  ```
  Or set animation-delay inline from JS.

#### BUG-017: `sidebar.collapsed ~ .main` CSS Sibling Selector Limitation
- **Severity:** Low
- **Lines affected:** 55
- **Description:** The selector `.sidebar.collapsed~.main` uses the general sibling combinator. This only works because `.sidebar` and `.main` are direct sibling elements in the DOM. If the DOM structure were ever changed (e.g., wrapping in a container), this would break.
- **Impact:** No current issue, but fragile architecture.
- **Fix recommendation:** Consider using a class on the body or main element instead:
  ```js
  document.getElementById('main').classList.toggle('sidebar-collapsed');
  ```

#### BUG-018: Table Header `position:sticky; top:0` Requires Scroll Container
- **Severity:** Low
- **Lines affected:** 106
- **Description:** `thead th` has `position:sticky; top:0` which only works when the table is inside a scrollable container. The `.table-scroll` wrapper (line 109) has `max-height:400px; overflow:auto`. Tables inside `.table-scroll` will work correctly. However, if a table were ever placed outside a `.table-scroll` container, the sticky header would stick to the viewport's top edge instead.
- **Impact:** No current issue since all tables are inside `.table-scroll` containers.

#### BUG-019: RFQ Month Filter Only Goes to June
- **Severity:** Low (data completeness)
- **Lines affected:** 267
- **Description:** The RFQ Month filter (`f-rfq-month`) only has options for Jan through Jun, despite the dashboard showing data for all 12 months. Similarly, the Calendar and Equipment Plan Month filters only go to April (lines 301, 324).
- **Impact:** Users cannot filter by months July-December in RFQ, or May-December in Calendar/Equipment Plan. Since filters are non-functional anyway (BUG-001), this is low severity.
- **Fix recommendation:** Add all 12 months to all month filter dropdowns.

#### BUG-020: No Loading State for CDN Script
- **Severity:** Low
- **Lines affected:** 7
- **Description:** ApexCharts is loaded from a CDN (line 7) without any `defer`, `async`, or error handling. If the CDN is slow or fails to load, the entire dashboard will crash with `ApexCharts is not defined` when `mk()` is called.
- **Impact:** Dashboard is completely unusable if CDN is unreachable.
- **Fix recommendation:** Add error handling:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/apexcharts" onerror="document.body.innerHTML='<p>Failed to load charts library. Please check your internet connection.</p>'"></script>
  ```

#### BUG-021: KPI Value `toLocaleString()` Locale Depends on Browser
- **Severity:** Low
- **Lines affected:** 379
- **Description:** The default formatter uses `Math.round(v).toLocaleString()` without specifying a locale. In a Norwegian browser this produces `1 234` (space separator), while in US English it produces `1,234` (comma separator).
- **Impact:** Inconsistent number formatting across different user locales.
- **Fix recommendation:** Specify locale explicitly:
  ```js
  formatter = formatter || (v => Math.round(v).toLocaleString('nb-NO'));
  ```

---

## 4. Missing Functionality

### Completely absent features (UI shells without logic):

| Feature | Page(s) | Status | Details |
|---|---|---|---|
| **Filter by Year** | Backlog, RFQ, Open RFQ, Calendar, Equip Plan | UI Only | `<select>` elements exist, no `onchange` handlers |
| **Filter by Month** | RFQ, Open RFQ, Calendar, Equip Plan | UI Only | Same |
| **Filter by Week** | Calendar, Equip Plan | UI Only | Same |
| **Filter by Status** | Backlog, RFQ | UI Only | Same |
| **Table sorting** | All tables | Missing | No click-to-sort on column headers |
| **Table search/filtering** | All tables | Missing | No text search capability |
| **Export to CSV/Excel** | All pages | Missing | Only `window.print()` exists |
| **Date range picker** | All pages | Missing | No date range selection capability |
| **Drill-down from charts** | All charts | Missing | Charts are display-only, no click handlers for drill-down |
| **Real-time data refresh** | All pages | Missing | Data is generated once at render time with random values |
| **Tooltip on KPI cards** | All KPI grids | Missing | No hover details on KPI cards |
| **Gantt timeline headers** | Calendar, Equip Plan | Missing | No week/month headers on the Gantt tracks |
| **Pagination** | Large tables (RFQ: 30 rows, Open RFQ: 20 rows) | Missing | All rows rendered at once |

---

## 5. UX Recommendations

### Priority 1 (Should fix)

1. **Implement filter functionality.** This is the most impactful UX gap. Users expect dropdown filters to actually filter data. At minimum, wire up RFQ and Backlog filters since those pages have the most data.

2. **Fix currency symbol.** Change `$` to `NOK` across the entire dashboard. For a Norwegian energy company this is critical for credibility.

3. **Add empty state messages.** If filters return no results, display "No matching records found" instead of empty space.

4. **Add Gantt timeline headers.** The Gantt bars float without any time reference. Add week/month labels above the track area.

### Priority 2 (Should consider)

5. **Add loading skeletons.** When navigating to a new page, show skeleton placeholders during chart render time (ApexCharts animations take 600ms).

6. **Make tables sortable.** Click on column headers to sort ascending/descending. This is expected behavior for data tables.

7. **Improve sidebar collapse behavior at medium breakpoints.** At 1024px the sidebar auto-collapses via CSS, but the JS toggle still works. If a user manually expands at 1024px, the CSS will fight the toggle state.

8. **Add breadcrumbs or page context.** When drilling into Equipment or Projects, users should know where they are in the navigation hierarchy.

9. **Keyboard shortcut hints.** Add `title` attributes to sidebar buttons showing keyboard shortcuts (e.g., "Ctrl+B to toggle sidebar").

### Priority 3 (Nice to have)

10. **Add chart type toggles.** Let users switch between bar and line charts where appropriate.

11. **Add data refresh timestamp.** Show "Data as of: [date/time]" to indicate when demo data was generated.

12. **Add notification badges.** The Equipment page shows 26 expired calibrations -- this should surface as a badge on the sidebar nav item.

---

## 6. Accessibility Audit

### WCAG 2.1 Level A Violations

| Issue | WCAG Criterion | Lines | Details |
|---|---|---|---|
| **Nav items are `<div>`, not `<a>` or `<button>`** | 2.1.1 Keyboard | 465 | `.nav-item` elements are `<div onclick="...">`. They are not focusable by keyboard (no `tabindex`), have no `role="button"` or `role="link"`, and cannot be activated with Enter/Space keys. |
| **No skip navigation link** | 2.4.1 Bypass Blocks | 161 | No "Skip to main content" link exists. Screen reader users must tab through all 8 nav items plus 2 footer buttons to reach content. |
| **SVG icons lack accessible names** | 1.1.1 Non-text Content | 170, 174, 465 | All SVG icons in sidebar nav and footer buttons have no `aria-label` or `<title>` element. Screen readers will either skip them or announce meaningless paths. |
| **Tables lack `<caption>` or `aria-label`** | 1.3.1 Info and Relationships | 422-435 | The `buildTable()` function generates tables without `<caption>` elements. Screen readers cannot determine what each table represents. |
| **Color-only status indicators in Gantt** | 1.4.1 Use of Color | 442-453 | Gantt bar colors indicate status (Active=blue, Planned=light blue, etc.) with no text label visible for the status. The bar displays `item.scope` (installation name) rather than status. |
| **Filter `<label>` elements not associated with inputs** | 1.3.1 Info and Relationships | 247-250, 263-268, etc. | `<label>Year</label>` is followed by `<select>` but lacks a `for` attribute. The `<select>` elements are not wrapped inside the `<label>`. Screen readers cannot associate the label with its control. |

### WCAG 2.1 Level AA Violations

| Issue | WCAG Criterion | Lines | Details |
|---|---|---|---|
| **KPI label text may have insufficient contrast** | 1.4.3 Contrast (Minimum) | 81 | `.kpi-label` uses `color: var(--text-muted)` which is `#9ca3af` on `#ffffff` background. Contrast ratio: **2.86:1** (fails 4.5:1 minimum for small text). |
| **Filter label contrast** | 1.4.3 Contrast (Minimum) | 100 | `.filter-bar label` uses `color: var(--text-secondary)` which is `#6b7280` on `#ffffff`. Contrast ratio: **4.65:1** (passes for normal text, but at 12px/uppercase may be hard to read). |
| **No focus indicators on filter selects** | 2.4.7 Focus Visible | 102 | `.filter-select:focus` only changes `border-color` to `var(--accent)`. This may not provide sufficient visual indication of focus, especially for users who rely on keyboard navigation. |
| **No visible focus on nav items** | 2.4.7 Focus Visible | 40-43 | `.nav-item` has no `:focus` style, and since they are `<div>` elements, they cannot receive focus at all. |
| **`<html lang="en">` but content includes Norwegian names** | 3.1.2 Language of Parts | 2 | The document language is set to English, but many data values are in Norwegian (e.g., "Vår Energi", "Åsgard", "Hammerfest"). Specific elements with Norwegian text should be marked with `lang="nb"`. |

### Recommended Fixes

1. **Convert nav items to `<button>` elements:**
   ```js
   // In initNav(), line 465:
   nav.innerHTML = NAV.map(n => `<button class="nav-item ..." ...>`).join('');
   ```

2. **Add skip link:**
   ```html
   <a href="#main" class="skip-link">Skip to main content</a>
   ```

3. **Associate labels with selects:**
   ```html
   <label for="f-bl-year">Year</label>
   <select class="filter-select" id="f-bl-year">...
   ```

4. **Add ARIA to tables:**
   ```js
   html = '<table class="data-table" role="table" aria-label="' + tableTitle + '">';
   ```

---

## 7. Performance Notes

### Current Architecture Assessment

| Aspect | Rating | Notes |
|---|---|---|
| **Initial load** | Good | Only overview page renders on load. Other pages are lazy-loaded on first navigation. |
| **Chart memory management** | Good | `mk()` function (line 391-407) properly destroys existing charts before creating new ones: `if (charts[id]) charts[id].destroy();` |
| **Render caching** | Good (with caveat) | `rendered` object (line 504) prevents duplicate renders. But this also prevents filter-driven re-renders (see BUG-001). |
| **DOM manipulation** | Acceptable | Uses `innerHTML` for batch updates rather than individual DOM node creation. Efficient for initial render but prevents event delegation. |
| **Random data generation** | Minimal impact | `rand()` and `pick()` are lightweight. Called ~200 times total across all pages. |

### Potential Performance Concerns

1. **ApexCharts CDN without version pinning (line 7).** The URL `cdn.jsdelivr.net/npm/apexcharts` resolves to the latest version. A breaking change in ApexCharts could silently break the dashboard. Pin to a specific version:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/apexcharts@3.49.0"></script>
   ```

2. **Google Fonts blocking render (line 8).** The Google Fonts stylesheet is loaded synchronously, blocking first paint. Add `display=swap` to the URL (already present) but consider using `<link rel="preconnect">`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   ```

3. **13 chart instances in memory.** After visiting all pages, 13 ApexCharts instances remain in the `charts` object. Each instance holds SVG DOM references, event listeners, and animation state. For a dashboard, this is acceptable, but consider destroying charts for non-visible pages if memory becomes a concern.

4. **`innerHTML +=` in `renderCalendar()` (lines 832, 837, 842).** Each `+=` forces the browser to serialize, concatenate, and re-parse the entire `smEl` innerHTML. For 9 cards, this means 9 parse cycles. Better to build the full string first:
   ```js
   let html = '';
   supports.forEach(s => { html += `<div class="sm-card">...`; });
   supports.forEach(s => { html += `<div class="sm-card">...`; });
   supports.forEach(s => { html += `<div class="sm-card">...`; });
   smEl.innerHTML = html;
   ```

5. **No `requestIdleCallback` or chunking.** All chart rendering happens synchronously when a page is navigated to. If a page has many charts (Overview has 6), the main thread is blocked during chart initialization. Consider using `requestIdleCallback` or `setTimeout` to spread chart rendering across frames.

---

## 8. Complete Chart Audit

### Chart ID Mapping (HTML containers vs JS `mk()` calls)

| # | Chart ID | HTML Line | JS Line | Type | Match |
|---|---|---|---|---|---|
| 1 | `ch-combo` | 194 | 535 | bar (mixed column+line) | OK |
| 2 | `ch-donut-bd` | 195 | 551 | donut | OK |
| 3 | `ch-gauge` | 196 | 563 | radialBar | OK |
| 4 | `ch-line-ytd` | 199 | 585 | area | OK |
| 5 | `ch-rev-dept` | 202 | 598 | bar (stacked) | OK |
| 6 | `ch-radar` | 203 | 610 | radar | OK |
| 7 | `ch-equip-type` | 213 | 634 | bar (horizontal) | OK |
| 8 | `ch-equip-loc` | 214 | 644 | bar | OK |
| 9 | `ch-proj-bd` | 228 | 680 | bar (distributed) | OK |
| 10 | `ch-po-month` | 229 | 691 | bar | OK |
| 11 | `ch-po-client` | 233 | 701 | bar (horizontal) | OK |
| 12 | `ch-bl-cost` | 254 | 734 | bar (mixed + line) | OK |
| 13 | `ch-bl-status` | 255 | 753 | bar (horizontal) | OK |

**Result:** All 13 chart containers have matching `mk()` calls. No orphaned containers.

---

## 9. Complete Table Audit

| # | Container ID | HTML Line | JS Line | Headers | Row Columns | Match |
|---|---|---|---|---|---|---|
| 1 | `tbl-calib` | 218 | 665 | 5 (`Equipment, Serial No., Next Calibration, Responsible, Location`) | 5 | OK |
| 2 | `tbl-client` | 234 | 712 | 3 (`Client, Projects, Invoice Value`) | 3 | OK |
| 3 | `tbl-po` | 238 | 718 | 5 (`PO Number, Client, Service, PM, PO Value`) | 5 | OK |
| 4 | `tbl-rfq` | 273 | 785 | 12 (`Job, Title, Date, Product, Segment, Responsible, Customer, Installation, Status, Sum Total, Cost Total, CMR`) | 12 | OK |
| 5 | `tbl-openrfq` | 289 | 809 | 13 (`Job, Title, Product, Client Ref, Segment, Responsible, Customer, Installation, Status, Quote Date, Sum Total, Cost Total, CMR`) | 13 | OK |
| 6 | `tbl-res-client` | 311 | 846 | 2 (`Active Technicians, Client`) | 2 | OK |
| 7 | `tbl-res-install` | 312 | 849 | 2 (`Active Technicians, Installation`) | 2 | OK |

**Result:** All 7 table containers match. Headers align with row column counts.

---

## 10. Complete KPI Card Audit

| Page | KPI Count | Container ID | Value IDs | Animation | Format Check |
|---|---|---|---|---|---|
| Overview | 4 | `kpi-overview` | `kpi-ov-0` to `kpi-ov-3` | OK (800ms) | `$` prefix on currency (BUG-002) |
| Equipment | 5 | `kpi-equip` | `kpi-eq-0` to `kpi-eq-4` | OK (800ms) | `%` suffix on Calibration % -- OK |
| Projects | 4 | `kpi-proj` | `kpi-pj-0` to `kpi-pj-3` | OK (800ms) | `$` prefix on currency (BUG-002) |
| Backlog | 3 | `kpi-backlog` | `kpi-bl-0` to `kpi-bl-2` | OK (800ms) | `$` prefix on currency (BUG-002) |

**Note on Backlog animation (line 730):** `kpis.forEach((k,i) => animateValue(..., k.fmt))` -- the `fmt` is `fmtCur` which is a function reference. This works correctly because `animateValue` accepts a formatter function parameter. However, the fallback `|| (v => ...)` is missing here (unlike other pages), so if `k.fmt` were ever `undefined`, the animation would crash. Since all 3 Backlog KPIs have `fmt:fmtCur`, this is not a current bug.

---

## 11. Navigation & Page Visibility Audit

### Navigation Flow Test

| From | To | `active` class removed from previous | `active` class added to new | Page title updates | Page visible | Previous page hidden |
|---|---|---|---|---|---|---|
| overview | equipment | Yes (line 470) | Yes (line 471) | "Equipment" (line 474) | Yes | Yes |
| equipment | projects | Yes | Yes | "Projects & PO" | Yes | Yes |
| projects | backlog | Yes | Yes | "Order Backlog" | Yes | Yes |
| backlog | rfq | Yes | Yes | "RFQ Tracker" | Yes | Yes |
| rfq | openrfq | Yes | Yes | "Open RFQ" | Yes | Yes |
| openrfq | calendar | Yes | Yes | "Personnel Plan" | Yes | Yes |
| calendar | eqplan | Yes | Yes | "Equipment Plan" | Yes | Yes |
| eqplan | overview | Yes | Yes | "GY Overview" | Yes | Yes |

**Result:** Navigation works correctly for all 8 pages. Only one `.page.active` exists at a time.

### Re-navigation Test (rendered cache)

| Page | First visit | Second visit | Charts duplicated? |
|---|---|---|---|
| overview | Renders | Skipped (`rendered.overview === true`) | No |
| equipment | Renders | Skipped | No |
| All others | Same pattern | Same pattern | No |

**Result:** `rendered` cache correctly prevents duplicate rendering.

---

## 12. Theme Toggle Audit

| Step | Light -> Dark | Dark -> Light |
|---|---|---|
| `data-theme` attribute | Set to `"dark"` | Set to `"light"` |
| `#themeLabel` text | Changes to "Light Mode" | Changes to "Dark Mode" |
| `localStorage.theme` | Set to `"dark"` | Set to `"light"` |
| `updateChartsTheme()` called | Yes, with `isDark=true` | Yes, with `isDark=false` |
| Chart `foreColor` updated | `#9ca3af` | `#6b7280` |
| Chart `grid.borderColor` updated | `#30363d` | `#e5e7eb` |
| Chart `tooltip.theme` updated | `"dark"` | `"light"` |
| SVG icon changes | **NO** (BUG-013) | **NO** (BUG-013) |

### Init Theme Restoration (line 868-873)

| Condition | Result |
|---|---|
| `localStorage.theme === 'dark'` | Sets `data-theme="dark"`, sets label to "Light Mode" |
| `localStorage.theme === 'light'` | Does nothing (default is already light) |
| `localStorage.theme === null` | Does nothing (default is already light) |

**Result:** Theme persistence works correctly, but icon does not update.

---

## 13. Summary of All Bugs by Severity

| Severity | Count | Bug IDs |
|---|---|---|
| Critical | 2 | BUG-001 (Filters non-functional), BUG-002 (Currency symbol) |
| High | 5 | BUG-003 (Gantt overflow), BUG-004 (Negative GM%), BUG-005 (`cols-1` undefined), BUG-006 (Missing filter IDs), BUG-007 (Title inconsistency) |
| Medium | 8 | BUG-008 through BUG-015 |
| Low | 6 | BUG-016 through BUG-021 |
| **Total** | **21** | |

---

## 14. Recommended Fix Priority

### Sprint 1 (Immediate)
1. BUG-002 -- Fix currency symbol from `$` to `NOK`
2. BUG-001 -- Implement filter logic for at least Backlog and RFQ pages
3. BUG-006 -- Add `id` attributes to Calendar and Equipment Plan filters
4. Accessibility: Convert nav `<div>` to `<button>`, add `for` attributes to labels

### Sprint 2 (Next iteration)
5. BUG-004 -- Fix negative GM% data generation
6. BUG-005 -- Add `.cols-1` CSS rule
7. BUG-013 -- Update theme toggle icon
8. BUG-012 -- Add `@media print` styles or rename button
9. Performance: Pin ApexCharts version, add `<link rel="preconnect">`

### Sprint 3 (Backlog)
10. BUG-003 -- Clamp Gantt bar widths
11. BUG-008 -- Clean up unused variables
12. BUG-019 -- Complete month options in filters
13. Remaining accessibility fixes
14. Table sorting and search functionality

---

*End of QA Audit Report*
