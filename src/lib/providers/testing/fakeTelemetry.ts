import type { RawProviderEvent } from '../core/ProviderTypes.js';
import type { ActiveReading, DisconnectedReading } from '../../telemetry/domain/TelemetryModels.js';
import type { TelemetryTimestamp } from '../../telemetry/domain/TimestampSemantics.js';

function makeTimestamp(capturedAt = Date.now()): TelemetryTimestamp {
  return { capturedAt, receivedAt: capturedAt, normalizedAt: capturedAt };
}

export function fakeActiveEvent(probeId: string, tempF: number, capturedAt = Date.now()): RawProviderEvent {
  return { probeId, status: 'active', temperature: tempF, unit: 'F', capturedAt, source: 'synthetic' };
}

export function fakeDisconnectedEvent(probeId: string, capturedAt = Date.now()): RawProviderEvent {
  return { probeId, status: 'disconnected', capturedAt, source: 'synthetic' };
}

export function fakeActiveReading(probeId: string, tempF: number, capturedAt = Date.now()): ActiveReading {
  return {
    probeId,
    source: 'synthetic',
    status: 'active',
    temp: { valueF: tempF, providerUnit: 'F', providerValue: tempF, normalizedBy: 'provider' },
    timestamp: makeTimestamp(capturedAt),
  };
}

export function fakeDisconnectedReading(probeId: string, capturedAt = Date.now()): DisconnectedReading {
  return {
    probeId,
    source: 'synthetic',
    status: 'disconnected',
    timestamp: makeTimestamp(capturedAt),
  };
}
