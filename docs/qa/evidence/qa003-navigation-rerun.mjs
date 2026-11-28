import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Mizzo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const result = { date: new Date().toISOString(), base: 'http://127.0.0.1:5177/pitlogic/', viewports: {}, errors: [] };

try {
  for (const [name, width, height] of [['mobile', 390, 844], ['desktop', 1440, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.on('pageerror', error => result.errors.push(`${name}: ${error.message}`));
    await page.goto(result.base);
    await page.getByRole('button', { name: 'Start New Cook' }).click();
    await page.locator('#cook-name').fill('QA Navigation Cook');
    await page.getByRole('button', { name: 'Start Cook', exact: true }).click();
    await page.getByRole('button', { name: 'End Cook' }).click();
    await page.getByRole('button', { name: 'Confirm end' }).click();

    const nav = page.locator(name === 'mobile' ? '#bottom-nav' : 'aside nav');
    const cases = name === 'mobile'
      ? [['Home', 'Recent Cooks'], ['History', 'Cook History'], ['Stats', 'Your Stats'], ['Guides', 'Pellet recommendation'], ['Recipes', 'Recipes'], ['Cook', 'New Cook Setup']]
      : [['Dashboard', 'Recent Cooks'], ['History', 'Cook History'], ['Analytics', 'Your Stats'], ['Guides', 'Pellet recommendation'], ['Recipes', 'Recipes'], ['New Cook', 'New Cook Setup']];
    result.viewports[name] = {};

    for (const [label, expected] of cases) {
      await nav.getByRole('button', { name: label, exact: true }).click();
      const body = await page.locator('main').innerText();
      const selected = await nav.getByRole('button', { name: label, exact: true }).getAttribute('aria-current');
      const detailBack = await page.locator('main').getByRole('button', { name: 'History', exact: true }).count();
      const expectedVisible = body.toLowerCase().includes(expected.toLowerCase());
      result.viewports[name][label] = { selected, expectedVisible, detailBackVisible: detailBack > 0, mainText: body.slice(0, 180) };
      if (selected !== 'page' || !expectedVisible || detailBack > 0 || body.includes('Select a cook from History.')) {
        throw new Error(`${name} ${label}: wrong page after leaving detail`);
      }
      await nav.getByRole('button', { name: 'History', exact: true }).click();
      await page.locator('main button.card-interactive').first().click();
    }

    await page.reload();
    const afterReload = await page.locator('main').innerText();
    result.viewports[name].reload = { dashboardVisible: afterReload.toLowerCase().includes('recent cooks') };
    if (!result.viewports[name].reload.dashboardVisible) throw new Error(`${name}: reload did not return to dashboard`);
    await context.close();
  }
  if (result.errors.length) throw new Error(`Page errors: ${result.errors.join('; ')}`);
} finally {
  await browser.close();
  await writeFile(new URL('./qa003-navigation-after-fix.json', import.meta.url), JSON.stringify(result, null, 2));
}

console.log('QA-003 browser rerun passed');
