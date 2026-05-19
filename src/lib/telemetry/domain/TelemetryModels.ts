import type { TelemetryTimestamp } from './TimestampSemantics.js';

export type ReadingSource = 'live' | 'csv-import' | 'manual' | 'replay' | 'synthetic';

export interface NormalizedTemperature {
  /** Canonical internal value — always °F. */
  valueF: number;
  providerUnit: 'F' | 'C';
  providerValue: number;
  normalizedBy: 'provider' | 'normalizer';
}

interface BaseReading {
  probeId: string;
  source: ReadingSource;
  timestamp: TelemetryTimestamp;
}

export interface ActiveReading extends BaseReading {
  status: 'active';
  temp: NormalizedTemperature;
}

export interface DisconnectedReading extends BaseReading {
  status: 'disconnected';
}

export type NormalizedReading = ActiveReading | DisconnectedReading;
