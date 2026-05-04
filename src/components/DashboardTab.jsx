import { Flame, Clock, Star, ChevronRight, Plus } from 'lucide-react';
import { dur, shortDate, PROBE_COLORS } from '../utils/helpers';

function StatPill({ label, value }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1rem', textAlign: 'center', flex: 1 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 500, color: 'var(--ember)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
    </div>
  );
}

function RecentCard({ cook, onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1rem', cursor: 'pointer', minWidth: 160,
      transition: 'border-color .15s', textAlign: 'left', fontFamily: 'inherit' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ember)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{shortDate(cook.startTime)}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{cook.cut}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {[1,2,3,4,5].map(s => (
          <span key={s} style={{ color: s <= cook.rating ? 'var(--amber)' : 'var(--ash)', fontSize: 12 }}>★</span>
        ))}
      </div>
      {cook.endTime && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--mono)' }}>{dur(cook.startTime, cook.endTime)}</div>}
    </button>
  );
}

export default function DashboardTab({ cooks, activeId, activeCook, allActiveCooks, tick, onGoActive, onNewCook, onSelectCook }) {
  const activeCooks = allActiveCooks?.length > 0 ? allActiveCooks : (activeCook ? [activeCook] : []);
  const completed = cooks.filter(c => c.status === 'complete');
  const totalHours = completed.reduce((acc, c) => acc + (c.endTime && c.startTime ? (c.endTime - c.startTime) : 0), 0);
  const cutCounts = completed.reduce((a, c) => { a[c.cut] = (a[c.cut] || 0) + 1; return a; }, {});
  const favCut = Object.entries(cutCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';
  const recent = [...completed].sort((a, b) => b.startTime - a.startTime).slice(0, 4);

  return (
    <div className="fadein">
      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem' }}>
        <StatPill label="Total Cooks" value={completed.length} />
        <StatPill label="Hours Smoked" value={Math.round(totalHours / 3600000)} />
        <StatPill label="Fav Cut" value={favCut.length > 8 ? favCut.slice(0,7)+'…' : favCut} />
      </div>

      {/* Active cook cards (one per active cook) */}
      {activeCooks.map(cook => (
        <button key={cook.id} onClick={() => onGoActive(cook.id)} style={{
          background: 'var(--surface)', border: '1px solid rgba(255,107,53,0.4)',
          borderRadius: 14, padding: '1.25rem', marginBottom: '1rem', cursor: 'pointer',
          boxShadow: '0 0 24px rgba(255,107,53,0.12)',
          width: '100%', textAlign: 'left', fontFamily: 'inherit',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ember)' }}>ACTIVE COOK</span>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text2)' }}>{dur(cook.startTime)}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 10 }}>{cook.name}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {cook.probes.map((p, i) => {
              const last = p.readings.slice(-1)[0];
              return (
                <div key={i} style={{ background: 'var(--surface-raised)', borderRadius: 8, padding: '6px 12px',
                  border: `1px solid ${PROBE_COLORS[i % PROBE_COLORS.length]}40` }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 18, color: PROBE_COLORS[i % PROBE_COLORS.length] }}>
                    {last ? `${last.temp}°` : '—'}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, color: 'var(--ember)', fontSize: 13 }}>
            <span>Monitor cook</span><ChevronRight size={14} />
          </div>
        </button>
      ))}
      {activeCooks.length > 0 && <div style={{ marginBottom: '0.5rem' }} />}

      {/* Quick start */}
      {activeCooks.length === 0 && (
        <button className="btn-primary" onClick={onNewCook}
          style={{ width: '100%', marginBottom: '1.5rem', padding: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15 }}>
          <Flame size={18} /> Start New Cook
        </button>
      )}

      {/* Recent cooks */}
      {recent.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text2)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Recent Cooks</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
            {recent.map(c => <RecentCard key={c.id} cook={c} onClick={() => onSelectCook(c.id)} />)}
          </div>
        </>
      )}

      {cooks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text3)' }}>
          <Flame size={48} style={{ color: 'var(--ember)', opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>No cooks yet</div>
          <div style={{ fontSize: 13 }}>Start your first cook to see stats here.</div>
        </div>
      )}
    </div>
  );
}
