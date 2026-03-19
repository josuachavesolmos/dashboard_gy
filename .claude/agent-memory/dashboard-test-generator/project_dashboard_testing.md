---
name: Dashboard Testing Infrastructure
description: Axess GY Dashboard architecture — single-file SPA with ApexCharts, filter audit results, and known gaps as of 2026-03-17
type: project
---

Two separate dashboards exist in this project:
1. `/dashboard.html` — SheetJS + Chart.js based, has Playwright test suite in `/tests/dashboard.spec.js` (121 tests)
2. `/Axess_GY_Dashboard.html` — ApexCharts based, single-file SPA (~1701 lines), demo data with random generation, 10 pages

**For Axess_GY_Dashboard.html (updated 2026-03-17):**
- Filter engine is now wired: `wireFilter()` / `getFilterVal()` / `rendered` cache reset pattern works
- 23 filter `<select>` elements exist in HTML; 23 `wireFilter()` calls in init
- 20 of 23 filters work end-to-end (wired + read + applied)
- 3 pages MISSING mandatory Year filter: Overview, Equipment, Projects (client requirement violation)
- 2 Week filters (Calendar, Equipment Plan) are wired but never read in render functions
- 13 small-multiples / resource-table components use `rand()` instead of filtered data
- Comprehensive audit saved at `/QA_Filter_Audit.md` with 14 bugs cataloged (3 Critical, 7 High, 1 Medium, 3 Low)

**Why:** Client complained about missing filters. The 3 missing Year filters are the top priority fix.

**How to apply:** When writing tests or fixes, prioritize P0 (add Year filters to Overview/Equipment/Projects), then P1 (fix Week filters), then P2 (replace rand() in small multiples/tables).
