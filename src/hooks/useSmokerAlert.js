import { useEffect, useRef } from 'react';

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    // Three short beeps at 880 Hz
    [0, 0.35, 0.7].forEach(offset => {
      osc.frequency.setValueAtTime(880, ctx.currentTime + offset);
      gain.gain.setValueAtTime(0.4, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.25);
    });
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1);
  } catch {
    // AudioContext blocked or unavailable — silent fallback
  }
}

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
        playBeep();
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
