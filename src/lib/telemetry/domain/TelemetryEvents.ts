import type { ActiveReading, DisconnectedReading } from './TelemetryModels.js';
import type { RejectedPayloadMetadata } from './RejectedPayload.js';

interface ProviderConnectedEvent {
  type: 'provider:connected';
  providerId: string;
  timestamp: number;
}

interface ProviderDisconnectedEvent {
  type: 'provider:disconnected';
  providerId: string;
  timestamp: number;
}

interface ProviderErrorEvent {
  type: 'provider:error';
  providerId: string;
  error: string;
  timestamp: number;
}

interface ProbeReadingEvent {
  type: 'probe:reading';
  reading: ActiveReading;
}

interface ProbeDisconnectedEvent {
  type: 'probe:disconnected';
  reading: DisconnectedReading;
}

interface SessionStartedEvent {
  type: 'session:started';
  sessionId: string;
  timestamp: number;
}

interface SessionEndedEvent {
  type: 'session:ended';
  sessionId: string;
  timestamp: number;
}

interface ProbeErrorEvent {
  type: 'probe:error';
  probeId: string;
  error: string;
  timestamp: number;
}

interface NormalizationRejectedEvent {
  type: 'normalization:rejected';
  payload: RejectedPayloadMetadata;
  timestamp: number;
}

export type NormalizedTelemetryEvent =
  | ProviderConnectedEvent
  | ProviderDisconnectedEvent
  | ProviderErrorEvent
  | ProbeReadingEvent
  | ProbeDisconnectedEvent
  | SessionStartedEvent
  | SessionEndedEvent
  | ProbeErrorEvent
  | NormalizationRejectedEvent;
