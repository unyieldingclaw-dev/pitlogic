import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Mizzo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const result = { date: new Date().toISOString(), viewport: { width: 390, height: 844 }, pages: {}, errors: [] };
try {
  const context = await browser.newContext({ viewport: result.viewport, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', error => result.errors.push(error.message));
  await page.goto('http://127.0.0.1:5179/pitlogic/');
  await page.getByRole('button', { name: 'Start New Cook', exact: true }).waitFor();
  const capture = async (name, locator = page.locator('main')) => {
    result.pages[name] = { text: await locator.innerText() };
    await locator.locator('.fadein').evaluateAll(elements => Promise.all(elements.flatMap(el => el.getAnimations()).map(a => a.finished)));
    await page.screenshot({ path: `docs/qa/evidence/ux-${name}-390.png`, fullPage: true });
  };
  await capture('home');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await capture('settings', page.getByRole('dialog', { name: 'Settings', exact: true }));
  await page.getByText('Live Device', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/qa/evidence/ux-device-390.png' });
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.getByRole('button', { name: 'Start New Cook', exact: true }).click();
  await page.getByRole('button', { name: 'Start Cook', exact: true }).waitFor();
  await capture('new-cook');
  result.pages['new-cook'].startButton = await page.getByRole('button', { name: 'Start Cook', exact: true }).boundingBox();
  result.pages['new-cook'].fields = await page.locator('main input, main select').count();
  await page.locator('#cook-name').fill('UX Walkthrough Cook');
  await page.getByRole('button', { name: 'Start Cook', exact: true }).click();
  await capture('active-cook');
} finally {
  await browser.close();
  await writeFile(new URL('./ux-flow-walkthrough.json', import.meta.url), JSON.stringify(result, null, 2));
}
console.log('Saved current PitLogic flow walkthrough');
