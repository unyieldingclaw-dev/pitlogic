import type { ProbeState } from '../domain/ProbeSemantics.js';

export const STALE_THRESHOLD_MS = 30_000;

export interface TelemetryStoreState {
  probes: Map<string, ProbeState>;
}
