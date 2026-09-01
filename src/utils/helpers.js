export const COLORS = [
  "#E24B4A","#378ADD","#639922",
  "#BA7517","#9340C4","#1BA39C"
];

export const PROBE_COLORS = ["#FF6B35","#60A5FA","#4ADE80","#FBBF24","#C084FC","#34D399"];

export const dur = (s, e) => {
  const ms = (e || Date.now()) - s;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const elapsed = s => {
  const ms = Date.now() - s;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return h > 0
    ? `${h}h ${String(m).padStart(2,'0')}m`
    : `${m}m ${String(sec).padStart(2,'0')}s`;
};

export const shortDate = ts =>
  new Date(ts).toLocaleDateString([], {
    month: 'short', day: 'numeric', year: 'numeric'
  });

export const probeStatusColor = status =>
  status === 'active' ? 'var(--green)' : status === 'stale' ? 'var(--amber)' : 'var(--text3)';

export const probeStatusBorderColor = status =>
  status === 'active' ? 'rgba(16,185,129,0.3)' : status === 'stale' ? 'rgba(245,158,11,0.3)' : 'var(--border)';