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

export function computeClimbRate(readings) {
  const window = readings.slice(-6);
  const n = window.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const { time, temp } of window) {
    sumX += time; sumY += temp; sumXY += time * temp; sumXX += time * time;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  return parseFloat(((n * sumXY - sumX * sumY) / denom * 60).toFixed(1));
}

export function computeETA(readings, target) {
  if (!readings || readings.length === 0) return null;
  const last = readings[readings.length - 1].temp;
  if (last >= target) return 0;
  const rate = computeClimbRate(readings); // °F/hr
  if (rate === null || rate <= 0) return null;
  return Math.round((target - last) / rate * 60); // minutes
}

export function computeStallProbability(readings) {
  if (!readings || readings.length < 2) return { level: 'low', label: 'Normal', pct: 0 };
  const last = readings[readings.length - 1].temp;
  if (last < 140 || last > 185) return { level: 'low', label: 'Normal', pct: 0 };

  // Check confirmed stall: 4-reading window, range < 8, tdiff >= 18
  if (readings.length >= 4) {
    const w4 = readings.slice(-4);
    const temps4 = w4.map(r => r.temp);
    const range4 = Math.max(...temps4) - Math.min(...temps4);
    const tdiff4 = w4[w4.length - 1].time - w4[0].time;
    if (range4 < 8 && tdiff4 >= 18) {
      return { level: 'stall', label: 'In Stall', pct: 100 };
    }
  }

  // Check approaching: 3-reading window range < 5 over >= 12 min
  if (readings.length >= 3) {
    const w3 = readings.slice(-3);
    const temps3 = w3.map(r => r.temp);
    const range3 = Math.max(...temps3) - Math.min(...temps3);
    const tdiff3 = w3[w3.length - 1].time - w3[0].time;
    if (range3 < 5 && tdiff3 >= 12) {
      return { level: 'approaching', label: 'Approaching Stall', pct: 50 };
    }
  }

  // Check approaching via slow climb rate
  const rate = computeClimbRate(readings);
  if (rate !== null && rate > 0 && rate < 4) {
    return { level: 'approaching', label: 'Approaching Stall', pct: 50 };
  }

  return { level: 'low', label: 'Normal', pct: 0 };
}

export function buildAverageCurve(cooks, cut) {
  const matching = cooks.filter(c =>
    c.status === 'complete' && c.cut === cut &&
    c.probes?.[0]?.readings?.length >= 2
  );
  if (matching.length < 2) return null;

  // Find max duration across matching cooks
  const maxDuration = Math.max(...matching.map(c => {
    const r = c.probes[0].readings;
    return r[r.length - 1].time;
  }));

  const buckets = [];
  for (let t = 0; t <= maxDuration; t += 15) {
    const vals = [];
    for (const cook of matching) {
      const readings = cook.probes[0].readings;
      // Linear interpolation at time t
      if (t < readings[0].time || t > readings[readings.length - 1].time) continue;
      let interp = null;
      for (let i = 1; i < readings.length; i++) {
        if (readings[i].time >= t) {
          const prev = readings[i - 1];
          const curr = readings[i];
          const frac = curr.time === prev.time ? 0 : (t - prev.time) / (curr.time - prev.time);
          interp = prev.temp + frac * (curr.temp - prev.temp);
          break;
        }
      }
      if (interp !== null) vals.push(interp);
    }
    if (vals.length < 2) continue;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length;
    const sigma = Math.sqrt(variance);
    buckets.push({
      time: t,
      avg: parseFloat(avg.toFixed(1)),
      upper: parseFloat((avg + sigma).toFixed(1)),
      lower: parseFloat((avg - sigma).toFixed(1)),
      n: vals.length,
    });
  }

  if (buckets.length === 0) return null;
  return { curve: buckets, sampleSize: matching.length };
}
