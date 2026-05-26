import { useEffect, useRef } from 'react';

export function useProbeAlert(activeCook) {
  const firedRef = useRef(new Set());

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    firedRef.current = new Set();
  }, [activeCook?.id]);

  const totalReadings = activeCook?.probes.reduce((sum, p) => sum + p.readings.length, 0) ?? 0;

  useEffect(() => {
    if (!activeCook) return;
    activeCook.probes.forEach((probe) => {
      if (!probe.target || probe.target <= 0) return;
      const key = `${activeCook.id}:${probe.id}`;
      if (firedRef.current.has(key)) return;
      const last = probe.readings[probe.readings.length - 1];
      if (!last || last.temp < probe.target) return;
      firedRef.current.add(key);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`PitLogic — ${probe.name} at target!`, {
          body: `${probe.name} reached ${probe.target}°F`,
          icon: '/favicon.svg',
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCook?.id, totalReadings]);
}
