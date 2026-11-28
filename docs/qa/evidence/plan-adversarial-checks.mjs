import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { computeStallProbability, stallPrediction } from '../../../src/utils/analytics.js';
const sparse = [0, 10, 20, 30].map(time => ({ time, temp: 160 }));
const dense = Array.from({ length: 1801 }, (_, second) => ({ time: second / 60, temp: 160 }));
const cooks = readings => [1, 2].map(id => ({ id: String(id), status: 'complete', cut: 'Brisket', probes: [{ readings }] }));
const result = {
  date: new Date().toISOString(),
  analytics: {
    curve: 'Constant 160F for 30 minutes; identical underlying curve, different sample cadence',
    sparse: { samples: sparse.length, stall: computeStallProbability(sparse), historical: stallPrediction(cooks(sparse), 'Brisket') },
    dense: { samples: dense.length, stall: computeStallProbability(dense), historical: stallPrediction(cooks(dense), 'Brisket') },
  },
};
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Mizzo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  result.peakCalculation = await page.evaluate(() => {
    const values = Array.from({ length: 172800 }, (_, i) => 150 + (i % 10));
    let spreadResult = null, spreadError = null;
    try { spreadResult = Math.max(...values); } catch (error) { spreadError = `${error.name}: ${error.message}`; }
    return { samples: values.length, spreadResult, spreadError, reductionResult: values.reduce((peak, temp) => Math.max(peak, temp), -Infinity) };
  });
} finally { await browser.close(); }
await writeFile(new URL('./plan-adversarial-checks.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
