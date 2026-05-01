export const COLORS = [
  "#E24B4A","#378ADD","#639922",
  "#BA7517","#9340C4","#1BA39C"
];

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