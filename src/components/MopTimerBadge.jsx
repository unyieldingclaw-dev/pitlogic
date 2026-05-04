import { Droplets } from 'lucide-react';

export default function MopTimerBadge({ countdown, alert, label, onDismiss }) {
  if (!countdown) return null;
  return (
    <>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: alert ? 'rgba(245,158,11,0.15)' : 'var(--surface-raised)',
        border: `1px solid ${alert ? 'var(--amber)' : 'var(--border2)'}`,
        borderRadius: 20, padding: '5px 12px', fontSize: 12,
        color: alert ? 'var(--amber)' : 'var(--text2)',
        transition: 'all .3s',
      }}>
        <Droplets size={13} />
        {alert ? `Spray time! ${label || ''}` : `Spray in ${countdown}`}
      </div>
      {alert && (
        <div role="alert" className="alert alert-amber fadein" style={{ marginTop: '0.75rem' }}>
          <Droplets size={18} style={{ flexShrink: 0, color: 'var(--amber)', marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Time to spray!</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{label || 'Apply your mop/spray'}</div>
          </div>
          <button className="btn" style={{ fontSize: 12 }} onClick={onDismiss}>Done ✓</button>
        </div>
      )}
    </>
  );
}
