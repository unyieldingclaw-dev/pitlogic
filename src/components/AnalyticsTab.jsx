import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { BarChart2, Flame, Clock, Star, TrendingUp } from 'lucide-react';
import { totalStats, cooksByMonth, stallPrediction } from '../utils/analytics';
import { MEATS } from '../data/meats';
import { useState } from 'react';

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <Icon size={20} style={{ color: 'var(--ember)', marginBottom: 8 }} />
      <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsTab({ cooks }) {
  const [selectedCut, setSelectedCut] = useState('Brisket');
  const stats = totalStats(cooks);
  const monthly = cooksByMonth(cooks);
  const stall = stallPrediction(cooks, selectedCut);
  const allCuts = Object.values(MEATS).flat();

  if (cooks.filter(c=>c.status==='complete').length === 0) {
    return (
      <div className="fadein" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text3)' }}>
        <BarChart2 size={48} style={{ color: 'var(--ember)', opacity: 0.3, marginBottom: 12 }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>No data yet</div>
        <div style={{ fontSize: 13 }}>Complete a few cooks to see your personal analytics.</div>
      </div>
    );
  }

  return (
    <div className="fadein">
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginBottom: '1.25rem',
        letterSpacing: '0.03em' }}>Your Stats</div>

      <div className="g2" style={{ marginBottom: '1.5rem' }}>
        <StatCard icon={Flame} label="Total Cooks" value={stats.total} />
        <StatCard icon={Clock} label="Hours Smoked" value={`${Math.round(stats.totalHours)}h`} />
        <StatCard icon={TrendingUp} label="Favorite Cut" value={stats.favCut.length > 10 ? stats.favCut.slice(0,9)+'…' : stats.favCut} />
        <StatCard icon={Star} label="Avg Rating" value={stats.avgRating} sub="out of 5" />
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text2)',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Cooks Per Month</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={monthly} barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--ash)" tick={{ fill: 'var(--text3)', fontSize: 10 }} />
            <YAxis allowDecimals={false} stroke="var(--ash)" tick={{ fill: 'var(--text3)', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" fill="var(--ember)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text2)',
            textTransform: 'uppercase', letterSpacing: '0.1em' }}>Stall Prediction</div>
          <select value={selectedCut} onChange={e => setSelectedCut(e.target.value)}
            style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}>
            {allCuts.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {stall ? (
          <div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              Based on {stall.sampleSize} past {selectedCut} cook{stall.sampleSize > 1 ? 's' : ''}:
            </div>
            <div className="g2">
              <div className="metric">
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Typical Stall Temp</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 22, color: 'var(--ember)' }}>{stall.avgTemp}°F</div>
              </div>
              <div className="metric">
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Avg Stall Duration</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 22, color: 'var(--amber)' }}>{stall.avgDurMin} min</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text3)', padding: '0.5rem 0' }}>
            Need at least 2 completed {selectedCut} cooks to predict your stall pattern.
          </div>
        )}
      </div>
    </div>
  );
}
