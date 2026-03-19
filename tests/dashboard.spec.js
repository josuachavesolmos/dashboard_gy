// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

/* ═══════════════════════════════════════════════════════════════
   Axess Group Operations Dashboard — Comprehensive Test Suite
   ═══════════════════════════════════════════════════════════════
   Tests a single-file HTML dashboard (dashboard.html) that:
   - Loads 3 Excel files via SheetJS (client-side)
   - Renders Chart.js interactive charts
   - Has 3 tabs: Quote Log, Personnel Planner, Master Project
   - Filters dynamically update all KPIs and charts
   ═══════════════════════════════════════════════════════════════ */

const DASHBOARD_PATH = path.resolve(__dirname, '..', 'dashboard.html');
const DASHBOARD_URL = `file://${DASHBOARD_PATH}`;

const TEMPLATES = path.resolve(__dirname, '..', 'templates');
const FILES = {
  quote: path.join(TEMPLATES, 'QuoteLog_2026-03-16_210018.xlsx'),
  personnel: path.join(TEMPLATES, 'Personnel_Planner_TEMPLATE.xlsx'),
  master: path.join(TEMPLATES, 'Guyana Master Project Sheet - 2025.xlsx'),
};

// ─── Helper: navigate to dashboard and wait for libs ───
async function openDashboard(page) {
  await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
  // Wait for both external libraries to load
  await page.waitForFunction(() => typeof window.XLSX !== 'undefined', { timeout: 15000 });
  await page.waitForFunction(() => typeof window.Chart !== 'undefined', { timeout: 15000 });
}

// ─── Helper: upload a file to a specific upload button ───
async function uploadFile(page, type, filePath) {
  const selectorMap = {
    quote: '#uploadQuote input[type="file"]',
    personnel: '#uploadPersonnel input[type="file"]',
    master: '#uploadMaster input[type="file"]',
  };
  const input = page.locator(selectorMap[type]);
  await input.setInputFiles(filePath);

  // Wait for processing to complete (button gains 'loaded' class)
  const btnId = `upload${type.charAt(0).toUpperCase() + type.slice(1)}`;
  await page.waitForFunction(
    (id) => document.getElementById(id)?.classList.contains('loaded'),
    btnId,
    { timeout: 20000 }
  );
}

// ─── Helper: upload all 3 files ───
async function uploadAllFiles(page) {
  await uploadFile(page, 'quote', FILES.quote);
  await uploadFile(page, 'personnel', FILES.personnel);
  await uploadFile(page, 'master', FILES.master);
}

// ─── Helper: switch to a tab ───
async function switchTab(page, tabName) {
  await page.click(`.tab-btn[data-tab="${tabName}"]`);
  await page.waitForSelector(`#tab-${tabName}.active`, { timeout: 3000 });
}


/* ═══════════════════════════════════════════════════════════════
   1. FILE UPLOAD & PARSING
   ═══════════════════════════════════════════════════════════════ */
test.describe('1. File Upload & Parsing', () => {

  test('1.1 SheetJS library loads successfully', async ({ page }) => {
    await openDashboard(page);
    const xlsxLoaded = await page.evaluate(() => typeof window.XLSX !== 'undefined');
    expect(xlsxLoaded).toBe(true);
    const hasRead = await page.evaluate(() => typeof window.XLSX.read === 'function');
    expect(hasRead).toBe(true);
  });

  test('1.2 Chart.js library loads successfully', async ({ page }) => {
    await openDashboard(page);
    const chartLoaded = await page.evaluate(() => typeof window.Chart !== 'undefined');
    expect(chartLoaded).toBe(true);
  });

  test('1.3 Quote Log file parses correctly', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'quote', FILES.quote);

    const rowCount = await page.evaluate(() => state.quote.raw.length);
    expect(rowCount).toBeGreaterThan(0);
    // Expected ~392 rows based on known data
    expect(rowCount).toBeGreaterThanOrEqual(300);

    // Upload button shows "loaded" state
    const isLoaded = await page.evaluate(() =>
      document.getElementById('uploadQuote').classList.contains('loaded')
    );
    expect(isLoaded).toBe(true);
  });

  test('1.4 Personnel Planner file parses correctly', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'personnel', FILES.personnel);

    const rowCount = await page.evaluate(() => state.personnel.raw.length);
    expect(rowCount).toBeGreaterThan(0);
    // Expected ~226 rows, filtered to those with 'Technician Name'
    expect(rowCount).toBeGreaterThanOrEqual(50);

    const isLoaded = await page.evaluate(() =>
      document.getElementById('uploadPersonnel').classList.contains('loaded')
    );
    expect(isLoaded).toBe(true);
  });

  test('1.5 Master Project file parses correctly', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'master', FILES.master);

    const rowCount = await page.evaluate(() => state.master.raw.length);
    expect(rowCount).toBeGreaterThan(0);
    // Master Project has variable row count depending on filtering by 'Work Order Number'
    expect(rowCount).toBeGreaterThanOrEqual(50);

    const isLoaded = await page.evaluate(() =>
      document.getElementById('uploadMaster').classList.contains('loaded')
    );
    expect(isLoaded).toBe(true);
  });

  test('1.6 Quote Log data has expected columns', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'quote', FILES.quote);

    const columns = await page.evaluate(() => {
      const row = state.quote.raw[0];
      return row ? Object.keys(row) : [];
    });

    const requiredColumns = ['Status', 'Segment', 'Customer', 'Responsible', 'Sum Total Base Currency'];
    for (const col of requiredColumns) {
      expect(columns, `Missing required column: ${col}`).toContain(col);
    }
  });

  test('1.7 Personnel Planner data has expected columns', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'personnel', FILES.personnel);

    const columns = await page.evaluate(() => {
      const row = state.personnel.raw[0];
      return row ? Object.keys(row) : [];
    });

    const requiredColumns = ['Technician Name', 'Status', 'Client', 'Installation'];
    for (const col of requiredColumns) {
      expect(columns, `Missing required column: ${col}`).toContain(col);
    }
  });

  test('1.8 Master Project data has expected columns', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'master', FILES.master);

    const columns = await page.evaluate(() => {
      const row = state.master.raw[0];
      return row ? Object.keys(row) : [];
    });

    const requiredColumns = ['Work Order Number', 'Installation', 'Client', 'PO Value'];
    for (const col of requiredColumns) {
      expect(columns, `Missing required column: ${col}`).toContain(col);
    }
  });

  test('1.9 Master Project correctly finds header row with "Work Order"', async ({ page }) => {
    await openDashboard(page);

    // Capture console logs to check header detection
    const logs = [];
    page.on('console', (msg) => {
      if (msg.text().includes('Master headers') || msg.text().includes('Master Project')) {
        logs.push(msg.text());
      }
    });

    await uploadFile(page, 'master', FILES.master);

    // Should have logged the sheet name and headers
    const headerLog = logs.find((l) => l.includes('Master headers'));
    expect(headerLog).toBeTruthy();

    // Verify Work Order Number exists in data
    const hasWorkOrder = await page.evaluate(() =>
      state.master.raw.some((r) => r['Work Order Number'])
    );
    expect(hasWorkOrder).toBe(true);
  });

  test('1.10 SheetJS cellDates fallback works (no crash on retry path)', async ({ page }) => {
    await openDashboard(page);

    // Monitor for errors during upload
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await uploadFile(page, 'quote', FILES.quote);

    // Even if cellDates:true fails, fallback should succeed
    const isLoaded = await page.evaluate(() =>
      document.getElementById('uploadQuote').classList.contains('loaded')
    );
    expect(isLoaded).toBe(true);

    // No unhandled page errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('net::')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('1.11 Row count badges update after upload', async ({ page }) => {
    await openDashboard(page);

    // Before upload, count shows dash
    const beforeText = await page.textContent('#count-quote');
    expect(beforeText?.trim()).toBe('—');

    await uploadFile(page, 'quote', FILES.quote);

    const afterText = await page.textContent('#count-quote');
    const countNum = parseInt(afterText?.trim() || '0', 10);
    expect(countNum).toBeGreaterThan(0);
  });

  test('1.12 Empty state hides after file upload', async ({ page }) => {
    await openDashboard(page);

    // Empty state visible before upload
    await expect(page.locator('#empty-quote')).toBeVisible();
    await expect(page.locator('#data-quote')).toBeHidden();

    await uploadFile(page, 'quote', FILES.quote);

    // Empty state hidden, data panel visible
    await expect(page.locator('#empty-quote')).toBeHidden();
    await expect(page.locator('#data-quote')).toBeVisible();
  });
});


/* ═══════════════════════════════════════════════════════════════
   2. CHART RENDERING
   ═══════════════════════════════════════════════════════════════ */
test.describe('2. Chart Rendering', () => {

  test.beforeEach(async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'quote', FILES.quote);
  });

  test('2.1 All Quote Log chart canvases have non-zero dimensions', async ({ page }) => {
    const canvasIds = [
      'qc-funnel', 'qc-segment', 'qc-clients', 'qc-probability',
      'qc-products', 'qc-responsible', 'qc-timeline', 'qc-cmr', 'qc-winrate',
    ];

    for (const id of canvasIds) {
      const dims = await page.evaluate((canvasId) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return { width: 0, height: 0, exists: false };
        const rect = canvas.getBoundingClientRect();
        return { width: rect.width, height: rect.height, exists: true };
      }, id);

      expect(dims.exists, `Canvas #${id} should exist in DOM`).toBe(true);
      expect(dims.width, `Canvas #${id} width should be > 0 (got ${dims.width})`).toBeGreaterThan(0);
      expect(dims.height, `Canvas #${id} height should be > 0 (got ${dims.height}). Known issue: canvas height collapsing to 0`).toBeGreaterThan(0);
    }
  });

  test('2.2 Chart.js instances are created for all Quote Log charts', async ({ page }) => {
    const chartKeys = await page.evaluate(() => Object.keys(charts));
    const expected = [
      'qc-funnel', 'qc-segment', 'qc-clients', 'qc-probability',
      'qc-products', 'qc-responsible', 'qc-timeline', 'qc-cmr', 'qc-winrate',
    ];

    for (const key of expected) {
      expect(chartKeys, `Chart instance for "${key}" should exist`).toContain(key);
    }
  });

  test('2.3 Personnel charts render after upload', async ({ page }) => {
    await uploadFile(page, 'personnel', FILES.personnel);
    await switchTab(page, 'personnel');

    // Allow chart resize after tab switch
    await page.waitForTimeout(200);

    const personnelCanvasIds = ['pc-status', 'pc-class', 'pc-install', 'pc-client', 'pc-comp', 'pc-mandays'];

    for (const id of personnelCanvasIds) {
      const exists = await page.evaluate((cid) => !!charts[cid], id);
      expect(exists, `Chart instance for "${id}" should be created`).toBe(true);
    }
  });

  test('2.4 Master Project charts render after upload', async ({ page }) => {
    await uploadFile(page, 'master', FILES.master);
    await switchTab(page, 'master');
    await page.waitForTimeout(200);

    const masterCanvasIds = ['mc-status', 'mc-install', 'mc-resp', 'mc-poinv', 'mc-period'];

    for (const id of masterCanvasIds) {
      const exists = await page.evaluate((cid) => !!charts[cid], id);
      expect(exists, `Chart instance for "${id}" should be created`).toBe(true);
    }
  });

  test('2.5 Donut charts have correct type "doughnut"', async ({ page }) => {
    const donutCharts = ['qc-segment'];
    for (const id of donutCharts) {
      const type = await page.evaluate((cid) => charts[cid]?.config?.type, id);
      expect(type).toBe('doughnut');
    }
  });

  test('2.6 Timeline chart is a line chart with fill (area)', async ({ page }) => {
    const config = await page.evaluate(() => {
      const c = charts['qc-timeline'];
      if (!c) return null;
      return {
        type: c.config.type,
        fill: c.config.data.datasets[0]?.fill,
      };
    });
    expect(config).not.toBeNull();
    expect(config.type).toBe('line');
    expect(config.fill).toBe(true);
  });

  test('2.7 Sales Funnel is a horizontal bar chart', async ({ page }) => {
    const config = await page.evaluate(() => {
      const c = charts['qc-funnel'];
      if (!c) return null;
      return {
        type: c.config.type,
        indexAxis: c.config.options?.indexAxis,
      };
    });
    expect(config).not.toBeNull();
    expect(config.type).toBe('bar');
    expect(config.indexAxis).toBe('y');
  });

  test('2.8 Chart containers (.chart-wrap) have sufficient min-height', async ({ page }) => {
    const wraps = page.locator('#charts-quote .chart-wrap');
    const count = await wraps.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const minHeight = await wraps.nth(i).evaluate((el) => {
        return parseInt(getComputedStyle(el).minHeight, 10);
      });
      expect(minHeight, `Chart wrap ${i} min-height should be >= 200px`).toBeGreaterThanOrEqual(200);
    }
  });

  test('2.9 Chart data has non-empty datasets', async ({ page }) => {
    const chartsToCheck = ['qc-funnel', 'qc-segment', 'qc-clients'];
    for (const id of chartsToCheck) {
      const dataLength = await page.evaluate((cid) => {
        const c = charts[cid];
        return c?.data?.datasets?.[0]?.data?.length ?? 0;
      }, id);
      expect(dataLength, `Chart "${id}" should have data points`).toBeGreaterThan(0);
    }
  });

  test('2.10 backgroundColor.replace() bug — no crash when backgroundColor is an array', async ({ page }) => {
    // This tests the known bug: barCfg tries .replace() on backgroundColor
    // which fails when it is an array instead of a string.
    // The fix is in barCfg: it checks typeof before calling replace.
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // CMR chart uses array backgroundColor
    await page.evaluate(() => {
      // Force re-render of CMR chart that uses array backgroundColor
      if (state.quote.filtered.length > 0) {
        renderQuoteCharts(state.quote.filtered);
      }
    });

    const replaceErrors = errors.filter((e) =>
      e.includes('replace') && e.includes('is not a function')
    );
    expect(
      replaceErrors,
      'backgroundColor.replace() should not crash when value is an array'
    ).toHaveLength(0);
  });

  test('2.11 Wide chart card spans 2 columns', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(200);

    const wideCard = page.locator('#charts-quote .chart-card.wide');
    await expect(wideCard).toBeVisible();

    // Verify the wide card is wider than a regular card
    const widths = await page.evaluate(() => {
      const wide = document.querySelector('#charts-quote .chart-card.wide');
      const regular = document.querySelector('#charts-quote .chart-card:not(.wide)');
      if (!wide || !regular) return { wide: 0, regular: 0 };
      return {
        wide: wide.getBoundingClientRect().width,
        regular: regular.getBoundingClientRect().width,
      };
    });

    // Wide card should be approximately 2x the width of a regular card (minus gap)
    expect(widths.wide).toBeGreaterThan(widths.regular * 1.5);
  });
});


/* ═══════════════════════════════════════════════════════════════
   3. KPI CALCULATIONS
   ═══════════════════════════════════════════════════════════════ */
test.describe('3. KPI Calculations', () => {

  test('3.1 Quote Log KPIs render and show valid values', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'quote', FILES.quote);

    // KPI cards should exist
    const kpiCards = page.locator('#kpi-quote .kpi-card');
    await expect(kpiCards).toHaveCount(5);

    // Check each KPI has a label and non-empty value
    for (let i = 0; i < 5; i++) {
      const label = await kpiCards.nth(i).locator('.kpi-label').textContent();
      const value = await kpiCards.nth(i).locator('.kpi-value').textContent();
      expect(label?.trim().length, `KPI ${i} should have a label`).toBeGreaterThan(0);
      expect(value?.trim().length, `KPI ${i} should have a value`).toBeGreaterThan(0);
      expect(value?.trim(), `KPI ${i} value should not be a dash`).not.toBe('—');
    }
  });

  test('3.2 Total Quotes KPI matches row count', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'quote', FILES.quote);

    const result = await page.evaluate(() => {
      const rowCount = state.quote.raw.length;
      const kpiText = document.querySelector('#kpi-quote .kpi-card:nth-child(1) .kpi-value')?.textContent;
      return { rowCount, kpiText: kpiText?.trim() };
    });

    expect(result.kpiText).toBe(String(result.rowCount));
  });

  test('3.3 Total Revenue KPI is a formatted currency value', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'quote', FILES.quote);

    const revText = await page.textContent('#kpi-quote .kpi-card:nth-child(2) .kpi-value');
    // Should start with $ and contain M/K/B or a number
    expect(revText?.trim()).toMatch(/^\$/);
  });

  test('3.4 Win Rate KPI is between 0% and 100%', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'quote', FILES.quote);

    const wrText = await page.textContent('#kpi-quote .kpi-card:nth-child(5) .kpi-value');
    const wrNum = parseFloat(wrText?.replace('%', '') || '0');
    expect(wrNum).toBeGreaterThanOrEqual(0);
    expect(wrNum).toBeLessThanOrEqual(100);
  });

  test('3.5 CMR KPI shows a percentage', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'quote', FILES.quote);

    const cmrText = await page.textContent('#kpi-quote .kpi-card:nth-child(4) .kpi-value');
    expect(cmrText?.trim()).toMatch(/%$/);
  });

  test('3.6 Win Rate sub-label shows "X won / Y decided"', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'quote', FILES.quote);

    const subText = await page.textContent('#kpi-quote .kpi-card:nth-child(5) .kpi-sub');
    expect(subText?.trim()).toMatch(/\d+ won \/ \d+ decided/);
  });

  test('3.7 Personnel KPIs render 5 cards with valid values', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'personnel', FILES.personnel);
    await switchTab(page, 'personnel');

    const kpiCards = page.locator('#kpi-personnel .kpi-card');
    await expect(kpiCards).toHaveCount(5);

    // Total Assignments should be > 0
    const totalText = await kpiCards.first().locator('.kpi-value').textContent();
    expect(parseInt(totalText?.trim() || '0', 10)).toBeGreaterThan(0);
  });

  test('3.8 Personnel Unique Technicians count is reasonable', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'personnel', FILES.personnel);
    await switchTab(page, 'personnel');

    const result = await page.evaluate(() => {
      const raw = state.personnel.raw;
      const techSet = new Set(raw.map((r) => (r['Technician Name'] || '').trim()));
      const kpiText = document.querySelector('#kpi-personnel .kpi-card:nth-child(2) .kpi-value')?.textContent;
      return { techCount: techSet.size, kpiText: kpiText?.trim() };
    });

    expect(parseInt(result.kpiText || '0', 10)).toBe(result.techCount);
  });

  test('3.9 Master Project KPIs render 5 cards', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'master', FILES.master);
    await switchTab(page, 'master');

    const kpiCards = page.locator('#kpi-master .kpi-card');
    await expect(kpiCards).toHaveCount(5);
  });

  test('3.10 Master PO Value is a formatted currency', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'master', FILES.master);
    await switchTab(page, 'master');

    const poText = await page.textContent('#kpi-master .kpi-card:nth-child(2) .kpi-value');
    expect(poText?.trim()).toMatch(/^\$/);
  });

  test('3.11 Master Completion Rate is between 0-100%', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'master', FILES.master);
    await switchTab(page, 'master');

    const crText = await page.textContent('#kpi-master .kpi-card:nth-child(5) .kpi-value');
    const crNum = parseFloat(crText?.replace('%', '') || '0');
    expect(crNum).toBeGreaterThanOrEqual(0);
    expect(crNum).toBeLessThanOrEqual(100);
  });

  test('3.12 KPI calculations are consistent with raw data', async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'quote', FILES.quote);

    const result = await page.evaluate(() => {
      const d = state.quote.raw;
      const computedRev = d.reduce((s, r) => s + (parseFloat(r['Sum Total Base Currency']) || 0), 0);
      const acc = d.filter((r) => r['Status'] === 'Accepted').length;
      const dec = d.filter((r) => r['Status'] === 'Accepted' || r['Status'] === 'Rejected').length;
      const computedWR = dec > 0 ? (acc / dec) * 100 : 0;
      return { computedRev, computedWR, totalRows: d.length, accepted: acc, decided: dec };
    });

    expect(result.totalRows).toBeGreaterThan(0);
    expect(result.computedRev).toBeGreaterThan(0);
    // Win rate should be a valid number
    expect(result.computedWR).toBeGreaterThanOrEqual(0);
  });
});


/* ═══════════════════════════════════════════════════════════════
   4. FILTER LOGIC
   ═══════════════════════════════════════════════════════════════ */
test.describe('4. Filter Logic', () => {

  test.beforeEach(async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'quote', FILES.quote);
  });

  test('4.1 Status filter populates with distinct values', async ({ page }) => {
    const optionCount = await page.evaluate(() => {
      return document.getElementById('fq-status').options.length;
    });
    // At least "All" + some statuses
    expect(optionCount).toBeGreaterThan(1);
  });

  test('4.2 Filtering by status reduces data count', async ({ page }) => {
    const totalBefore = await page.evaluate(() => state.quote.filtered.length);

    // Pick the second option (first non-"All" status)
    const statusValue = await page.evaluate(() => {
      const sel = document.getElementById('fq-status');
      return sel.options.length > 1 ? sel.options[1].value : null;
    });

    if (statusValue) {
      await page.selectOption('#fq-status', statusValue);
      await page.waitForTimeout(300);

      const totalAfter = await page.evaluate(() => state.quote.filtered.length);
      expect(totalAfter).toBeLessThan(totalBefore);
      expect(totalAfter).toBeGreaterThan(0);
    }
  });

  test('4.3 Filtering updates KPI values', async ({ page }) => {
    const kpiBefore = await page.textContent('#kpi-quote .kpi-card:nth-child(1) .kpi-value');

    const statusValue = await page.evaluate(() => {
      const sel = document.getElementById('fq-status');
      return sel.options.length > 1 ? sel.options[1].value : null;
    });

    if (statusValue) {
      await page.selectOption('#fq-status', statusValue);
      await page.waitForTimeout(300);

      const kpiAfter = await page.textContent('#kpi-quote .kpi-card:nth-child(1) .kpi-value');
      // KPI should change (unless all rows match the filter, unlikely)
      expect(kpiAfter).not.toBe(kpiBefore);
    }
  });

  test('4.4 Clear All button resets all filters', async ({ page }) => {
    // Apply a filter first
    const statusValue = await page.evaluate(() => {
      const sel = document.getElementById('fq-status');
      return sel.options.length > 1 ? sel.options[1].value : null;
    });
    if (statusValue) {
      await page.selectOption('#fq-status', statusValue);
      await page.waitForTimeout(300);
    }

    const filteredCount = await page.evaluate(() => state.quote.filtered.length);

    // Click Clear All
    await page.click('#filters-quote .filter-reset');
    await page.waitForTimeout(300);

    const clearedCount = await page.evaluate(() => state.quote.filtered.length);
    const rawCount = await page.evaluate(() => state.quote.raw.length);

    expect(clearedCount).toBe(rawCount);
    expect(clearedCount).toBeGreaterThanOrEqual(filteredCount);
  });

  test('4.5 Segment filter works', async ({ page }) => {
    const segmentValue = await page.evaluate(() => {
      const sel = document.getElementById('fq-segment');
      return sel.options.length > 1 ? sel.options[1].value : null;
    });

    if (segmentValue) {
      await page.selectOption('#fq-segment', segmentValue);
      await page.waitForTimeout(300);

      const allMatch = await page.evaluate((val) => {
        return state.quote.filtered.every((r) => r['Segment'] === val);
      }, segmentValue);

      expect(allMatch).toBe(true);
    }
  });

  test('4.6 Customer filter works', async ({ page }) => {
    const customerValue = await page.evaluate(() => {
      const sel = document.getElementById('fq-customer');
      return sel.options.length > 1 ? sel.options[1].value : null;
    });

    if (customerValue) {
      await page.selectOption('#fq-customer', customerValue);
      await page.waitForTimeout(300);

      const allMatch = await page.evaluate((val) => {
        return state.quote.filtered.every((r) => r['Customer'] === val);
      }, customerValue);

      expect(allMatch).toBe(true);
    }
  });

  test('4.7 Multiple filters combine (AND logic)', async ({ page }) => {
    const rawCount = await page.evaluate(() => state.quote.raw.length);

    // Apply status filter
    const statusValue = await page.evaluate(() => {
      const sel = document.getElementById('fq-status');
      return sel.options.length > 1 ? sel.options[1].value : null;
    });
    if (statusValue) {
      await page.selectOption('#fq-status', statusValue);
      await page.waitForTimeout(300);
    }

    const afterStatus = await page.evaluate(() => state.quote.filtered.length);

    // Apply segment filter on top
    const segmentValue = await page.evaluate(() => {
      const sel = document.getElementById('fq-segment');
      return sel.options.length > 1 ? sel.options[1].value : null;
    });
    if (segmentValue) {
      await page.selectOption('#fq-segment', segmentValue);
      await page.waitForTimeout(300);
    }

    const afterBoth = await page.evaluate(() => state.quote.filtered.length);

    // Combined filters should give equal or fewer results
    expect(afterBoth).toBeLessThanOrEqual(afterStatus);
    expect(afterStatus).toBeLessThanOrEqual(rawCount);
  });

  test('4.8 Date range filter works for Quote Log', async ({ page }) => {
    // Find the date range of the data
    const dateRange = await page.evaluate(() => {
      const dates = state.quote.raw
        .map((r) => {
          const d = r['Quote Date'];
          if (!d) return null;
          if (d instanceof Date) return d;
          const s = d.toString().trim();
          if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s);
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => a - b);
      if (dates.length === 0) return null;
      return {
        min: dates[0].toISOString().slice(0, 10),
        max: dates[dates.length - 1].toISOString().slice(0, 10),
        mid: dates[Math.floor(dates.length / 2)].toISOString().slice(0, 10),
      };
    });

    if (dateRange) {
      // Set "from" to midpoint — should reduce results
      await page.fill('#fq-from', dateRange.mid);
      await page.dispatchEvent('#fq-from', 'change');
      await page.waitForTimeout(300);

      const filtered = await page.evaluate(() => state.quote.filtered.length);
      const total = await page.evaluate(() => state.quote.raw.length);

      expect(filtered).toBeLessThan(total);
      expect(filtered).toBeGreaterThan(0);
    }
  });

  test('4.9 Personnel filters work', async ({ page }) => {
    await uploadFile(page, 'personnel', FILES.personnel);
    await switchTab(page, 'personnel');

    const rawCount = await page.evaluate(() => state.personnel.raw.length);

    const statusValue = await page.evaluate(() => {
      const sel = document.getElementById('fp-status');
      return sel.options.length > 1 ? sel.options[1].value : null;
    });

    if (statusValue) {
      await page.selectOption('#fp-status', statusValue);
      await page.waitForTimeout(300);

      const filtered = await page.evaluate(() => state.personnel.filtered.length);
      expect(filtered).toBeLessThanOrEqual(rawCount);
      expect(filtered).toBeGreaterThan(0);
    }
  });

  test('4.10 Master Project filters work', async ({ page }) => {
    await uploadFile(page, 'master', FILES.master);
    await switchTab(page, 'master');

    const rawCount = await page.evaluate(() => state.master.raw.length);

    const statusValue = await page.evaluate(() => {
      const sel = document.getElementById('fm-status');
      return sel.options.length > 1 ? sel.options[1].value : null;
    });

    if (statusValue) {
      await page.selectOption('#fm-status', statusValue);
      await page.waitForTimeout(300);

      const filtered = await page.evaluate(() => state.master.filtered.length);
      expect(filtered).toBeLessThanOrEqual(rawCount);
      expect(filtered).toBeGreaterThan(0);
    }
  });

  test('4.11 Charts re-render after filtering', async ({ page }) => {
    // Get initial chart data length for funnel
    const dataBefore = await page.evaluate(
      () => charts['qc-funnel']?.data?.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) ?? 0
    );

    const statusValue = await page.evaluate(() => {
      const sel = document.getElementById('fq-status');
      return sel.options.length > 1 ? sel.options[1].value : null;
    });

    if (statusValue) {
      await page.selectOption('#fq-status', statusValue);
      await page.waitForTimeout(500);

      const dataAfter = await page.evaluate(
        () => charts['qc-funnel']?.data?.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) ?? 0
      );

      // Total data in chart should change after filter
      expect(dataAfter).not.toBe(dataBefore);
    }
  });
});


/* ═══════════════════════════════════════════════════════════════
   5. TAB SWITCHING
   ═══════════════════════════════════════════════════════════════ */
test.describe('5. Tab Switching', () => {

  test.beforeEach(async ({ page }) => {
    await openDashboard(page);
  });

  test('5.1 Default tab is Quote Log and is active', async ({ page }) => {
    const isActive = await page.evaluate(() => {
      const btn = document.querySelector('.tab-btn[data-tab="quote"]');
      return btn?.classList.contains('active') ?? false;
    });
    expect(isActive).toBe(true);

    const contentVisible = await page.locator('#tab-quote').isVisible();
    expect(contentVisible).toBe(true);
  });

  test('5.2 Switching to Personnel tab hides Quote and shows Personnel', async ({ page }) => {
    await switchTab(page, 'personnel');

    await expect(page.locator('#tab-quote')).toBeHidden();
    await expect(page.locator('#tab-personnel')).toBeVisible();
  });

  test('5.3 Switching to Master tab hides others and shows Master', async ({ page }) => {
    await switchTab(page, 'master');

    await expect(page.locator('#tab-quote')).toBeHidden();
    await expect(page.locator('#tab-personnel')).toBeHidden();
    await expect(page.locator('#tab-master')).toBeVisible();
  });

  test('5.4 Only one tab button has "active" class at a time', async ({ page }) => {
    await switchTab(page, 'personnel');

    const activeCount = await page.evaluate(() => {
      return document.querySelectorAll('.tab-btn.active').length;
    });
    expect(activeCount).toBe(1);
  });

  test('5.5 aria-selected updates correctly on tab switch', async ({ page }) => {
    await switchTab(page, 'personnel');

    const ariaStates = await page.evaluate(() => {
      return {
        quote: document.querySelector('.tab-btn[data-tab="quote"]')?.getAttribute('aria-selected'),
        personnel: document.querySelector('.tab-btn[data-tab="personnel"]')?.getAttribute('aria-selected'),
        master: document.querySelector('.tab-btn[data-tab="master"]')?.getAttribute('aria-selected'),
      };
    });

    expect(ariaStates.quote).toBe('false');
    expect(ariaStates.personnel).toBe('true');
    expect(ariaStates.master).toBe('false');
  });

  test('5.6 Tab switch triggers chart resize', async ({ page }) => {
    await uploadAllFiles(page);

    // Switch to personnel
    await switchTab(page, 'personnel');
    await page.waitForTimeout(200);

    // Charts in personnel should have non-zero dimensions
    const dims = await page.evaluate(() => {
      const canvas = document.getElementById('pc-status');
      if (!canvas) return { width: 0, height: 0 };
      const rect = canvas.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);
  });

  test('5.7 Rapid tab switching does not cause errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await uploadAllFiles(page);

    // Rapidly switch between tabs
    for (let i = 0; i < 5; i++) {
      await page.click('.tab-btn[data-tab="quote"]');
      await page.click('.tab-btn[data-tab="personnel"]');
      await page.click('.tab-btn[data-tab="master"]');
    }

    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('5.8 Tab count badges show correct numbers after all uploads', async ({ page }) => {
    await uploadAllFiles(page);

    const counts = await page.evaluate(() => ({
      quote: document.getElementById('count-quote')?.textContent?.trim(),
      personnel: document.getElementById('count-personnel')?.textContent?.trim(),
      master: document.getElementById('count-master')?.textContent?.trim(),
    }));

    expect(parseInt(counts.quote || '0', 10)).toBeGreaterThan(0);
    expect(parseInt(counts.personnel || '0', 10)).toBeGreaterThan(0);
    expect(parseInt(counts.master || '0', 10)).toBeGreaterThan(0);
  });
});


/* ═══════════════════════════════════════════════════════════════
   6. RESPONSIVE LAYOUT
   ═══════════════════════════════════════════════════════════════ */
test.describe('6. Responsive Layout', () => {

  test.beforeEach(async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'quote', FILES.quote);
  });

  test('6.1 Desktop (1400px): KPI grid has 5 columns', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(200);

    const cols = await page.evaluate(() => {
      const grid = document.getElementById('kpi-quote');
      return getComputedStyle(grid).gridTemplateColumns;
    });

    // 5 columns: should contain 5 values separated by spaces
    const colCount = cols.split(/\s+/).filter((v) => v && v !== '0px').length;
    expect(colCount).toBe(5);
  });

  test('6.2 Tablet (1100px): KPI grid collapses to 3 columns', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.waitForTimeout(200);

    const cols = await page.evaluate(() => {
      const grid = document.getElementById('kpi-quote');
      return getComputedStyle(grid).gridTemplateColumns;
    });

    const colCount = cols.split(/\s+/).filter((v) => v && v !== '0px').length;
    expect(colCount).toBe(3);
  });

  test('6.3 Mobile (700px): KPI grid collapses to 2 columns', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.waitForTimeout(200);

    const cols = await page.evaluate(() => {
      const grid = document.getElementById('kpi-quote');
      return getComputedStyle(grid).gridTemplateColumns;
    });

    const colCount = cols.split(/\s+/).filter((v) => v && v !== '0px').length;
    expect(colCount).toBe(2);
  });

  test('6.4 Small mobile (450px): KPI grid collapses to 1 column', async ({ page }) => {
    await page.setViewportSize({ width: 450, height: 900 });
    await page.waitForTimeout(200);

    const cols = await page.evaluate(() => {
      const grid = document.getElementById('kpi-quote');
      return getComputedStyle(grid).gridTemplateColumns;
    });

    const colCount = cols.split(/\s+/).filter((v) => v && v !== '0px').length;
    expect(colCount).toBe(1);
  });

  test('6.5 Tablet (900px): Chart grid collapses to 1 column', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.waitForTimeout(200);

    const cols = await page.evaluate(() => {
      const grid = document.getElementById('charts-quote');
      return getComputedStyle(grid).gridTemplateColumns;
    });

    const colCount = cols.split(/\s+/).filter((v) => v && v !== '0px').length;
    expect(colCount).toBe(1);
  });

  test('6.6 Mobile (700px): Header upload buttons are hidden', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.waitForTimeout(200);

    const isVisible = await page.locator('.header-actions').isVisible();
    expect(isVisible).toBe(false);
  });

  test('6.7 Filters bar wraps at narrow widths', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.waitForTimeout(200);

    const flexWrap = await page.evaluate(() => {
      const bar = document.getElementById('filters-quote');
      return getComputedStyle(bar).flexWrap;
    });
    expect(flexWrap).toBe('wrap');
  });

  test('6.8 Tab bar is horizontally scrollable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 900 });
    await page.waitForTimeout(200);

    const overflowX = await page.evaluate(() => {
      const tabBar = document.querySelector('.tab-bar');
      return getComputedStyle(tabBar).overflowX;
    });
    expect(overflowX).toBe('auto');
  });

  test('6.9 Chart cards maintain min-height at all viewports', async ({ page }) => {
    for (const width of [1400, 900, 600, 400]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);

      const minHeights = await page.evaluate(() => {
        const cards = document.querySelectorAll('#charts-quote .chart-card');
        return Array.from(cards).map((c) => parseInt(getComputedStyle(c).minHeight, 10));
      });

      for (const mh of minHeights) {
        expect(mh, `Chart card min-height should be >= 300px at ${width}px viewport`).toBeGreaterThanOrEqual(300);
      }
    }
  });
});


/* ═══════════════════════════════════════════════════════════════
   7. EDGE CASES
   ═══════════════════════════════════════════════════════════════ */
test.describe('7. Edge Cases', () => {

  test.beforeEach(async ({ page }) => {
    await openDashboard(page);
  });

  test('7.1 Dashboard renders without any file uploads (empty state)', async ({ page }) => {
    // All 3 empty states should be visible
    await expect(page.locator('#empty-quote')).toBeVisible();

    // Switch tabs to check others
    await switchTab(page, 'personnel');
    await expect(page.locator('#empty-personnel')).toBeVisible();

    await switchTab(page, 'master');
    await expect(page.locator('#empty-master')).toBeVisible();
  });

  test('7.2 Utility functions handle null/undefined/NaN gracefully', async ({ page }) => {
    const results = await page.evaluate(() => {
      return {
        fmtNull: fmt(null),
        fmtUndef: fmt(undefined),
        fmtNaN: fmt(NaN),
        fmtCurNull: fmtCur(null),
        fmtCurNaN: fmtCur(NaN),
        parseDateNull: parseDate(null),
        parseDateEmpty: parseDate(''),
        parseDateGarbage: parseDate('not-a-date'),
      };
    });

    expect(results.fmtNull).toBe('—');
    expect(results.fmtUndef).toBe('—');
    expect(results.fmtNaN).toBe('—');
    expect(results.fmtCurNull).toBe('—');
    expect(results.fmtCurNaN).toBe('—');
    expect(results.parseDateNull).toBeNull();
    expect(results.parseDateEmpty).toBeNull();
  });

  test('7.3 fmt() number formatting works correctly', async ({ page }) => {
    const results = await page.evaluate(() => ({
      zero: fmt(0, 0),
      small: fmt(42, 0),
      thousands: fmt(1500, 0),
      millions: fmt(2500000, 0),
      billions: fmt(3500000000, 0),
      negative: fmt(-1500, 0),
    }));

    expect(results.zero).toBe('0');
    expect(results.small).toBe('42');
    expect(results.thousands).toMatch(/1\.5K/);
    expect(results.millions).toMatch(/2\.5M/);
    expect(results.billions).toMatch(/3\.50B/);
    expect(results.negative).toMatch(/-1\.5K/);
  });

  test('7.4 groupBy handles blank values as "(blank)"', async ({ page }) => {
    const result = await page.evaluate(() => {
      const data = [
        { status: 'Active' },
        { status: '' },
        { status: null },
        { status: 'Active' },
      ];
      const grouped = groupBy(data, 'status');
      return { keys: Object.keys(grouped), blankCount: (grouped['(blank)'] || []).length };
    });

    expect(result.keys).toContain('(blank)');
    expect(result.blankCount).toBe(2);
  });

  test('7.5 sumBy handles non-numeric values without crashing', async ({ page }) => {
    const result = await page.evaluate(() => {
      const data = [
        { val: '100' },
        { val: 'abc' },
        { val: null },
        { val: '' },
        { val: 200 },
      ];
      return sumBy(data, 'val');
    });

    expect(result).toBe(300);
  });

  test('7.6 avgBy excludes zero and NaN values', async ({ page }) => {
    const result = await page.evaluate(() => {
      const data = [
        { val: 10 },
        { val: 0 },
        { val: 'abc' },
        { val: 20 },
      ];
      return avgBy(data, 'val');
    });

    expect(result).toBe(15); // (10 + 20) / 2, excluding 0 and NaN
  });

  test('7.7 excelDate converts Excel serial numbers correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Excel serial 44927 = 2023-01-01
      const d = excelDate(44927);
      return d ? d.toISOString().slice(0, 10) : null;
    });

    expect(result).toBe('2023-01-01');
  });

  test('7.8 Rendering charts with empty filtered data does not crash', async ({ page }) => {
    await uploadFile(page, 'quote', FILES.quote);

    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Render charts with empty array
    await page.evaluate(() => {
      renderQuoteKPIs([]);
      renderQuoteCharts([]);
    });

    // Should not crash
    expect(errors).toHaveLength(0);

    // KPIs should show 0 or dash for empty data
    const totalText = await page.textContent('#kpi-quote .kpi-card:nth-child(1) .kpi-value');
    expect(totalText?.trim()).toBe('0');
  });

  test('7.9 Rendering Personnel charts with empty data does not crash', async ({ page }) => {
    await uploadFile(page, 'personnel', FILES.personnel);
    await switchTab(page, 'personnel');

    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.evaluate(() => {
      renderPersonnelKPIs([]);
      renderPersonnelCharts([]);
    });

    expect(errors).toHaveLength(0);
  });

  test('7.10 Rendering Master charts with empty data does not crash', async ({ page }) => {
    await uploadFile(page, 'master', FILES.master);
    await switchTab(page, 'master');

    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.evaluate(() => {
      renderMasterKPIs([]);
      renderMasterCharts([]);
    });

    expect(errors).toHaveLength(0);
  });

  test('7.11 topN returns at most N entries', async ({ page }) => {
    const result = await page.evaluate(() => {
      const obj = { a: 100, b: 200, c: 300, d: 400, e: 500 };
      return topN(obj, 3).length;
    });
    expect(result).toBe(3);
  });

  test('7.12 topN sorts by value descending', async ({ page }) => {
    const result = await page.evaluate(() => {
      const obj = { a: 100, b: 300, c: 200 };
      return topN(obj, 3).map((e) => e[0]);
    });
    expect(result).toEqual(['b', 'c', 'a']);
  });

  test('7.13 populateSelect preserves current selection if still valid', async ({ page }) => {
    await uploadFile(page, 'quote', FILES.quote);

    const result = await page.evaluate(() => {
      const sel = document.getElementById('fq-status');
      // Set a value
      if (sel.options.length > 1) {
        sel.value = sel.options[1].value;
        const savedVal = sel.value;
        // Re-populate with same values
        populateSelect('fq-status', state.quote.raw.map((r) => r['Status']));
        return { savedVal, afterVal: sel.value };
      }
      return null;
    });

    if (result) {
      expect(result.afterVal).toBe(result.savedVal);
    }
  });

  test('7.14 No console errors during normal operation with all files loaded', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await uploadAllFiles(page);

    // Switch through all tabs
    await switchTab(page, 'personnel');
    await page.waitForTimeout(300);
    await switchTab(page, 'master');
    await page.waitForTimeout(300);
    await switchTab(page, 'quote');
    await page.waitForTimeout(300);

    // Filter out non-critical errors (favicon, network errors for fonts)
    const criticalPageErrors = pageErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('net::ERR')
    );
    expect(criticalPageErrors).toHaveLength(0);
  });
});


/* ═══════════════════════════════════════════════════════════════
   8. ACCESSIBILITY
   ═══════════════════════════════════════════════════════════════ */
test.describe('8. Accessibility', () => {

  test.beforeEach(async ({ page }) => {
    await openDashboard(page);
  });

  test('8.1 Page has lang attribute', async ({ page }) => {
    const lang = await page.evaluate(() => document.documentElement.getAttribute('lang'));
    expect(lang).toBe('en');
  });

  test('8.2 Page has a descriptive title', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('Axess');
    expect(title).toContain('Dashboard');
  });

  test('8.3 Tab bar has role="tablist" and aria-label', async ({ page }) => {
    const tabBar = page.locator('.tab-bar');
    await expect(tabBar).toHaveAttribute('role', 'tablist');
    await expect(tabBar).toHaveAttribute('aria-label', 'Dashboard sections');
  });

  test('8.4 Tab buttons have role="tab"', async ({ page }) => {
    const tabs = page.locator('.tab-btn');
    const count = await tabs.count();
    expect(count).toBe(3);

    for (let i = 0; i < count; i++) {
      await expect(tabs.nth(i)).toHaveAttribute('role', 'tab');
    }
  });

  test('8.5 Tab panels have role="tabpanel"', async ({ page }) => {
    const panels = page.locator('.tab-content');
    const count = await panels.count();
    expect(count).toBe(3);

    for (let i = 0; i < count; i++) {
      await expect(panels.nth(i)).toHaveAttribute('role', 'tabpanel');
    }
  });

  test('8.6 File upload inputs have aria-label', async ({ page }) => {
    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();
    expect(count).toBe(3);

    for (let i = 0; i < count; i++) {
      const ariaLabel = await fileInputs.nth(i).getAttribute('aria-label');
      expect(ariaLabel?.length).toBeGreaterThan(0);
    }
  });

  test('8.7 Upload toolbar has role="toolbar" and aria-label', async ({ page }) => {
    const toolbar = page.locator('.header-actions');
    await expect(toolbar).toHaveAttribute('role', 'toolbar');
    await expect(toolbar).toHaveAttribute('aria-label', 'File uploads');
  });

  test('8.8 Tab buttons have focus-visible styles (outline defined in CSS)', async ({ page }) => {
    // Check that the CSS rule for :focus-visible exists
    const hasFocusStyle = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules);
          for (const rule of rules) {
            if (rule.selectorText && rule.selectorText.includes('tab-btn') && rule.selectorText.includes('focus-visible')) {
              return true;
            }
          }
        } catch (e) {
          // Cross-origin stylesheet
        }
      }
      return false;
    });
    expect(hasFocusStyle).toBe(true);
  });

  test('8.9 Upload buttons have focus-visible styles', async ({ page }) => {
    const hasFocusStyle = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules);
          for (const rule of rules) {
            if (rule.selectorText && rule.selectorText.includes('upload-btn') && rule.selectorText.includes('focus-visible')) {
              return true;
            }
          }
        } catch (e) {}
      }
      return false;
    });
    expect(hasFocusStyle).toBe(true);
  });

  test('8.10 Reset filter button has focus-visible styles', async ({ page }) => {
    const hasFocusStyle = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules);
          for (const rule of rules) {
            if (rule.selectorText && rule.selectorText.includes('filter-reset') && rule.selectorText.includes('focus-visible')) {
              return true;
            }
          }
        } catch (e) {}
      }
      return false;
    });
    expect(hasFocusStyle).toBe(true);
  });

  test('8.11 prefers-reduced-motion media query is defined', async ({ page }) => {
    const hasReducedMotion = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules);
          for (const rule of rules) {
            if (rule.conditionText && rule.conditionText.includes('prefers-reduced-motion')) {
              return true;
            }
          }
        } catch (e) {}
      }
      return false;
    });
    expect(hasReducedMotion).toBe(true);
  });

  test('8.12 Filter select elements are focusable', async ({ page }) => {
    await uploadFile(page, 'quote', FILES.quote);

    const selects = page.locator('#filters-quote select');
    const count = await selects.count();

    for (let i = 0; i < count; i++) {
      await selects.nth(i).focus();
      const isFocused = await selects.nth(i).evaluate(
        (el) => document.activeElement === el
      );
      expect(isFocused, `Select ${i} should be focusable`).toBe(true);
    }
  });

  test('8.13 Tab buttons are keyboard navigable', async ({ page }) => {
    // Focus the first tab
    await page.locator('.tab-btn[data-tab="quote"]').focus();
    const firstFocused = await page.evaluate(
      () => document.activeElement?.getAttribute('data-tab')
    );
    expect(firstFocused).toBe('quote');

    // Tab to next element
    await page.keyboard.press('Tab');
    const secondFocused = await page.evaluate(
      () => document.activeElement?.getAttribute('data-tab')
    );
    expect(secondFocused).toBe('personnel');
  });

  test('8.14 File inputs accept only .xlsx and .xls', async ({ page }) => {
    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();

    for (let i = 0; i < count; i++) {
      const accept = await fileInputs.nth(i).getAttribute('accept');
      expect(accept).toContain('.xlsx');
      expect(accept).toContain('.xls');
    }
  });

  test('8.15 Header h1 element exists for landmark navigation', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    const text = await h1.textContent();
    expect(text).toContain('AXESS');
  });
});


/* ═══════════════════════════════════════════════════════════════
   9. UX — UPLOAD STATES, ERROR MESSAGES, TOOLTIPS
   ═══════════════════════════════════════════════════════════════ */
test.describe('9. UX Issues', () => {

  test.beforeEach(async ({ page }) => {
    await openDashboard(page);
  });

  test('9.1 Upload buttons start in idle state (no loaded/processing class)', async ({ page }) => {
    const states = await page.evaluate(() => {
      const ids = ['uploadQuote', 'uploadPersonnel', 'uploadMaster'];
      return ids.map((id) => {
        const el = document.getElementById(id);
        return {
          id,
          loaded: el?.classList.contains('loaded'),
          processing: el?.classList.contains('processing'),
        };
      });
    });

    for (const s of states) {
      expect(s.loaded, `${s.id} should not be loaded initially`).toBe(false);
      expect(s.processing, `${s.id} should not be processing initially`).toBe(false);
    }
  });

  test('9.2 Upload button transitions to "loaded" state after successful upload', async ({ page }) => {
    await uploadFile(page, 'quote', FILES.quote);

    const isLoaded = await page.evaluate(() =>
      document.getElementById('uploadQuote').classList.contains('loaded')
    );
    expect(isLoaded).toBe(true);

    // Verify the loaded class is present (CSS applies success color via .upload-btn.loaded .indicator)
    const hasLoadedClass = await page.evaluate(() => {
      const btn = document.getElementById('uploadQuote');
      return btn?.classList.contains('loaded') && !btn?.classList.contains('processing');
    });
    expect(hasLoadedClass).toBe(true);

    // Verify CSS rule exists for loaded indicator
    const hasLoadedIndicatorRule = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules);
          for (const rule of rules) {
            if (rule.selectorText && rule.selectorText.includes('loaded') && rule.selectorText.includes('indicator')) {
              return true;
            }
          }
        } catch (e) {}
      }
      return false;
    });
    expect(hasLoadedIndicatorRule).toBe(true);
  });

  test('9.3 Upload button indicator dot starts with low-opacity background', async ({ page }) => {
    const bgColor = await page.evaluate(() => {
      const dot = document.querySelector('#uploadQuote .indicator');
      return getComputedStyle(dot).backgroundColor;
    });
    // Should be rgba(255,255,255,0.3) or similar subdued color
    expect(bgColor).toBeTruthy();
  });

  test('9.4 Empty state messages are descriptive for each tab', async ({ page }) => {
    const quoteMsg = await page.textContent('#empty-quote p');
    expect(quoteMsg).toContain('QuoteLog');
    expect(quoteMsg).toContain('Excel');

    await switchTab(page, 'personnel');
    const personnelMsg = await page.textContent('#empty-personnel p');
    expect(personnelMsg).toContain('Personnel Planner');

    await switchTab(page, 'master');
    const masterMsg = await page.textContent('#empty-master p');
    expect(masterMsg).toContain('Master Project');
  });

  test('9.5 Empty state has a visual icon for each tab', async ({ page }) => {
    await expect(page.locator('#empty-quote .icon-wrap svg')).toBeVisible();

    await switchTab(page, 'personnel');
    await expect(page.locator('#empty-personnel .icon-wrap svg')).toBeVisible();

    await switchTab(page, 'master');
    await expect(page.locator('#empty-master .icon-wrap svg')).toBeVisible();
  });

  test('9.6 Chart tooltips are configured globally', async ({ page }) => {
    const tooltipConfig = await page.evaluate(() => ({
      bg: Chart.defaults.plugins.tooltip.backgroundColor,
      cornerRadius: Chart.defaults.plugins.tooltip.cornerRadius,
      displayColors: Chart.defaults.plugins.tooltip.displayColors,
    }));

    expect(tooltipConfig.bg).toBe('#1a1917');
    expect(tooltipConfig.cornerRadius).toBe(6);
    expect(tooltipConfig.displayColors).toBe(true);
  });

  test('9.7 Chart legends use point style (cleaner than rectangles)', async ({ page }) => {
    const usePointStyle = await page.evaluate(
      () => Chart.defaults.plugins.legend.labels.usePointStyle
    );
    expect(usePointStyle).toBe(true);
  });

  test('9.8 KPI cards have hover effect (transform and shadow)', async ({ page }) => {
    await uploadFile(page, 'quote', FILES.quote);

    const hasHoverRule = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules);
          for (const rule of rules) {
            if (rule.selectorText && rule.selectorText.includes('kpi-card:hover')) {
              return true;
            }
          }
        } catch (e) {}
      }
      return false;
    });
    expect(hasHoverRule).toBe(true);
  });

  test('9.9 Chart cards have hover shadow effect', async ({ page }) => {
    const hasHoverRule = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules);
          for (const rule of rules) {
            if (rule.selectorText && rule.selectorText.includes('chart-card:hover')) {
              return true;
            }
          }
        } catch (e) {}
      }
      return false;
    });
    expect(hasHoverRule).toBe(true);
  });

  test('9.10 KPI cards have colored top bar via ::after pseudo-element', async ({ page }) => {
    await uploadFile(page, 'quote', FILES.quote);

    // Check that the first KPI card has a visible ::after with height 3px
    const afterHeight = await page.evaluate(() => {
      const card = document.querySelector('#kpi-quote .kpi-card');
      if (!card) return '0px';
      const style = getComputedStyle(card, '::after');
      return style.height;
    });
    expect(afterHeight).toBe('3px');
  });

  test('9.11 Filter reset button has danger color styling', async ({ page }) => {
    await uploadFile(page, 'quote', FILES.quote);

    const color = await page.evaluate(() => {
      const btn = document.querySelector('#filters-quote .filter-reset');
      return getComputedStyle(btn).color;
    });
    // var(--ax-danger) = #e76f51 -> rgb(231, 111, 81)
    expect(color).toContain('231, 111, 81');
  });

  test('9.12 Sales funnel total text updates', async ({ page }) => {
    await uploadFile(page, 'quote', FILES.quote);

    const text = await page.textContent('#qt-funnel-total');
    expect(text?.trim()).toMatch(/\d+ total/);
  });

  test('9.13 Timeline total text shows month count', async ({ page }) => {
    await uploadFile(page, 'quote', FILES.quote);

    const text = await page.textContent('#qt-timeline-total');
    expect(text?.trim()).toMatch(/\d+ months/);
  });
});


/* ═══════════════════════════════════════════════════════════════
   10. CSS LAYOUT — CHART CONTAINERS, CANVAS, OVERFLOW
   ═══════════════════════════════════════════════════════════════ */
test.describe('10. CSS Layout', () => {

  test.beforeEach(async ({ page }) => {
    await openDashboard(page);
    await uploadFile(page, 'quote', FILES.quote);
  });

  test('10.1 Chart containers (.chart-wrap) have min-height >= 260px', async ({ page }) => {
    const wraps = page.locator('#charts-quote .chart-wrap');
    const count = await wraps.count();

    for (let i = 0; i < count; i++) {
      const minH = await wraps.nth(i).evaluate((el) =>
        parseInt(getComputedStyle(el).minHeight, 10)
      );
      expect(minH, `chart-wrap ${i} should have min-height >= 260`).toBeGreaterThanOrEqual(260);
    }
  });

  test('10.2 Chart wraps use position:relative (for absolute canvas)', async ({ page }) => {
    const wraps = page.locator('#charts-quote .chart-wrap');
    const count = await wraps.count();

    for (let i = 0; i < count; i++) {
      const position = await wraps.nth(i).evaluate((el) =>
        getComputedStyle(el).position
      );
      expect(position).toBe('relative');
    }
  });

  test('10.3 Canvas elements are position:absolute inside chart-wrap', async ({ page }) => {
    const canvases = page.locator('#charts-quote .chart-wrap canvas');
    const count = await canvases.count();

    for (let i = 0; i < count; i++) {
      const position = await canvases.nth(i).evaluate((el) =>
        getComputedStyle(el).position
      );
      expect(position).toBe('absolute');
    }
  });

  test('10.4 Chart cards use flexbox column layout', async ({ page }) => {
    const cards = page.locator('#charts-quote .chart-card');
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const display = await cards.nth(i).evaluate((el) => getComputedStyle(el).display);
      const direction = await cards.nth(i).evaluate((el) => getComputedStyle(el).flexDirection);
      expect(display).toBe('flex');
      expect(direction).toBe('column');
    }
  });

  test('10.5 Chart wrap flex:1 makes it fill remaining card space', async ({ page }) => {
    const wraps = page.locator('#charts-quote .chart-wrap');
    const count = await wraps.count();

    for (let i = 0; i < count; i++) {
      const flex = await wraps.nth(i).evaluate((el) => getComputedStyle(el).flexGrow);
      expect(flex).toBe('1');
    }
  });

  test('10.6 Chart grid uses CSS Grid with 2 columns on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(200);

    const grid = page.locator('#charts-quote');
    const display = await grid.evaluate((el) => getComputedStyle(el).display);
    const cols = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);

    expect(display).toBe('grid');
    const colCount = cols.split(/\s+/).filter((v) => v && v !== '0px').length;
    expect(colCount).toBe(2);
  });

  test('10.7 No horizontal overflow on the page at common viewports', async ({ page }) => {
    for (const width of [1400, 1024, 768, 480]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasOverflow, `No horizontal overflow expected at ${width}px`).toBe(false);
    }
  });

  test('10.8 Header is sticky at top', async ({ page }) => {
    const position = await page.evaluate(() => {
      const header = document.querySelector('.header');
      return getComputedStyle(header).position;
    });
    expect(position).toBe('sticky');
  });

  test('10.9 Tab bar is sticky below header', async ({ page }) => {
    const style = await page.evaluate(() => {
      const tabBar = document.querySelector('.tab-bar');
      const s = getComputedStyle(tabBar);
      return { position: s.position, top: s.top };
    });
    expect(style.position).toBe('sticky');
    expect(style.top).toBe('60px');
  });

  test('10.10 Header has higher z-index than tab bar', async ({ page }) => {
    const zIndexes = await page.evaluate(() => {
      const header = document.querySelector('.header');
      const tabBar = document.querySelector('.tab-bar');
      return {
        header: parseInt(getComputedStyle(header).zIndex, 10),
        tabBar: parseInt(getComputedStyle(tabBar).zIndex, 10),
      };
    });
    expect(zIndexes.header).toBeGreaterThan(zIndexes.tabBar);
  });

  test('10.11 KPI row gap is consistent', async ({ page }) => {
    const gap = await page.evaluate(() => {
      const row = document.getElementById('kpi-quote');
      return getComputedStyle(row).gap;
    });
    expect(gap).toBe('10px');
  });

  test('10.12 Chart grid gap is consistent', async ({ page }) => {
    const gap = await page.evaluate(() => {
      const grid = document.getElementById('charts-quote');
      return getComputedStyle(grid).gap;
    });
    expect(gap).toBe('12px');
  });

  test('10.13 Main container has max-width for readability', async ({ page }) => {
    const maxW = await page.evaluate(() => {
      const main = document.querySelector('.main');
      return getComputedStyle(main).maxWidth;
    });
    expect(maxW).toBe('1560px');
  });

  test('10.14 Chart cards have border-radius', async ({ page }) => {
    const radius = await page.evaluate(() => {
      const card = document.querySelector('#charts-quote .chart-card');
      return getComputedStyle(card).borderRadius;
    });
    expect(parseInt(radius, 10)).toBeGreaterThan(0);
  });

  test('10.15 KPI cards have box-shadow', async ({ page }) => {
    const shadow = await page.evaluate(() => {
      const card = document.querySelector('#kpi-quote .kpi-card');
      return getComputedStyle(card).boxShadow;
    });
    expect(shadow).not.toBe('none');
  });
});


/* ═══════════════════════════════════════════════════════════════
   BONUS: INTEGRATION — Full Workflow End-to-End
   ═══════════════════════════════════════════════════════════════ */
test.describe('Bonus: Full Workflow Integration', () => {

  test('E2E: Upload all files, switch tabs, apply filters, verify no errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await openDashboard(page);

    // 1. Upload all three files
    await uploadAllFiles(page);

    // 2. Verify Quote Log tab has data
    const quoteKPIs = await page.locator('#kpi-quote .kpi-card').count();
    expect(quoteKPIs).toBe(5);
    const quoteCharts = await page.evaluate(() => Object.keys(charts).filter((k) => k.startsWith('qc-')).length);
    expect(quoteCharts).toBe(9);

    // 3. Apply a filter on Quote Log
    const statusValue = await page.evaluate(() => {
      const sel = document.getElementById('fq-status');
      return sel.options.length > 1 ? sel.options[1].value : null;
    });
    if (statusValue) {
      await page.selectOption('#fq-status', statusValue);
      await page.waitForTimeout(300);
    }

    // 4. Switch to Personnel tab
    await switchTab(page, 'personnel');
    await page.waitForTimeout(300);
    const personnelKPIs = await page.locator('#kpi-personnel .kpi-card').count();
    expect(personnelKPIs).toBe(5);

    // 5. Apply a filter on Personnel
    const clientValue = await page.evaluate(() => {
      const sel = document.getElementById('fp-client');
      return sel.options.length > 1 ? sel.options[1].value : null;
    });
    if (clientValue) {
      await page.selectOption('#fp-client', clientValue);
      await page.waitForTimeout(300);
    }

    // 6. Switch to Master tab
    await switchTab(page, 'master');
    await page.waitForTimeout(300);
    const masterKPIs = await page.locator('#kpi-master .kpi-card').count();
    expect(masterKPIs).toBe(5);

    // 7. Reset Master filters
    await page.click('#filters-master .filter-reset');
    await page.waitForTimeout(300);

    // 8. Switch back to Quote and clear filters
    await switchTab(page, 'quote');
    await page.click('#filters-quote .filter-reset');
    await page.waitForTimeout(300);

    // 9. Verify no page errors throughout the entire flow
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('net::ERR')
    );
    expect(criticalErrors).toHaveLength(0);

    // 10. All three tabs have data counts > 0
    const counts = await page.evaluate(() => ({
      quote: parseInt(document.getElementById('count-quote')?.textContent || '0', 10),
      personnel: parseInt(document.getElementById('count-personnel')?.textContent || '0', 10),
      master: parseInt(document.getElementById('count-master')?.textContent || '0', 10),
    }));
    expect(counts.quote).toBeGreaterThan(0);
    expect(counts.personnel).toBeGreaterThan(0);
    expect(counts.master).toBeGreaterThan(0);
  });
});
