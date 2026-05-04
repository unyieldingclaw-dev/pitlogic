import { computeClimbRate, computeETA, computeStallProbability } from '../utils/analytics';

export default function LiveIntelligencePanel({ probes }) {
  const activeProbes = probes.filter(p => p.readings.length >= 3);
  if (activeProbes.length === 0) return null;

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1rem', marginTop: '1rem' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        Live Intelligence
      </div>
      {activeProbes.map((probe, i) => {
        const rate = computeClimbRate(probe.readings);
        const eta = computeETA(probe.readings, probe.target ?? 203);
        const stall = computeStallProbability(probe.readings);
        const dotsLit = stall.pct === 0 ? 1 : stall.pct === 50 ? 3 : 5;
        const dotColor = stall.level === 'low' ? 'var(--green)' : 'var(--amber)';

        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
            {/* Probe name */}
            <div style={{ minWidth: 80, fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
              {probe.name}
            </div>
            {/* Climb rate */}
            <div style={{ minWidth: 72, textAlign: 'right' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 14,
                color: rate === null ? 'var(--text3)' : rate > 0 ? 'var(--ember)' : 'var(--text2)' }}>
                {rate === null ? '—' : `${rate > 0 ? '+' : ''}${rate}°/hr`}
              </span>
            </div>
            {/* ETA */}
            <div style={{ minWidth: 72, textAlign: 'right' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)' }}>
                {eta === null ? '' : eta === 0 ? 'Done' : `~${eta}m`}
              </span>
            </div>
            {/* Stall probability dots */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 'auto' }}>
              {[1,2,3,4,5].map(d => (
                <span key={d} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  display: 'inline-block',
                  background: d <= dotsLit ? dotColor : 'var(--text3)',
                  opacity: d <= dotsLit ? 1 : 0.25,
                  transition: 'background 0.4s, opacity 0.4s',
                }} />
              ))}
              <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 4 }}>
                {stall.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
