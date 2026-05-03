import { BookOpen, ChevronRight, Flame } from 'lucide-react';
import { MEATS } from '../data/meats';
import { G } from '../data/cuts';

export default function GuideTab({ guideKey, setGuideKey, guideCat, setGuideCat, onStartCook }) {
  const guide = G[guideKey];

  return (
    <div className="fadein">
      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1rem', overflowX: 'auto', paddingBottom: 2 }}>
        {Object.keys(MEATS).map(cat => (
          <button
            key={cat}
            className={`nav-tab${cat === guideCat ? ' active' : ''}`}
            style={{ flexShrink: 0 }}
            onClick={() => { setGuideCat(cat); setGuideKey(MEATS[cat][0]); }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1rem' }}>
        {/* Cut list */}
        <div>
          {(MEATS[guideCat] || []).map(cut => (
            <div
              key={cut}
              className={`guide-cut${cut === guideKey ? ' active' : ''}`}
              onClick={() => setGuideKey(cut)}
            >
              {cut}
            </div>
          ))}
        </div>

        {/* Guide detail */}
        {guide && (
          <div>
            {/* Title + badges */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, marginBottom: 8 }}>{guideKey}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="badge badge-amber">Pull: {guide.pull}°F</span>
                {guide.wrap && <span className="badge badge-green">Wrap: {guide.wrap}°F</span>}
                {guide.stall && (
                  <span className="badge" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--amber)' }}>
                    Stall: {guide.sr}
                  </span>
                )}
                {guide.co && <span className="badge" style={{ background: 'var(--surface-raised)', color: 'var(--text2)' }}>Carryover: ~{guide.co}°F</span>}
              </div>
            </div>

            {/* Pellets */}
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '0.5px solid rgba(245,158,11,0.2)',
              borderRadius: 10, padding: '.875rem', marginBottom: '.875rem' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--amber)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flame size={13} /> Pellet recommendation
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {guide.p.map(p => <span key={p} className="badge badge-amber">{p}</span>)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{guide.pn}</div>
            </div>

            {/* Traeger stages */}
            <div style={{ marginBottom: '.875rem' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase',
                letterSpacing: '.04em', marginBottom: '.625rem' }}>
                Traeger stages
              </div>
              {guide.stages.map((st, i) => (
                <div key={i} className="stage-block">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span className="step-num">{st.n}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span className="mono-pill">{st.t}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>· {st.d}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--amber)', marginBottom: 3 }}>When: {st.w}</div>
                      <div style={{ fontSize: 13, lineHeight: 1.6 }}>{st.a}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stall warning */}
            {guide.stall && (
              <div className="alert alert-amber" style={{ marginBottom: '.875rem' }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 3 }}>Stall expected</div>
                  <div style={{ color: 'var(--text2)', lineHeight: 1.5, fontSize: 13 }}>
                    Expect a stall at {guide.sr} lasting {guide.sd}. Your RFX graph will show a flat line — the app auto-detects it and will alert you. Options: wrap, run hotter (275–300°F), or wait it out.
                  </div>
                </div>
              </div>
            )}

            {/* Pro tip */}
            {guide.tip && (
              <div className="card" style={{ marginBottom: '.875rem' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', marginBottom: 4,
                  textTransform: 'uppercase', letterSpacing: '.04em' }}>Pro tip</div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>{guide.tip}</div>
              </div>
            )}

            {/* Probe placement */}
            <div style={{ marginBottom: '.875rem' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase',
                letterSpacing: '.04em', marginBottom: 8 }}>
                RFX probe placement
              </div>
              <div className="card" style={{ fontSize: 13, lineHeight: 1.7 }}>
                {guide.pull <= 145
                  ? 'Insert probe horizontally into the thickest part of the meat, parallel to any bone structure. For fish and poultry, aim for geometric center and avoid touching bone.'
                  : guide.stall
                  ? 'Insert probe parallel to the grain into the thickest part. For brisket or shoulder, aim for geometric center — the 4 independent sensors in the RFX average to find true thermal center.'
                  : 'Insert probe into the thickest part, away from any bone. Bone conducts heat differently and will give falsely high readings. The RFX 2.8mm tip makes precise placement easy.'
                }
              </div>
            </div>

            {/* Start cook button */}
            <button
              className="btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={() => onStartCook(guideKey)}
            >
              Start this cook <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
