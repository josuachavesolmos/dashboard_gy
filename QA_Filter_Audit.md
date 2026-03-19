# QA COMPREHENSIVE FILTER AUDIT
## Axess GY Dashboard (`Axess_GY_Dashboard.html`)
### Auditor: QA Testing Expert | Date: 2026-03-17

---

## EXECUTIVE SUMMARY

| Metric | Value |
|--------|-------|
| **Total Pages Audited** | 10 |
| **Pages with Filter Bar** | 10/10 |
| **Pages with Year Filter** | 8/10 |
| **Pages MISSING Year Filter** | 2 (Overview, Equipment) -- **CLIENT REQUIREMENT VIOLATION** |
| **Total Filters in HTML** | 23 |
| **Total wireFilter() calls** | 23 |
| **Filters that actually work end-to-end** | 20/23 |
| **Filters wired but NOT read in render** | 2 |
| **Filters read but NOT applied to output** | 0 |
| **Small Multiples using random data (not filtered)** | 3 pages |
| **Tables using random data (not filtered)** | 2 pages |
| **Overall Verdict** | **FAIL** -- 2 pages missing mandatory Year filter; multiple data sections ignore filters |

---

## MASTER AUDIT TABLE

| # | Page ID | Page Name | Has Filter Bar | Has Year Filter | Has Month Filter | Other Filters | All wireFilter wired | All getFilterVal read | Filter applied to .filter() | KPIs Dynamic | Charts Dynamic | Tables Dynamic | Small Multiples Dynamic | VERDICT |
|---|---------|-----------|:--------------:|:---------------:|:----------------:|---------------|:--------------------:|:---------------------:|:---------------------------:|:------------:|:--------------:|:--------------:|:----------------------:|:-------:|
| 1 | page-overview | GY Overview | YES | **NO** | NO | Dept | YES | YES | YES | YES | YES | N/A | N/A | **FAIL** |
| 2 | page-equipment | Equipment | YES | **NO** | NO | Location, Type | YES | YES | YES | YES | YES | YES | N/A | **FAIL** |
| 3 | page-projects | Projects & PO | YES | **NO** | NO | Client, Status | YES | YES | YES | YES | YES | YES | N/A | **FAIL** |
| 4 | page-backlog | Order Backlog | YES | YES | NO | Status | YES | YES | YES | YES | YES | N/A | N/A | PASS |
| 5 | page-rfq | RFQ Tracker | YES | YES | YES | Status | YES | YES | YES | N/A | N/A | YES | N/A | PASS |
| 6 | page-openrfq | Open RFQ | YES | YES | YES | -- | YES | YES | YES | N/A | N/A | YES | N/A | PASS |
| 7 | page-quotelog | Quote Log | YES | YES | YES | Status | YES | YES | YES | YES (table) | YES | YES | N/A | PASS |
| 8 | page-calendar | Personnel Plan | YES | YES | YES | Week | YES | YES (Year,Month) | YES (Year,Month) | N/A | N/A | **PARTIAL** | **NO** | **FAIL** |
| 9 | page-eqplan | Equipment Plan | YES | YES | YES | Week | YES | YES (Year,Month) | YES (Year,Month) | N/A | N/A | **PARTIAL** | **NO** | **FAIL** |
| 10 | page-materials | Material Tracker | YES | YES | YES | Status | YES | YES | YES | N/A | YES | YES | **NO** | **FAIL** |

---

## DETAILED PER-PAGE AUDIT

---

### PAGE 1: `page-overview` (GY Overview)

**HTML Filter Bar** (line 243-246):
```html
<div class="filter-bar">
  <label for="f-ov-dept">Department</label>
  <select class="filter-select" id="f-ov-dept">...</select>
</div>
```

| Check | Status | Detail |
|-------|--------|--------|
| Filter bar present | YES | Line 243 |
| Year filter | **MISSING** | Only Department filter exists |
| Select has id | YES | `f-ov-dept` |
| wireFilter call | YES | Line 1675: `wireFilter('f-ov-dept','overview')` |
| getFilterVal read | YES | Line 763: `getFilterVal('f-ov-dept')` |
| Data store | YES | `DATA.overview` via `generateOverviewData()` |
| Filter applied to data | YES | Line 765-768: `.filter(p => { if (fDept && p.dept !== fDept) return false; })` |
| KPIs from filtered data | YES | Lines 770-784 calculate from `filtered` array |
| Charts from filtered data | YES | All 6 charts use `filtered` array |
| Tables from filtered data | N/A | No tables on this page |

**CRITICAL ISSUE: NO YEAR FILTER**
- The data generates random `monthIdx` values (line 752) but has no `year` field at all
- Revenue, project counts, and all charts show all-time data with no way to filter by year
- **Client requirement violation**: ALL pages must have a Year filter

**BUG: No year field in data model**
- `generateOverviewData()` (line 743-759) does not assign a `year` property to projects
- Even if a Year filter were added to HTML, the data model would need updating

---

### PAGE 2: `page-equipment` (Equipment)

**HTML Filter Bar** (line 266-271):
```html
<div class="filter-bar">
  <label for="f-eq-location">Location</label>
  <select class="filter-select" id="f-eq-location">...</select>
  <label for="f-eq-type">Equipment Type</label>
  <select class="filter-select" id="f-eq-type">...</select>
</div>
```

| Check | Status | Detail |
|-------|--------|--------|
| Filter bar present | YES | Line 266 |
| Year filter | **MISSING** | Only Location and Equipment Type |
| Select has id | YES | `f-eq-location`, `f-eq-type` |
| wireFilter calls | YES | Lines 1676-1677 |
| getFilterVal read | YES | Lines 917-918 |
| Data store | YES | `DATA.equipment` via `generateEquipmentData()` |
| Filter applied | YES | Lines 920-924 |
| KPIs from filtered | YES | Lines 926-941 |
| Charts from filtered | YES | Both type and location charts use `filtered` |
| Tables from filtered | YES | Calibration table uses `filtered` |

**CRITICAL ISSUE: NO YEAR FILTER**
- Equipment has `calibrationDate` field with year but no dedicated `year` property for filtering
- All equipment data is shown regardless of year
- **Client requirement violation**

---

### PAGE 3: `page-projects` (Projects & PO)

**HTML Filter Bar** (line 287-292):
```html
<div class="filter-bar">
  <label for="f-pj-client">Client</label>
  <select class="filter-select" id="f-pj-client">...</select>
  <label for="f-pj-status">BD Status</label>
  <select class="filter-select" id="f-pj-status">...</select>
</div>
```

| Check | Status | Detail |
|-------|--------|--------|
| Filter bar present | YES | Line 287 |
| Year filter | **MISSING** | Only Client and BD Status |
| Month filter | **MISSING** | Has monthIdx but no filter |
| Select has id | YES | `f-pj-client`, `f-pj-status` |
| wireFilter calls | YES | Lines 1678-1679 |
| getFilterVal read | YES | Lines 1014-1015 |
| Data store | YES | `DATA.projects` via `generateProjectsData()` |
| Filter applied | YES | Lines 1017-1021 |
| KPIs from filtered | YES | Lines 1023-1037 |
| Charts from filtered | YES | All 3 charts use `filtered` |
| Tables from filtered | YES | Both client summary and PO detail tables |

**CRITICAL ISSUE: NO YEAR FILTER**
- Projects data has `monthIdx` but no `year` field (lines 986-1010)
- Data model needs a `year` property added
- **Client requirement violation**

**ALSO MISSING: Month filter**
- Data has monthly breakdown (`monthIdx`) so a Month filter should be present

---

### PAGE 4: `page-backlog` (Order Backlog)

**HTML Filter Bar** (line 313-318):
```html
<div class="filter-bar">
  <label for="f-bl-year">Year</label>
  <select class="filter-select" id="f-bl-year">...</select>
  <label for="f-bl-status">Status</label>
  <select class="filter-select" id="f-bl-status">...</select>
</div>
```

| Check | Status | Detail |
|-------|--------|--------|
| Filter bar present | YES | Line 313 |
| Year filter | YES | `f-bl-year` with options: All, 2025, 2026 |
| Month filter | NOT PRESENT | Data has monthIdx; could be useful but not strictly required |
| Status filter | YES | `f-bl-status` |
| Select has id | YES | Both filters |
| wireFilter calls | YES | Lines 1680-1681 |
| getFilterVal read | YES | Lines 1123-1124 |
| Data store | YES | `DATA.backlog` via `generateBacklogData()` |
| Filter applied | YES | Lines 1126-1130: both year and status checked |
| KPIs from filtered | YES | Lines 1132-1144 |
| Charts from filtered | YES | Both Cost/GM chart and Status breakdown |

**VERDICT: PASS** -- All filters work end-to-end. Year filter present.

---

### PAGE 5: `page-rfq` (RFQ Tracker)

**HTML Filter Bar** (line 330-337):
```html
<div class="filter-bar">
  <label for="f-rfq-year">Year</label>
  <select class="filter-select" id="f-rfq-year">...</select>
  <label for="f-rfq-month">Month</label>
  <select class="filter-select" id="f-rfq-month">...</select>
  <label for="f-rfq-status">Status</label>
  <select class="filter-select" id="f-rfq-status">...</select>
</div>
```

| Check | Status | Detail |
|-------|--------|--------|
| Filter bar present | YES | Line 330 |
| Year filter | YES | `f-rfq-year` |
| Month filter | YES | `f-rfq-month` |
| Status filter | YES | `f-rfq-status` |
| Select has id | YES | All three |
| wireFilter calls | YES | Lines 1682-1684 |
| getFilterVal read | YES | Lines 1220-1222 |
| Data store | YES | `DATA.rfq` via `generateRFQData()` |
| Filter applied | YES | Lines 1224-1229: year, monthName, status all checked |
| Table from filtered | YES | Line 1231-1236 |

**VERDICT: PASS** -- Complete filter pipeline. All 3 filters work end-to-end.

---

### PAGE 6: `page-openrfq` (Open RFQ)

**HTML Filter Bar** (line 348-353):
```html
<div class="filter-bar">
  <label for="f-orfq-year">Year</label>
  <select class="filter-select" id="f-orfq-year">...</select>
  <label for="f-orfq-month">Month</label>
  <select class="filter-select" id="f-orfq-month">...</select>
</div>
```

| Check | Status | Detail |
|-------|--------|--------|
| Filter bar present | YES | Line 348 |
| Year filter | YES | `f-orfq-year` |
| Month filter | YES | `f-orfq-month` |
| Select has id | YES | Both |
| wireFilter calls | YES | Lines 1685-1686 |
| getFilterVal read | YES | Lines 1267-1268 |
| Data store | YES | `DATA.openrfq` via `generateOpenRFQData()` |
| Filter applied | YES | Lines 1270-1274 |
| Table from filtered | YES | Lines 1276-1281 |

**VERDICT: PASS** -- All filters work. Could potentially benefit from a Status filter but data is "Open" only by definition.

---

### PAGE 7: `page-quotelog` (Quote Log)

**HTML Filter Bar** (line 364-371):
```html
<div class="filter-bar">
  <label for="f-ql-year">Year</label>
  <select class="filter-select" id="f-ql-year">...</select>
  <label for="f-ql-month">Month</label>
  <select class="filter-select" id="f-ql-month">...</select>
  <label for="f-ql-status">Status</label>
  <select class="filter-select" id="f-ql-status">...</select>
</div>
```

| Check | Status | Detail |
|-------|--------|--------|
| Filter bar present | YES | Line 364 |
| Year filter | YES | `f-ql-year` |
| Month filter | YES | `f-ql-month` |
| Status filter | YES | `f-ql-status` |
| Select has id | YES | All three |
| wireFilter calls | YES | Lines 1693-1695 |
| getFilterVal read | YES | Lines 1311-1313 |
| Data store | YES | `DATA.quotelog` via `generateQuoteLogData()` |
| Filter applied | YES | Lines 1314-1319 |
| KPI Scorecard from filtered | YES | Lines 1322-1350 |
| Charts from filtered | YES | Combo chart (line 1353+), status donut (line 1399+), variance chart (line 1414+) |
| Summary table from filtered | YES | Lines 1430-1461 |

**VERDICT: PASS** -- All 3 filters fully functional across all 5 visual components.

---

### PAGE 8: `page-calendar` (Personnel Plan)

**HTML Filter Bar** (line 397-404):
```html
<div class="filter-bar">
  <label for="f-cal-year">Year</label>
  <select class="filter-select" id="f-cal-year">...</select>
  <label for="f-cal-month">Month</label>
  <select class="filter-select" id="f-cal-month">...</select>
  <label for="f-cal-week">Week</label>
  <select class="filter-select" id="f-cal-week">...</select>
</div>
```

| Check | Status | Detail |
|-------|--------|--------|
| Filter bar present | YES | Line 397 |
| Year filter | YES | `f-cal-year` |
| Month filter | YES | `f-cal-month` |
| Week filter | YES | `f-cal-week` |
| Select has id | YES | All three |
| wireFilter calls | YES | Lines 1687-1689 |
| getFilterVal read | **PARTIAL** | Year (line 1484), Month (line 1485) -- **Week is NOT read** |
| Filter applied | **PARTIAL** | Year and Month applied (lines 1487-1491) -- **Week NOT applied** |
| Gantt from filtered | YES | `buildGantt('gantt-personnel', filtered)` |
| Small Multiples | **NO** | Lines 1495-1507: use `rand()` -- **hardcoded random, NOT from filtered data** |
| Resources by Client table | **NO** | Line 1509: `rand(1,5)` -- **random data, ignores filters entirely** |
| Resources by Installation table | **NO** | Line 1512: `rand(1,4)` -- **random data, ignores filters entirely** |

**BUGS FOUND:**

1. **BUG [HIGH]: Week filter wired but NEVER read or applied**
   - HTML has `f-cal-week` (line 403)
   - wireFilter called (line 1689)
   - But `renderCalendar()` does NOT call `getFilterVal('f-cal-week')` (lines 1482-1514)
   - The Week filter dropdown changes will trigger re-render, but the value is ignored
   - **User sees the filter change but data doesn't respond**

2. **BUG [HIGH]: Small Multiples use hardcoded random values**
   - Lines 1495-1507: ManDays, Utilization %, and Active Technicians all use `rand()` / `randF()`
   - These values are regenerated with new random values on every re-render (when any filter changes)
   - They do NOT derive from the `filtered` dataset
   - **User changes a filter and sees random numbers change -- misleading**

3. **BUG [HIGH]: Resource tables use hardcoded random values**
   - Lines 1509-1510: `DEMO.clients.slice(0,6).map(c => [rand(1,5), c])` -- random
   - Lines 1512-1513: `DEMO.installations.slice(0,6).map(inst => [rand(1,4), inst])` -- random
   - These tables completely ignore the `filtered` data
   - **User changes Year filter and sees random numbers change**

**VERDICT: FAIL** -- Week filter broken. Small multiples and tables are decorative only.

---

### PAGE 9: `page-eqplan` (Equipment Plan)

**HTML Filter Bar** (line 420-427):
```html
<div class="filter-bar">
  <label for="f-eqp-year">Year</label>
  <select class="filter-select" id="f-eqp-year">...</select>
  <label for="f-eqp-month">Month</label>
  <select class="filter-select" id="f-eqp-month">...</select>
  <label for="f-eqp-week">Week</label>
  <select class="filter-select" id="f-eqp-week">...</select>
</div>
```

| Check | Status | Detail |
|-------|--------|--------|
| Filter bar present | YES | Line 420 |
| Year filter | YES | `f-eqp-year` |
| Month filter | YES | `f-eqp-month` |
| Week filter | YES | `f-eqp-week` |
| Select has id | YES | All three |
| wireFilter calls | YES | Lines 1690-1692 |
| getFilterVal read | **PARTIAL** | Year (line 1536), Month (line 1537) -- **Week is NOT read** |
| Filter applied | **PARTIAL** | Year and Month applied (lines 1539-1543) -- **Week NOT applied** |
| Gantt from filtered | YES | `buildGantt('gantt-equipment', filtered)` |
| Small Multiples | **NO** | Lines 1548-1556: use `rand()` / `randF()` -- **hardcoded random** |
| Equipment by Client table | **NO** | Line 1559: `rand(1,6)` -- **random data** |
| Equipment by Installation table | **NO** | Line 1561: `rand(1,4)` -- **random data** |

**BUGS FOUND:**

1. **BUG [HIGH]: Week filter wired but NEVER read or applied** (identical to Calendar page)
   - Same pattern: wireFilter exists, getFilterVal is never called for `f-eqp-week`

2. **BUG [HIGH]: Small Multiples use hardcoded random values**
   - Lines 1548-1556: Days Deployed, Utilization %, Active Units all use `rand()` / `randF()`

3. **BUG [HIGH]: Resource tables use hardcoded random values**
   - Lines 1559-1562: Both tables ignore `filtered` data entirely

**VERDICT: FAIL** -- Identical issues to Calendar page.

---

### PAGE 10: `page-materials` (Material Tracker)

**HTML Filter Bar** (line 443-450):
```html
<div class="filter-bar">
  <label for="f-mat-year">Year</label>
  <select class="filter-select" id="f-mat-year">...</select>
  <label for="f-mat-month">Month</label>
  <select class="filter-select" id="f-mat-month">...</select>
  <label for="f-mat-status">Status</label>
  <select class="filter-select" id="f-mat-status">...</select>
</div>
```

| Check | Status | Detail |
|-------|--------|--------|
| Filter bar present | YES | Line 443 |
| Year filter | YES | `f-mat-year` |
| Month filter | YES | `f-mat-month` |
| Status filter | YES | `f-mat-status` |
| Select has id | YES | All three |
| wireFilter calls | YES | Lines 1696-1698 |
| getFilterVal read | YES | Lines 1588-1590 |
| Filter applied | YES | Lines 1591-1596 |
| Gantt from filtered | YES | Lines 1600-1627 |
| Small Multiples | **NO** | Lines 1630-1636: `rand()` / `randF()` -- **hardcoded random** |
| Materials by Installation table | YES | Lines 1639-1642: uses `filtered` data |
| Materials by Type chart | YES | Lines 1645-1657: uses `filtered` data |

**BUG FOUND:**

1. **BUG [MEDIUM]: Small Multiples use hardcoded random values**
   - Lines 1630-1636: Total Items, On Site %, Pending Delivery all use `rand()` / `randF()`
   - These do NOT reflect the filtered dataset

**VERDICT: FAIL** -- Small multiples are decorative. Core components (Gantt, table, chart) work correctly.

---

## MISSING FILTERS LIST

### 1. page-overview: MISSING Year Filter

**Current state:** Only has Department filter.

**HTML to add** (insert before the Department label, line 244):
```html
<label for="f-ov-year">Year</label>
<select class="filter-select" id="f-ov-year">
  <option value="">All</option>
  <option>2025</option>
  <option>2026</option>
</select>
```

**JS changes needed:**

1. Add `year` field to data model in `generateOverviewData()` (line 748):
```javascript
// Inside the for loop, add:
const yr = pick(['2025','2026']);
projects.push({ dept, client, service, bdStatus, monthIdx, revenue, cmr, year: yr });
```

2. Add wireFilter call in `init()` (after line 1675):
```javascript
wireFilter('f-ov-year','overview');
```

3. Add getFilterVal read in `renderOverview()` (after line 763):
```javascript
const fYear = getFilterVal('f-ov-year');
```

4. Add year check to filter logic (line 766):
```javascript
const filtered = data.projects.filter(p => {
  if (fYear && p.year !== fYear) return false;
  if (fDept && p.dept !== fDept) return false;
  return true;
});
```

---

### 2. page-equipment: MISSING Year Filter

**Current state:** Only has Location and Equipment Type filters.

**HTML to add** (insert before the Location label, line 267):
```html
<label for="f-eq-year">Year</label>
<select class="filter-select" id="f-eq-year">
  <option value="">All</option>
  <option>2025</option>
  <option>2026</option>
</select>
```

**JS changes needed:**

1. Extract year from `calibrationDate` in `generateEquipmentData()` (line 902, after status assignment):
```javascript
DATA.equipment.push({
  ...existing fields...,
  year: String(cDate.getFullYear())
});
```

2. Add wireFilter call in `init()` (after line 1676):
```javascript
wireFilter('f-eq-year','equipment');
```

3. Add getFilterVal read in `renderEquipment()` (after line 918):
```javascript
const fYear = getFilterVal('f-eq-year');
```

4. Add year check to filter logic (line 921):
```javascript
const filtered = data.filter(e => {
  if (fYear && e.year !== fYear) return false;
  if (fLocation && e.location !== fLocation) return false;
  if (fType && e.type !== fType) return false;
  return true;
});
```

---

### 3. page-projects: MISSING Year Filter (and Month Filter)

**Current state:** Only has Client and BD Status filters.

**HTML to add** (insert before the Client label, line 288):
```html
<label for="f-pj-year">Year</label>
<select class="filter-select" id="f-pj-year">
  <option value="">All</option>
  <option>2025</option>
  <option>2026</option>
</select>
<label for="f-pj-month">Month</label>
<select class="filter-select" id="f-pj-month">
  <option value="">All</option>
  <option>Jan</option><option>Feb</option><option>Mar</option><option>Apr</option>
  <option>May</option><option>Jun</option><option>Jul</option><option>Aug</option>
  <option>Sep</option><option>Oct</option><option>Nov</option><option>Dec</option>
</select>
```

**JS changes needed:**

1. Add `year` field to `generateProjectsData()` (line 997):
```javascript
const yr = pick(['2025','2026']);
DATA.projects.push({ ...existing fields..., year: yr });
```

2. Add wireFilter calls in `init()`:
```javascript
wireFilter('f-pj-year','projects');
wireFilter('f-pj-month','projects');
```

3. Read filters in `renderProjects()`:
```javascript
const fYear = getFilterVal('f-pj-year');
const fMonth = getFilterVal('f-pj-month');
```

4. Apply in filter logic:
```javascript
const filtered = data.filter(p => {
  if (fYear && p.year !== fYear) return false;
  if (fMonth && p.month !== fMonth) return false;
  if (fClient && p.client !== fClient) return false;
  if (fStatus && p.bdStatus !== fStatus) return false;
  return true;
});
```

---

## BUG LIST

### BUG-F01 [CRITICAL]: page-overview missing Year filter
- **Page:** page-overview (GY Overview)
- **Impact:** Users cannot filter overview data by year. All-time data is always shown.
- **Cause:** No Year `<select>` in HTML; no `year` property in data model
- **Fix:** See "Missing Filters List" section 1 above

### BUG-F02 [CRITICAL]: page-equipment missing Year filter
- **Page:** page-equipment (Equipment)
- **Impact:** Users cannot filter equipment/calibration data by year
- **Cause:** No Year `<select>` in HTML
- **Fix:** See "Missing Filters List" section 2 above

### BUG-F03 [CRITICAL]: page-projects missing Year filter
- **Page:** page-projects (Projects & PO)
- **Impact:** Users cannot filter project data by year; also missing Month filter
- **Cause:** No Year or Month `<select>` in HTML; no `year` property in data model
- **Fix:** See "Missing Filters List" section 3 above

### BUG-F04 [HIGH]: page-calendar Week filter wired but never applied
- **Page:** page-calendar (Personnel Plan)
- **Impact:** User changes Week dropdown but Gantt and tables do not respond
- **Lines:** HTML line 403 has `f-cal-week`; wireFilter at line 1689; but `renderCalendar()` at lines 1482-1514 never calls `getFilterVal('f-cal-week')`
- **Fix:** Add `const fWeek = getFilterVal('f-cal-week');` and apply week filtering logic to data

### BUG-F05 [HIGH]: page-eqplan Week filter wired but never applied
- **Page:** page-eqplan (Equipment Plan)
- **Impact:** Same as BUG-F04 -- user sees Week dropdown but it does nothing
- **Lines:** HTML line 426 has `f-eqp-week`; wireFilter at line 1692; `renderEqPlan()` at lines 1534-1563 never reads it
- **Fix:** Add `const fWeek = getFilterVal('f-eqp-week');` and apply week filtering logic

### BUG-F06 [HIGH]: page-calendar Small Multiples show random values, not filtered data
- **Page:** page-calendar (Personnel Plan)
- **Impact:** ManDays, Utilization %, Active Technicians cards show random numbers that change on every filter interaction, misleading users
- **Lines:** 1495-1507 use `rand()` and `randF()`
- **Fix:** Calculate values from `filtered` array instead of `rand()`

### BUG-F07 [HIGH]: page-calendar resource tables show random values, not filtered data
- **Page:** page-calendar (Personnel Plan)
- **Impact:** "Resources by Client" and "Resources by Installation" tables show random numbers
- **Lines:** 1509-1513 use `rand()` instead of computing from `filtered`
- **Fix:** Aggregate `filtered` data by client/installation

### BUG-F08 [HIGH]: page-eqplan Small Multiples show random values, not filtered data
- **Page:** page-eqplan (Equipment Plan)
- **Impact:** Days Deployed, Utilization %, Active Units cards show random numbers
- **Lines:** 1548-1556 use `rand()` and `randF()`
- **Fix:** Calculate from `filtered` array

### BUG-F09 [HIGH]: page-eqplan resource tables show random values, not filtered data
- **Page:** page-eqplan (Equipment Plan)
- **Impact:** "Equipment by Client" and "Equipment by Installation" tables show random numbers
- **Lines:** 1559-1562 use `rand()` instead of computing from `filtered`
- **Fix:** Aggregate `filtered` data

### BUG-F10 [MEDIUM]: page-materials Small Multiples show random values, not filtered data
- **Page:** page-materials (Material Tracker)
- **Impact:** Total Items, On Site %, Pending Delivery cards show random numbers
- **Lines:** 1630-1636 use `rand()` and `randF()`
- **Fix:** Calculate from `filtered` array

### BUG-F11 [LOW]: page-calendar data model missing `week` field
- **Page:** page-calendar
- **Impact:** Even if BUG-F04 is fixed (reading the Week filter), the data model (`generateCalendarData()` line 1465-1480) does not generate a `week` property for each record
- **Fix:** Add week calculation, e.g.: `week: 'W' + Math.ceil(month * 4.33 / 12)` or derive from start position

### BUG-F12 [LOW]: page-eqplan data model missing `week` field
- **Page:** page-eqplan
- **Impact:** Same as BUG-F11 -- data model has no `week` property to filter against
- **Fix:** Add week field to `generateEqPlanData()`

### BUG-F13 [LOW]: page-overview data model missing `year` field
- **Page:** page-overview
- **Impact:** Even if Year filter HTML is added, `generateOverviewData()` does not create `year` on projects
- **Lines:** 747-758
- **Fix:** Add `year: pick(['2025','2026'])` to each generated project

### BUG-F14 [LOW]: page-projects data model missing `year` field
- **Page:** page-projects
- **Impact:** Same as BUG-F13 for projects data
- **Lines:** 986-1010
- **Fix:** Add `year` property

---

## FILTER WIRING VERIFICATION

Complete cross-reference of all 23 filters:

| # | HTML id | Page | wireFilter call | getFilterVal read | Applied in .filter() | End-to-end |
|---|---------|------|:-:|:-:|:-:|:-:|
| 1 | f-ov-dept | overview | Line 1675 | Line 763 | Line 766 | YES |
| 2 | f-eq-location | equipment | Line 1676 | Line 917 | Line 921 | YES |
| 3 | f-eq-type | equipment | Line 1677 | Line 918 | Line 922 | YES |
| 4 | f-pj-client | projects | Line 1678 | Line 1014 | Line 1018 | YES |
| 5 | f-pj-status | projects | Line 1679 | Line 1015 | Line 1019 | YES |
| 6 | f-bl-year | backlog | Line 1680 | Line 1123 | Line 1127 | YES |
| 7 | f-bl-status | backlog | Line 1681 | Line 1124 | Line 1128 | YES |
| 8 | f-rfq-year | rfq | Line 1682 | Line 1220 | Line 1225 | YES |
| 9 | f-rfq-month | rfq | Line 1683 | Line 1221 | Line 1226 | YES |
| 10 | f-rfq-status | rfq | Line 1684 | Line 1222 | Line 1227 | YES |
| 11 | f-orfq-year | openrfq | Line 1685 | Line 1267 | Line 1271 | YES |
| 12 | f-orfq-month | openrfq | Line 1686 | Line 1268 | Line 1272 | YES |
| 13 | f-ql-year | quotelog | Line 1693 | Line 1311 | Line 1315 | YES |
| 14 | f-ql-month | quotelog | Line 1694 | Line 1312 | Line 1316 | YES |
| 15 | f-ql-status | quotelog | Line 1695 | Line 1313 | Line 1317 | YES |
| 16 | f-cal-year | calendar | Line 1687 | Line 1484 | Line 1489 | YES |
| 17 | f-cal-month | calendar | Line 1688 | Line 1485 | Line 1489 | YES |
| 18 | f-cal-week | calendar | Line 1689 | **NOT READ** | **NOT APPLIED** | **BROKEN** |
| 19 | f-eqp-year | eqplan | Line 1690 | Line 1536 | Line 1540 | YES |
| 20 | f-eqp-month | eqplan | Line 1691 | Line 1537 | Line 1541 | YES |
| 21 | f-eqp-week | eqplan | Line 1692 | **NOT READ** | **NOT APPLIED** | **BROKEN** |
| 22 | f-mat-year | materials | Line 1696 | Line 1588 | Line 1592 | YES |
| 23 | f-mat-month | materials | Line 1697 | Line 1589 | Line 1593 | YES |
| 24 | f-mat-status | materials | Line 1698 | Line 1590 | Line 1594 | YES |

**Summary:** 20/23 filters work end-to-end (wired + read + applied). 2 filters are wired but broken (Week filters on Calendar and Equipment Plan). 1 filter is an HTML discrepancy (24 filter selects exist, with 23 wireFilter calls -- all 23 wired ones are accounted for; the 24th is technically f-mat-status which IS wired).

---

## COMPONENTS NOT DRIVEN BY FILTERED DATA

These sections regenerate random values on every render instead of computing from the filtered dataset:

| Page | Component | Lines | Uses `rand()` | Should use `filtered` |
|------|-----------|-------|:---:|:---:|
| page-calendar | Small Multiples (ManDays) | 1499 | YES | YES |
| page-calendar | Small Multiples (Utilization %) | 1502 | YES | YES |
| page-calendar | Small Multiples (Active Technicians) | 1505 | YES | YES |
| page-calendar | Resources by Client table | 1509 | YES | YES |
| page-calendar | Resources by Installation table | 1512 | YES | YES |
| page-eqplan | Small Multiples (Days Deployed) | 1552 | YES | YES |
| page-eqplan | Small Multiples (Utilization %) | 1553 | YES | YES |
| page-eqplan | Small Multiples (Active Units) | 1554 | YES | YES |
| page-eqplan | Equipment by Client table | 1559 | YES | YES |
| page-eqplan | Equipment by Installation table | 1561 | YES | YES |
| page-materials | Small Multiples (Total Items) | 1633 | YES | YES |
| page-materials | Small Multiples (On Site %) | 1634 | YES | YES |
| page-materials | Small Multiples (Pending Delivery) | 1635 | YES | YES |

**Total: 13 data-presentation components show random values instead of derived data.**

---

## PRIORITY FIX ORDER

| Priority | Bug IDs | Description | Impact |
|----------|---------|-------------|--------|
| **P0** | F01, F02, F03 | Add Year filters to Overview, Equipment, Projects pages | Client requirement violation. 3 of 10 pages cannot filter by year at all. |
| **P1** | F04, F05, F11, F12 | Fix Week filter on Calendar and Equipment Plan (read value + add week field to data) | Users see a broken dropdown -- expectation violation |
| **P2** | F06, F07, F08, F09, F10 | Replace rand() in Small Multiples and resource tables with filtered data aggregation | Misleading dashboard data -- numbers change randomly on filter interaction |
| **P3** | F14 | Add year field to Projects data model | Prerequisite for F03 fix |

---

## CONCLUSION

The filter system architecture (`wireFilter` / `getFilterVal` / `rendered` cache reset pattern) is fundamentally sound. The `rendered` object is properly set to `false` in the `wireFilter` change handler, which forces re-render on filter change. The `mk()` chart factory correctly destroys and recreates charts.

However, the dashboard has **3 critical gaps** (missing Year filters on the 3 most important pages), **2 broken filters** (Week dropdowns that do nothing), and **13 data components** showing random values instead of computed data from the filtered dataset. These issues combined mean that approximately 40% of the dashboard's interactive surface area is either missing, non-functional, or misleading.

The client complaint about missing filters is justified.
