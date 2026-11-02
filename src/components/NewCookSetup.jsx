import { Flame } from 'lucide-react';
import { MEATS } from '../data/meats';
import { G } from '../data/cuts';
import { PELLETS } from '../data/pellets';

export default function NewCookSetup({ form, onChange: setForm, onStart, onOpenDevices, prefs, setCutPref, onGoGuide }) {
    const guide = G[form.cut];

    const cutPref = prefs?.cutPrefs?.[form.cut];
    const defaultPit = cutPref?.pit ?? G[form.cut]?.pit ?? 225;
    const defaultPull = cutPref?.pull ?? G[form.cut]?.pull ?? 165;
    const pitChanged = form.smokerTarget !== defaultPit;
    const pullChanged = form.probes.some(p => p.target !== defaultPull);
    const showSaveDefault = (pitChanged || pullChanged) && Boolean(G[form.cut]);
    const allPellets = Object.values(PELLETS).flat();

  return (
    <div className="fadein cook-setup">
      <h1 className="flow-title">Start a cook</h1>
      <p className="flow-help">Log temperatures manually as you cook. No device connection is required.</p>
      <div className="card">
          <div className="g2" style={{ marginBottom: '1rem' }}>
            <div>
              <label htmlFor="cook-meat">Meat type</label>
              <select id="cook-meat" value={form.meat} onChange={e => setForm(f => ({ ...f, meat: e.target.value }))}>
                {Object.keys(MEATS).map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="cook-cut">Cut</label>
              <select id="cook-cut" value={form.cut} onChange={e => setForm(f => ({ ...f, cut: e.target.value }))}>
                {(MEATS[form.meat] || []).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

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
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)' }}>Enter the smoker temperature manually</div>
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="smoker-target">Smoker target °F</label>
                <input id="smoker-target" type="number" value={form.smokerTarget}
                  onChange={e => setForm(f => ({ ...f, smokerTarget: e.target.value }))} />
              </div>
            </div>

            {/* Meat probes */}
            {form.probes.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 2 }}>
                  <label htmlFor={`food-name-${i}`}>Food probe {i + 1} name</label>
                  <input id={`food-name-${i}`} value={p.name} onChange={e => setForm(f => ({ ...f, probes: f.probes.map((pp, j) => j === i ? { ...pp, name: e.target.value } : pp) }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor={`food-target-${i}`}>Food probe {i + 1} target °F</label>
                  <input id={`food-target-${i}`} type="number" value={p.target} onChange={e => setForm(f => ({ ...f, probes: f.probes.map((pp, j) => j === i ? { ...pp, target: e.target.value } : pp) }))} />
                </div>
                {i > 0 && (
                  <button type="button" aria-label={`Remove food probe ${i + 1}`} className="btn-danger" style={{ flexShrink: 0 }} onClick={() => setForm(f => ({ ...f, probes: f.probes.filter((_, j) => j !== i) }))}>×</button>
                )}
              </div>
            ))}

            <button className="btn" style={{ fontSize: 12, marginTop: 4 }}
              onClick={() => setForm(f => ({ ...f, probes: [...f.probes, { name: `Probe ${f.probes.length + 1}`, target: G[f.cut]?.pull || 165 }] }))}>
              + Add meat probe
            </button>
          </div>

          <hr className="divider" />


          <details className="flow-options"><summary>Optional cook details</summary>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="cook-name">Cook name (optional)</label>
            <input
              id="cook-name"
              placeholder={`e.g. ${form.meat} — ${form.cut}`}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Save-as-default badge */}
          {showSaveDefault && (
            <div style={{
              background: 'rgba(245,158,11,0.07)',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 8,
            }}>
              <span style={{ fontSize: 12, color: 'var(--amber)', lineHeight: 1.4 }}>
                Different from your defaults for {form.cut}
              </span>
              <button
                type="button"
                onClick={() => setCutPref(form.cut, {
                  pit: form.smokerTarget,
                  pull: form.probes[0]?.target,
                })}
                style={{
                  background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  borderRadius: 8,
                  padding: '5px 12px',
                  color: 'var(--amber)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                }}
              >
                Save as default
              </button>
            </div>
          )}

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
            {/* Low temp alarm */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              borderRadius: 8, background: 'var(--surface-raised)', border: '1px solid rgba(90,90,85,0.4)',
              marginBottom: 8 }}>
              <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ margin: 0, fontSize: 13, color: 'var(--text)' }} htmlFor="low-alarm-toggle">Low temp alarm</label>
              </div>
              <button type="button" id="low-alarm-toggle"
                className={form.smokerLowAlarm?.enabled ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '4px 12px', fontSize: 12 }}
                aria-pressed={!!form.smokerLowAlarm?.enabled}
                onClick={() => setForm(f => ({ ...f, smokerLowAlarm: { ...(f.smokerLowAlarm || { threshold: 200 }), enabled: !f.smokerLowAlarm?.enabled } }))}>
                {form.smokerLowAlarm?.enabled ? 'On' : 'Off'}
              </button>
              {form.smokerLowAlarm?.enabled && (
                <div style={{ flex: 1 }}>
                  <label htmlFor="low-alarm-threshold">Below °F</label>
                  <input id="low-alarm-threshold" type="number" value={form.smokerLowAlarm.threshold}
                    onChange={e => setForm(f => ({ ...f, smokerLowAlarm: { ...f.smokerLowAlarm, threshold: e.target.value } }))} />
                </div>
              )}
            </div>

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


          </details>
          <button className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={onStart}>
            <Flame size={18} /> Start Cook
          </button>
          <button type="button" className="btn-ghost flow-device-link" onClick={onOpenDevices}>View device readings</button>
          <p className="flow-help">Device readings are not saved to this cook.</p>
      </div>
    </div>
  );
}
