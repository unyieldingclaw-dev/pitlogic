import { useState } from 'react';
import { Share2, Download, Copy, X } from 'lucide-react';
import { captureShareCard, downloadCanvas, copyCanvasToClipboard, svgToDataUrl } from '../utils/shareCard';
import { dur, shortDate, PROBE_COLORS } from '../utils/helpers';

function OffscreenCard({ cook, chartImgUrl, id }) {
  const done = cook.endTime && cook.startTime;
  return (
    <div id={id} style={{
      width: 800, background: '#141410', borderRadius: 16, padding: 32,
      fontFamily: 'Inter, sans-serif', color: '#F5F5F0',
      border: '1px solid rgba(255,107,53,0.2)',
      position: 'fixed', left: -9999, top: -9999,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 32, color: '#FF6B35',
            textShadow: '0 0 20px rgba(255,107,53,0.5)', letterSpacing: '0.05em' }}>PitLogic</div>
          <div style={{ fontSize: 9, letterSpacing: '0.15em', color: '#6B6B65', textTransform: 'uppercase' }}>Cook Tracker</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, fontWeight: 600 }}>{cook.name}</div>
          <div style={{ fontSize: 12, color: '#B5B5AE', marginTop: 4 }}>{shortDate(cook.startTime)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: '0 0 200px' }}>
          {[
            ['Cut', cook.cut],
            ['Meat', cook.meat],
            done && ['Duration', dur(cook.startTime, cook.endTime)],
            ['Smoker', `${cook.smokerTarget}°F`],
          ].filter(Boolean).map(([label, val]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#6B6B65', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, color: '#F5F5F0' }}>{val}</div>
            </div>
          ))}
          {cook.probes.map((p, i) => {
            const last = p.readings.slice(-1)[0];
            return last ? (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#6B6B65', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.name}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, color: PROBE_COLORS[i % PROBE_COLORS.length] }}>{last.temp}°F</div>
              </div>
            ) : null;
          })}
          {cook.rating > 0 && (
            <div>
              <div style={{ fontSize: 10, color: '#6B6B65', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Rating</div>
              <div style={{ fontSize: 18 }}>{'★'.repeat(cook.rating)}{'☆'.repeat(5 - cook.rating)}</div>
            </div>
          )}
        </div>
        <div style={{ flex: 1, background: '#0A0A08', borderRadius: 10, overflow: 'hidden', minHeight: 200 }}>
          {chartImgUrl
            ? <img src={chartImgUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="temp chart" />
            : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#5A5A55', fontSize: 12 }}>No chart data</div>
          }
        </div>
      </div>
      {cook.notes && (
        <div style={{ marginTop: 20, padding: '12px 16px', background: '#1C1C18', borderRadius: 8,
          fontSize: 12, color: '#B5B5AE', borderLeft: '3px solid rgba(255,107,53,0.4)', fontStyle: 'italic' }}>
          {cook.notes.slice(0, 200)}{cook.notes.length > 200 ? '…' : ''}
        </div>
      )}
    </div>
  );
}

export default function ShareButton({ cook, chartContainerRef, flash }) {
  const [working, setWorking] = useState(false);
  const [chartImgUrl, setChartImgUrl] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const CARD_ID = `share-card-${cook.id}`;

  const prepare = () => {
    const url = chartContainerRef?.current ? svgToDataUrl(chartContainerRef.current) : null;
    setChartImgUrl(url);
    setShowPanel(true);
  };

  const handleDownload = async () => {
    setWorking(true);
    try {
      const canvas = await captureShareCard(CARD_ID);
      downloadCanvas(canvas, `${cook.cut.replace(/\s+/g, '-')}-cook.png`);
      flash?.('Downloaded!');
    } catch { flash?.('Download failed'); }
    setWorking(false);
  };

  const handleCopy = async () => {
    setWorking(true);
    try {
      const canvas = await captureShareCard(CARD_ID);
      await copyCanvasToClipboard(canvas);
      flash?.('Copied to clipboard!');
    } catch { flash?.('Copy failed — try Download instead'); }
    setWorking(false);
  };

  return (
    <>
      <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        onClick={prepare}>
        <Share2 size={14} /> Share Cook
      </button>
      {showPanel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 400, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Share This Cook</div>
              <button aria-label="Close share panel" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}
                onClick={() => setShowPanel(false)}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: '1.25rem' }}>
              Generate a shareable image card with your cook stats and temperature graph.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={handleDownload} disabled={working}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Download size={14} /> Download PNG
              </button>
              <button className="btn-ghost" onClick={handleCopy} disabled={working}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Copy size={14} /> Copy
              </button>
            </div>
            {working && <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: 12, color: 'var(--text3)' }}>Generating…</div>}
          </div>
          <OffscreenCard cook={cook} chartImgUrl={chartImgUrl} id={CARD_ID} />
        </div>
      )}
    </>
  );
}
