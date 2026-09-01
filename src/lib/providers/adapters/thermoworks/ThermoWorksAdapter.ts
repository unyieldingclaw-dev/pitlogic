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
  unit?: 'F' | 'C';
}

export interface TransformOptions {
  now?: number;
  getUnitsForGateway?: (gatewayId: string) => 'F' | 'C';
}

// ---------------------------------------------------------------------------
// Device meta event types — emitted by subscribeDeviceMeta(), NOT by subscribe().
// The full per-channel state (labels, alarms) must NOT flow through globalEventBus;
// it stays in hook-local state (feeds Channel Labels UI). The gateway-level summary
// fields (wifiStrength/battery/firmware/units, no channels) are a different, smaller
// slice of the same /state message — those DO flow through subscribe()/globalEventBus
// as a RawProviderEvent, because TelemetryStore's GatewayState (Device Health) needs
// them and only observes state materialized through the store, not hook-local state.
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
const CONFIG_TOPIC_RE = /^\/devices\/([^/]+)\/config$/;
const SUBSCRIPTIONS = ['/probes/+/events', '/devices/+/events', '/devices/+/state', '/devices/+/config'];

/**
 * Transforms a raw ThermaConnect MQTT message into zero or more RawProviderEvents.
 *
 * Three shapes are handled, dispatched by topic:
 *   - /devices/{gatewayId}/state  → one gateway-level event (wifiStrength/battery/firmware/units)
 *   - /devices/{gatewayId}/config → one event carrying the raw retained config payload
 *   - /probes/{probeId}/events or /devices/{deviceId}/events →
 *       { channels: [{ number, ts (ms epoch), readings: [{ value, type }] }] }
 *     Only readings with type === 'T' (temperature) produce events. Type 'H' (humidity) and
 *     others are silently ignored. A channels-less battery-only payload on an events topic
 *     is treated as the probe's sole channel (see WHY ch1 below). Per-channel timestamp
 *     validation rejects both stale seconds-epoch values and far-future spoofed ones.
 */
export function transformPayload(topic: string, rawPayload: Buffer | string, opts: TransformOptions = {}): RawProviderEvent[] {
  const now = opts.now ?? Date.now();
  const getUnits = opts.getUnitsForGateway ?? (() => 'F' as const);

  const deviceStateMatch = topic.match(STATE_TOPIC_RE);
  const deviceConfigMatch = topic.match(CONFIG_TOPIC_RE);
  const eventsMatch = topic.match(EVENTS_TOPIC_RE);
  if (!deviceStateMatch && !deviceConfigMatch && !eventsMatch) return [];

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

  const topicProbeId = eventsMatch![1]!;

  if (!Array.isArray(body.channels)) {
    if (typeof body.battery === 'number') {
      // WHY ch1: RFX probes are single-channel devices (see RFX Probe Information in the
      // SDK docs) — the battery sub-payload has no per-channel breakdown, so it applies to
      // the probe's sole channel.
      return [{ probeId: `${topicProbeId}-ch1`, capturedAt: now, battery: body.battery }];
    }
    console.warn('[thermoworks] unexpected payload structure', { topic });
    return [];
  }

  const gatewayUnits = getUnits(topicProbeId);
  const events: RawProviderEvent[] = [];
  for (const channel of body.channels as Record<string, unknown>[]) {
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
        unit: gatewayUnits,
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
    // Validate deviceId to prevent topic injection via broker-supplied device identifiers.
    if (!/^[\w-]+$/.test(deviceId)) throw new Error(`[thermoworks] publishDeviceConfig: invalid deviceId "${deviceId}"`);
    await this._client.publishAsync(
      `/devices/${deviceId}/config`,
      JSON.stringify(config),
      { retain: true },
    );
  }

  /**
   * Merges `edits` onto the cached (or supplied fallback) retained config baseline for
   * `gatewayId` and republishes the complete object — never a partial write, which the RFX
   * SDK would otherwise silently wipe. Throws if not connected.
   */
  async publishConfig(gatewayId: string, edits: ConfigEdits, fallbackBaseline?: DeviceConfigJson): Promise<void> {
    if (!this._client) throw new Error('Cannot publish config: not connected');
    // Validate gatewayId to prevent topic injection via broker-supplied device identifiers.
    if (!/^[\w-]+$/.test(gatewayId)) throw new Error(`[thermoworks] publishConfig: invalid gatewayId "${gatewayId}"`);
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
    await this._client.subscribeAsync(SUBSCRIPTIONS);
  }

  private _onMessage(topic: string, payload: Buffer): void {
    // Temperature/gateway-state/config readings → temperature event handlers
    const events = transformPayload(topic, payload, {
      now: Date.now(),
      getUnitsForGateway: (gatewayId) => this._gatewayUnits.get(gatewayId) ?? this._config.unit ?? 'F',
    });
    for (const event of events) {
      if (typeof event.gatewayId === 'string' && typeof event.units === 'string') {
        this._gatewayUnits.set(event.gatewayId, event.units as 'F' | 'C');
      }
      if (typeof event.gatewayId === 'string' && typeof event.raw === 'object' && event.raw !== null) {
        this._configCache.set(event.gatewayId, event.raw as Record<string, unknown>);
      }
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
