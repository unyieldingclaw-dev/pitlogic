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
