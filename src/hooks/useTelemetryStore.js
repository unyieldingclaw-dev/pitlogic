// Second file (with useThermoWorksProvider.js) permitted to import from src/lib/telemetry/ per ADR-001.
// Does not import from src/lib/providers/ — read-only consumer of already-materialized store state.
import { useEffect, useState } from 'react';
// Aliased on import: globalStore.ts exports a single app-wide singleton, shared with
// useLiveProbes.js's live-readings pipeline — both hooks must observe the same instance.
import { globalStore as globalTelemetryStore } from '../lib/telemetry/store/globalStore.js';

export function useTelemetryStore() {
  const [probes, setProbes] = useState(() => globalTelemetryStore.getProbes());
  const [gatewayState, setGatewayState] = useState(() => globalTelemetryStore.getGatewayState());

  useEffect(() => {
    globalTelemetryStore.startStaleCheck();
    const unsub = globalTelemetryStore.subscribe(nextProbes => {
      setProbes(nextProbes);
      setGatewayState(globalTelemetryStore.getGatewayState());
    });
    return unsub;
  }, []);

  return { probes, gatewayState };
}
