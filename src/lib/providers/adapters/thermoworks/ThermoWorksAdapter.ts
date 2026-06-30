/**
 * ThermoWorks RFX adapter — ThermaConnect open MQTT protocol.
 *
 * COMPLIANCE NOTICE (ADR-003): All 8 questions answered "no" for this implementation.
 * Protocol: github.com/ThermoWorks-Integrations/ThermaConnect (open, documented).
 *
 * PROHIBITED in this file:
 * - Accessing localStorage, domain state, or UI state
 * - Emitting session events (SessionStore owns session lifecycle)
 * - Inferring staleness (TelemetryStore owns stale derivation)
 * - Any analytics logic
 */

import mqtt from 'mqtt';
import type { IConnackPacket, MqttClient } from 'mqtt';
import type { TemperatureProvider } from '../../core/TemperatureProvider.js';
import type { RawProviderEvent } from '../../core/ProviderTypes.js';

export interface ThermoWorksConfig {
  brokerUrl: string;
  username: string;
  password: string;
}

/**
 * Transforms a raw ThermaConnect MQTT message into zero or more RawProviderEvents.
 * Pure function — exported for unit testing without a mock broker.
 *
 * ThermaConnect telemetry format (topic: /probes/{probeId}/events or /devices/{deviceId}/events):
 *   { gatewayId?, channels: [{ number, ts (ms epoch), readings: [{ value, type }] }] }
 * Only readings with type === 'T' (temperature) produce events. Type 'H' (humidity) and
 * others are silently ignored. Battery/firmware messages have no channels array and are
 * discarded. Timestamp validation is per-channel — bad-ts channels are skipped individually.
 */
export function transformPayload(topic: string, rawPayload: Buffer | string): RawProviderEvent[] {
  const match = topic.match(/^\/(?:probes|devices)\/([^/]+)\/events$/);
  if (!match) return [];
  const topicProbeId = match[1];

  let parsed: unknown;
  try {
    const str = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf-8');
    parsed = JSON.parse(str);
  } catch {
    console.warn('[thermoworks] malformed JSON payload', { topic });
    return [];
  }

  if (typeof parsed !== 'object' || parsed === null) return [];
  const p = parsed as Record<string, unknown>;
  if (!Array.isArray(p.channels)) return [];

  const now = Date.now();
  const events: RawProviderEvent[] = [];

  for (const channel of p.channels as Record<string, unknown>[]) {
    // Per-channel timestamp: must be ms-epoch integer. 1e10 boundary rejects seconds-epoch
    // values (~2001 in ms). Upper bound (+60 s) blocks far-future spoofed timestamps.
    const ts = channel.ts;
    if (!Number.isInteger(ts) || (ts as number) < 1e10 || (ts as number) > now + 60_000) continue;
    if (!Array.isArray(channel.readings)) continue;
    const channelNumber = channel.number;
    if (channelNumber === undefined || channelNumber === null) continue;

    for (const reading of channel.readings as Record<string, unknown>[]) {
      if (reading.type !== 'T') continue;
      if (typeof reading.value !== 'number') continue;
      events.push({
        probeId: `${topicProbeId}-ch${channelNumber}`,
        capturedAt: ts as number,
        temperature: reading.value,
        unit: 'F',
        source: 'live',
      });
    }
  }
  return events;
}

export class ThermoWorksAdapter implements TemperatureProvider {
  readonly id = 'thermoworks';
  private readonly _config: ThermoWorksConfig;
  private _client: MqttClient | null = null;
  private _messageHandlerRegistered = false;
  private readonly _handlers = new Set<(event: RawProviderEvent) => void>();

  constructor(config: ThermoWorksConfig) {
    this._config = config;
  }

  async connect(): Promise<void> {
    if (this._client) return;
    const client = await mqtt.connectAsync(this._config.brokerUrl, {
      username: this._config.username,
      password: this._config.password,
    });
    this._client = client;
    await client.subscribeAsync(['/probes/+/events', '/devices/+/events']);
    this._registerMessageHandler();
    client.on('connect', (connack: IConnackPacket) => { void this._onReconnect(connack); });
  }

  subscribe(handler: (event: RawProviderEvent) => void): () => void {
    this._handlers.add(handler);
    return () => { this._handlers.delete(handler); };
  }

  async disconnect(): Promise<void> {
    if (!this._client) return;
    await this._client.endAsync(true);
    this._client = null;
    this._messageHandlerRegistered = false;
    this._handlers.clear();
  }

  private _registerMessageHandler(): void {
    if (this._messageHandlerRegistered) return;
    this._client!.on('message', (topic: string, payload: Buffer) => {
      this._onMessage(topic, payload);
    });
    this._messageHandlerRegistered = true;
  }

  private async _onReconnect(connack: IConnackPacket): Promise<void> {
    if (connack.sessionPresent || !this._client) return;
    await this._client.subscribeAsync(['/probes/+/events', '/devices/+/events']);
  }

  private _onMessage(topic: string, payload: Buffer): void {
    const events = transformPayload(topic, payload);
    for (const event of events) {
      for (const handler of this._handlers) {
        try { handler(event); } catch { /* isolate handler failures — user code must not block other handlers */ }
      }
    }
  }
}
