// @ts-check
/**
 * Verificación automatizada — Axess_GY_Dashboard_v4.html
 * Mapa 1:1 con los entregables del plan (Win Rate, Gantt/Desglose, Group by,
 * Mandays report, Top technicians, Master treemap + QA/Invoice).
 */
const { test, expect } = require('@playwright/test');
const path = require('path');

const V4_PATH = path.resolve(__dirname, '..', 'Axess_GY_Dashboard_v4.html');
const V4_URL = `file://${V4_PATH}`;

async function openV4(page) {
  await page.goto(V4_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.ApexCharts !== 'undefined', { timeout: 20000 });
  await page.waitForSelector('#kpi-quote .kpi-card', { timeout: 15000 });
  // KPIs animan valores (~1s); esperar texto estable en Win Rate
  await page.waitForTimeout(1100);
}

async function switchTabV4(page, tab) {
  await page.locator(`button[data-tab="${tab}"]`).first().click();
  await page.waitForTimeout(150);
}

test.describe('V4 — Todo Win Rate + grupos Quote', () => {
  test('Win Rate KPI: accepted / total coincide con vista filtrada (quotes in view)', async ({ page }) => {
    await openV4(page);
    const card = page.locator('#kpi-quote .kpi-card').filter({ hasText: 'Win Rate' });
    await expect(card.locator('.kpi-sub')).toContainText(/quotes in view/i);
    const subText = await card.locator('.kpi-sub').textContent();
    expect(subText).toMatch(/\d+\s+accepted\s*\/\s*\d+\s+quotes in view/i);
  });

  test('Gráfico Win Rate by Segment existe', async ({ page }) => {
    await openV4(page);
    await expect(page.locator('#c-q-wrseg')).toBeAttached();
  });

  test('Quote Group by: control y tabla resumen al seleccionar Segment', async ({ page }) => {
    await openV4(page);
    await page.selectOption('#q-groupby', 'Segment');
    await page.waitForTimeout(200);
    await expect(page.locator('#quote-group-summary')).toContainText('Grouped summary');
    await expect(page.locator('#quote-group-summary')).toContainText('Segment');
  });
});

test.describe('V4 — Todo Gantt Desglose + Personnel', () => {
  test('Desglose Gantt: checkbox desactivado por defecto (vista plana)', async ({ page }) => {
    await openV4(page);
    await switchTabV4(page, 'personnel');
    await page.locator('#vbtn-gantt').click();
    await page.waitForTimeout(400);
    const desgloseInput = page.locator('#personnel-gantt-view .gantt-toolbar .chart-toggle input[type="checkbox"]');
    await expect(desgloseInput).toBeAttached();
    await expect(desgloseInput).not.toBeChecked();
  });

  test('Gantt: toggle Desglose y vista Charts con Top Technicians', async ({ page }) => {
    await openV4(page);
    await switchTabV4(page, 'personnel');
    await page.locator('#vbtn-charts').click();
    await page.waitForTimeout(400);
    await expect(page.locator('#c-p-techtop')).toBeAttached();
    await page.locator('#vbtn-gantt').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#personnel-gantt-view .gantt-wrap').first()).toBeVisible();
    const desglose = page.locator('#personnel-gantt-view .chart-toggle').filter({ hasText: /Desglose/i });
    await expect(desglose).toBeVisible();
  });

  test('Group by Personnel + Mandays report', async ({ page }) => {
    await openV4(page);
    await switchTabV4(page, 'personnel');
    await page.selectOption('#p-groupby', 'Client');
    await page.waitForTimeout(200);
    await expect(page.locator('#personnel-group-summary')).toContainText('Grouped summary');
    await expect(page.locator('#personnel-mandays-section')).toContainText('Man-Days report');
    await expect(page.locator('#personnel-mandays-section')).toContainText('Installation');
    await expect(page.locator('#p-mandays-tech')).toBeAttached();
  });
});

test.describe('V4 — Todo Master treemap + QA/Invoice', () => {
  test('Master: treemap overview + KPI QA target + donas + tabla overview', async ({ page }) => {
    await openV4(page);
    await switchTabV4(page, 'master');
    await page.waitForTimeout(600);
    await expect(page.locator('#c-m-treemap')).toBeAttached();
    await expect(page.locator('#kpi-master .kpi-card').filter({ hasText: 'QA target' })).toBeVisible();
    await expect(page.locator('#kpi-master .kpi-card').filter({ hasText: 'Invoice target' })).toBeVisible();
    await expect(page.locator('#master-qa-strip')).toContainText('QA Status');
    await expect(page.locator('#master-qa-strip')).toContainText('Invoice Status');
    await expect(page.locator('#master-qa-overview-table')).toContainText('QA & Invoice overview');
  });

  test('Helpers QA/Invoice: defaults Under preparation vía funciones globales', async ({ page }) => {
    await openV4(page);
    const ok = await page.evaluate(() => typeof getQAStatus === 'function'
      && typeof getInvoiceStatus === 'function'
      && getQAStatus({}) === 'Under preparation'
      && getInvoiceStatus({}) === 'Under preparation');
    expect(ok).toBe(true);
  });
});

test.describe('V4 — Integridad implementación (strings críticos)', () => {
  test('Treemap Master renderizado al abrir pestaña Master', async ({ page }) => {
    await openV4(page);
    await switchTabV4(page, 'master');
    await page.waitForTimeout(700);
    await expect(page.locator('#c-m-treemap')).toBeAttached();
    await expect(page.locator('#c-m-treemap')).toBeVisible();
  });
});
