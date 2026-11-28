import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Mizzo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const server = createServer((_request, response) => response.end('<!doctype html><title>Local storage fixture</title>'));
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let result;
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  result = await page.evaluate(() => {
    const cases = [];
    for (const hours of [1, 4, 8, 12]) {
      const start = 1_700_000_000_000;
      const probes = Array.from({ length: 4 }, (_, channel) => ({
        id: channel, readings: Array.from({ length: hours * 3600 }, (_, second) => ({
          time: second / 60, ts: start + second * 1000, temp: 150 + channel,
          source: 'live', deviceProbeId: `QA000-ch${channel + 1}`, receivedAt: start + second * 1000 + 20,
        })),
      }));
      const json = JSON.stringify({ cooks: [{ id: 'synthetic', probes }], activeCooks: ['synthetic'], dis: {} });
      const before = performance.now();
      let saved = false, error = null;
      try { localStorage.setItem('synthetic-storage-fixture', json); saved = true; }
      catch (failure) { error = failure.name; }
      cases.push({ hours, probes: 4, sampleIntervalSeconds: 1, samples: hours * 3600 * 4, jsonCharacters: json.length, saveMs: performance.now() - before, saved, error });
      localStorage.clear();
    }
    return { cases, limitation: 'Synthetic capacity fixture in isolated desktop Chrome; actual telemetry frequency and other browsers not established.' };
  });
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
await writeFile(new URL('./recording-storage-capacity.json', import.meta.url), JSON.stringify({ date: new Date().toISOString(), ...result }, null, 2));
console.log(JSON.stringify(result));
