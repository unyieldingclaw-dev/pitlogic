import { useEffect, useRef } from 'react';

export function useSmokerAlert(activeCook) {
  const belowRef = useRef(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    belowRef.current = false;
  }, [activeCook?.id]);

  const alarm = activeCook?.smokerLowAlarm;
  const smokerReadings = activeCook?.smokerReadings ?? [];
  const totalSmoker = smokerReadings.length;
  const lastSmok = smokerReadings[totalSmoker - 1];

  useEffect(() => {
    if (!alarm?.enabled || !lastSmok) return;
    if (lastSmok.temp < alarm.threshold) {
      if (!belowRef.current) {
        belowRef.current = true;
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('PitLogic — Smoker temp low!', {
            body: `Pit dropped to ${lastSmok.temp}°F (alarm: ${alarm.threshold}°F)`,
            icon: '/favicon.svg',
          });
        }
      }
    } else {
      belowRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCook?.id, totalSmoker]);

  return Boolean(alarm?.enabled && lastSmok && lastSmok.temp < alarm.threshold);
}
