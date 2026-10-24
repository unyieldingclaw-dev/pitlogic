import { useEffect, useState } from 'react';

export default function ProbeFreshness({ probe, style }) {
  const capturedAt = probe.lastReading?.timestamp.capturedAt;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (capturedAt == null) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [capturedAt]);

  const status = probe.status === 'active' ? 'Live' : probe.status === 'stale' ? 'Stale' : 'Disconnected';
  if (capturedAt == null) return <span style={style}>{status} · no reading</span>;

  const observedNow = Math.max(now, probe.lastReading.timestamp.receivedAt ?? now);
  const seconds = Math.max(0, Math.floor((observedNow - capturedAt) / 1000));
  const age = seconds < 60 ? `${seconds}s` : seconds < 3600 ? `${Math.floor(seconds / 60)}m` : `${Math.floor(seconds / 3600)}h`;
  return <span style={style}>{status} · {age} ago</span>;
}
