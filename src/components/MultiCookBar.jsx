import { PROBE_COLORS } from '../utils/helpers';

export default function MultiCookBar({ activeCooks }) {
  if (!activeCooks || activeCooks.length < 2) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
      background: 'rgba(20,20,16,0.95)', borderBottom: '1px solid rgba(255,107,53,0.2)',
      padding: '6px 1rem', display: 'flex', gap: '1rem', overflowX: 'auto',
      backdropFilter: 'blur(8px)',
    }}>
      {activeCooks.map((cook, ci) => {
        const hotProbe = cook.probes.reduce((best, p) => {
          const last = p.readings.slice(-1)[0];
          const bestLast = best?.readings.slice(-1)[0];
          return last && (!bestLast || last.temp > bestLast.temp) ? p : best;
        }, null);
        const last = hotProbe?.readings.slice(-1)[0];
        return (
          <div key={cook.id} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <span className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{cook.name}</span>
            {last && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: PROBE_COLORS[ci % PROBE_COLORS.length] }}>{last.temp}°F</span>}
          </div>
        );
      })}
    </div>
  );
}
