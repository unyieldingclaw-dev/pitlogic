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
import { mergeDeviceConfig, type ConfigEdits, type DeviceConfigJson } from './deviceConfigMerge.js';

export interface ThermoWorksConfig {
  brokerUrl: string;
  username: string;
  password: string;
}

export interface TransformOptions {
  now?: number;
  getUnitsForGateway?: (gatewayId: string) => 'F' | 'C';
}

/**
 * Transforms a raw ThermaConnect RFX MQTT message into zero or more RawProviderEvents.
 * Pure function — exported for unit testing without a mock broker.
 */
export function transformPayload(topic: string, rawPayload: Buffer | string, opts: TransformOptions = {}): RawProviderEvent[] {
  const now = opts.now ?? Date.now();
  const getUnits = opts.getUnitsForGateway ?? (() => 'F' as const);

  const deviceStateMatch = topic.match(/^\/devices\/([^/]+)\/state$/);
  const deviceConfigMatch = topic.match(/^\/devices\/([^/]+)\/config$/);
  const probeEventsMatch = topic.match(/^\/probes\/([^/]+)\/events$/);
  if (!deviceStateMatch && !deviceConfigMatch && !probeEventsMatch) return [];

  let parsed: unknown;
  try {
    const str = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf-8');
    parsed = JSON.parse(str);
  } catch {
    console.warn('[thermoworks] malformed JSON payload', { topic });
    return [];
  }

  if (typeof parsed !== 'object' || parsed === null) {
    console.warn('[thermoworks] unexpected payload structure', { topic });
    return [];
  }
  const body = parsed as Record<string, unknown>;

  if (deviceStateMatch) {
    const gatewayId = deviceStateMatch[1];
    const event: RawProviderEvent = { gatewayId, capturedAt: now };
    if (typeof body.wifi_strength === 'number') event.wifiStrength = body.wifi_strength;
    if (typeof body.battery === 'string') event.battery = body.battery;
    if (typeof body.firmware === 'string') event.firmware = body.firmware;
    if (body.units === 'F' || body.units === 'C') event.units = body.units;
    return [event];
  }

  if (deviceConfigMatch) {
    const gatewayId = deviceConfigMatch[1];
    return [{ gatewayId, capturedAt: now, raw: body }];
  }

  const probeTopicId = probeEventsMatch![1]!;

  if (!Array.isArray(body.channels)) {
    if (typeof body.battery === 'number') {
      // WHY ch1: RFX probes are single-channel devices (see RFX Probe Information in the
      // SDK docs) — the battery sub-payload has no per-channel breakdown, so it applies to
      // the probe's sole channel.
      return [{ probeId: `${probeTopicId}-ch1`, capturedAt: now, battery: body.battery }];
    }
    console.warn('[thermoworks] unexpected payload structure', { topic });
    return [];
  }

  const gatewayUnits = getUnits(probeTopicId);
  const events: RawProviderEvent[] = [];
  for (const channel of body.channels as unknown[]) {
    const ch = channel as Record<string, unknown>;
    if (!Number.isInteger(ch.ts) || (ch.ts as number) < 1e10) continue;
    if (!Array.isArray(ch.readings)) continue;
    for (const reading of ch.readings as Record<string, unknown>[]) {
      if (reading.type !== 'T') continue;
      events.push({
        probeId: `${probeTopicId}-ch${ch.number}`,
        capturedAt: ch.ts as number,
        temperature: reading.value as number,
        unit: gatewayUnits,
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
  private readonly _gatewayUnits = new Map<string, 'F' | 'C'>();
  private readonly _configCache = new Map<string, Record<string, unknown>>();

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
    await client.subscribeAsync('/devices/+/state');
    await client.subscribeAsync('/devices/+/config');
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

  async publishConfig(gatewayId: string, edits: ConfigEdits, fallbackBaseline?: DeviceConfigJson): Promise<void> {
    if (!this._client) throw new Error('Cannot publish config: not connected');
    const baseline = this._configCache.get(gatewayId) ?? fallbackBaseline ?? {};
    const merged = mergeDeviceConfig(baseline, edits);
    await this._client.publishAsync(`/devices/${gatewayId}/config`, JSON.stringify(merged), { retain: true, qos: 1 });
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
    await this._client.subscribeAsync('/devices/+/state');
    await this._client.subscribeAsync('/devices/+/config');
  }

  private _onMessage(topic: string, payload: Buffer): void {
    const events = transformPayload(topic, payload, {
      now: Date.now(),
      getUnitsForGateway: (gatewayId) => this._gatewayUnits.get(gatewayId) ?? 'F',
    });
    for (const event of events) {
      if (typeof event.gatewayId === 'string' && typeof event.units === 'string') {
        this._gatewayUnits.set(event.gatewayId, event.units as 'F' | 'C');
      }
      if (typeof event.gatewayId === 'string' && typeof event.raw === 'object' && event.raw !== null) {
        this._configCache.set(event.gatewayId, event.raw as Record<string, unknown>);
      }
      for (const handler of this._handlers) {
        try { handler(event); } catch { /* isolate handler failures — user code must not block other handlers */ }
      }
    }
  }
}
