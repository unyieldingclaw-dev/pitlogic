import type { ActiveReading } from './TelemetryModels.js';

export interface ProbeState {
  probeId: string;
  label: string;
  /** Inventory/config metadata — not telemetry-derived. */
  occupancy: 'occupied' | 'empty';
  /** Derived by TelemetryStore from capturedAt delta and readings. */
  status: 'active' | 'disconnected' | 'stale';
  lastReading: ActiveReading | null;
  targetTemp: number | null;
  /** Percent (0-100) from the probe's own battery event. Null until first reported. */
  battery: number | null;
}
