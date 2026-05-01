import { MEATS } from '../data/meats';
import { G } from '../data/cuts';
import { COLORS, shortDate, elapsed } from '../utils/helpers';
import TempChart from './TempChart';

export default function ActiveTab({
  view, form, setForm,
  activeCook, entry, setEntry,
  stalls, wrapAlert, coAlert, confirmEnd, setConfirmEnd,
  onStart, onEnd, onLog, onCSV, onGoGuide,
  tick
}) {

  /* ── New cook form ── */
  if (view === 'new') {
    const guide = G[form.cut];
    return (
      <div className="fadein">
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: '1.25rem' }}>New cook setup</div>
        <div className="card">
          <label className="lbl">Cook name (optional)</label>
          <input
            style={{ marginBottom: '1rem' }}
            placeholder={`e.g. ${form.meat} — ${form.cut}`}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />

          <div className="g2" style={{ marginBottom: '1rem' }}>
            <div>
              <label className="lbl">Meat type</label>
              <select value={form.meat} onChange={e => setForm(f => ({ ...f, meat: e.target.value }))}>
                {Object.keys(MEATS).map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Cut</label>
              <select value={form.cut} onChange={e => setForm(f => ({ ...f, cut: e.target.value }))}>
                {(MEATS[form.meat] || []).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="lbl">Traeger starting temp (°F)</label>
            <input
              type="number"
              style={{ width: 150 }}
              value={form.smokerTarget}
              onChange={e => setForm(f => ({ ...f, smokerTarget: e.target.value }))}
            />
          </div>

          {guide && (
            <div style={{ background: 'var(--amber-bg)', border: '0.5px solid rgba(186,117,23,.25)', borderRadius: 10, padding: '.875rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--amber)', marginBottom: 6 }}>🪵 Recommended pellets for {form.cut}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {guide.p.map(p => <span key={p} className="badge badge-amber">{p}</span>)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{guide.pn}</div>
            </div>
          )}

          {guide && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>Traeger stages</div>
              {guide.stages.map((st, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
                  <span className="step-num" style={{ width: 20, height: 20, fontSize: 11 }}>{st.n}</span>
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>Probes ({form.probes.length})</span>
            <button className="btn" onClick={() => setForm(f => ({ ...f, probes: [...f.probes, { name: `Probe ${f.probes.length + 1}`, target: G[f.cut]?.pull || 165 }] }))}>
              +  Add probe
            </button>
          </div>

          {form.probes.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                {i === 0 && <label className="lbl">Probe label</label>}
                <input value={p.name} onChange={e => setForm(f => ({ ...f, probes: f.probes.map((pp, j) => j === i ? { ...pp, name: e.target.value } : pp) }))} />
              </div>
              <div style={{ flex: 1 }}>
                {i === 0 && <label className="lbl">Target °F</label>}
                <input type="number" value={p.target} onChange={e => setForm(f => ({ ...f, probes: f.probes.map((pp, j) => j === i ? { ...pp, target: e.target.value } : pp) }))} />
              </div>
              {i > 0 && (
                <button className="btn-danger" style={{ flexShrink: 0, alignSelf: 'stretch' }} onClick={() => setForm(f => ({ ...f, probes: f.probes.filter((_, j) => j !== i) }))}>×</button>
              )}
            </div>
          ))}

          <button className="btn-orange" style={{ width: '100%', padding: '10px', fontSize: 15, marginTop: 8 }} onClick={onStart}>
            Start cook 🔥
          </button>
        </div>
      </div>
    );
  }

  /* ── No active cook ── */
  if (!activeCook) return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text2)' }}>
      <div style={{ fontSize: 40, marginBottom: '.75rem' }}>🔥</div>
      <div style={{ fontWeight: 500, marginBottom: 10 }}>No active cook</div>
      <button className="btn-orange" onClick={() => onStart(null)}>+ New cook</button>
    </div>
  );

  /* ── Active cook monitor ── */
  const guide   = G[activeCook.cut];
  const lastR   = activeCook.probes.map(p => p.readings[p.readings.length - 1]);
  const lastSmok = activeCook.smokerReadings[activeCook.smokerReadings.length - 1];
  const cols    = Math.min(activeCook.probes.length + 1, 4);

  return (
    <div className="fadein">
      {/* Cook header + end button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontWeight: 500, fontSize: 15 }}>{activeCook.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{shortDate(activeCook.startTime)} · {elapsed(activeCook.startTime)}</div>
        </div>
        {confirmEnd
          ? <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-orange" style={{ padding: '6px 12px', fontSize: 13 }} onClick={onEnd}>Confirm end</button>
              <button className="btn" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setConfirmEnd(false)}>Cancel</button>
            </div>
          : <button className="btn-danger" onClick={() => setConfirmEnd(true)}>End cook</button>
        }
      </div>

      {/* Carryover reminder when ending */}
      {confirmEnd && guide?.co && (
        <div className="alert-wrap" style={{ background: 'var(--amber-bg)', border: '1px solid rgba(186,117,23,.3)', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 500, marginBottom: 3 }}>🌡️ Carryover reminder</div>
          <div style={{ color: 'var(--text2)', lineHeight: 1.5 }}>
            {activeCook.cut} will rise ~{guide.co}°F after pulling. For a target of {guide.pull}°F, consider pulling at {guide.pull - guide.co}–{guide.pull - Math.round(guide.co / 2)}°F.
          </div>
        </div>
      )}

      {/* Wrap alert */}
      {wrapAlert && (
        <div className="alert-wrap" style={{ background: 'rgba(99,153,34,.08)', border: '1px solid rgba(99,153,34,.3)', display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 3 }}>🎁 Time to wrap!</div>
            <div style={{ color: 'var(--text2)', lineHeight: 1.5 }}>A probe hit {guide?.wrap}°F. Wrap in pink butcher paper or foil and return to smoker.</div>
          </div>
          <button className="btn" style={{ flexShrink: 0, fontSize: 12 }} onClick={() => onEnd('dismiss_wrap')}>Got it</button>
        </div>
      )}

      {/* Stall alerts */}
      {Object.entries(stalls).map(([i, temp]) => (
        <div key={i} className="alert-wrap" style={{ background: 'var(--amber-bg)', border: '1px solid rgba(186,117,23,.3)', display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 3 }}>⚠️ Stall detected — {activeCook.probes[i]?.name}</div>
            <div style={{ color: 'var(--text2)', lineHeight: 1.5 }}>Temp has plateaued around {temp}°F. Options: wrap now, raise to 275°F, or wait it out.</div>
          </div>
          <button className="btn" style={{ flexShrink: 0, fontSize: 12 }} onClick={() => onEnd(`dismiss_stall_${i}`)}>Got it</button>
        </div>
      ))}

      {/* Carryover approaching */}
      {coAlert && (
        <div className="alert-wrap" style={{ background: 'rgba(55,138,221,.08)', border: '1px solid rgba(55,138,221,.3)', display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 3 }}>📡 Getting close — carryover alert</div>
            <div style={{ color: 'var(--text2)', lineHeight: 1.5 }}>
              A probe is within {guide?.co}°F of target. {activeCook.cut} rises ~{guide?.co}°F after pulling — consider pulling {Math.round((guide?.co || 8) / 2)}–{guide?.co}°F early.
            </div>
          </div>
          <button className="btn" style={{ flexShrink: 0, fontSize: 12 }} onClick={() => onEnd('dismiss_co')}>Got it</button>
        </div>
      )}

      {/* Probe tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: 8, marginBottom: '1rem' }}>
        {activeCook.probes.map((p, i) => {
          const lr = lastR[i];
          const pct = lr ? Math.min(100, (lr.temp / p.target) * 100) : 0;
          const hit = lr && lr.temp >= p.target;
          const stalled = stalls[i] !== undefined;
          return (
            <div key={i} style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '.75rem', borderLeft: `3px solid ${stalled ? 'var(--amber)' : COLORS[i]}`, outline: stalled ? '1px solid rgba(186,117,23,.3)' : 'none' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: hit ? COLORS[i] : stalled ? 'var(--amber)' : 'var(--text)' }}>{lr ? `${lr.temp}°` : '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>→ {p.target}°F</div>
              <div style={{ marginTop: 5, height: 3, background: 'var(--border)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: stalled ? 'var(--amber)' : COLORS[i], borderRadius: 2, transition: 'width .5s' }} />
              </div>
            </div>
          );
        })}
        <div className="metric">
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2 }}>Smoker</div>
          <div style={{ fontSize: 20, fontWeight: 500 }}>{lastSmok ? `${lastSmok.temp}°` : '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>→ {activeCook.smokerTarget}°F</div>
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ padding: '1rem', marginBottom: '.75rem' }}>
        <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, marginBottom: '.75rem' }}>Temperature over time</div>
        <TempChart cook={activeCook} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: '.5rem' }}>
          {activeCook.probes.map((p, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)' }}>
              <span style={{ width: 12, height: 3, background: COLORS[i], display: 'inline-block', borderRadius: 2 }} />
              {p.name} (→{p.target}°)
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)' }}>
            <span style={{ width: 12, height: 3, background: '#aaa', display: 'inline-block', borderRadius: 2 }} />Smoker
          </span>
        </div>
      </div>

      {/* Log reading */}
      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: '.75rem' }}>Log reading</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: 8, marginBottom: 8 }}>
          {activeCook.probes.map((p, i) => (
            <div key={i}>
              <label className="lbl" style={{ borderBottom: `1.5px solid ${COLORS[i]}`, paddingBottom: 2 }}>{p.name} °F</label>
              <input
                type="number"
                placeholder="—"
                value={entry.temps[i] || ''}
                onChange={e => setEntry(en => ({ ...en, temps: en.temps.map((v, j) => j === i ? e.target.value : v) }))}
              />
            </div>
          ))}
          <div>
            <label className="lbl" style={{ borderBottom: '1.5px solid #aaa', paddingBottom: 2 }}>Smoker °F</label>
            <input
              type="number"
              placeholder="—"
              value={entry.smokerTemp}
              onChange={e => setEntry(en => ({ ...en, smokerTemp: e.target.value }))}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-orange" style={{ flex: 1 }} onClick={onLog}>Log now</button>
          <label className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
            ↑ Import CSV
            <input type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => onCSV(e, activeCook.id)} />
          </label>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 5 }}>ThermoWorks CSV export auto-detected</div>
      </div>

      {/* Inline stages */}
      {guide && (
        <div className="card" style={{ borderColor: 'rgba(186,117,23,.25)', background: 'rgba(186,117,23,.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.625rem' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--amber)' }}>📋 {activeCook.cut} cook stages</div>
            <button className="btn" style={{ fontSize: 11 }} onClick={() => onGoGuide(activeCook.cut)}>Full guide</button>
          </div>
          {guide.stages.map((st, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
              <span className="step-num" style={{ width: 20, height: 20, fontSize: 11 }}>{st.n}</span>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                <span className="mono-pill" style={{ marginRight: 5 }}>{st.t}</span>
                <span style={{ color: 'var(--text2)' }}>{st.w} — </span>{st.a}
              </div>
            </div>
          ))}
          {guide.tip && (
            <div style={{ marginTop: '.5rem', padding: '.625rem', background: 'var(--amber-bg)', borderRadius: 6, fontSize: 12, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 500 }}>Pro tip: </span>{guide.tip}
            </div>
          )}
        </div>
      )}
    </div>
  );
}