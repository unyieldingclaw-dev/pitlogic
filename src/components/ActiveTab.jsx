import { useState } from 'react';
import { Flame, AlertTriangle, CheckCircle, Droplets, ChevronDown, ChevronUp } from 'lucide-react';
import { MEATS } from '../data/meats';
import { G } from '../data/cuts';
import { PELLETS } from '../data/pellets';
import { PROBE_COLORS, shortDate, elapsed } from '../utils/helpers';
import TempChart from './TempChart';
import { useMopTimer } from '../hooks/useMopTimer';
import MopTimerBadge from './MopTimerBadge';
import { computeETA, computeStallProbability } from '../utils/analytics';
import LiveIntelligencePanel from './LiveIntelligencePanel';
import StallCoach from './StallCoach';

export default function ActiveTab({
  view, form, setForm,
  cooks, activeCook, entry, setEntry,
  stalls, wrapAlert, coAlert, confirmEnd, setConfirmEnd,
  onStart, onEnd, onLog, onCSV, onGoGuide, tick,
  allActiveCooks, activeCookIdx, setActiveCookIdx, onAddCook, onSprayEvent
}) {

  /* ── New cook form ── */
  if (view === 'new') {
    const guide = G[form.cut];
    const [showMore, setShowMore] = useState(false);
    const allPellets = Object.values(PELLETS).flat();
    return (
      <div className="fadein">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: '1.25rem', letterSpacing: '0.03em' }}>New Cook Setup</div>
        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
            <label>Cook name (optional)</label>
            <input
              placeholder={`e.g. ${form.meat} — ${form.cut}`}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="g2" style={{ marginBottom: '1rem' }}>
            <div>
              <label>Meat type</label>
              <select value={form.meat} onChange={e => setForm(f => ({ ...f, meat: e.target.value }))}>
                {Object.keys(MEATS).map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label>Cut</label>
              <select value={form.cut} onChange={e => setForm(f => ({ ...f, cut: e.target.value }))}>
                {(MEATS[form.meat] || []).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {guide && (
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 10, padding: '.875rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--amber)', marginBottom: 6 }}>Recommended pellets for {form.cut}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {guide.p.map(p => <span key={p} className="badge badge-amber">{p}</span>)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{guide.pn}</div>
            </div>
          )}

          {guide && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>Cook stages</div>
              {guide.stages.map((st, i) => (
                <div key={i} className="stage-block" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span className="step-num">{st.n}</span>
                  <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                    <span className="mono-pill" style={{ marginRight: 5 }}>{st.t}</span>
                    <span style={{ color: 'var(--text2)' }}>{st.a}</span>
                  </div>
                </div>
              ))}
              <button className="btn" style={{ marginTop: 6, fontSize: 12 }} onClick={() => onGoGuide(form.cut)}>
                Full guide →
              </button>
            </div>
          )}

          <hr className="divider" />

          {/* Ambient probe — always present, non-removable */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 8 }}>Probes</div>

            {/* Ambient row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end',
              padding: '10px 12px', borderRadius: 8, background: 'var(--surface-raised)',
              border: '1px solid rgba(90,90,85,0.4)' }}>
              <div style={{ flex: 2 }}>
                <label style={{ borderBottom: '1.5px solid var(--ash)', paddingBottom: 2, display: 'block', marginBottom: 4 }}>Ambient / Smoker</label>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)' }}>Wired ambient probe</div>
              </div>
              <div style={{ flex: 1 }}>
                <label>Target °F</label>
                <input type="number" value={form.smokerTarget}
                  onChange={e => setForm(f => ({ ...f, smokerTarget: e.target.value }))} />
              </div>
            </div>

            {/* Meat probes */}
            {form.probes.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 2 }}>
                  {i === 0 && <label>Probe label</label>}
                  <input value={p.name} onChange={e => setForm(f => ({ ...f, probes: f.probes.map((pp, j) => j === i ? { ...pp, name: e.target.value } : pp) }))} />
                </div>
                <div style={{ flex: 1 }}>
                  {i === 0 && <label>Target °F</label>}
                  <input type="number" value={p.target} onChange={e => setForm(f => ({ ...f, probes: f.probes.map((pp, j) => j === i ? { ...pp, target: e.target.value } : pp) }))} />
                </div>
                {i > 0 && (
                  <button className="btn-danger" style={{ flexShrink: 0 }} onClick={() => setForm(f => ({ ...f, probes: f.probes.filter((_, j) => j !== i) }))}>×</button>
                )}
              </div>
            ))}

            <button className="btn" style={{ fontSize: 12, marginTop: 4 }}
              onClick={() => setForm(f => ({ ...f, probes: [...f.probes, { name: `Probe ${f.probes.length + 1}`, target: G[f.cut]?.pull || 165 }] }))}>
              + Add meat probe
            </button>
          </div>

          <hr className="divider" />

          {/* More Details (collapsible) */}
          <div style={{ marginBottom: '1rem' }}>
            <button type="button" className="btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, padding: '8px 0' }}
              onClick={() => setShowMore(v => !v)}>
              <span style={{ color: 'var(--text2)' }}>More Details</span>
              {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showMore && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="g2">
                  <div>
                    <label>Meat weight (lbs)</label>
                    <input type="number" min="0" step="0.1" placeholder="e.g. 12.5"
                      value={form.weight}
                      onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
                  </div>
                  <div>
                    <label>Wood / Pellets</label>
                    <select value={form.pellet} onChange={e => setForm(f => ({ ...f, pellet: e.target.value }))}>
                      <option value="">— Select —</option>
                      {allPellets.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label>Smoker / Equipment</label>
                  <input placeholder="e.g. Traeger Pro 575"
                    value={form.equipment}
                    onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          <hr className="divider" />
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ margin: 0, fontSize: 13, color: 'var(--text)' }}>Mop / Spray Timer</label>
              <button type="button" className={form.mop?.enabled ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '4px 12px', fontSize: 12 }}
                onClick={() => setForm(f => ({ ...f, mop: { ...(f.mop || { intervalMin: 45, label: '' }), enabled: !f.mop?.enabled } }))}>
                {form.mop?.enabled ? 'On' : 'Off'}
              </button>
            </div>
            {form.mop?.enabled && (
              <div className="g2">
                <div>
                  <label>Interval (min)</label>
                  <select value={form.mop.intervalMin}
                    onChange={e => setForm(f => ({ ...f, mop: { ...f.mop, intervalMin: Number(e.target.value) } }))}>
                    {[15, 30, 45, 60].map(v => <option key={v} value={v}>{v} min</option>)}
                  </select>
                </div>
                <div>
                  <label>What (e.g. apple juice)</label>
                  <input value={form.mop.label || ''}
                    onChange={e => setForm(f => ({ ...f, mop: { ...f.mop, label: e.target.value } }))}
                    placeholder="Apple juice + butter" />
                </div>
              </div>
            )}
          </div>

          <button className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={onStart}>
            <Flame size={18} /> Start Cook
          </button>
        </div>
      </div>
    );
  }

  /* ── No active cook ── */
  if (!activeCook) return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text2)' }}>
      <Flame size={48} style={{ color: 'var(--ember)', opacity: 0.4, marginBottom: 16 }} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 10 }}>No active cook</div>
      <button className="btn-primary" onClick={() => onStart(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Flame size={16} /> New Cook
      </button>
    </div>
  );

  /* ── Active cook monitor ── */
  const guide   = G[activeCook.cut];
  const lastSmok = activeCook.smokerReadings[activeCook.smokerReadings.length - 1];
  const smokerPct = lastSmok ? Math.min(100, Math.round((lastSmok.temp / activeCook.smokerTarget) * 100)) : 0;
  const { countdown, alert: mopAlert, dismissSpray } = useMopTimer(activeCook, onSprayEvent);

  const stallProbs = activeCook.probes.reduce((acc, probe, i) => {
    acc[i] = computeStallProbability(probe.readings);
    return acc;
  }, {});

  const etaMinutes = activeCook.probes.reduce((min, probe) => {
    const last = probe.readings.slice(-1)[0];
    if (!last) return min;
    const eta = computeETA(probe.readings, probe.target || 203);
    if (eta === null) return min;
    return min === null ? eta : Math.min(min, eta);
  }, null);

  return (
    <div className="fadein">
      {/* Cook header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>{activeCook.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{shortDate(activeCook.startTime)} · {elapsed(activeCook.startTime)}</div>
          {etaMinutes !== null && (
            <div style={{ fontSize: 11, color: 'var(--ember)', fontFamily: 'var(--mono)', marginTop: 2 }}>
              ETA ~{etaMinutes >= 60 ? `${Math.floor(etaMinutes/60)}h ${etaMinutes%60}m` : `${etaMinutes}m`}
            </div>
          )}
        </div>
        {confirmEnd
          ? <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={onEnd}>Confirm end</button>
              <button className="btn" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setConfirmEnd(false)}>Cancel</button>
            </div>
          : <button className="btn-danger" onClick={() => setConfirmEnd(true)}>End Cook</button>
        }
      </div>

      {/* Multi-cook tab strip */}
      {allActiveCooks && allActiveCooks.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', overflowX: 'auto' }}>
          {allActiveCooks.map((c, i) => (
            <button key={c.id} onClick={() => setActiveCookIdx(i)}
              className={i === activeCookIdx ? 'btn-primary' : 'btn-ghost'}
              style={{ whiteSpace: 'nowrap', fontSize: 12, padding: '6px 14px' }}>
              {c.name || `Cook ${i + 1}`}
            </button>
          ))}
          {allActiveCooks.length < 4 && (
            <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={onAddCook}>+ Add Cook</button>
          )}
        </div>
      )}

      {/* Carryover reminder */}
      {confirmEnd && guide?.co && (
        <div className="alert alert-amber" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, color: 'var(--amber)', marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 500, marginBottom: 3 }}>Carryover reminder</div>
            <div style={{ color: 'var(--text2)', lineHeight: 1.5, fontSize: 12 }}>
              {activeCook.cut} will rise ~{guide.co}°F after pulling. For target {guide.pull}°F, consider pulling at {guide.pull - guide.co}–{guide.pull - Math.round(guide.co / 2)}°F.
            </div>
          </div>
        </div>
      )}

      {/* Wrap alert */}
      {wrapAlert && (
        <div className="alert alert-green" style={{ marginBottom: '1rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <CheckCircle size={16} style={{ flexShrink: 0, color: 'var(--green)', marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 500, marginBottom: 3 }}>Time to wrap!</div>
              <div style={{ color: 'var(--text2)', lineHeight: 1.5, fontSize: 12 }}>A probe hit {guide?.wrap}°F. Wrap in pink butcher paper or foil and return to smoker.</div>
            </div>
          </div>
          <button className="btn" style={{ flexShrink: 0, fontSize: 12 }} onClick={() => onEnd('dismiss_wrap')}>Got it</button>
        </div>
      )}

      {/* Stall coach */}
      <StallCoach
        activeCook={activeCook}
        stalls={stalls}
        cooks={cooks}
        stallProbs={stallProbs}
        onDismiss={onEnd}
      />

      {/* Carryover approaching */}
      {coAlert && (
        <div className="alert alert-ember" style={{ marginBottom: '1rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, color: 'var(--ember)', marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 500, marginBottom: 3 }}>Getting close — carryover alert</div>
              <div style={{ color: 'var(--text2)', lineHeight: 1.5, fontSize: 12 }}>
                A probe is within {guide?.co}°F of target. {activeCook.cut} rises ~{guide?.co}°F after pulling.
              </div>
            </div>
          </div>
          <button className="btn" style={{ flexShrink: 0, fontSize: 12 }} onClick={() => onEnd('dismiss_co')}>Got it</button>
        </div>
      )}

      {/* Mop/spray timer badge */}
      {activeCook.mopTimer?.enabled && (
        <div style={{ marginBottom: '1rem' }}>
          <MopTimerBadge countdown={countdown} alert={mopAlert}
            label={activeCook.mopTimer?.label} onDismiss={dismissSpray} />
        </div>
      )}

      {/* Ambient smoker strip */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 12, padding: '12px 16px', marginBottom: '1rem',
        display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: 4 }}>Smoker / Ambient</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 500, color: 'var(--text)' }}>
              {lastSmok ? `${lastSmok.temp}°` : '—'}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>→ {activeCook.smokerTarget}°F</span>
          </div>
          <div className="progress-track" style={{ marginTop: 6 }}>
            <div className="progress-fill" style={{ width: `${smokerPct}%`, background: 'var(--ash)' }} />
          </div>
        </div>
      </div>

      {/* Probe cards */}
      <div className="g4" style={{ marginBottom: '1rem' }}>
        {activeCook.probes.map((probe, i) => {
          const last = probe.readings.slice(-1)[0];
          const prev = probe.readings.slice(-3, -1);
          const isHot = prev.length >= 1 && last && (last.temp - prev[0].temp) > 4;
          const pct = last ? Math.min(100, Math.round((last.temp / probe.target) * 100)) : 0;
          const color = PROBE_COLORS[i % PROBE_COLORS.length];
          return (
            <div key={i} className={`probe-card${isHot ? ' hot' : ''}`}
              style={{ borderColor: `${color}30` }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 6 }}>{probe.name}</div>
              <div className="temp-display" style={{ color, marginBottom: 4 }}>
                {last ? `${last.temp}°` : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>→ {probe.target}°F</div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                {pct}%
              </div>
            </div>
          );
        })}
      </div>

      <LiveIntelligencePanel probes={activeCook.probes} />

      {/* Chart */}
      <div className="card" style={{ marginBottom: '.75rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--text2)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '.75rem' }}>Temperature Over Time</div>
        <TempChart cook={activeCook} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: '.5rem' }}>
          {activeCook.probes.map((p, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)' }}>
              <span style={{ width: 12, height: 3, background: PROBE_COLORS[i % PROBE_COLORS.length], display: 'inline-block', borderRadius: 2 }} />
              {p.name} (→{p.target}°)
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)' }}>
            <span style={{ width: 12, height: 3, background: 'var(--ash)', display: 'inline-block', borderRadius: 2 }} />Smoker
          </span>
        </div>
      </div>

      {/* Log reading */}
      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500, marginBottom: '.75rem' }}>Log Reading</div>
        <div className="g4" style={{ marginBottom: 8 }}>
          {activeCook.probes.map((p, i) => (
            <div key={i}>
              <label style={{ borderBottom: `1.5px solid ${PROBE_COLORS[i % PROBE_COLORS.length]}`, paddingBottom: 2 }}>{p.name} °F</label>
              <input
                type="number"
                placeholder="—"
                value={entry.temps[i] || ''}
                onChange={e => setEntry(en => ({ ...en, temps: en.temps.map((v, j) => j === i ? e.target.value : v) }))}
              />
            </div>
          ))}
          <div>
            <label style={{ borderBottom: '1.5px solid var(--ash)', paddingBottom: 2 }}>Smoker °F</label>
            <input
              type="number"
              placeholder="—"
              value={entry.smokerTemp}
              onChange={e => setEntry(en => ({ ...en, smokerTemp: e.target.value }))}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={onLog}>Log Now</button>
          <label className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
            ↑ Import CSV
            <input type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => onCSV(e, activeCook.id)} />
          </label>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>ThermoWorks CSV export auto-detected</div>
      </div>

      {/* Inline stages */}
      {guide && (
        <div className="card" style={{ marginTop: '.75rem', borderColor: 'rgba(245,158,11,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.625rem' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--amber)', fontFamily: 'var(--font-display)',
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>{activeCook.cut} cook stages</div>
            <button className="btn" style={{ fontSize: 11 }} onClick={() => onGoGuide(activeCook.cut)}>Full guide</button>
          </div>
          {guide.stages.map((st, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
              <span className="step-num">{st.n}</span>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                <span className="mono-pill" style={{ marginRight: 5 }}>{st.t}</span>
                <span style={{ color: 'var(--text2)' }}>{st.w} — </span>{st.a}
              </div>
            </div>
          ))}
          {guide.tip && (
            <div style={{ marginTop: '.5rem', padding: '.625rem', background: 'rgba(245,158,11,0.06)', borderRadius: 6, fontSize: 12, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 500, color: 'var(--amber)' }}>Pro tip: </span>{guide.tip}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
