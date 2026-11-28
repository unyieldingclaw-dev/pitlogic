import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Mizzo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = new URL('./', import.meta.url).pathname.replace(/^\/(.)\:/, '$1:');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const results = [];
let failure = null;
try {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.addInitScript(({ theme }) => {
      const now = Date.now();
      const cook = { id: 'qa-visual', name: 'QA Synthetic Brisket', meat: 'Beef', cut: 'Brisket', smokerTarget: 225, startTime: now - 3600000, endTime: now, status: 'complete', probes: [{ id: 0, name: 'Probe 1', target: 203, readings: [{ time: 60, ts: now, temp: 180 }] }], smokerReadings: [], notes: '', rating: 0, linkedRecipes: [] };
      localStorage.setItem('pitlogic-v5', JSON.stringify({ cooks: [cook], activeCooks: [], dis: {} }));
      localStorage.setItem('pitlogic-prefs-v1', JSON.stringify({ theme, cutPrefs: {} }));
    }, { theme });
    await page.goto('http://127.0.0.1:5174/pitlogic/');
    await page.locator('#bottom-nav').getByRole('button', { name: 'History' }).click();
    const card = page.locator('main button.card').first();
    await card.waitFor();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('main .fadein')).opacity === '1');
    results.push({ theme, ...(await card.evaluate(el => ({ color: getComputedStyle(el).color, backgroundColor: getComputedStyle(el).backgroundColor, nameColor: getComputedStyle(el.querySelector('div div div') || el).color }))) });
    await page.screenshot({ path: join(out, `history-${theme}-390x844.png`) });
    await context.close();
  }
} catch (error) {
  failure = error;
  console.error(error);
} finally {
  await writeFile(join(out, 'visual-contrast-results.json'), JSON.stringify(results, null, 2));
  await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  process.exit(failure ? 1 : 0);
}
