import { Thermometer, AlertTriangle, CheckCircle } from 'lucide-react';

const STALL_BARS = [
  { label: 'Brisket',        time: 'up to 7 hrs', width: 95, color: 'var(--red)'   },
  { label: 'Pork shoulder',  time: 'up to 5 hrs', width: 80, color: 'var(--amber)' },
  { label: 'Short ribs',     time: '2–3 hrs',      width: 55, color: 'var(--blue)'  },
  { label: 'Pork ribs',      time: '1–2 hrs',      width: 40, color: 'var(--green)' },
  { label: 'Poultry & fish', time: 'minimal',       width: 8,  color: 'var(--text3)' },
];

const STALL_WAYS = [
  ['Texas Crutch',  'Wrap in pink butcher paper at 160–165°F. Stops evaporation. Butcher paper preserves bark; foil is faster but softer.'],
  ['Run hotter',    'Raise Traeger to 275–300°F to overpower evaporative cooling. Works great for pork shoulder.'],
  ['Wait it out',   'The surface eventually dries, evaporation slows, and temp resumes. Best bark — but build 2+ extra hours into your plan.'],
];

const STALL_FACTORS = [
  ['More airflow',        'Stall starts earlier (~150°F), faster evaporation'],
  ['Water pan in smoker', 'Humid air slows evaporation, shortens stall'],
  ['Larger cut',          'More surface area = longer stall'],
  ['Higher pit temp',     'Shorter stall — heat overwhelms cooling effect'],
  ['Humid weather',       'Can prolong the stall'],
];

export default function StallCard() {
  return (
    <div className="card" style={{ marginTop: '1.5rem', borderColor: 'rgba(245,158,11,0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, fontSize: 14, marginBottom: '.75rem' }}>
        <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />
        Understanding the stall
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text2)', marginBottom: '.75rem' }}>
        The stall is a temperature plateau between 150–170°F where internal temp stops rising — sometimes for hours.
        Caused entirely by evaporative cooling: the meat sweats, and evaporation carries away as much heat as the smoker adds.
      </div>

      {STALL_BARS.map((b, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13 }}>
          <span style={{ minWidth: 120, color: 'var(--text)' }}>{b.label}</span>
          <div style={{ flex: 1, height: 5, background: 'var(--surface-raised)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: b.width + '%', background: b.color, borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 55, textAlign: 'right' }}>{b.time}</span>
        </div>
      ))}

      <hr className="divider" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>
        <CheckCircle size={14} style={{ color: 'var(--green)' }} /> Three ways to handle it
      </div>
      {STALL_WAYS.map(([t, d], i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
          <span className="step-num">{i + 1}</span>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 500 }}>{t} — </span>{d}
          </div>
        </div>
      ))}

      <hr className="divider" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>
        <Thermometer size={14} style={{ color: 'var(--ember)' }} /> What affects stall length
      </div>
      {STALL_FACTORS.map(([factor, effect], i) => (
        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, padding: '5px 0', borderBottom: '0.5px solid var(--border)' }}>
          <span style={{ minWidth: 150, fontWeight: 500 }}>{factor}</span>
          <span style={{ color: 'var(--text2)' }}>{effect}</span>
        </div>
      ))}
    </div>
  );
}
