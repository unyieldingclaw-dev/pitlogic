import type { ProbeState } from '../domain/ProbeSemantics.js';
import type { GatewayState } from '../domain/GatewayState.js';

export const STALE_THRESHOLD_MS = 30_000;

export interface TelemetryStoreState {
  probes: Map<string, ProbeState>;
  gatewayState: Map<string, GatewayState>;
}
