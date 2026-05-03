export function totalStats(cooks) {
  const done = cooks.filter(c => c.status === 'complete' && c.endTime);
  const totalMs = done.reduce((a, c) => a + (c.endTime - c.startTime), 0);
  const cutCounts = done.reduce((a, c) => { a[c.cut] = (a[c.cut] || 0) + 1; return a; }, {});
  const woodCounts = done.reduce((a, c) => { if (c.pellet) a[c.pellet] = (a[c.pellet] || 0) + 1; return a; }, {});
  const favCut  = Object.entries(cutCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? '—';
  const favWood = Object.entries(woodCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? '—';
  const rated = done.filter(c => c.rating > 0);
  const avgRating = rated.length ? (rated.reduce((a,c)=>a+c.rating,0)/rated.length).toFixed(1) : '—';
  return { total: done.length, totalMs, totalHours: totalMs/3600000, favCut, favWood, avgRating };
}

export function cooksByMonth(cooks) {
  const done = cooks.filter(c => c.status === 'complete' && c.startTime);
  const counts = {};
  done.forEach(c => {
    const d = new Date(c.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    result.push({ key, label, count: counts[key] || 0 });
  }
  return result;
}

export function stallPrediction(cooks, cut) {
  const matching = cooks.filter(c => c.cut === cut && c.status === 'complete');
  if (matching.length < 2) return null;
  const stallTemps = [], stallDurations = [];
  matching.forEach(cook => {
    cook.probes.forEach(probe => {
      const readings = probe.readings;
      for (let i = 3; i < readings.length; i++) {
        const window = readings.slice(i-3, i+1);
        const temps = window.map(r=>r.temp);
        const range = Math.max(...temps) - Math.min(...temps);
        const tdiff = window[window.length-1].time - window[0].time;
        if (range < 8 && tdiff >= 18 && temps[0] >= 140 && temps[0] <= 185) {
          stallTemps.push(temps[0]);
          stallDurations.push(tdiff);
          break;
        }
      }
    });
  });
  if (stallTemps.length < 2) return null;
  const avgTemp = Math.round(stallTemps.reduce((a,b)=>a+b,0)/stallTemps.length);
  const avgDur  = Math.round(stallDurations.reduce((a,b)=>a+b,0)/stallDurations.length);
  return { avgTemp, avgDurMin: avgDur, sampleSize: stallTemps.length };
}
