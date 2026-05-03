import { useState, useEffect, useRef, useCallback } from 'react';

export function useMopTimer(activeCook, onSprayEvent) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [alert, setAlert] = useState(false);
  const intervalRef = useRef(null);

  const mop = activeCook?.mopTimer;
  const enabled = mop?.enabled && mop?.intervalMin > 0;

  useEffect(() => {
    if (!enabled) { setSecondsLeft(null); setAlert(false); return; }
    const totalSecs = mop.intervalMin * 60;
    const lastEvent = mop.events?.slice(-1)[0];
    const lastTs = lastEvent?.ts ?? activeCook.startTime;
    const elapsed = Math.floor((Date.now() - lastTs) / 1000);
    const remaining = Math.max(0, totalSecs - elapsed);
    setSecondsLeft(remaining);
    if (remaining === 0) setAlert(true);
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { setAlert(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [enabled, activeCook?.id, mop?.events?.length]);

  const dismissSpray = useCallback(() => {
    setAlert(false);
    if (activeCook && mop?.enabled) onSprayEvent(activeCook.id);
  }, [activeCook, mop, onSprayEvent]);

  const fmt = s => {
    if (s == null) return null;
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return { countdown: fmt(secondsLeft), alert, dismissSpray };
}
