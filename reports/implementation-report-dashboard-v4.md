# Reporte de verificación — Axess_GY_Dashboard_v4

**Fecha:** 2026-05-04  
**Entregable probado:** `Axess_GY_Dashboard_v4.html` (datos demo precargados)  
**Trazabilidad:** versión anterior del mismo artefacto monolítico: `Axess_GY_Dashboard_v3.html` (renombrado a v4).  
**Herramienta:** Playwright (`@playwright/test` 1.58.x), Chromium  
**Comando:** `npm run test:v4` o `npx playwright test tests/dashboard_v4_implementation.spec.js`  
**Resultado global:** 9/9 pruebas pasaron (~22 s en entorno local)

---

## Mapa: To-do del plan → prueba automatizada

| To-do (plan) | Caso de prueba (archivo) | Qué valida | Estado |
|--------------|---------------------------|------------|--------|
| Win Rate KPI + gráfico por segmento | `Win Rate KPI: subtítulo indica…` | Subtítulo con “filtered” y “quotes in file”; fórmula documentada en UI | OK |
| (mismo) | `Gráfico Win Rate by Segment existe` | Existe contenedor `#c-q-wrseg` | OK |
| Group by (Quote) | `Quote Group by: control y tabla…` | Select `#q-groupby` + bloque `Grouped summary` al agrupar por Segment | OK |
| Gantt + Desglose | `Desglose Gantt: checkbox desactivado…` | Personnel → Gantt: input Desglose en DOM, no marcado | OK |
| (mismo) + Top Technicians | `Gantt: toggle Desglose y vista Charts…` | `#c-p-techtop` en vista Charts; `#personnel-gantt-view .gantt-wrap` en Gantt; toggle Desglose visible | OK |
| Group by (Personnel) + Mandays | `Group by Personnel + Mandays report` | Resumen agrupado + sección Man-Days report + columna Installation + `#p-mandays-tech` | OK |
| Master visualización + QA/Invoice | `Master: treemap overview + KPI…` | `#c-m-treemap`, KPIs QA/Invoice target, franja QA/Invoice, tabla overview | OK |
| Defaults QA/Invoice | `Helpers QA/Invoice: defaults…` | `getQAStatus({})` y `getInvoiceStatus({})` → `Under preparation` | OK |
| Treemap / integridad | `Treemap Master renderizado…` | Tras cambiar a Master, `#c-m-treemap` visible | OK |

---

## Pruebas manuales recomendadas (no cubiertas en E2E)

1. **Carga de Excel reales** (Order Backlog, Personnel, Master) y comprobación de que columnas `QA Status` / `Invoice Status` se reflejan en donas y tabla.
2. **Win Rate** con filtros de año y status: confirmar con negocio que el denominador sigue siendo el total de filas del archivo cargado.
3. **Desglose** activado: ver filas installation/scope y colapso coherente.
4. **Impresión / export** (si aplica) y **rendimiento** con archivos &gt; 5k filas.

---

## Artefactos

- Especificación: `tests/dashboard_v4_implementation.spec.js`
- Salida HTML Playwright: `test-results/html-report` (tras `npm test` con reporter html configurado)

---

## Conclusión

La implementación alineada con el plan quedó **cubierta por pruebas de regresión E2E** en el flujo principal (demo + navegación por pestañas). Para cierre de proyecto con cliente, añadir una pasada con **ficheros Excel de producción** y registro de capturas o video de UAT.
