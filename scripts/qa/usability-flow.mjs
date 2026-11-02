import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const { WebSocketServer } = require('ws');
const packet = require('mqtt-packet');
const output = resolve(process.env.QA_OUTPUT_DIR ?? '.qa-temp/usability-evidence');
await mkdir(output, { recursive: true });
const broker = new WebSocketServer({ host: '127.0.0.1', port: 0 });
await new Promise(resolve => broker.once('listening', resolve));
let accepting = true;
const sockets = new Set();
const result = { date: new Date().toISOString(), cases: [], errors: [], limitations: ['Synthetic local broker and browser contexts; no production data, real RFX hardware, native mobile browser, or unattended cook duration.'] };
broker.on('connection', socket => {
  if (!accepting) { socket.terminate(); return; }
  sockets.add(socket);
  socket.on('close', () => sockets.delete(socket));
  const parser = packet.parser();
  socket.on('message', data => parser.parse(Buffer.from(data)));
  parser.on('error', error => result.errors.push(`Fixture parser: ${error.message}`));
  parser.on('packet', message => {
    if (message.cmd === 'connect') socket.send(packet.generate({ cmd: 'connack', returnCode: 0, sessionPresent: false }));
    if (message.cmd === 'subscribe') socket.send(packet.generate({ cmd: 'suback', messageId: message.messageId, granted: message.subscriptions.map(s => s.qos) }));
    if (message.cmd === 'pingreq') socket.send(packet.generate({ cmd: 'pingresp' }));
    if (message.cmd === 'disconnect') socket.close();
  });
});
const publish = value => {
  const payload = JSON.stringify({ channels: [{ number: 1, ts: Date.now(), readings: [{ type: 'T', value }] }] });
  const bytes = packet.generate({ cmd: 'publish', topic: '/probes/QA000/events', payload, qos: 0, retain: false });
  for (const socket of sockets) if (socket.readyState === 1) socket.send(bytes);
};
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const theme of ['dark', 'light']) for (const [size, width, height] of [['mobile', 390, 844], ['desktop', 1440, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block', acceptDownloads: true });
    await context.addInitScript(theme => {
      if (!localStorage.getItem('pitlogic-prefs-v1')) localStorage.setItem('pitlogic-prefs-v1', JSON.stringify({ theme, cutPrefs: {} }));
    }, theme);
    const page = await context.newPage();
    page.on('pageerror', error => result.errors.push(`${theme}/${size}: ${error.message}`));
    await page.goto(process.env.QA_BASE ?? 'http://127.0.0.1:5180/pitlogic/');
    const nav = page.locator(size === 'mobile' ? '#bottom-nav' : 'aside nav');
    const main = page.locator('main');
    const shot = async name => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await main.locator(':scope > .fadein').evaluateAll(elements => Promise.all(elements.flatMap(el => el.getAnimations()).map(a => a.finished)));
      await page.screenshot({ path: resolve(output, `${theme}-${size}-${name}.png`), fullPage: true });
    };
    await page.getByRole('button', { name: 'Start a cook', exact: true }).click();
    await page.getByLabel('Smoker target °F').fill('250');
    await page.getByText('Optional cook details', { exact: true }).click();
    await page.getByLabel('Cook name (optional)').fill('Stage A Cook');
    await page.getByText('Optional cook details', { exact: true }).click();
    await shot('setup');
    const startBox = await page.getByRole('button', { name: 'Start Cook', exact: true }).boundingBox();
    await page.getByRole('button', { name: 'View device readings' }).click();
    await page.waitForFunction(() => window.scrollY === 0);
    await page.getByLabel('Broker URL').fill(`ws://127.0.0.1:${broker.address().port}/mqtt`);
    await page.getByLabel('Username', { exact: true }).fill('synthetic-user');
    await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
    await page.getByRole('button', { name: 'Save and connect', exact: true }).click();
    await page.getByText('● Connected', { exact: true }).waitFor();
    await page.getByText('Connected — waiting for fresh device readings.', { exact: true }).waitFor();
    publish(182);
    await page.getByText('182.0°F').waitFor();
    await page.getByText('Fresh device readings received.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('pitlogic-v5')), null, 'Device readings must not silently create/save a cook');
    await shot('devices');
    accepting = false;
    for (const socket of [...sockets]) socket.terminate();
    await page.getByText('○ Reconnecting…', { exact: true }).waitFor();
    accepting = true;
    await page.getByText('● Connected', { exact: true }).waitFor();
    publish(190);
    await page.getByText('190.0°F').waitFor();
    await page.getByRole('button', { name: 'Back to cook setup' }).click();
    await page.waitForFunction(() => window.scrollY === 0);
    assert.equal(await page.getByLabel('Smoker target °F').inputValue(), '250');
    await page.getByRole('button', { name: 'Start Cook', exact: true }).click();
    await page.getByLabel('Probe 1 °F', { exact: true }).fill('155');
    await page.getByLabel('Smoker °F', { exact: true }).fill('225');
    await page.getByRole('button', { name: 'Log Now', exact: true }).click();
    const first = await page.evaluate(() => JSON.parse(localStorage.getItem('pitlogic-v5')).cooks[0]);
    assert.equal(first.probes[0].readings[0].temp, 155);
    assert.equal(first.smokerReadings[0].temp, 225);
    assert.equal(first.smokerTarget, 250);
    assert.equal('readingMode' in first || 'recording' in first || 'bindings' in first, false);
    assert.deepEqual(Object.keys(first.probes[0].readings[0]).sort(), ['temp', 'time', 'ts']);
    await shot('manual-cook');
    await main.getByRole('button', { name: '+ Add Cook', exact: true }).click();
    await page.getByRole('button', { name: 'Start Cook', exact: true }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pitlogic-v5')).activeCooks.length), 2);
    for (let i = 0; i < 2; i++) {
      await nav.getByRole('button', { name: 'Cook', exact: true }).click();
      await page.getByRole('button', { name: 'End Cook', exact: true }).click();
      await page.getByRole('button', { name: 'Confirm end', exact: true }).click();
      await nav.getByRole('button', { name: 'History', exact: true }).click();
      await page.getByText('Cook History', { exact: true }).waitFor();
    }
    await shot('history');
    for (const [label, expected] of [['Stats', 'Your Stats'], ['Guides', 'Pellet recommendation'], ['Recipes', 'Recipes']]) {
      await nav.getByRole('button', { name: 'More', exact: true }).click();
      await main.getByRole('button', { name: label, exact: true }).click();
      assert.ok((await main.innerText()).toLowerCase().includes(expected.toLowerCase()), `${label} body`);
      assert.equal(await nav.getByRole('button', { name: 'More', exact: true }).getAttribute('aria-current'), 'page');
    }
    await nav.getByRole('button', { name: 'More', exact: true }).click();
    await main.getByRole('button', { name: 'Settings', exact: true }).click();
    assert.equal(await page.getByRole('dialog').getByLabel('Broker URL').count(), 0);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download backup', exact: true }).click();
    const download = await downloadPromise;
    const file = resolve(output, `${theme}-${size}-backup.json`);
    await download.saveAs(file);
    const backup = JSON.parse(await readFile(file, 'utf8'));
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pitlogic-v5')));
    assert.equal(backup.version, 1);
    assert.deepEqual(backup.cooks, saved.cooks);
    assert.equal(saved.cooks.length, 2);
    assert.equal(saved.activeCooks.length, 0);
    await page.getByRole('button', { name: 'Close settings', exact: true }).focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('[role="dialog"]'))), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close settings');
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.reload();
    await page.getByRole('button', { name: 'Start a cook', exact: true }).waitFor();
    const restoreContext = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
    const restorePage = await restoreContext.newPage();
    restorePage.on('pageerror', error => result.errors.push(`Restore ${theme}/${size}: ${error.message}`));
    await restorePage.goto(process.env.QA_BASE ?? 'http://127.0.0.1:5180/pitlogic/');
    const restoreNav = restorePage.locator(size === 'mobile' ? '#bottom-nav' : 'aside nav');
    await restoreNav.getByRole('button', { name: 'More', exact: true }).click();
    await restorePage.locator('main').getByRole('button', { name: 'Settings', exact: true }).click();
    await restorePage.getByRole('dialog').locator('input[type="file"]').setInputFiles(file);
    await restorePage.getByRole('dialog').getByRole('button', { name: 'Import', exact: true }).click();
    await restorePage.getByRole('dialog').waitFor({ state: 'hidden' });
    const restored = await restorePage.evaluate(() => JSON.parse(localStorage.getItem('pitlogic-v5')));
    assert.deepEqual(restored.cooks, backup.cooks);
    assert.deepEqual(restored.activeCooks, backup.activeCooks);
    await restoreContext.close();
    result.cases.push({ theme, size, manualSaved: true, noSchemaChange: true, editedConfigConnected: true, brokerRecovered: true, twoCookHistoryPreserved: true, backupRoundTrip: true, keyboardTrap: true, settingsEscape: true, reload: true, startButtonY: startBox.y });
    await context.close();
  }
  assert.equal(result.errors.length, 0, 'Browser page errors');
} catch (error) { result.failure = error.message; throw error; }
finally {
  await browser.close();
  for (const socket of [...sockets]) socket.terminate();
  await new Promise(resolve => broker.close(resolve));
  await writeFile(resolve(output, 'results.json'), JSON.stringify(result, null, 2));
}
console.log(`Stage A browser flows passed: ${result.cases.length}`);
