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
  unit?: 'F' | 'C';
}

// ---------------------------------------------------------------------------
// Device meta event types — emitted by subscribeDeviceMeta(), NOT by subscribe().
// Device state must NOT flow through globalEventBus; it stays in hook-local state.
// ---------------------------------------------------------------------------

export interface DeviceStateChannelInfo {
  number: string | number;
  label?: string;
  highAlarming: boolean;
  lowAlarming: boolean;
}

export interface DeviceStateEvent {
  type: 'state';
  deviceId: string;
  firmware?: string;
  wifiStrength?: number;
  battery?: number | null;
  channels: DeviceStateChannelInfo[];
}

export interface DeviceBatteryEvent {
  type: 'battery';
  deviceId: string;
  battery: number;
}

export interface DeviceFirmwareEvent {
  type: 'firmware';
  deviceId: string;
  firmware: string;
}

export type DeviceMetaEvent = DeviceStateEvent | DeviceBatteryEvent | DeviceFirmwareEvent;

// ---------------------------------------------------------------------------
// Pure transform functions — exported for unit testing without a mock broker.
// ---------------------------------------------------------------------------

const EVENTS_TOPIC_RE = /^\/(?:probes|devices)\/([^/]+)\/events$/;
const STATE_TOPIC_RE = /^\/devices\/([^/]+)\/state$/;
const SUBSCRIPTIONS = ['/probes/+/events', '/devices/+/events', '/devices/+/state'];

/**
 * Transforms a raw ThermaConnect MQTT message into zero or more RawProviderEvents.
 *
 * ThermaConnect telemetry format (topic: /probes/{probeId}/events or /devices/{deviceId}/events):
 *   { gatewayId?, channels: [{ number, ts (ms epoch), readings: [{ value, type }] }] }
 * Only readings with type === 'T' (temperature) produce events. Type 'H' (humidity) and
 * others are silently ignored. Battery/firmware messages have no channels array and are
 * discarded. Timestamp validation is per-channel — bad-ts channels are skipped individually.
 */
export function transformPayload(
  topic: string,
  rawPayload: Buffer | string,
  unit: 'F' | 'C' = 'F',
): RawProviderEvent[] {
  const match = topic.match(EVENTS_TOPIC_RE);
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
        unit,
        source: 'live',
      });
    }
  }
  return events;
}

/**
 * Parses a ThermaConnect /devices/{id}/state message into a DeviceStateEvent.
 * Returns null for non-state topics or unparseable payloads.
 */
export function parseStatePayload(
  topic: string,
  rawPayload: Buffer | string,
): DeviceStateEvent | null {
  const match = topic.match(STATE_TOPIC_RE);
  if (!match) return null;
  const topicDeviceId = match[1];

  let parsed: unknown;
  try {
    const str = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf-8');
    parsed = JSON.parse(str);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const p = parsed as Record<string, unknown>;

  const channels: DeviceStateChannelInfo[] = [];
  if (Array.isArray(p.channels)) {
    for (const ch of p.channels as Record<string, unknown>[]) {
      if (ch.number === undefined || ch.number === null) continue;
      const high = ch.highAlarm as Record<string, unknown> | undefined;
      const low = ch.lowAlarm as Record<string, unknown> | undefined;
      channels.push({
        number: ch.number as string | number,
        label: typeof ch.label === 'string' ? ch.label : undefined,
        highAlarming: high?.alarming === true,
        lowAlarming: low?.alarming === true,
      });
    }
  }

  return {
    type: 'state',
    deviceId: typeof p.device === 'string' ? p.device : topicDeviceId,
    firmware: typeof p.firmware === 'string' ? p.firmware : undefined,
    wifiStrength: typeof p.wifi_strength === 'number' ? p.wifi_strength : undefined,
    battery: typeof p.battery === 'number' ? p.battery : null,
    channels,
  };
}

export class ThermoWorksAdapter implements TemperatureProvider {
  readonly id = 'thermoworks';
  private readonly _config: ThermoWorksConfig;
  private _client: MqttClient | null = null;
  private _messageHandlerRegistered = false;
  private readonly _handlers = new Set<(event: RawProviderEvent) => void>();
  private readonly _metaHandlers = new Set<(event: DeviceMetaEvent) => void>();

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
    await client.subscribeAsync(SUBSCRIPTIONS);
    this._registerMessageHandler();
    client.on('connect', (connack: IConnackPacket) => { void this._onReconnect(connack); });
  }

  subscribe(handler: (event: RawProviderEvent) => void): () => void {
    this._handlers.add(handler);
    return () => { this._handlers.delete(handler); };
  }

  /** Subscribe to device metadata events (state, battery, firmware). */
  subscribeDeviceMeta(handler: (event: DeviceMetaEvent) => void): () => void {
    this._metaHandlers.add(handler);
    return () => { this._metaHandlers.delete(handler); };
  }

  async disconnect(): Promise<void> {
    if (!this._client) return;
    await this._client.endAsync(true);
    this._client = null;
    this._messageHandlerRegistered = false;
    this._handlers.clear();
    this._metaHandlers.clear();
  }

  /**
   * Publishes a device config update to /devices/{deviceId}/config with retain=true.
   * The retained message ensures the device receives the config on its next connect.
   * Throws if not connected.
   */
  async publishDeviceConfig(deviceId: string, config: Record<string, unknown>): Promise<void> {
    if (!this._client) throw new Error('[thermoworks] publishDeviceConfig: not connected');
    await this._client.publishAsync(
      `/devices/${deviceId}/config`,
      JSON.stringify(config),
      { retain: true },
    );
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
    await this._client.subscribeAsync(SUBSCRIPTIONS);
  }

  private _onMessage(topic: string, payload: Buffer): void {
    // Temperature readings → temperature event handlers
    const events = transformPayload(topic, payload, this._config.unit);
    for (const event of events) {
      for (const handler of this._handlers) {
        try { handler(event); } catch { /* isolate handler failures */ }
      }
    }

    // Device meta (state, battery, firmware) → meta event handlers
    const meta = this._parseDeviceMeta(topic, payload);
    if (meta) {
      for (const handler of this._metaHandlers) {
        try { handler(meta); } catch { /* isolate handler failures */ }
      }
    }
  }

  private _parseDeviceMeta(topic: string, payload: Buffer): DeviceMetaEvent | null {
    // State topic
    const stateMeta = parseStatePayload(topic, payload);
    if (stateMeta) return stateMeta;

    // Battery / firmware sub-messages from events topics
    const eventsMatch = topic.match(EVENTS_TOPIC_RE);
    if (!eventsMatch) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload.toString('utf-8'));
    } catch {
      return null;
    }

    if (typeof parsed !== 'object' || parsed === null) return null;
    const p = parsed as Record<string, unknown>;
    if (Array.isArray(p.channels)) return null; // telemetry message, handled by transformPayload

    const deviceId = typeof p.gatewayId === 'string' ? p.gatewayId : eventsMatch[1];

    if (typeof p.battery === 'number') {
      return { type: 'battery', deviceId, battery: p.battery };
    }
    if (typeof p.firmware === 'string') {
      return { type: 'firmware', deviceId, firmware: p.firmware };
    }

    return null;
  }
}
