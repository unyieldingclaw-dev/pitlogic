import { useState, useEffect } from 'react';
import { globalStore } from '../lib/telemetry/store/globalStore.js';

export function useLiveProbes() {
  const [probes, setProbes] = useState(() => new Map(globalStore.getProbes()));

  // Empty deps: globalStore is a stable module-level singleton and this hook is
  // mounted once at the App root, so there's no dependency that would ever change.
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
