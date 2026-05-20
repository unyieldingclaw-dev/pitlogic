# Cook Comparison Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Compare" mode to the Analytics tab that overlays up to 4 past cooks' temperature curves on a single chart, with a probe picker, average reference line toggle, and a cook checklist.

**Architecture:** A segmented "Average | Compare" toggle is added to `AnalyticsTab`. Compare mode renders a new self-contained `CompareChart` component. A new `buildCompareCurves` utility in `analytics.js` handles per-probe interpolation at 15-min buckets (mirroring the existing `buildAverageCurve` pattern). The chart data is merged into a unified Recharts dataset keyed by `cookId`.

**Tech Stack:** React 19, Recharts (ComposedChart, Line, Area), Vitest

---

## File Map

| File | Role |
|------|------|
| `src/utils/analytics.js` | Add `buildCompareCurves(cooks, probeIndex)` |
| `src/utils/__tests__/analytics.test.js` | Add tests for `buildCompareCurves` |
| `src/components/CompareChart.jsx` | New: full Compare mode view (probe picker, chart, checklist) |
| `src/components/AnalyticsTab.jsx` | Add mode toggle, hoist cut selector, render `CompareChart` |

---

## Task 1: `buildCompareCurves` — utility + tests

**Files:**
- Modify: `src/utils/analytics.js`
- Modify: `src/utils/__tests__/analytics.test.js`

- [ ] **Step 1: Add the failing tests**

Append to `src/utils/__tests__/analytics.test.js`:

```js
import { ..., buildCompareCurves } from '../analytics';

describe('buildCompareCurves', () => {
  const makeReadings = pts => pts.map(([time, temp]) => ({ time, temp }));
  const makeC = (id, overrides = {}) => ({
    id,
    probes: [{ name: 'Meat', readings: [] }],
    ...overrides,
  });

  it('returns array of same length as input', () => {
    const c1 = makeC('1', { probes: [{ name: 'Meat', readings: makeReadings([[0,150],[30,165],[60,180]]) }] });
    const c2 = makeC('2', { probes: [{ name: 'Meat', readings: makeReadings([[0,145],[30,160],[60,175]]) }] });
    expect(buildCompareCurves([c1, c2], 0).length).toBe(2);
  });

  it('returns points: null when probe slot is missing', () => {
    const cook = makeC('1', { probes: [{ name: 'Meat', readings: makeReadings([[0,150],[30,180]]) }] });
    const result = buildCompareCurves([cook], 1); // probeIndex 1 doesn't exist
    expect(result[0].points).toBeNull();
  });

  it('returns points: null when fewer than 2 readings', () => {
    const cook = makeC('1', { probes: [{ name: 'Meat', readings: [{ time: 0, temp: 150 }] }] });
    const result = buildCompareCurves([cook], 0);
    expect(result[0].points).toBeNull();
  });

  it('cookId matches cook.id', () => {
    const cook = makeC('abc123', { probes: [{ name: 'Meat', readings: makeReadings([[0,150],[30,180]]) }] });
    expect(buildCompareCurves([cook], 0)[0].cookId).toBe('abc123');
  });

  it('interpolates at 15-min buckets', () => {
    // t=0: 150°, t=30: 180° — linear, so t=15 should be 165°
    const cook = makeC('1', { probes: [{ name: 'Meat', readings: makeReadings([[0,150],[30,180]]) }] });
    const result = buildCompareCurves([cook], 0);
    const pt = result[0].points?.find(p => p.t === 15);
    expect(pt).toBeDefined();
    expect(pt.temp).toBeCloseTo(165, 1);
  });

  it('stops at last reading time', () => {
    // readings end at t=45, so no bucket at t=60
    const cook = makeC('1', { probes: [{ name: 'Meat', readings: makeReadings([[0,150],[30,165],[45,172]]) }] });
    const result = buildCompareCurves([cook], 0);
    expect(result[0].points?.every(p => p.t <= 45)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```
npm test -- --run src/utils/__tests__/analytics.test.js
```

Expected: FAIL with `buildCompareCurves is not a function` (or similar import error).

- [ ] **Step 3: Implement `buildCompareCurves` in `src/utils/analytics.js`**

Append after `buildAverageCurve`:

```js
export function buildCompareCurves(cooks, probeIndex) {
  return cooks.map(cook => {
    const probe = cook.probes?.[probeIndex];
    if (!probe || probe.readings.length < 2) {
      return { cookId: cook.id, points: null };
    }
    const readings = probe.readings;
    const maxT = readings[readings.length - 1].time;
    const points = [];
    for (let t = 0; t <= maxT; t += 15) {
      if (t < readings[0].time) continue;
      for (let i = 1; i < readings.length; i++) {
        if (readings[i].time >= t) {
          const prev = readings[i - 1];
          const curr = readings[i];
          const frac = curr.time === prev.time ? 0 : (t - prev.time) / (curr.time - prev.time);
          points.push({ t, temp: parseFloat((prev.temp + frac * (curr.temp - prev.temp)).toFixed(1)) });
          break;
        }
      }
    }
    return { cookId: cook.id, points };
  });
}
```

Also update the import line at the top of `src/utils/__tests__/analytics.test.js` to include `buildCompareCurves`:

```js
import { totalStats, cooksByMonth, stallPrediction, computeClimbRate, computeETA, computeStallProbability, buildAverageCurve, buildCompareCurves } from '../analytics';
```

- [ ] **Step 4: Run tests — confirm they pass**

```
npm test -- --run src/utils/__tests__/analytics.test.js
```

Expected: All tests PASS (the existing suite + the 6 new `buildCompareCurves` tests).

- [ ] **Step 5: Commit**

```
git add src/utils/analytics.js src/utils/__tests__/analytics.test.js
git commit -m "feat: add buildCompareCurves utility for cook comparison chart"
```

---

## Task 2: `CompareChart` component

**Files:**
- Create: `src/components/CompareChart.jsx`

- [ ] **Step 1: Create `src/components/CompareChart.jsx`**

```jsx
import { useState, useEffect } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { buildCompareCurves, buildAverageCurve } from '../utils/analytics';
import { shortDate } from '../utils/helpers';

const COMPARE_COLORS = ['#FF6B35', '#60A5FA', '#4ADE80', '#FBBF24'];
const MAX_COOKS = 4;

function buildChartData(selectedCooks, curves, avgCurve, showAvgLine) {
  const tsSet = new Set();
  curves.forEach(c => c.points?.forEach(p => tsSet.add(p.t)));
  if (showAvgLine && avgCurve) avgCurve.curve.forEach(p => tsSet.add(p.time));

  return [...tsSet].sort((a, b) => a - b).map(t => {
    const row = { t };
    selectedCooks.forEach(cook => {
      const curve = curves.find(c => c.cookId === cook.id);
      const pt = curve?.points?.find(p => p.t === t);
      row[cook.id] = pt?.temp ?? null;
    });
    if (showAvgLine && avgCurve) {
      const ap = avgCurve.curve.find(p => p.time === t);
      if (ap) { row.avg = ap.avg; row.upper = ap.upper; row.lower = ap.lower; }
    }
    return row;
  });
}

function CompareTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const h = Math.floor(label / 60);
  const m = label % 60;
  const timeLabel = m === 0 ? `${h}h` : `${h}h ${m}m`;
  return (
    <div style={{
      background: 'var(--surface-raised)', border: '1px solid rgba(255,107,53,0.3)',
      borderRadius: 10, padding: '8px 12px', fontSize: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      <div style={{ color: 'var(--text3)', marginBottom: 4 }}>{timeLabel}</div>
      {payload
        .filter(p => p.value != null && p.dataKey !== 'upper' && p.dataKey !== 'lower')
        .map(p => (
          <div key={p.dataKey} style={{
            color: p.color, display: 'flex', gap: 12, justifyContent: 'space-between',
          }}>
            <span>{p.name}</span>
            <span style={{ fontFamily: 'var(--mono)' }}>{p.value}°F</span>
          </div>
        ))}
    </div>
  );
}

export default function CompareChart({ cooks, cut }) {
  const eligible = cooks
    .filter(c => c.status === 'complete' && c.cut === cut && c.probes?.[0]?.readings?.length >= 2)
    .sort((a, b) => b.startTime - a.startTime);

  const [selectedIds, setSelectedIds] = useState([]);
  const [probeIndex, setProbeIndex] = useState(0);
  const [showAvg, setShowAvg] = useState(true);

  useEffect(() => {
    setSelectedIds(eligible.slice(0, 3).map(c => c.id));
    setProbeIndex(0);
  }, [cut]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCooks = selectedIds
    .map(id => eligible.find(c => c.id === id))
    .filter(Boolean);

  const curves = buildCompareCurves(selectedCooks, probeIndex);
  const avgCurve = buildAverageCurve(cooks, cut);
  const showAvgLine = showAvg && probeIndex === 0 && !!avgCurve;
  const chartData = buildChartData(selectedCooks, curves, avgCurve, showAvgLine);

  const maxProbeCount = Math.max(0, ...selectedCooks.map(c => c.probes?.length ?? 0));
  const probeTabs = Array.from({ length: maxProbeCount }, (_, i) => {
    const labelCook = selectedCooks.find(c => c.probes?.[i]);
    return { index: i, name: labelCook?.probes[i]?.name ?? `Probe ${i + 1}` };
  });

  function toggleCook(id) {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_COOKS) return prev;
      return [...prev, id];
    });
  }

  if (eligible.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text3)', fontSize: 13 }}>
        Need at least 1 completed {cut} cook to compare.
      </div>
    );
  }

  return (
    <div>
      {/* Probe picker + avg toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {probeTabs.length > 1 && probeTabs.map(tab => (
          <button
            key={tab.index}
            onClick={() => setProbeIndex(tab.index)}
            style={{
              padding: '4px 12px', borderRadius: 16, fontSize: 12,
              border: 'none', cursor: 'pointer',
              background: probeIndex === tab.index ? 'var(--ember)' : 'var(--surface-raised)',
              color: probeIndex === tab.index ? '#fff' : 'var(--text2)',
            }}
          >
            {tab.name}
          </button>
        ))}
        <label style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, cursor: probeIndex === 0 ? 'pointer' : 'default',
          color: probeIndex === 0 ? 'var(--text2)' : 'var(--text3)',
        }}>
          <input
            type="checkbox"
            checked={showAvg && probeIndex === 0}
            disabled={probeIndex !== 0}
            onChange={e => setShowAvg(e.target.checked)}
            style={{ accentColor: 'var(--ember)' }}
          />
          Show avg
        </label>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
        {selectedCooks.map((cook, i) => (
          <div key={cook.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)' }}>
            <span style={{
              width: 20, height: 3, background: COMPARE_COLORS[i],
              borderRadius: 2, display: 'inline-block',
            }} />
            {shortDate(cook.startTime)}
          </div>
        ))}
        {showAvgLine && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text3)' }}>
            <span style={{
              width: 20, height: 0, display: 'inline-block',
              borderTop: '2px dashed rgba(255,255,255,0.35)',
            }} />
            Avg
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="avgBand-compare" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={v => `${Math.floor(v / 60)}h`}
            stroke="var(--ash)"
            tick={{ fill: 'var(--text3)', fontSize: 10 }}
          />
          <YAxis
            stroke="var(--ash)"
            tick={{ fill: 'var(--text3)', fontSize: 10 }}
            tickFormatter={v => `${v}°`}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CompareTooltip />} />
          {showAvgLine && (
            <>
              <Area dataKey="lower" stroke="none" fill="none" legendType="none" isAnimationActive={false} />
              <Area
                dataKey="upper" stroke="none" fill="url(#avgBand-compare)"
                baseDataKey="lower" legendType="none" isAnimationActive={false}
              />
              <Line
                dataKey="avg" name="Avg"
                stroke="rgba(255,255,255,0.35)" strokeWidth={1.5}
                strokeDasharray="4 3" dot={false} isAnimationActive={false}
              />
            </>
          )}
          {selectedCooks.map((cook, i) => {
            const curve = curves.find(c => c.cookId === cook.id);
            if (!curve?.points) return null;
            return (
              <Line
                key={cook.id}
                dataKey={cook.id}
                name={shortDate(cook.startTime)}
                stroke={COMPARE_COLORS[i]}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Cook checklist */}
      <div style={{ marginTop: 16 }}>
        <div style={{
          fontSize: 11, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
        }}>
          Select Cooks (max {MAX_COOKS})
        </div>
        {eligible.map(cook => {
          const isSelected = selectedIds.includes(cook.id);
          const isDisabled = !isSelected && selectedIds.length >= MAX_COOKS;
          const colorIdx = selectedIds.indexOf(cook.id);
          const color = isSelected ? COMPARE_COLORS[colorIdx] : 'var(--border)';
          const finalTemp = cook.probes?.[probeIndex]?.readings?.slice(-1)[0]?.temp;
          const durationH = cook.endTime
            ? ((cook.endTime - cook.startTime) / 3600000).toFixed(1)
            : null;
          const missingProbe = probeIndex > 0 && !cook.probes?.[probeIndex];

          return (
            <div
              key={cook.id}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={isDisabled ? -1 : 0}
              onClick={() => !isDisabled && toggleCook(cook.id)}
              onKeyDown={e => e.key === 'Enter' && !isDisabled && toggleCook(cook.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8, marginBottom: 4,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.4 : 1,
                background: isSelected ? `${COMPARE_COLORS[colorIdx]}18` : 'transparent',
                border: `1px solid ${color}`,
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                readOnly
                tabIndex={-1}
                style={{ accentColor: isSelected ? COMPARE_COLORS[colorIdx] : undefined, pointerEvents: 'none' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text1)' }}>
                  {cook.name ? `${cook.name} · ` : ''}{shortDate(cook.startTime)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {durationH && `${durationH}h`}
                  {finalTemp != null && ` · ${finalTemp}°F final`}
                  {missingProbe && (
                    <span style={{ color: '#FBBF24', marginLeft: 4 }}>· No data for this probe</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Confirm no syntax errors**

```
npm run build 2>&1 | head -30
```

Expected: No errors referencing `CompareChart.jsx`. (It's not imported anywhere yet so no runtime check is possible — that comes in Task 3.)

- [ ] **Step 3: Commit**

```
git add src/components/CompareChart.jsx
git commit -m "feat: add CompareChart component for cook comparison view"
```

---

## Task 3: Wire `CompareChart` into `AnalyticsTab`

**Files:**
- Modify: `src/components/AnalyticsTab.jsx`

- [ ] **Step 1: Replace the full contents of `src/components/AnalyticsTab.jsx`**

The changes vs the original:
1. Import `CompareChart` and `useState`'s existing import already exists — just add `CompareChart`
2. Add `const [mode, setMode] = useState('average')`
3. Hoist the cut `<select>` out of the Stall Prediction card into a top-level control row alongside the new mode toggle
4. Gate all existing "average mode" cards behind `mode === 'average'`
5. Render `<CompareChart>` when `mode === 'compare'`

```jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ComposedChart, Area, Line, ScatterChart, Scatter, ZAxis } from 'recharts';
import { BarChart2, Flame, Clock, Star, TrendingUp } from 'lucide-react';
import { totalStats, cooksByMonth, stallPrediction, buildAverageCurve } from '../utils/analytics';
import { MEATS } from '../data/meats';
import { PROBE_COLORS, shortDate } from '../utils/helpers';
import { useState } from 'react';
import CompareChart from './CompareChart';

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <Icon size={20} style={{ color: 'var(--ember)', marginBottom: 8 }} />
      <div className="gradient-text" style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 500, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function EmberScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'var(--surface-raised)', border: '1px solid rgba(255,107,53,0.3)',
      borderRadius: 10, padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, marginBottom: 4 }}>{d.name}</div>
      <div style={{ color: 'var(--text3)', marginBottom: 2 }}>{d.cut} · {shortDate(d.startTime)}</div>
      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
        <span style={{ color: 'var(--text2)' }}>{d.durationH.toFixed(1)}h</span>
        <span>{'★'.repeat(d.rating)}{'☆'.repeat(5 - d.rating)}</span>
      </div>
    </div>
  );
}

export default function AnalyticsTab({ cooks }) {
  const [selectedCut, setSelectedCut] = useState('Brisket');
  const [mode, setMode] = useState('average');
  const stats = totalStats(cooks);
  const monthly = cooksByMonth(cooks);
  const stall = stallPrediction(cooks, selectedCut);
  const avgCurve = buildAverageCurve(cooks, selectedCut);
  const allCuts = Object.values(MEATS).flat();

  const ratedCooks = cooks.filter(c => c.status === 'complete' && c.rating > 0 && c.endTime);
  const allCutsForScatter = [...new Set(ratedCooks.map(c => c.cut))];
  const scatterByCut = allCutsForScatter.reduce((acc, cut, i) => {
    acc[cut] = {
      color: PROBE_COLORS[i % PROBE_COLORS.length],
      data: ratedCooks.filter(c => c.cut === cut).map(c => ({
        name: c.name || c.cut,
        cut: c.cut,
        startTime: c.startTime,
        durationH: (c.endTime - c.startTime) / 3600000,
        rating: c.rating,
      })),
    };
    return acc;
  }, {});

  if (cooks.filter(c => c.status === 'complete').length === 0) {
    return (
      <div className="fadein" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text3)' }}>
        <BarChart2 size={48} style={{ color: 'var(--ember)', opacity: 0.3, marginBottom: 12 }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>No data yet</div>
        <div style={{ fontSize: 13 }}>Complete a few cooks to see your personal analytics.</div>
      </div>
    );
  }

  return (
    <div className="fadein">
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginBottom: '1.25rem',
        letterSpacing: '0.03em' }}>Your Stats</div>

      <div className="g2" style={{ marginBottom: '1.5rem' }}>
        <StatCard icon={Flame} label="Total Cooks" value={stats.total} />
        <StatCard icon={Clock} label="Hours Smoked" value={`${Math.round(stats.totalHours)}h`} />
        <StatCard icon={TrendingUp} label="Favorite Cut" value={stats.favCut.length > 10 ? stats.favCut.slice(0,9)+'…' : stats.favCut} />
        <StatCard icon={Star} label="Avg Rating" value={stats.avgRating} sub="out of 5" />
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text2)',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Cooks Per Month</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={monthly} barSize={18}>
            <defs>
              <linearGradient id="barGrad-monthly" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF6B35" stopOpacity={1} />
                <stop offset="100%" stopColor="#E8510A" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--ash)" tick={{ fill: 'var(--text3)', fontSize: 10 }} />
            <YAxis allowDecimals={false} stroke="var(--ash)" tick={{ fill: 'var(--text3)', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" fill="url(#barGrad-monthly)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cut selector + mode toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
        <select
          value={selectedCut}
          onChange={e => setSelectedCut(e.target.value)}
          style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}
        >
          {allCuts.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{
          display: 'flex', borderRadius: 8, overflow: 'hidden',
          border: '1px solid var(--border)', marginLeft: 'auto',
        }}>
          {['average', 'compare'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '5px 14px', fontSize: 12, border: 'none', cursor: 'pointer',
                background: mode === m ? 'var(--ember)' : 'var(--surface-raised)',
                color: mode === m ? '#fff' : 'var(--text2)',
                textTransform: 'capitalize',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === 'compare' && (
        <div className="card">
          <CompareChart cooks={cooks} cut={selectedCut} />
        </div>
      )}

      {mode === 'average' && (
        <>
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text2)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Stall Prediction</div>
            {stall ? (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
                  Based on {stall.sampleSize} past {selectedCut} cook{stall.sampleSize > 1 ? 's' : ''}:
                </div>
                <div className="g2">
                  <div className="metric">
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Typical Stall Temp</div>
                    <div className="gradient-text" style={{ fontFamily: 'var(--mono)', fontSize: 22 }}>{stall.avgTemp}°F</div>
                  </div>
                  <div className="metric">
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Avg Stall Duration</div>
                    <div className="gradient-text" style={{ fontFamily: 'var(--mono)', fontSize: 22 }}>{stall.avgDurMin} min</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text3)', padding: '0.5rem 0' }}>
                Need at least 2 completed {selectedCut} cooks to predict your stall pattern.
              </div>
            )}
          </div>

          {avgCurve && (
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text2)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                {selectedCut} Avg Temp Curve
                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8, textTransform: 'none',
                  letterSpacing: 0, fontFamily: 'var(--font)' }}>
                  ±1σ band · {avgCurve.sampleSize} cook{avgCurve.sampleSize > 1 ? 's' : ''}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={avgCurve.curve} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sigmaFill-curve" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#FF6B35" stopOpacity={0.03} />
                    </linearGradient>
                    <filter id="avgLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="rgba(245,158,11,0.5)" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="time" tickFormatter={v => `${v}m`} stroke="var(--ash)"
                    tick={{ fill: 'var(--text3)', fontSize: 10 }} />
                  <YAxis stroke="var(--ash)" tick={{ fill: 'var(--text3)', fontSize: 10 }}
                    tickFormatter={v => `${v}°`} domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(v, name) => [`${v}°F`, name]}
                    labelFormatter={l => `${l} min`}
                    contentStyle={{ background: 'var(--surface-raised)', border: '1px solid rgba(255,107,53,0.3)',
                      borderRadius: 10, fontSize: 12 }}
                  />
                  <Area dataKey="lower" stroke="none" fill="none" legendType="none" isAnimationActive={false} />
                  <Area dataKey="upper" stroke="none" fill="url(#sigmaFill-curve)"
                    baseDataKey="lower" legendType="none" isAnimationActive={false} />
                  <Line dataKey="avg" name="Avg Temp" stroke="#F59E0B" strokeWidth={2.5}
                    dot={false} isAnimationActive={false}
                    style={{ filter: 'url(#avgLineGlow)' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {ratedCooks.length >= 2 && (
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text2)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                Cook Quality
                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8, textTransform: 'none',
                  letterSpacing: 0, fontFamily: 'var(--font)' }}>duration vs rating</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <ScatterChart margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="durationH" name="Duration" type="number" stroke="var(--ash)"
                    tick={{ fill: 'var(--text3)', fontSize: 10 }}
                    tickFormatter={v => `${v.toFixed(1)}h`} domain={[0, 'auto']} />
                  <YAxis dataKey="rating" name="Rating" type="number" domain={[0, 5]}
                    stroke="var(--ash)" tick={{ fill: 'var(--text3)', fontSize: 10 }}
                    tickFormatter={v => '★'.repeat(v)} />
                  <ZAxis range={[40, 40]} />
                  <Tooltip content={<EmberScatterTooltip />} />
                  {Object.entries(scatterByCut).map(([cut, { color, data }]) => (
                    <Scatter key={cut} name={cut} data={data} fill={color} fillOpacity={0.85}
                      style={{ filter: 'drop-shadow(0 0 3px rgba(255,107,53,0.3))' }} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                {Object.entries(scatterByCut).map(([cut, { color }]) => (
                  <div key={cut} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text3)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                    {cut}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Open browser and verify**

With the dev server running (`npm run dev`), go to `http://localhost:5173/rfx-cook-tracker/` and navigate to the Analytics tab.

Check:
- Cut selector and "Average | Compare" toggle appear below the monthly bar chart
- Average mode shows Stall Prediction + Avg Curve + Cook Quality exactly as before
- Compare mode shows the `CompareChart` — if you have completed cooks, the 3 most recent auto-load
- Clicking checkboxes in the list adds/removes cook lines
- "Show avg" checkbox toggles the dashed reference line
- If you have probes named something other than "Probe 1", those names appear in the probe tab strip

- [ ] **Step 3: Run full test suite**

```
npm test -- --run
```

Expected: All existing tests pass. No new failures (CompareChart has no unit tests — it's a pure render component with no logic beyond what's tested in `buildCompareCurves`).

- [ ] **Step 4: Commit**

```
git add src/components/AnalyticsTab.jsx
git commit -m "feat: add Compare mode to Analytics tab with cook comparison chart"
```
