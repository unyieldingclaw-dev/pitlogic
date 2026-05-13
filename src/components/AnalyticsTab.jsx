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
