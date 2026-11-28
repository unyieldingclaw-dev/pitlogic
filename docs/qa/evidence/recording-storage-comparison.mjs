import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Mizzo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const server = createServer((_request, response) => response.end('<!doctype html><title>Isolated storage comparison</title>'));
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let cases;
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  cases = await page.evaluate(() => {
    const output = [];
    for (const shape of ['verbose', 'compact']) {
      for (const intervalSeconds of [1, 5, 15, 60]) {
        const hours = 12;
        const serializeStart = performance.now();
        const probes = Array.from({ length: 4 }, (_, channel) => ({
          id: channel, deviceProbeId: `QA000-ch${channel + 1}`,
          readings: Array.from({ length: hours * 3600 / intervalSeconds }, (_, index) => {
            const second = index * intervalSeconds;
            const base = { time: Number((second / 60).toFixed(2)), ts: 1_700_000_000_000 + second * 1000, temp: 150 + channel };
            return shape === 'compact' ? base : { ...base, source: 'live', deviceProbeId: `QA000-ch${channel + 1}`, receivedAt: base.ts + 20 };
          }),
        }));
        const json = JSON.stringify({ cooks: [{ id: 'fixture', probes }], activeCooks: ['fixture'], dis: {} });
        const serializeMs = performance.now() - serializeStart;
        let saved = false, error = null;
        const saveStart = performance.now();
        try { localStorage.setItem('fixture', json); saved = true; } catch (failure) { error = failure.name; }
        output.push({ shape, hours, probes: 4, intervalSeconds, samples: probes.reduce((sum, p) => sum + p.readings.length, 0), jsonCharacters: json.length, serializeMs, saveMs: performance.now() - saveStart, saved, error });
        localStorage.clear();
      }
    }
    return output;
  });
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
const result = { date: new Date().toISOString(), cases, limitation: 'Controlled synthetic Chrome workload. Compact samples omit per-reading provenance/receipt time; slower intervals represent different capture policies, not lossless compression. Neither demonstrates actual RFX cadence or establishes an acceptable retention policy.' };
await writeFile(new URL('./recording-storage-comparison.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
