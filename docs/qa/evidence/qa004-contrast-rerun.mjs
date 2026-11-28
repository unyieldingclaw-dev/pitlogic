import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Mizzo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const result = { date: new Date().toISOString(), cases: [], failures: [], errors: [] };
const base = 'http://127.0.0.1:5178/pitlogic/';

function contrast(foreground, background) {
  const luminance = rgb => (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(v => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
}

try {
  for (const theme of ['dark', 'light']) {
    for (const [size, width, height] of [['mobile', 390, 844], ['desktop', 1440, 900]]) {
      const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
      await context.addInitScript(theme => {
        const cook = {
          id: 'qa-complete', name: 'QA Completed Cook', cut: 'Brisket', status: 'complete',
          startTime: 1_700_000_000_000, endTime: 1_700_030_000_000, smokerTarget: 225,
          smokerReadings: [], probes: [{ name: 'Probe 1', target: 203, readings: [] }], rating: 0,
        };
        localStorage.setItem('pitlogic-v5', JSON.stringify({ cooks: [cook, { ...cook, id: 'qa-active', name: 'QA Active Cook', status: 'active', endTime: null }], activeCooks: ['qa-active'], dis: {} }));
        localStorage.setItem('pitlogic-prefs-v1', JSON.stringify({ theme, cutPrefs: {} }));
      }, theme);
      const page = await context.newPage();
      page.on('pageerror', error => result.errors.push(error.message));
      await page.goto(base);
      const nav = page.locator(size === 'mobile' ? '#bottom-nav' : 'aside nav');

      async function measure(kind, card, title) {
        const colors = await title.evaluate((el) => ({ foreground: getComputedStyle(el).color }));
        colors.background = await card.evaluate(el => getComputedStyle(el).backgroundColor);
        const ratio = contrast(colors.foreground, colors.background);
        result.cases.push({ theme, size, kind, ...colors, ratio });
        if (ratio < 4.5) result.failures.push(`${theme}/${size}/${kind}: ${ratio}:1`);
      }

      const recent = page.locator('main button.card-interactive');
      await recent.waitFor();
      await page.locator('main > .fadein').evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
      await measure('dashboard-recent', recent, recent.getByText('Brisket', { exact: true }));
      const active = page.locator('main button.breathe-glow');
      await measure('dashboard-active', active, active.getByText('QA Active Cook', { exact: true }));
      if (process.env.QA_SCREENSHOTS) await page.screenshot({ path: new URL(`./qa004-${theme}-${size}-dashboard.png`, import.meta.url).pathname.replace(/^\//, ''), fullPage: true });
      await nav.getByRole('button', { name: 'History', exact: true }).click();
      await page.getByText('Cook History', { exact: true }).waitFor();
      await page.locator('main > .fadein').evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
      for (const [kind, name] of [['history-active', 'QA Active Cook'], ['history-completed', 'QA Completed Cook']]) {
        const card = page.locator('main button.card-interactive').filter({ hasText: name });
        await measure(kind, card, card.getByText(name, { exact: true }));
      }
      if (process.env.QA_SCREENSHOTS) await page.screenshot({ path: new URL(`./qa004-${theme}-${size}-history.png`, import.meta.url).pathname.replace(/^\//, ''), fullPage: true });
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(process.env.QA_OUTPUT ?? new URL('./qa004-contrast-after-fix.json', import.meta.url), JSON.stringify(result, null, 2));
}
if (result.errors.length || result.failures.length) throw new Error(JSON.stringify({ failures: result.failures, errors: result.errors }));
console.log(`QA-004 contrast passed: ${result.cases.length} checks`);
