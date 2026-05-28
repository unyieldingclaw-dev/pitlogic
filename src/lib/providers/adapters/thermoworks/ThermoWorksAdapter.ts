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
 * Transforms a raw ThermaConnect RFX MQTT message into zero or more RawProviderEvents.
 * Pure function — exported for unit testing without a mock broker.
 */
export function transformPayload(topic: string, rawPayload: Buffer | string): RawProviderEvent[] {
  const match = topic.match(/^\/probes\/([^/]+)\/events$/);
  if (!match) return [];
  const probeTopicId = match[1];

  let parsed: unknown;
  try {
    const str = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf-8');
    parsed = JSON.parse(str);
  } catch {
    console.warn('[thermoworks] malformed JSON payload', { topic });
    return [];
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>).channels)
  ) {
    console.warn('[thermoworks] unexpected payload structure', { topic });
    return [];
  }

  const events: RawProviderEvent[] = [];
  for (const channel of (parsed as { channels: unknown[] }).channels) {
    const ch = channel as Record<string, unknown>;
    if (!Number.isInteger(ch.ts) || (ch.ts as number) < 1e10) continue;
    if (!Array.isArray(ch.readings)) continue;
    for (const reading of ch.readings as Record<string, unknown>[]) {
      if (reading.type !== 'T') continue;
      events.push({
        probeId: `${probeTopicId}-ch${ch.number}`,
        capturedAt: ch.ts as number,
        temperature: reading.value as number,
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
    await client.subscribeAsync('/probes/+/events');
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
    await this._client.subscribeAsync('/probes/+/events');
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
