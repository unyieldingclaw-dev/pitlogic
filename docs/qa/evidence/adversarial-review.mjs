// Read-only local browser challenges of the P1 audit findings.
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Mizzo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = 'http://127.0.0.1:5174/pitlogic/';
const result = { date: new Date().toISOString(), base, telemetry: {}, navigation: {}, contrast: {}, limitations: [] };
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let failure = null;

function contrast(a, b) {
  const rgb = s => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const lum = s => rgb(s).map(v => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return Number(((x + 0.05) / (y + 0.05)).toFixed(2));
}

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.setDefaultNavigationTimeout(8000);
  await page.goto(base);
  await page.getByRole('button', { name: 'Start New Cook' }).waitFor();

  // Vite resolves source .js specifiers to .ts; direct dynamic .js URLs create extra instances.
  result.telemetry.modulePath = '/pitlogic/src/lib/telemetry/eventBus/EventBus.ts';
  result.telemetry.moduleDiagnostic = await page.evaluate(async () => {
    const { globalEventBus: busJs } = await import('/pitlogic/src/lib/telemetry/eventBus/EventBus.js');
    const { globalStore: storeJs } = await import('/pitlogic/src/lib/telemetry/store/globalStore.js');
    const { globalEventBus: busTs } = await import('/pitlogic/src/lib/telemetry/eventBus/EventBus.ts');
    const { globalStore: storeTs } = await import('/pitlogic/src/lib/telemetry/store/globalStore.ts');
    const now = Date.now();
    const reading = { probeId: 'QA-module-diag', source: 'synthetic', status: 'active', timestamp: { capturedAt: now, receivedAt: now }, temp: { valueF: 111, providerUnit: 'F', providerValue: 111, normalizedBy: 'provider' } };
    busJs.publish({ type: 'probe:reading', reading });
    const afterJs = { js: storeJs.getProbes().has('QA-module-diag'), ts: storeTs.getProbes().has('QA-module-diag') };
    busTs.publish({ type: 'probe:reading', reading });
    return { sameBus: busJs === busTs, sameStore: storeJs === storeTs, afterJs, afterTs: { js: storeJs.getProbes().has('QA-module-diag'), ts: storeTs.getProbes().has('QA-module-diag') } };
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 8000 });
  await page.getByRole('button', { name: 'Start New Cook' }).waitFor();
  result.telemetry.freshThenOlder = await page.evaluate(async () => {
    const { globalEventBus } = await import('/pitlogic/src/lib/telemetry/eventBus/EventBus.ts');
    const { globalStore } = await import('/pitlogic/src/lib/telemetry/store/globalStore.ts');
    const now = Date.now();
    const emit = (capturedAt, valueF) => globalEventBus.publish({ type: 'probe:reading', reading: {
      probeId: 'QA-adversarial-ch1', source: 'synthetic', status: 'active',
      timestamp: { capturedAt, receivedAt: now },
      temp: { valueF, providerUnit: 'F', providerValue: valueF, normalizedBy: 'provider' },
    } });
    emit(now, 182);
    const afterFresh = globalStore.getProbes().get('QA-adversarial-ch1')?.lastReading?.temp.valueF;
    emit(now - 20_000, 160);
    const afterOlder = globalStore.getProbes().get('QA-adversarial-ch1')?.lastReading?.temp.valueF;
    return { afterFresh, afterOlder, status: globalStore.getProbes().get('QA-adversarial-ch1')?.status };
  });
  result.telemetry.uiAfterActualBus = (await page.locator('main').innerText()).includes('Live Readings');
  result.telemetry.visibleAfterOlder = (await page.locator('main').innerText()).includes('160.0°');
  result.telemetry.olderThenFresh = await page.evaluate(async () => {
    const { globalEventBus } = await import('/pitlogic/src/lib/telemetry/eventBus/EventBus.ts');
    const { globalStore } = await import('/pitlogic/src/lib/telemetry/store/globalStore.ts');
    const now = Date.now();
    for (const [capturedAt, valueF] of [[now - 20_000, 170], [now, 190]]) {
      globalEventBus.publish({ type: 'probe:reading', reading: { probeId: 'QA-adversarial-ch2', source: 'synthetic', status: 'active', timestamp: { capturedAt, receivedAt: now }, temp: { valueF, providerUnit: 'F', providerValue: valueF, normalizedBy: 'provider' } } });
    }
    return globalStore.getProbes().get('QA-adversarial-ch2')?.lastReading?.temp.valueF;
  });
  result.telemetry.sameTimestampConflict = await page.evaluate(async () => {
    const { globalEventBus } = await import('/pitlogic/src/lib/telemetry/eventBus/EventBus.ts');
    const { globalStore } = await import('/pitlogic/src/lib/telemetry/store/globalStore.ts');
    const now = Date.now();
    for (const valueF of [200, 150]) globalEventBus.publish({ type: 'probe:reading', reading: { probeId: 'QA-adversarial-ch4', source: 'synthetic', status: 'active', timestamp: { capturedAt: now, receivedAt: now }, temp: { valueF, providerUnit: 'F', providerValue: valueF, normalizedBy: 'provider' } } });
    return globalStore.getProbes().get('QA-adversarial-ch4')?.lastReading?.temp.valueF;
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 8000 });
  await page.getByRole('button', { name: 'Start New Cook' }).waitFor();
  result.telemetry.oldImmediate = await page.evaluate(async () => {
    const { globalEventBus } = await import('/pitlogic/src/lib/telemetry/eventBus/EventBus.ts');
    const { globalStore } = await import('/pitlogic/src/lib/telemetry/store/globalStore.ts');
    const now = Date.now();
    globalEventBus.publish({ type: 'probe:reading', reading: { probeId: 'QA-adversarial-ch3', source: 'synthetic', status: 'active', timestamp: { capturedAt: now - 31_000, receivedAt: now }, temp: { valueF: 177.3, providerUnit: 'F', providerValue: 177.3, normalizedBy: 'provider' } } });
    return { status: globalStore.getProbes().get('QA-adversarial-ch3')?.status, capturedAgeMs: now - globalStore.getProbes().get('QA-adversarial-ch3')?.lastReading?.timestamp.capturedAt };
  });
  await page.waitForTimeout(5500);
  result.telemetry.afterStaleSweep = await page.evaluate(async () => {
    const { globalStore } = await import('/pitlogic/src/lib/telemetry/store/globalStore.ts');
    return { status: globalStore.getProbes().get('QA-adversarial-ch3')?.status, ageMs: Date.now() - globalStore.getProbes().get('QA-adversarial-ch3')?.lastReading?.timestamp.capturedAt };
  });
  result.telemetry.dashboardAfterStale = (await page.locator('main').innerText()).match(/Live Readings[\s\S]{0,120}/)?.[0] ?? '';
  result.telemetry.headerDotAfterStale = await page.getByText('Live Readings').evaluate(el => getComputedStyle(el.previousElementSibling).backgroundColor);
  await page.getByRole('button', { name: 'Settings' }).last().click();
  result.telemetry.settingsAfterStale = (await page.locator('body').innerText()).match(/LIVE PROBES[\s\S]{0,180}/i)?.[0] ?? '';
  result.telemetry.afterDisconnect = await page.evaluate(async () => {
    const { globalEventBus } = await import('/pitlogic/src/lib/telemetry/eventBus/EventBus.ts');
    const { globalStore } = await import('/pitlogic/src/lib/telemetry/store/globalStore.ts');
    globalEventBus.publish({ type: 'probe:disconnected', reading: { probeId: 'QA-adversarial-ch3' } });
    return { status: globalStore.getProbes().get('QA-adversarial-ch3')?.status, valueF: globalStore.getProbes().get('QA-adversarial-ch3')?.lastReading?.temp.valueF };
  });
  result.telemetry.settingsAfterDisconnect = (await page.locator('body').innerText()).match(/LIVE PROBES[\s\S]{0,180}/i)?.[0] ?? '';
  await page.getByRole('button', { name: 'Close settings' }).click();
  result.telemetry.dashboardAfterDisconnect = (await page.locator('main').innerText()).match(/Live Readings[\s\S]{0,120}/)?.[0] ?? '';
  result.telemetry.afterRetainedReplay = await page.evaluate(async () => {
    const { globalEventBus } = await import('/pitlogic/src/lib/telemetry/eventBus/EventBus.ts');
    const { globalStore } = await import('/pitlogic/src/lib/telemetry/store/globalStore.ts');
    const now = Date.now();
    globalEventBus.publish({ type: 'probe:reading', reading: { probeId: 'QA-adversarial-ch3', source: 'synthetic', status: 'active', timestamp: { capturedAt: now - 40_000, receivedAt: now }, temp: { valueF: 170, providerUnit: 'F', providerValue: 170, normalizedBy: 'provider' } } });
    return { status: globalStore.getProbes().get('QA-adversarial-ch3')?.status, valueF: globalStore.getProbes().get('QA-adversarial-ch3')?.lastReading?.temp.valueF };
  });
  console.log('telemetry challenges complete');
  await context.close();

  const flow = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const app = await flow.newPage();
  app.setDefaultTimeout(7000);
  app.setDefaultNavigationTimeout(8000);
  await app.goto(base);
  await app.getByRole('button', { name: 'Start New Cook' }).click();
  await app.locator('#cook-name').fill('QA Adversarial Cook');
  await app.getByRole('button', { name: 'Start Cook', exact: true }).click();
  await app.getByRole('button', { name: 'End Cook' }).click();
  await app.getByRole('button', { name: 'Confirm end' }).click();

  for (const tab of ['Dashboard', 'Analytics', 'Guides', 'Recipes', 'New Cook']) {
    await app.locator('aside').getByRole('button', { name: 'New Cook' }).click();
    await app.locator('aside').getByRole('button', { name: 'History' }).click();
    await app.locator('main button.card-interactive').first().click();
    await app.locator('aside').getByRole('button', { name: tab, exact: true }).click();
    result.navigation[tab] = {
      selected: await app.locator('aside').getByRole('button', { name: tab, exact: true }).getAttribute('aria-current'),
      detailBackVisible: await app.locator('main').getByRole('button', { name: 'History' }).count() > 0,
      mainText: (await app.locator('main').innerText()).slice(0, 180),
    };
    console.log(`navigation challenge: ${tab}`);
  }

  await app.locator('aside').getByRole('button', { name: 'New Cook' }).click();
  await app.locator('aside').getByRole('button', { name: 'History' }).click();
  const historyCard = app.locator('main button.card-interactive').first();
  result.contrast.historyDark = await historyCard.evaluate(el => ({ foreground: getComputedStyle(el.querySelector('div div div')).color, background: getComputedStyle(el).backgroundColor }));
  await app.locator('aside').getByRole('button', { name: 'Dashboard' }).click();
  const recentCard = app.locator('main button.card-interactive').first();
  result.contrast.recentDark = await recentCard.evaluate(el => ({ foreground: getComputedStyle(el.querySelector('div:nth-child(2)')).color, background: getComputedStyle(el).backgroundColor }));
  for (const c of Object.values(result.contrast)) c.ratio = contrast(c.foreground, c.background);
  console.log('contrast challenges complete');
  await flow.close();
  result.limitations.push('No controlled broker, native mobile browser, or hardware used; disconnect event was injected after normalization.');
} catch (error) {
  failure = error;
  result.error = String(error);
} finally {
  await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  await writeFile(new URL('./adversarial-results.json', import.meta.url), JSON.stringify(result, null, 2));
}
if (failure) { console.error(failure); process.exit(1); }
console.log('saved adversarial-results.json');
process.exit(0);
