import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Trash2, Share2, Star, BarChart2, FileText } from 'lucide-react';
import ShareButton from './ShareCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import TempChart, { buildChartData, analyzeProbe } from './TempChart';
import { PROBE_COLORS, dur, shortDate } from '../utils/helpers';
import { G } from '../data/cuts';

export default function DetailView({ cooks, detailId, onBack, onDelete, onSave, flash }) {
  const [subTab, setSubTab]     = useState('overview');
  const [compareId, setCompareId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editRating, setEditRating] = useState(0);
  const chartContainerRef = useRef(null);

  const detailCook = cooks.find(c => c.id === detailId);

  useEffect(() => {
    if (detailCook) { setEditNotes(detailCook.notes || ''); setEditRating(detailCook.rating || 0); }
  }, [detailId]);

  if (!detailCook) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text2)' }}>Select a cook from History.</div>
  );

  const g = G[detailCook.cut];
  const allT = detailCook.probes.flatMap(p => p.readings.map(r => r.temp));
  const peak  = allT.length ? Math.max(...allT) : null;
  const total = detailCook.probes.reduce((a, p) => a + p.readings.length, 0) + detailCook.smokerReadings.length;
  const analyses = detailCook.probes.map(analyzeProbe);
  const compareCook = cooks.find(c => c.id === compareId);
  const eligible = cooks.filter(c => c.id !== detailId && c.status === 'complete');

  const buildCompareData = (a, b) => {
    const times = new Set();
    a.probes.forEach(p => p.readings.forEach(r => times.add(Math.round(r.time))));
    b.probes.forEach(p => p.readings.forEach(r => times.add(Math.round(r.time))));
    return Array.from(times).sort((x, y) => x - y).map(t => {
      const pt = { time: t };
      a.probes.forEach((p, i) => { const r = p.readings.find(x => Math.round(x.time) === t); if (r) pt[`a${i}`] = r.temp; });
      b.probes.forEach((p, i) => { const r = p.readings.find(x => Math.round(x.time) === t); if (r) pt[`b${i}`] = r.temp; });
      return pt;
    });
  };

  const SUB_TABS = [
    { key: 'overview',  label: 'Overview',  Icon: BarChart2 },
    { key: 'analysis',  label: 'Analysis',  Icon: BarChart2 },
    { key: 'compare',   label: 'Compare',   Icon: Share2    },
    { key: 'notes',     label: 'Notes',     Icon: FileText  },
  ];

  return (
    <div className="fadein">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={onBack}>
          <ChevronLeft size={14} /> History
        </button>
        <div style={{ flex: 1, margin: '0 10px' }}>
          <div style={{ fontWeight: 500, fontSize: 15 }}>{detailCook.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{shortDate(detailCook.startTime)} · {dur(detailCook.startTime, detailCook.endTime)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ShareButton cook={detailCook} chartContainerRef={chartContainerRef} flash={flash} />
          <button className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => onDelete(detailCook.id)}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {/* Sub-tab nav */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', marginBottom: '1rem', overflowX: 'auto' }}>
        {SUB_TABS.map(({ key, label }) => (
          <button key={key} className={`nav-tab${subTab === key ? ' active' : ''}`} onClick={() => setSubTab(key)}>{label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {subTab === 'overview' && (
        <div>
          {g?.co && (
            <div className="alert alert-amber" style={{ marginBottom: '1rem' }}>
              <span style={{ fontWeight: 500 }}>Carryover note: </span>
              {detailCook.cut} rises ~{g.co}°F after pulling. For a {g.pull}°F target, pull at {g.pull - g.co}–{g.pull - Math.round(g.co / 2)}°F.
            </div>
          )}
          <div className="g3" style={{ marginBottom: '1rem' }}>
            <div className="metric">
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Duration</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 500 }}>{dur(detailCook.startTime, detailCook.endTime)}</div>
            </div>
            <div className="metric">
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Peak Temp</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 500 }}>{peak ? `${peak}°F` : '—'}</div>
            </div>
            <div className="metric">
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Readings</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 500 }}>{total}</div>
            </div>
          </div>
          {(detailCook.weight || detailCook.pellet || detailCook.equipment) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
              {detailCook.weight && (
                <div style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--surface-raised)', border: '1px solid var(--border2)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Weight</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 500 }}>{detailCook.weight} lbs</div>
                </div>
              )}
              {detailCook.pellet && (
                <div style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--surface-raised)', border: '1px solid var(--border2)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Wood / Pellets</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{detailCook.pellet}</div>
                </div>
              )}
              {detailCook.equipment && (
                <div style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--surface-raised)', border: '1px solid var(--border2)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Equipment</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{detailCook.equipment}</div>
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(detailCook.probes.length, 3)}, minmax(0,1fr))`, gap: 8, marginBottom: '1rem' }}>
            {detailCook.probes.map((p, i) => {
              const temps = p.readings.map(r => r.temp);
              const final = temps[temps.length - 1];
              const pMax  = temps.length ? Math.max(...temps) : null;
              const color = PROBE_COLORS[i % PROBE_COLORS.length];
              return (
                <div key={i} style={{
                  background: 'var(--surface-raised)', borderRadius: 'var(--radius)',
                  padding: '.75rem', borderLeft: `3px solid ${color}`,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 500, color }}>{final ? `${final}°F` : '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Final · Target {p.target}°F</div>
                  {pMax && <div style={{ fontSize: 11, color: 'var(--text3)' }}>Peak {pMax}°F</div>}
                </div>
              );
            })}
          </div>
          <div className="card" style={{ marginBottom: '.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>Temperature graph</div>
              {analyses[0]?.stallSegs.length > 0 && <div style={{ fontSize: 11, color: 'var(--amber)' }}>Stall regions highlighted</div>}
            </div>
            <div ref={chartContainerRef}>
              <TempChart cook={detailCook} height={280} showStall analyses={analyses} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: '.5rem' }}>
              {detailCook.probes.map((p, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)' }}>
                  <span style={{ width: 12, height: 3, background: PROBE_COLORS[i % PROBE_COLORS.length], display: 'inline-block', borderRadius: 2 }} />{p.name}
                </span>
              ))}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)' }}>
                <span style={{ width: 12, height: 3, background: 'var(--ash)', display: 'inline-block', borderRadius: 2 }} />Smoker
              </span>
            </div>
          </div>
          {/* Export */}
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: '.5rem' }}>Export</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: '.75rem' }}>Save a copy of this cook summary as a printable page.</div>
            <button className="btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => {
              const rows = detailCook.probes.map((p, i) => {
                const a = analyses[i]; const temps = p.readings.map(r => r.temp); const final = temps[temps.length - 1];
                return `<tr><td>${p.name}</td><td>${final || '—'}°F</td><td>${p.target}°F</td><td>${a?.stallMins ? Math.round(a.stallMins) + 'm' : '—'}</td><td>${a?.overallRate || '—'}°F/hr</td></tr>`;
              }).join('');
              const html = `<!DOCTYPE html><html><head><title>${detailCook.name}</title><style>body{font-family:system-ui;max-width:700px;margin:2rem auto}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px 10px;background:#f4f4f2;font-size:12px}td{padding:8px 10px;border-bottom:1px solid #eee}</style></head><body><h1>${detailCook.name}</h1><h2>${shortDate(detailCook.startTime)} · ${dur(detailCook.startTime, detailCook.endTime)}</h2><table><thead><tr><th>Probe</th><th>Final</th><th>Target</th><th>Stall time</th><th>Climb rate</th></tr></thead><tbody>${rows}</tbody></table>${detailCook.notes ? `<p><strong>Notes:</strong> ${detailCook.notes}</p>` : ''}</body></html>`;
              const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.print();
            }}>
              <Share2 size={14} /> Print / Save as PDF
            </button>
          </div>
        </div>
      )}

      {/* ── ANALYSIS ── */}
      {subTab === 'analysis' && (
        <div>
          {analyses.every(a => !a) && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text2)' }}>Not enough readings to analyze.</div>
          )}
          {detailCook.probes.map((probe, i) => {
            const a = analyses[i]; if (!a) return null;
            const stallPct  = a.totalMins > 0 ? Math.round(a.stallMins / a.totalMins * 100) : 0;
            const activePct = 100 - stallPct;
            const color = PROBE_COLORS[i % PROBE_COLORS.length];
            return (
              <div key={i} className="card" style={{ marginBottom: '.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '.875rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{probe.name}</span>
                  {a.stallSegs.length > 0 && (
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4,
                      background: 'rgba(245,158,11,0.12)', color: 'var(--amber)', fontWeight: 500 }}>
                      {a.stallSegs.length} stall detected
                    </span>
                  )}
                </div>
                <div style={{ marginBottom: '.875rem' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Time breakdown</div>
                  <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', marginBottom: 5 }}>
                    <div style={{ width: `${activePct}%`, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--bg)', fontWeight: 500 }}>
                      {activePct > 15 ? 'Climbing' : ''}
                    </div>
                    {a.stallMins > 0 && (
                      <div style={{ width: `${stallPct}%`, background: 'rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--bg)', fontWeight: 500 }}>
                        {stallPct > 8 ? 'Stall' : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text2)' }}>
                    <span>Climbing: {Math.round(a.totalMins - a.stallMins)}m</span>
                    {a.stallMins > 0 && <span style={{ color: 'var(--amber)' }}>Stall: {Math.round(a.stallMins)}m ({stallPct}%)</span>}
                  </div>
                </div>
                {a.stallSegs.length > 0 && (
                  <div style={{ marginBottom: '.875rem' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Stall details</div>
                    {a.stallSegs.map((s, j) => (
                      <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '0.5px solid var(--border)' }}>
                        <span style={{ fontFamily: 'var(--mono)' }}>{Math.round(s.start)}–{Math.round(s.end)} min</span>
                        <span style={{ color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{s.startTemp}→{s.endTemp}°F · {Math.round(s.end - s.start)}m</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div className="metric"><div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Pre-stall rate</div><div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 500 }}>{a.preRate ? `${a.preRate}°/hr` : '—'}</div></div>
                  <div className="metric"><div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Post-stall rate</div><div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 500 }}>{a.postRate ? `${a.postRate}°/hr` : '—'}</div></div>
                  <div className="metric"><div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Overall rate</div><div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 500 }}>{a.overallRate ? `${a.overallRate}°/hr` : '—'}</div></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── COMPARE ── */}
      {subTab === 'compare' && (
        <div>
          <div className="card" style={{ marginBottom: '.75rem' }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: '.5rem' }}>Compare with another cook</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: '.75rem' }}>Overlay two cooks on the same graph.</div>
            {eligible.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: '1rem' }}>No other completed cooks yet.</div>
              : <select value={compareId} onChange={e => setCompareId(e.target.value)}>
                  <option value="">— Choose a cook to compare —</option>
                  {eligible.map(c => <option key={c.id} value={c.id}>{c.name} · {shortDate(c.startTime)}</option>)}
                </select>
            }
          </div>
          {compareId && compareCook && (
            <>
              <div className="card" style={{ marginBottom: '.75rem' }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, marginBottom: '.75rem' }}>Both cooks — same time axis</div>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={buildCompareData(detailCook, compareCook)} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,.1)" />
                      <XAxis dataKey="time" tickFormatter={v => `${Math.round(v)}m`} tick={{ fontSize: 10 }} stroke="rgba(128,128,128,.2)" />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} stroke="rgba(128,128,128,.2)" tickFormatter={v => `${v}°`} />
                      <Tooltip formatter={(v, n) => [`${v}°F`, n]} labelFormatter={l => `${Math.round(l)} min`} contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--bg)' }} />
                      {detailCook.probes.map((p, i) => <Line key={`a${i}`} type="monotone" dataKey={`a${i}`} name={`${detailCook.name.substring(0, 12)} P${i + 1}`} stroke={PROBE_COLORS[i % PROBE_COLORS.length]} strokeWidth={2} dot={false} connectNulls />)}
                      {compareCook.probes.map((p, i) => <Line key={`b${i}`} type="monotone" dataKey={`b${i}`} name={`${compareCook.name.substring(0, 12)} P${i + 1}`} stroke={PROBE_COLORS[i % PROBE_COLORS.length]} strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />)}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="g2">
                {[detailCook, compareCook].map((c, ci) => {
                  const t = c.probes.flatMap(p => p.readings.map(r => r.temp));
                  const pk = t.length ? Math.max(...t) : null;
                  return (
                    <div key={ci} className="card" style={{ marginBottom: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Duration</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500, marginBottom: 8 }}>{dur(c.startTime, c.endTime)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Peak temp</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500, marginBottom: 8 }}>{pk ? `${pk}°F` : '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Smoker target</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500 }}>{c.smokerTarget}°F</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── NOTES ── */}
      {subTab === 'notes' && (
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: '.75rem' }}>Notes & Rating</div>
          <div style={{ marginBottom: '.75rem' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} style={{ fontSize: 24, cursor: 'pointer',
                color: n <= editRating ? 'var(--amber)' : 'var(--border2)', marginRight: 3 }}
                onClick={() => setEditRating(n)}>
                <Star size={20} fill={n <= editRating ? 'var(--amber)' : 'none'} color={n <= editRating ? 'var(--amber)' : 'var(--border2)'} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </span>
            ))}
          </div>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Your notes</label>
          <textarea
            style={{ width: '100%', minHeight: 120 }}
            placeholder="How did it turn out? What would you change next time?"
            value={editNotes}
            onChange={e => setEditNotes(e.target.value)}
          />
          <button className="btn-primary" style={{ marginTop: 8, width: '100%' }} onClick={() => { onSave(detailCook.id, editNotes, editRating); flash('Saved ✓'); }}>
            Save Notes
          </button>
        </div>
      )}
    </div>
  );
}
