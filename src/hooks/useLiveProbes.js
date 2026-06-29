import { useState, useEffect } from 'react';
import { globalStore } from '../lib/telemetry/store/globalStore.js';

export function useLiveProbes() {
  const [probes, setProbes] = useState(() => new Map(globalStore.getProbes()));

  useEffect(() => {
    globalStore.startStaleCheck();
    const unsub = globalStore.subscribe(p => setProbes(new Map(p)));
    return () => {
      unsub();
      globalStore.stopStaleCheck();
    };
  }, []);

  return probes;
}
