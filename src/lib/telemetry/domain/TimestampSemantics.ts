export interface TelemetryTimestamp {
  /** Device/provider observation — authoritative cook timeline. */
  capturedAt: number;
  /** Adapter ingress time. */
  receivedAt: number;
  /** Normalization completion time. */
  normalizedAt: number;
  /** Optional store commit time. */
  persistedAt?: number;
}
