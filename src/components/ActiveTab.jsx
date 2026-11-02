import { useState } from 'react';
import { Flame, AlertTriangle, CheckCircle } from 'lucide-react';
import { G } from '../data/cuts';
import { PROBE_COLORS, shortDate, elapsed } from '../utils/helpers';
import TempChart from './TempChart';
import NewCookSetup from './NewCookSetup';
import { useMopTimer } from '../hooks/useMopTimer';
import { useProbeAlert } from '../hooks/useProbeAlert';
import { useSmokerAlert } from '../hooks/useSmokerAlert';
import MopTimerBadge from './MopTimerBadge';
import { computeETA, computeStallProbability } from '../utils/analytics';
import LiveIntelligencePanel from './LiveIntelligencePanel';
import StallCoach from './StallCoach';

export default function ActiveTab({
  view, form, setForm,
  cooks, activeCook, entry, setEntry,
  stalls, wrapAlert, coAlert, confirmEnd, setConfirmEnd,
  onStart, onEnd, onLog, onCSV, onGoGuide,
  allActiveCooks, activeCookIdx, setActiveCookIdx, onAddCook, onSprayEvent,
  onUpdateSmokerAlarm,
  prefs, setCutPref, onOpenDevices,
}) {
  const [editingAlarm, setEditingAlarm] = useState(false);
  const [alarmDraft, setAlarmDraft] = useState('');
  const { countdown, alert: mopAlert, dismissSpray } = useMopTimer(activeCook, onSprayEvent);
  useProbeAlert(activeCook);
  const smokerAlert = useSmokerAlert(activeCook);

  if (view === 'new') return <NewCookSetup form={form} onChange={setForm} onStart={onStart} onOpenDevices={onOpenDevices} prefs={prefs} setCutPref={setCutPref} onGoGuide={onGoGuide} />;

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
              <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => onEnd()}>Confirm end</button>
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
        <div role="alert" className="alert alert-amber" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, color: 'var(--amber)', marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 500, marginBottom: 3 }}>Carryover reminder</div>
            <div style={{ color: 'var(--text2)', lineHeight: 1.5, fontSize: 12 }}>
              {activeCook.cut} will rise ~{guide.co}°F after pulling. For target {guide.pull}°F, consider pulling at {guide.pull - guide.co}–{guide.pull - Math.round(guide.co / 2)}°F.
            </div>
          </div>
        </div>
      )}

      {/* Low smoker temp alert */}
      {smokerAlert && (
        <div role="alert" className="alert alert-amber" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, color: 'var(--amber)', marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 500, marginBottom: 3 }}>Smoker temp low</div>
            <div style={{ color: 'var(--text2)', lineHeight: 1.5, fontSize: 12 }}>
              Pit is at {lastSmok?.temp}°F — below the {activeCook.smokerLowAlarm?.threshold}°F alarm threshold. Check your fire or vents.
            </div>
          </div>
        </div>
      )}

      {/* Wrap alert */}
      {wrapAlert && (
        <div role="alert" className="alert alert-green" style={{ marginBottom: '1rem', justifyContent: 'space-between' }}>
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
        <div role="alert" className="alert alert-ember" style={{ marginBottom: '1rem', justifyContent: 'space-between' }}>
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
        borderRadius: 12, padding: '12px 16px', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
        {/* Low alarm row */}
        {activeCook.smokerLowAlarm && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border2)',
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: 'var(--text3)', flex: 1 }}>
              Low alarm:&nbsp;
              <span style={{ color: smokerAlert ? 'var(--amber)' : 'var(--text2)', fontFamily: 'var(--mono)' }}>
                {activeCook.smokerLowAlarm.enabled ? `${activeCook.smokerLowAlarm.threshold}°F` : 'off'}
              </span>
            </span>
            {editingAlarm ? (
              <>
                <input
                  type="number"
                  aria-label="Low alarm threshold"
                  value={alarmDraft}
                  onChange={e => setAlarmDraft(e.target.value)}
                  style={{ width: 64, padding: '3px 6px', fontSize: 12 }}
                />
                <button className="btn-primary" style={{ padding: '3px 10px', fontSize: 12 }}
                  onClick={() => {
                    const t = Number(alarmDraft);
                    if (!isNaN(t) && t > 0) {
                      onUpdateSmokerAlarm(activeCook.id, { ...activeCook.smokerLowAlarm, threshold: t, enabled: true });
                    }
                    setEditingAlarm(false);
                  }}>Save</button>
                <button className="btn" style={{ padding: '3px 10px', fontSize: 12 }}
                  onClick={() => setEditingAlarm(false)}>Cancel</button>
              </>
            ) : (
              <>
                <button className="btn-ghost" style={{ padding: '3px 10px', fontSize: 12 }}
                  onClick={() => { setAlarmDraft(String(activeCook.smokerLowAlarm.threshold)); setEditingAlarm(true); }}>
                  Edit
                </button>
                <button
                  className={activeCook.smokerLowAlarm.enabled ? 'btn' : 'btn-ghost'}
                  style={{ padding: '3px 10px', fontSize: 12 }}
                  aria-pressed={activeCook.smokerLowAlarm.enabled}
                  onClick={() => onUpdateSmokerAlarm(activeCook.id, { ...activeCook.smokerLowAlarm, enabled: !activeCook.smokerLowAlarm.enabled })}>
                  {activeCook.smokerLowAlarm.enabled ? 'On' : 'Off'}
                </button>
              </>
            )}
          </div>
        )}
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
            <div key={i} className={`probe-card${isHot ? ' hot' : ''}`}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 6 }}>{probe.name}</div>
              <div className="temp-card">
                <div className="temp-display" style={{ color: '#FFF5EE', marginBottom: 2 }}>
                  {last ? `${last.temp}°` : '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>→ {probe.target}°F</div>
              </div>
              <div className="progress-track">
                <div className="progress-fill shimmer-bar"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}50, ${color})` }} />
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
            <input type="file" accept=".csv,.txt" multiple style={{ display: 'none' }} onChange={e => onCSV(e, activeCook.id)} />
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
