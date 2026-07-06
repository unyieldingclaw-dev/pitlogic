import type { NormalizedTelemetryEvent } from '../domain/TelemetryEvents.js';
import type { ActiveReading, DisconnectedReading } from '../domain/TelemetryModels.js';
import type { TelemetryTimestamp } from '../domain/TimestampSemantics.js';
import {
  RawActiveReadingSchema,
  RawDisconnectedReadingSchema,
  RawGatewayStateSchema,
  RawProbeBatterySchema,
} from './schemas.js';
import { normalizeTemperature } from './temperatureUtils.js';

export type RawProviderEvent = Record<string, unknown>;

function makeTimestamp(capturedAt: number): TelemetryTimestamp {
  const now = Date.now();
  return { capturedAt, receivedAt: now, normalizedAt: now };
}

export function normalizeProviderEvent(
  raw: RawProviderEvent,
  providerId: string,
): NormalizedTelemetryEvent {
  const receivedAt = Date.now();

  const disconnectedResult = RawDisconnectedReadingSchema.safeParse(raw);
  if (disconnectedResult.success) {
    const d = disconnectedResult.data;
    const reading: DisconnectedReading = {
      probeId: d.probeId,
      source: d.source,
      status: 'disconnected',
      timestamp: { capturedAt: d.capturedAt, receivedAt, normalizedAt: Date.now() },
    };
    return { type: 'probe:disconnected', reading };
  }

  const activeResult = RawActiveReadingSchema.safeParse(raw);
  if (activeResult.success) {
    const a = activeResult.data;
    const reading: ActiveReading = {
      probeId: a.probeId,
      source: a.source,
      status: 'active',
      temp: normalizeTemperature(a.temperature, a.unit),
      timestamp: makeTimestamp(a.capturedAt),
    };
    return { type: 'probe:reading', reading };
  }

  const gatewayStateResult = RawGatewayStateSchema.safeParse(raw);
  if (gatewayStateResult.success) {
    const g = gatewayStateResult.data;
    return {
      type: 'gateway:state',
      gatewayId: g.gatewayId,
      wifiStrength: g.wifiStrength ?? null,
      battery: g.battery ?? null,
      firmware: g.firmware ?? null,
      units: g.units ?? 'F',
      timestamp: g.capturedAt,
    };
  }

  const probeBatteryResult = RawProbeBatterySchema.safeParse(raw);
  if (probeBatteryResult.success) {
    const b = probeBatteryResult.data;
    return { type: 'probe:battery', probeId: b.probeId, battery: b.battery, timestamp: b.capturedAt };
  }

  return {
    type: 'normalization:rejected',
    payload: {
      providerId,
      receivedAt,
      truncatedPayload: truncate(raw),
    },
    timestamp: receivedAt,
  };
}

function truncate(raw: unknown): unknown {
  try {
    const str = JSON.stringify(raw);
    if (str.length <= 200) return raw;
    return JSON.parse(str.slice(0, 200) + '"…(truncated)"');
  } catch {
    return String(raw).slice(0, 200);
  }
}
