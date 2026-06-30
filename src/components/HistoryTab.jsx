import { Clock, Flame, ChevronRight } from 'lucide-react';
import { PROBE_COLORS } from '../utils/helpers';
import { dur, shortDate, elapsed } from '../utils/helpers';


export default function HistoryTab({ cooks, activeId, activeCook, onSelectCook, onNewCook, onGoActive }) {
  return (
    <div className="fadein">
      {activeId && activeCook && (
        <button
          className="card card-interactive"
          style={{ borderColor: 'rgba(255,107,53,0.35)', cursor: 'pointer', marginBottom: '1.25rem',
            width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
          onClick={onGoActive}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span className="live-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ember)', display: 'inline-block' }} />
                <span style={{ fontWeight: 500, fontSize: 15 }}>{activeCook.name}</span>
              </div>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                Active · {elapsed(activeCook.startTime)} elapsed
              </span>
            </div>
            <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20,
              background: 'rgba(255,107,53,0.12)', color: 'var(--ember)', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 4 }}>
              Monitor <ChevronRight size={12} />
            </span>
          </div>
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, letterSpacing: '0.03em' }}>Cook History</span>
        <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={onNewCook}>+ New Cook</button>
      </div>

      {cooks.filter(c => c.status === 'complete').length === 0 && !activeId && (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text2)' }}>
          <Flame size={40} style={{ color: 'var(--ember)', opacity: 0.4, marginBottom: 12 }} />
          <div style={{ fontWeight: 500, marginBottom: 4 }}>No cooks yet</div>
          <div style={{ fontSize: 13 }}>Start a new cook or browse the Guide tab</div>
        </div>
      )}

      {cooks.filter(c => c.status === 'complete').map(cook => {
        const allT = cook.probes.flatMap(p => p.readings.map(r => r.temp));
        const peak = allT.length ? Math.max(...allT) : null;
        return (
          <button
            key={cook.id}
            className="card card-interactive"
            style={{ cursor: 'pointer', marginBottom: '.75rem', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
            onClick={() => onSelectCook(cook.id)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 2 }}>{cook.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={11} />
                  {shortDate(cook.startTime)} · {dur(cook.startTime, cook.endTime)} · {cook.smokerTarget}°F
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                {cook.rating > 0 && (
                  <div style={{ color: 'var(--amber)', fontSize: 13, letterSpacing: 1 }}>
                    {'★'.repeat(cook.rating)}{'☆'.repeat(5 - cook.rating)}
                  </div>
                )}
                {peak && (
                  <div className="gradient-text" style={{ fontSize: 11, marginTop: 2, fontFamily: 'var(--mono)' }}>
                    Peak {peak}°F
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {cook.probes.map((p, i) => {
                const last = p.readings[p.readings.length - 1];
                return (
                  <span key={i} style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 4,
                    background: 'var(--surface-raised)',
                    borderLeft: `2px solid ${PROBE_COLORS[i % PROBE_COLORS.length]}`,
                    color: 'var(--text2)',
                  }}>
                    {p.name}: {last ? last.temp + '°F' : '—'} / {p.target}°F
                  </span>
                );
              })}
            </div>
            {(cook.weight || cook.pellet || cook.equipment) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {cook.weight && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--surface-raised)', color: 'var(--text3)' }}>
                    {cook.weight} lbs
                  </span>
                )}
                {cook.pellet && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--surface-raised)', color: 'var(--text3)' }}>
                    {cook.pellet}
                  </span>
                )}
                {cook.equipment && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--surface-raised)', color: 'var(--text3)' }}>
                    {cook.equipment}
                  </span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
