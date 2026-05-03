import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer
} from 'recharts';
import { PROBE_COLORS } from '../utils/helpers';

export function buildChartData(cook) {
  const ts = new Set();
  cook.probes.forEach(p => p.readings.forEach(r => ts.add(r.time)));
  cook.smokerReadings.forEach(r => ts.add(r.time));
  return Array.from(ts).sort((a, b) => a - b).map(t => {
    const pt = { time: t };
    cook.probes.forEach((p, i) => {
      const r = p.readings.find(x => x.time === t);
      if (r) pt[`p${i}`] = r.temp;
    });
    const sr = cook.smokerReadings.find(r => r.time === t);
    if (sr) pt.smoker = sr.temp;
    return pt;
  });
}

export function analyzeProbe(probe) {
  const r = probe.readings;
  if (r.length < 2) return null;
  const totalMins = r[r.length - 1].time - r[0].time;
  const startTemp = r[0].temp;
  const endTemp = r[r.length - 1].temp;
  const stallSegs = [];
  let si = -1;
  for (let i = 1; i < r.length; i++) {
    const window = r.slice(Math.max(0, i - 3), i + 1);
    const range = Math.max(...window.map(x => x.temp)) - Math.min(...window.map(x => x.temp));
    const inStall = range < 7 && r[i].temp > 140 && r[i].temp < 185;
    if (inStall && si < 0) si = i - 1;
    if (!inStall && si >= 0) {
      stallSegs.push({ start: r[si].time, end: r[i].time, startTemp: r[si].temp, endTemp: r[i].temp });
      si = -1;
    }
  }
  if (si >= 0) stallSegs.push({ start: r[si].time, end: r[r.length - 1].time, startTemp: r[si].temp, endTemp: r[r.length - 1].temp });
  const stallMins = stallSegs.reduce((a, s) => a + (s.end - s.start), 0);
  const firstStall = stallSegs[0];
  const preStallReadings  = firstStall ? r.filter(x => x.time < firstStall.start) : r;
  const postStallReadings = firstStall ? r.filter(x => x.time > firstStall.end)   : [];
  const rate = arr => {
    if (arr.length < 2) return null;
    const dt = arr[arr.length - 1].time - arr[0].time;
    if (dt < 1) return null;
    return ((arr[arr.length - 1].temp - arr[0].temp) / dt * 60).toFixed(1);
  };
  return {
    totalMins, startTemp, endTemp, stallSegs, stallMins,
    preRate: rate(preStallReadings),
    postRate: rate(postStallReadings),
    overallRate: totalMins > 0 ? ((endTemp - startTemp) / totalMins * 60).toFixed(1) : null
  };
}

export default function TempChart({ cook, height = 260, showStall = false, analyses = [] }) {
  const data = buildChartData(cook);
  if (data.length < 2) return (
    <div style={{ textAlign: 'center', padding: '2.5rem', fontSize: 13, color: 'var(--text2)' }}>
      {data.length === 0 ? 'No readings yet — log your first temp below' : 'Add one more reading to see the graph'}
    </div>
  );
  return (
    <div style={{ position: 'relative', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="time" tickFormatter={v => `${Math.round(v)}m`} tick={{ fill: 'var(--text3)', fontSize: 11, fontFamily: 'JetBrains Mono' }} stroke="var(--ash)" />
          <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text3)', fontSize: 11, fontFamily: 'JetBrains Mono' }} stroke="var(--ash)" tickFormatter={v => `${v}°`} />
          <Tooltip
            formatter={(v, n) => [`${v}°F`, n]}
            labelFormatter={l => `${Math.round(l)} min`}
            contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: 'var(--text2)' }} itemStyle={{ color: 'var(--text)' }}
          />
          {showStall && analyses[0]?.stallSegs.map((s, i) => (
            <ReferenceArea key={i} x1={s.start} x2={s.end} fill="rgba(245,158,11,0.08)"
              label={{ value: 'STALL', fontSize: 9, fill: '#BA7517', position: 'insideTop' }} />
          ))}
          {cook.probes.map((p, i) => (
            <ReferenceLine key={`r${i}`} y={p.target} stroke={PROBE_COLORS[i % PROBE_COLORS.length]} strokeDasharray="5 3" strokeOpacity={.45} />
          ))}
          {cook.smokerTarget && (
            <ReferenceLine y={cook.smokerTarget} stroke="#999" strokeDasharray="5 3" strokeOpacity={.3} />
          )}
          {cook.probes.map((p, i) => (
            <Line key={i} type="monotone" dataKey={`p${i}`} name={p.name}
              stroke={PROBE_COLORS[i % PROBE_COLORS.length]} dot={{ r: 3, fill: PROBE_COLORS[i % PROBE_COLORS.length] }} strokeWidth={2} connectNulls />
          ))}
          <Line type="monotone" dataKey="smoker" name="Smoker"
            stroke="#aaa" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}