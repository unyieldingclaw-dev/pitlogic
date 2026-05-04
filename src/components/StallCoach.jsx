import { useState } from 'react';
import { stallPrediction } from '../utils/analytics';

export default function StallCoach({ activeCook, stalls, cooks, stallProbs, onDismiss }) {
  const [showRunHotterTip, setShowRunHotterTip] = useState(false);

  const hasStall = Object.keys(stalls).length > 0;
  const isApproaching = !hasStall && Object.values(stallProbs).some(p => p?.level === 'approaching');

  if (!hasStall && !isApproaching) return null;

  const prediction = stallPrediction(cooks, activeCook.cut);

  if (isApproaching) {
    return (
      <div className="stall-approaching" style={{
        borderLeft: '4px solid rgba(245,158,11,0.7)',
        borderRadius: 10, padding: '1rem', marginBottom: '1rem',
        background: 'rgba(245,158,11,0.06)',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--amber)',
          marginBottom: 6 }}>
          Entering Stall Zone
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          {prediction
            ? `Based on your last ${prediction.sampleSize} ${activeCook.cut} cooks, expect ~${prediction.avgDurMin} min at ~${prediction.avgTemp}°F.`
            : 'Temp plateauing in the stall zone. Keep an eye on it.'
          }
        </div>
      </div>
    );
  }

  // Confirmed stall
  const stallKey = Object.keys(stalls)[0];
  const probeIdx = parseInt(stallKey, 10);
  const probeReadings = activeCook.probes[probeIdx]?.readings ?? [];
  const stallWindow = probeReadings.slice(-4);
  const stallDurMin = stallWindow.length >= 2
    ? stallWindow[stallWindow.length - 1].time - stallWindow[0].time
    : null;

  return (
    <div className="stall-coach-active" style={{
      border: '1px solid rgba(245,158,11,0.5)',
      borderRadius: 12, padding: '1rem', marginBottom: '1rem',
      background: 'rgba(245,158,11,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--amber)' }}>
          ⏸ Stall Detected
        </div>
        {stallDurMin !== null && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)' }}>
            {stallDurMin} min in stall
          </span>
        )}
      </div>
      {prediction && (
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
          Historical avg: ~{prediction.avgDurMin} min at ~{prediction.avgTemp}°F
          {' '}({prediction.sampleSize} {activeCook.cut} cooks)
        </div>
      )}
      {showRunHotterTip && (
        <div style={{ fontSize: 12, color: 'var(--text3)', background: 'var(--surface-raised)',
          borderRadius: 8, padding: '6px 10px', marginBottom: 10 }}>
          Bump smoker 15–20°F to push through faster.
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => onDismiss('dismiss_wrap')}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface-raised)',
            color: 'var(--text)', cursor: 'pointer' }}>
          Wrap now
        </button>
        <button onClick={() => setShowRunHotterTip(v => !v)}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface-raised)',
            color: 'var(--text)', cursor: 'pointer' }}>
          Run hotter
        </button>
        <button onClick={() => onDismiss(`dismiss_stall_${stallKey}`)}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8,
            border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)',
            color: 'var(--amber)', cursor: 'pointer' }}>
          Wait it out
        </button>
      </div>
    </div>
  );
}
