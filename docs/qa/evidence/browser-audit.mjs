// Run against a local Vite server with an isolated Chrome context.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Mizzo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = new URL('./', import.meta.url).pathname.replace(/^\/(.)\:/, '$1:');
const base = 'http://127.0.0.1:5174/pitlogic/';
const sizes = [[1920, 1080], [1440, 900], [1024, 768], [768, 1024], [430, 932], [390, 844], [375, 667]];
const results = { environment: { browser: 'Chrome headless', url: base, date: new Date().toISOString() }, viewports: [], workflow: {}, telemetry: {}, accessibility: {}, performance: [], errors: [] };
await mkdir(out, { recursive: true });
const saveScreenshot = (page, name) => process.env.QA_SKIP_SCREENSHOTS ? Promise.resolve() : page.screenshot({ path: join(out, name) });
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let failure = null;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.on('pageerror', e => results.errors.push(e.message));
  await page.goto(base);
  await page.getByRole('button', { name: 'Start New Cook' }).waitFor();
  results.workflow.initial = { title: await page.title(), storage: await page.evaluate(() => localStorage.getItem('pitlogic-v5')), text: (await page.locator('main').innerText()).slice(0, 300) };
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo(0, 0));
    await saveScreenshot(page, `empty-${width}x${height}.png`);
    results.viewports.push({ width, height, state: 'empty', overflowPx: await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth)) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Start New Cook' }).click();
  results.workflow.newCookVisible = await page.getByText('New Cook Setup').isVisible();
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo(0, 0));
    await saveScreenshot(page, `setup-${width}x${height}.png`);
    results.viewports.push({ width, height, state: 'setup', overflowPx: await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth)) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('#cook-name').fill('QA Synthetic Brisket');
  await page.getByRole('button', { name: 'Start Cook', exact: true }).click();
  results.workflow.created = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('pitlogic-v5')); return { cooks: d.cooks.length, activeCooks: d.activeCooks.length, name: d.cooks[0].name, readings: d.cooks[0].probes[0].readings.length }; });
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo(0, 0));
    await saveScreenshot(page, `active-${width}x${height}.png`);
    results.viewports.push({ width, height, state: 'active', overflowPx: await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth)) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const entryInputs = page.locator('main').getByRole('spinbutton');
  results.workflow.activeSpinbuttonCount = await entryInputs.count();
  await entryInputs.last().fill('225');
  await entryInputs.nth((await entryInputs.count()) - 2).fill('155');
  await page.getByRole('button', { name: 'Log Now' }).click();
  results.workflow.logged = await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('pitlogic-v5')).cooks[0]; return { probe: c.probes[0].readings.at(-1)?.temp, smoker: c.smokerReadings.at(-1)?.temp }; });
  results.telemetry.activeCookLive = await page.evaluate(async () => {
    const { globalEventBus } = await import('/pitlogic/src/lib/telemetry/eventBus/EventBus.ts');
    const { globalStore } = await import('/pitlogic/src/lib/telemetry/store/globalStore.ts');
    const now = Date.now();
    globalEventBus.publish({ type: 'probe:reading', reading: { probeId: 'QA-during-cook-ch9', source: 'synthetic', status: 'active', timestamp: { capturedAt: now, receivedAt: now }, temp: { valueF: 177, providerUnit: 'F', providerValue: 177, normalizedBy: 'provider' } } });
    return { storeHasProbe: globalStore.getProbes().has('QA-during-cook-ch9'), cookReadingCount: JSON.parse(localStorage.getItem('pitlogic-v5')).cooks[0].probes[0].readings.length, activeViewHasLiveCard: document.querySelector('main')?.innerText.includes('Live Readings') };
  });
  await page.reload();
  await page.locator('aside').getByRole('button', { name: 'Active Cook', exact: true }).click();
  await page.getByRole('button', { name: 'End Cook' }).waitFor();
  results.workflow.reloaded = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('pitlogic-v5')); return { activeCooks: d.activeCooks.length, probe: d.cooks[0].probes[0].readings.at(-1)?.temp }; });
  await page.getByRole('button', { name: 'End Cook' }).click();
  await page.getByRole('button', { name: 'Confirm end' }).click();
  results.workflow.ended = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('pitlogic-v5')); return { activeCooks: d.activeCooks.length, status: d.cooks[0].status, endTime: Boolean(d.cooks[0].endTime) }; });
  await saveScreenshot(page, 'completed-1440x900.png');
  await page.locator('aside').getByRole('button', { name: 'Dashboard' }).click();
  results.workflow.dashboardFromDetail = { detailStillVisible: await page.locator('main').getByRole('button', { name: 'History' }).isVisible(), mainText: (await page.locator('main').innerText()).slice(0, 160) };
  await page.locator('main').getByRole('button', { name: 'History' }).click();
  await page.locator('aside').getByRole('button', { name: 'Dashboard' }).click();
  results.telemetry.injectedStore = await page.evaluate(async () => {
    const { globalEventBus } = await import('/pitlogic/src/lib/telemetry/eventBus/EventBus.js');
    const { globalStore } = await import('/pitlogic/src/lib/telemetry/store/globalStore.js');
    const { globalEventBus: busTs } = await import('/pitlogic/src/lib/telemetry/eventBus/EventBus.ts');
    const { globalStore: storeTs } = await import('/pitlogic/src/lib/telemetry/store/globalStore.ts');
    const now = Date.now();
    const event = { type: 'probe:reading', reading: { probeId: 'QA-gateway-ch1', source: 'synthetic', status: 'active', timestamp: { capturedAt: now - 31000, receivedAt: now }, temp: { valueF: 177.3, providerUnit: 'F', providerValue: 177.3, normalizedBy: 'provider' } } };
    globalEventBus.publish(event);
    busTs.publish(event);
    return { jsSize: globalStore.getProbes().size, tsSize: storeTs.getProbes().size, ids: [...storeTs.getProbes().keys()] };
  });
  await page.getByText('Live Readings').waitFor({ timeout: 3000 });
  results.telemetry.initialCard = await page.locator('main').innerText();
  await page.waitForTimeout(5500); // Store checks freshness every 5 seconds.
  results.telemetry.staleCard = await page.locator('main').innerText();
  await saveScreenshot(page, 'stale-live-1440x900.png');
  await page.getByRole('button', { name: 'Settings' }).last().click();
  results.telemetry.settings = (await page.locator('body').innerText()).slice(-2500);
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await saveScreenshot(page, `settings-live-${width}x${height}.png`);
    results.viewports.push({ width, height, state: 'settings-live', overflowPx: await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth)) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  results.telemetry.outOfOrder = await page.evaluate(async () => {
    const { globalEventBus } = await import('/pitlogic/src/lib/telemetry/eventBus/EventBus.ts');
    const { globalStore } = await import('/pitlogic/src/lib/telemetry/store/globalStore.ts');
    const now = Date.now();
    const emit = (capturedAt, valueF) => globalEventBus.publish({ type: 'probe:reading', reading: { probeId: 'QA-gateway-ch1', source: 'synthetic', status: 'active', timestamp: { capturedAt, receivedAt: now }, temp: { valueF, providerUnit: 'F', providerValue: valueF, normalizedBy: 'provider' } } });
    emit(now, 182);
    emit(now - 20000, 160);
    const p = globalStore.getProbes().get('QA-gateway-ch1');
    return { storedValueF: p.lastReading.temp.valueF, storedCapturedAt: p.lastReading.timestamp.capturedAt, newerCapturedAt: now };
  });
  results.telemetry.outOfOrderVisible = (await page.locator('main').innerText()).includes('160.0°');
  results.telemetry.manualHistoryAfterLive = await page.evaluate(() => JSON.parse(localStorage.getItem('pitlogic-v5')).cooks[0].probes[0].readings.length);
  results.accessibility.unlabeledControls = await page.evaluate(() => [...document.querySelectorAll('input,select,textarea,button')].filter(el => {
    const label = el.getAttribute('aria-label') || el.getAttribute('title') || el.labels?.[0]?.innerText || el.innerText;
    return !label?.trim() && getComputedStyle(el).display !== 'none';
  }).map(el => ({ tag: el.tagName, type: el.getAttribute('type'), html: el.outerHTML.slice(0, 180) })).slice(0, 30));
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  results.workflow.lightTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  results.workflow.darkTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.getByRole('button', { name: 'Close settings' }).click();
  for (const [label, state] of [['History', 'history'], ['Analytics', 'analytics'], ['Guides', 'guides'], ['Recipes', 'recipes']]) {
    await page.locator('aside').getByRole('button', { name: label, exact: true }).click();
    results.workflow[state] = (await page.locator('main').innerText()).slice(0, 250);
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => scrollTo(0, 0));
      await saveScreenshot(page, `${state}-${width}x${height}.png`);
      results.viewports.push({ width, height, state, overflowPx: await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth)) });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.locator('main').getByRole('button', { name: 'New', exact: true }).click();
  console.log('Opened recipe form');
  results.accessibility.recipeFormUnlabeled = await page.evaluate(() => [...document.querySelectorAll('main input,main textarea,main select')].filter(el => {
    const labels = el.labels?.length || 0;
    return !labels && !el.getAttribute('aria-label') && getComputedStyle(el).display !== 'none';
  }).map(el => ({ tag: el.tagName, placeholder: el.getAttribute('placeholder') })).slice(0, 20));
  await page.locator('#recipe-name').fill('QA Synthetic Rub');
  await page.getByRole('button', { name: 'Save Recipe' }).click();
  console.log('Saved recipe');
  results.workflow.recipeCreated = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('pitlogic-recipes-v1')); return { count: d.length, name: d[0]?.name }; });
  await context.close();
  console.log('Starting performance samples');

  if (!process.env.QA_SKIP_PERF) for (const minutes of [30, 120, 480, 720]) {
    const perfContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const perfPage = await perfContext.newPage();
    perfPage.setDefaultTimeout(5000);
    await perfPage.addInitScript(({ minutes }) => {
      const now = Date.now();
      const startTime = now - minutes * 60000;
      const readings = Array.from({ length: minutes + 1 }, (_, i) => ({ time: i, ts: startTime + i * 60000, temp: 135 + Math.round(i * 0.09) }));
      const cook = { id: 'qa-perf', name: `QA ${minutes} minute cook`, meat: 'Beef', cut: 'Brisket', smokerTarget: 225, startTime, endTime: null, status: 'active', probes: [{ id: 0, name: 'Probe 1', target: 203, readings }], smokerReadings: readings.map(r => ({ ...r, temp: 225 })), notes: '', rating: 0, linkedRecipes: [], mopTimer: null, smokerLowAlarm: null };
      localStorage.setItem('pitlogic-v5', JSON.stringify({ cooks: [cook], activeCooks: [cook.id], dis: {} }));
    }, { minutes });
    const navStart = Date.now();
    await perfPage.goto(base);
    await perfPage.locator('#bottom-nav').getByRole('button', { name: 'Active', exact: true }).click();
    await perfPage.locator('main .recharts-surface').first().waitFor();
    const sample = await perfPage.evaluate(() => ({
      navLoadMs: performance.getEntriesByType('navigation')[0]?.loadEventEnd,
      resourceTransferBytes: performance.getEntriesByType('resource').reduce((sum, e) => sum + (e.transferSize || 0), 0),
      heapBytes: performance.memory?.usedJSHeapSize ?? null,
      chartPoints: document.querySelectorAll('main .recharts-line-dot').length,
      storageBytes: localStorage.getItem('pitlogic-v5').length,
    }));
    results.performance.push({ minutesRepresented: minutes, readingsPerSeries: minutes + 1, wallMsToChart: Date.now() - navStart, ...sample });
    if (minutes === 720) await saveScreenshot(perfPage, 'chart-12h-synthetic-390x844.png');
    console.log(`Measured ${minutes} minutes`);
    await perfContext.close();
  }
} catch (error) {
  failure = error;
  console.error(error);
} finally {
  await writeFile(join(out, 'browser-results.json'), JSON.stringify(results, null, 2));
  await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  process.exit(failure ? 1 : 0);
}
