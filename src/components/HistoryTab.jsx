import { COLORS } from '../utils/helpers';
import { dur, shortDate, elapsed } from '../utils/helpers';

export default function HistoryTab({ cooks, activeId, activeCook, onSelectCook, onNewCook, onGoActive, tick }) {
  return (
    <div className="fadein">
      {activeId && activeCook && (
        <div
          className="card"
          style={{ borderColor: 'var(--amber)', cursor: 'pointer', marginBottom: '1.25rem' }}
          onClick={onGoActive}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontWeight: 500, fontSize: 15 }}>{activeCook.name}</span>
              </div>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                Active · {elapsed(activeCook.startTime)} elapsed
              </span>
            </div>
            <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'var(--amber-bg)', color: 'var(--amber)', fontWeight: 500 }}>
              Monitor →
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Cook history</span>
        <button className="btn-orange" onClick={onNewCook}>+  New cook</button>
      </div>

      {cooks.filter(c => c.status === 'complete').length === 0 && !activeId && (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text2)' }}>
          <div style={{ fontSize: 40, marginBottom: '.5rem' }}>🔥</div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>No cooks yet</div>
          <div style={{ fontSize: 13 }}>Start a new cook or browse the Guide tab</div>
        </div>
      )}

      {cooks.filter(c => c.status === 'complete').map(cook => {
        const allT = cook.probes.flatMap(p => p.readings.map(r => r.temp));
        const peak = allT.length ? Math.max(...allT) : null;
        return (
          <div
            key={cook.id}
            className="card"
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectCook(cook.id)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 2 }}>{cook.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                  {shortDate(cook.startTime)} · {dur(cook.startTime, cook.endTime)} · Smoker {cook.smokerTarget}°F
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                {cook.rating > 0 && (
                  <div style={{ color: 'var(--amber)', fontSize: 13 }}>
                    {'★'.repeat(cook.rating)}{'☆'.repeat(5 - cook.rating)}
                  </div>
                )}
                {peak && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Peak {peak}°F</div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {cook.probes.map((p, i) => {
                const last = p.readings[p.readings.length - 1];
                return (
                  <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bg2)', borderLeft: `2px solid ${COLORS[i]}` }}>
                    {p.name}: {last ? last.temp + '°F' : '—'} / {p.target}°F
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}