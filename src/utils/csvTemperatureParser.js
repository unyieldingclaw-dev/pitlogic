function thin(readings, minGapMs = 60000) {
  const out = [];
  for (const r of readings) {
    if (!out.length || r.ts - out[out.length - 1].ts >= minGapMs) out.push(r);
  }
  return out;
}

/**
 * Parses a ThermoWorks-style temperature CSV into cook reading arrays.
 * Returns { pData: Reading[][], sData: Reading[] } or null if unparseable.
 * Reading = { time: number (minutes from cook start), ts: number (epoch ms), temp: number }
 */
export function parseCsvReadings(text, cook) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;

  const hdrs = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const tCol = hdrs.findIndex(h => /time|date/.test(h));
  const sCol = hdrs.findIndex(h => /smoker|ambient|pit|grill/.test(h));
  const pCols = hdrs.reduce((a, h, i) => {
    if (/probe|ch\s*\d|channel|temp/i.test(h) && !/smoker|ambient|pit/i.test(h)) a.push(i);
    return a;
  }, []);

  let startTs = null;
  const pData = cook.probes.map(() => []);
  const sData = [];

  lines.slice(1).forEach(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const ts = tCol >= 0 ? new Date(cols[tCol].replace(' ', 'T')).getTime() : null;
    if (ts && isNaN(ts)) return;
    if (!startTs && ts) startTs = cook.startTime || ts;
    const mins = ts && startTs ? (ts - startTs) / 60000 : pData[0]?.length || 0;

    pCols.forEach((ci, pi) => {
      const temp = parseFloat(cols[ci]);
      if (!isNaN(temp) && pi < pData.length) pData[pi].push({ time: +mins.toFixed(2), ts: ts || Date.now(), temp });
    });

    if (sCol >= 0) {
      const temp = parseFloat(cols[sCol]);
      if (!isNaN(temp)) sData.push({ time: +mins.toFixed(2), ts: ts || Date.now(), temp });
    }
  });

  return { pData: pData.map(arr => thin(arr)), sData: thin(sData) };
}
