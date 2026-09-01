import { describe, it, expect, beforeEach, vi } from 'vitest';
import { transformPayload, parseStatePayload } from '../ThermoWorksAdapter.js';

const PROBE_TOPIC = '/probes/M123456789012/events';
const DEVICE_TOPIC = '/devices/T10061CE92E24/events';
const STATE_TOPIC = '/devices/T10061CE92E24/state';
const CONFIG_TOPIC = '/devices/T10061CE92E24/config';

function makePayload(channels: unknown[], overrides: Record<string, unknown> = {}): Buffer {
  return Buffer.from(JSON.stringify({
    gatewayId: 'T10061CE92E24',
    channels,
    ...overrides,
  }));
}

function makeChannel(number: string | number, readings: unknown[], tsOverride?: number): object {
  return { number, ts: tsOverride ?? Date.now(), readings };
}

// ---------------------------------------------------------------------------
// transformPayload — temperature events
// ---------------------------------------------------------------------------

describe('transformPayload', () => {
  it('emits one event per temperature reading in a single-channel payload', () => {
    const ts = Date.now();
    const payload = makePayload([makeChannel('1', [{ value: 225.4, type: 'T' }], ts)]);
    const events = transformPayload(PROBE_TOPIC, payload);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      probeId: 'M123456789012-ch1',
      capturedAt: ts,
      temperature: 225.4,
      unit: 'F',
      source: 'live',
    });
  });

  it('emits one event per channel when multiple channels are present', () => {
    const payload = makePayload([
      makeChannel('1', [{ value: 200.0, type: 'T' }]),
      makeChannel('2', [{ value: 165.0, type: 'T' }]),
    ]);
    const events = transformPayload(PROBE_TOPIC, payload);
    expect(events).toHaveLength(2);
    expect(events[0].probeId).toBe('M123456789012-ch1');
    expect(events[1].probeId).toBe('M123456789012-ch2');
  });

  it('skips humidity readings (type H) and emits only temperature readings', () => {
    const payload = makePayload([
      makeChannel('1', [{ value: 225.4, type: 'T' }, { value: 65.0, type: 'H' }]),
    ]);
    const events = transformPayload(PROBE_TOPIC, payload);
    expect(events).toHaveLength(1);
    expect(events[0].temperature).toBe(225.4);
  });

  it('returns empty array when channel has only humidity readings', () => {
    const payload = makePayload([makeChannel('1', [{ value: 65.0, type: 'H' }])]);
    expect(transformPayload(PROBE_TOPIC, payload)).toHaveLength(0);
  });

  it('returns empty array when readings array is empty', () => {
    const payload = makePayload([makeChannel('1', [])]);
    expect(transformPayload(PROBE_TOPIC, payload)).toHaveLength(0);
  });

  it('skips channels where reading has no numeric value field', () => {
    const payload = makePayload([makeChannel('1', [{ type: 'T' }])]);
    expect(transformPayload(PROBE_TOPIC, payload)).toHaveLength(0);
  });

  it('discards channel with ts < 1e10 (seconds-epoch detection)', () => {
    const payload = makePayload([makeChannel('1', [{ value: 200.0, type: 'T' }], 1_716_825_600)]);
    expect(transformPayload(PROBE_TOPIC, payload)).toHaveLength(0);
  });

  it('discards channel with ts more than 60 s in the future (far-future spoof guard)', () => {
    const futureTs = Date.now() + 120_000;
    const payload = makePayload([makeChannel('1', [{ value: 200.0, type: 'T' }], futureTs)]);
    expect(transformPayload(PROBE_TOPIC, payload)).toHaveLength(0);
  });

  it('accepts channel with ts within 60 s clock skew tolerance', () => {
    const nearFutureTs = Date.now() + 30_000;
    const payload = makePayload([makeChannel('1', [{ value: 200.0, type: 'T' }], nearFutureTs)]);
    expect(transformPayload(PROBE_TOPIC, payload)).toHaveLength(1);
  });

  it('discards channel with non-integer ts', () => {
    const payload = Buffer.from(JSON.stringify({
      gatewayId: 'T10061CE92E24',
      channels: [{ number: '1', ts: '2024-05-01T00:00:00Z', readings: [{ value: 200.0, type: 'T' }] }],
    }));
    expect(transformPayload(PROBE_TOPIC, payload)).toHaveLength(0);
  });

  it('emits only valid channels when mixed good and bad timestamps are present', () => {
    const goodTs = Date.now();
    const payload = makePayload([
      makeChannel('1', [{ value: 200.0, type: 'T' }], goodTs),
      makeChannel('2', [{ value: 165.0, type: 'T' }], 1_716_825_600),
    ]);
    const events = transformPayload(PROBE_TOPIC, payload);
    expect(events).toHaveLength(1);
    expect(events[0].probeId).toBe('M123456789012-ch1');
  });

  it('returns empty array for malformed JSON payload', () => {
    expect(transformPayload(PROBE_TOPIC, Buffer.from('not json'))).toHaveLength(0);
  });

  it('returns empty array for an empty channels array', () => {
    const payload = makePayload([]);
    expect(transformPayload(PROBE_TOPIC, payload)).toHaveLength(0);
  });

  it('emits a probe-battery raw event when a probe payload has battery but no channels', () => {
    const payload = Buffer.from(JSON.stringify({ gatewayId: 'M123456789012', battery: 42 }));
    const events = transformPayload(PROBE_TOPIC, payload, { now: 5_000 });
    expect(events).toEqual([
      { probeId: 'M123456789012-ch1', capturedAt: 5_000, battery: 42 },
    ]);
  });

  it('still returns empty array for a probe payload with neither channels nor battery', () => {
    const payload = Buffer.from(JSON.stringify({ gatewayId: 'M123456789012', firmware: '1.1.10' }));
    expect(transformPayload(PROBE_TOPIC, payload)).toHaveLength(0);
  });

  it('returns empty array for an unrecognised topic pattern', () => {
    const payload = makePayload([makeChannel('1', [{ value: 200.0, type: 'T' }])]);
    expect(transformPayload('/something/else', payload)).toHaveLength(0);
  });

  it('uses probeId from topic, not from payload', () => {
    const payload = makePayload([makeChannel('1', [{ value: 100.0, type: 'T' }])]);
    const events = transformPayload('/probes/M100280635/events', payload);
    expect(events).toHaveLength(1);
    expect(events[0].probeId).toBe('M100280635-ch1');
  });

  it('handles /devices/+/events topic (non-RFX devices use same telemetry format)', () => {
    const payload = Buffer.from(JSON.stringify({
      channels: [{ number: '1', ts: Date.now(), readings: [{ value: 75.2, type: 'T' }] }],
    }));
    const events = transformPayload(DEVICE_TOPIC, payload);
    expect(events).toHaveLength(1);
    expect(events[0].probeId).toBe('T10061CE92E24-ch1');
  });

  it('injects gateway units into channel readings via getUnitsForGateway', () => {
    const payload = makePayload([makeChannel('1', [{ value: 100.0, type: 'T' }])]);
    const events = transformPayload(PROBE_TOPIC, payload, { getUnitsForGateway: () => 'C' });
    expect(events[0]).toMatchObject({ unit: 'C' });
  });

  it('defaults to F units when getUnitsForGateway is not provided', () => {
    const payload = makePayload([makeChannel('1', [{ value: 100.0, type: 'T' }])]);
    const events = transformPayload(PROBE_TOPIC, payload);
    expect(events[0]).toMatchObject({ unit: 'F' });
  });

  it('emits a gateway:state-shaped raw event for a device state topic', () => {
    const payload = Buffer.from(JSON.stringify({
      wifi_strength: 88, battery: 'C', firmware: 'v2.45', units: 'F',
    }));
    const events = transformPayload(STATE_TOPIC, payload, { now: 5_000 });
    expect(events).toEqual([
      { gatewayId: 'T10061CE92E24', capturedAt: 5_000, wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F' },
    ]);
  });

  it('gateway:state raw event omits fields absent from the payload', () => {
    const payload = Buffer.from(JSON.stringify({ wifi_strength: 50 }));
    const events = transformPayload(STATE_TOPIC, payload, { now: 5_000 });
    expect(events).toEqual([
      { gatewayId: 'T10061CE92E24', capturedAt: 5_000, wifiStrength: 50 },
    ]);
  });

  it('wraps a device config topic payload as a raw gateway-config event', () => {
    const configBody = { label: 'My Device', firmware: 'v2.45', channels: [{ number: 1, label: 'Brisket' }] };
    const payload = Buffer.from(JSON.stringify(configBody));
    const events = transformPayload(CONFIG_TOPIC, payload, { now: 5_000 });
    expect(events).toEqual([
      { gatewayId: 'T10061CE92E24', capturedAt: 5_000, raw: configBody },
    ]);
  });

  it('returns empty array for malformed JSON on the config topic', () => {
    expect(transformPayload(CONFIG_TOPIC, Buffer.from('not json'))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// parseStatePayload — device state events
// ---------------------------------------------------------------------------

describe('parseStatePayload', () => {
  it('returns null for a non-state topic', () => {
    const payload = Buffer.from(JSON.stringify({ device: 'T10061CE92E24', channels: [] }));
    expect(parseStatePayload('/devices/T10061CE92E24/events', payload)).toBeNull();
    expect(parseStatePayload('/something/else', payload)).toBeNull();
  });

  it('parses a full state payload with firmware, wifiStrength, battery, and channels', () => {
    const payload = Buffer.from(JSON.stringify({
      device: 'T10061CE92E24',
      firmware: '1.0.10',
      wifi_strength: -66,
      battery: null,
      channels: [
        { number: 1, label: 'Brisket', highAlarm: { value: 500, alarming: false }, lowAlarm: { value: -100, alarming: false } },
        { number: 2, label: 'Ribs',    highAlarm: { value: 500, alarming: true  }, lowAlarm: { value: -100, alarming: false } },
      ],
    }));
    const result = parseStatePayload(STATE_TOPIC, payload);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('state');
    expect(result!.deviceId).toBe('T10061CE92E24');
    expect(result!.firmware).toBe('1.0.10');
    expect(result!.wifiStrength).toBe(-66);
    expect(result!.battery).toBeNull();
    expect(result!.channels).toHaveLength(2);
    expect(result!.channels[0]).toEqual({ number: 1, label: 'Brisket', highAlarming: false, lowAlarming: false });
    expect(result!.channels[1]).toEqual({ number: 2, label: 'Ribs', highAlarming: true, lowAlarming: false });
  });

  it('falls back to topicDeviceId when payload has no device field', () => {
    const payload = Buffer.from(JSON.stringify({ channels: [] }));
    const result = parseStatePayload('/devices/T_FALLBACK/state', payload);
    expect(result!.deviceId).toBe('T_FALLBACK');
  });

  it('omits firmware and wifiStrength when not present in payload', () => {
    const payload = Buffer.from(JSON.stringify({ device: 'T10061CE92E24', channels: [] }));
    const result = parseStatePayload(STATE_TOPIC, payload);
    expect(result!.firmware).toBeUndefined();
    expect(result!.wifiStrength).toBeUndefined();
  });

  it('returns empty channels array when channels field is missing', () => {
    const payload = Buffer.from(JSON.stringify({ device: 'T10061CE92E24' }));
    const result = parseStatePayload(STATE_TOPIC, payload);
    expect(result!.channels).toHaveLength(0);
  });

  it('skips channels with no number field', () => {
    const payload = Buffer.from(JSON.stringify({
      device: 'T10061CE92E24',
      channels: [{ label: 'No number' }, { number: 2, label: 'OK' }],
    }));
    const result = parseStatePayload(STATE_TOPIC, payload);
    expect(result!.channels).toHaveLength(1);
    expect(result!.channels[0].number).toBe(2);
  });

  it('returns null for malformed JSON', () => {
    expect(parseStatePayload(STATE_TOPIC, Buffer.from('not json'))).toBeNull();
  });

  it('returns null for non-object JSON', () => {
    expect(parseStatePayload(STATE_TOPIC, Buffer.from('"string"'))).toBeNull();
  });

  it('treats missing highAlarm/lowAlarm as not alarming', () => {
    const payload = Buffer.from(JSON.stringify({
      device: 'T10061CE92E24',
      channels: [{ number: 1 }],
    }));
    const result = parseStatePayload(STATE_TOPIC, payload);
    expect(result!.channels[0].highAlarming).toBe(false);
    expect(result!.channels[0].lowAlarming).toBe(false);
  });

  it('includes numeric battery when present', () => {
    const payload = Buffer.from(JSON.stringify({ device: 'T10061CE92E24', battery: 75, channels: [] }));
    const result = parseStatePayload(STATE_TOPIC, payload);
    expect(result!.battery).toBe(75);
  });
});

// ---------------------------------------------------------------------------
// ThermoWorksAdapter — connection lifecycle, device meta, and config publishing
// ---------------------------------------------------------------------------

// Hoisted mock values — must be defined before vi.mock() runs
const {
  mockConnectAsync, mockSubscribeAsync, mockEndAsync, mockPublishAsync,
  mockClientOn, simulateMessage, simulateReconnect, clearListeners,
} =
  vi.hoisted(() => {
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    const mockClient = {
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        listeners[event] = [...(listeners[event] ?? []), cb];
      }),
      subscribeAsync: vi.fn().mockResolvedValue(undefined),
      endAsync: vi.fn().mockResolvedValue(undefined),
      publishAsync: vi.fn().mockResolvedValue(undefined),
    };
    return {
      mockConnectAsync: vi.fn().mockResolvedValue(mockClient),
      mockSubscribeAsync: mockClient.subscribeAsync,
      mockEndAsync: mockClient.endAsync,
      mockPublishAsync: mockClient.publishAsync,
      mockClientOn: mockClient.on,
      simulateMessage: (topic: string, payload: Buffer) => {
        (listeners['message'] ?? []).forEach(cb => cb(topic, payload));
      },
      simulateReconnect: (sessionPresent: boolean) => {
        (listeners['connect'] ?? []).forEach(cb => cb({ sessionPresent }));
      },
      clearListeners: () => {
        Object.keys(listeners).forEach(k => { delete listeners[k]; });
      },
    };
  });

vi.mock('mqtt', () => ({
  default: { connectAsync: mockConnectAsync },
  connectAsync: mockConnectAsync,
}));

import { ThermoWorksAdapter } from '../ThermoWorksAdapter.js';

const VALID_CONFIG = { brokerUrl: 'wss://test.hivemq.cloud:8884/mqtt', username: 'u', password: 'p' };
const ALL_TOPICS = ['/probes/+/events', '/devices/+/events', '/devices/+/state', '/devices/+/config'];

describe('ThermoWorksAdapter — connection lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearListeners();
    mockConnectAsync.mockResolvedValue({
      on: mockClientOn,
      subscribeAsync: mockSubscribeAsync,
      endAsync: mockEndAsync,
      publishAsync: mockPublishAsync,
    });
  });

  it('connect() creates client and subscribes to all telemetry, state, and config topics', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    expect(mockConnectAsync).toHaveBeenCalledWith(VALID_CONFIG.brokerUrl, {
      username: VALID_CONFIG.username,
      password: VALID_CONFIG.password,
    });
    expect(mockSubscribeAsync).toHaveBeenCalledWith(ALL_TOPICS);
  });

  it('connect() is idempotent — second call does not create a second client', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    await adapter.connect();
    expect(mockConnectAsync).toHaveBeenCalledTimes(1);
  });

  it('message listener is registered exactly once across connect cycles', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    // Simulate a reconnect that would naively re-register if unguarded
    simulateReconnect(false);
    const messageListenerCalls = mockClientOn.mock.calls.filter(([event]) => event === 'message');
    expect(messageListenerCalls).toHaveLength(1);
  });

  it('disconnect() calls endAsync(true) and nulls the client', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    await adapter.disconnect();
    expect(mockEndAsync).toHaveBeenCalledWith(true);
    // After disconnect, connect() should be able to create a new client
    await adapter.connect();
    expect(mockConnectAsync).toHaveBeenCalledTimes(2);
  });

  it('handler is not called after disconnect()', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const received: unknown[] = [];
    adapter.subscribe(e => received.push(e));
    await adapter.connect();
    await adapter.disconnect();
    simulateMessage(
      '/devices/M123/events',
      Buffer.from(JSON.stringify({
        gatewayId: 'T_gateway',
        channels: [{ number: '1', ts: Date.now(), readings: [{ value: 200, type: 'T' }] }],
      })),
    );
    expect(received).toHaveLength(0);
  });

  it('emits one event per channel on message', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const received: unknown[] = [];
    adapter.subscribe(e => received.push(e));
    await adapter.connect();
    simulateMessage(
      '/devices/M123456789012/events',
      Buffer.from(JSON.stringify({
        gatewayId: 'T142B2FD392FC',
        channels: [
          { number: '1', ts: Date.now(), readings: [{ value: 225.4, type: 'T' }] },
          { number: '2', ts: Date.now(), readings: [{ value: 165.0, type: 'T' }] },
        ],
      })),
    );
    expect(received).toHaveLength(2);
    expect(received[0]).toMatchObject({ probeId: 'M123456789012-ch1', temperature: 225.4 });
    expect(received[1]).toMatchObject({ probeId: 'M123456789012-ch2', temperature: 165.0 });
  });

  it('reconnect with sessionPresent=true does NOT resubscribe', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    const callsBefore = mockSubscribeAsync.mock.calls.length;
    simulateReconnect(true);
    expect(mockSubscribeAsync.mock.calls.length).toBe(callsBefore);
  });

  it('reconnect with sessionPresent=false resubscribes to all topics', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    const callsBefore = mockSubscribeAsync.mock.calls.length;
    simulateReconnect(false);
    await Promise.resolve();
    expect(mockSubscribeAsync.mock.calls.length).toBe(callsBefore + 1);
    expect(mockSubscribeAsync).toHaveBeenLastCalledWith(ALL_TOPICS);
  });

  it('emits event for probe topic /probes/+/events (real RFX probe topic)', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const received: unknown[] = [];
    adapter.subscribe(e => received.push(e));
    await adapter.connect();
    simulateMessage(
      '/probes/M100280635/events',
      Buffer.from(JSON.stringify({
        gatewayId: 'T142B2FD392FC',
        channels: [{ number: '1', ts: Date.now(), readings: [{ value: 195.0, type: 'T' }] }],
      })),
    );
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ probeId: 'M100280635-ch1', temperature: 195.0 });
  });

  it('does not emit for humidity-only message', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const received: unknown[] = [];
    adapter.subscribe(e => received.push(e));
    await adapter.connect();
    simulateMessage(
      '/probes/M100280635/events',
      Buffer.from(JSON.stringify({
        gatewayId: 'T142B2FD392FC',
        channels: [{ number: '1', ts: Date.now(), readings: [{ value: 65.0, type: 'H' }] }],
      })),
    );
    expect(received).toHaveLength(0);
  });

  it('emits unit from config when unit is C', async () => {
    const adapter = new ThermoWorksAdapter({ ...VALID_CONFIG, unit: 'C' });
    const received: unknown[] = [];
    adapter.subscribe(e => received.push(e));
    await adapter.connect();
    simulateMessage(
      '/probes/M100280635/events',
      Buffer.from(JSON.stringify({
        channels: [{ number: '1', ts: Date.now(), readings: [{ value: 107.2, type: 'T' }] }],
      })),
    );
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ unit: 'C', temperature: 107.2 });
  });

  it('caches the full raw config from a device-config message', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const received: unknown[] = [];
    adapter.subscribe(e => received.push(e));
    await adapter.connect();
    const configBody = { label: 'My Device', channels: [{ number: 1, label: 'Brisket' }] };
    simulateMessage('/devices/M123456789012/config', Buffer.from(JSON.stringify(configBody)));
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ gatewayId: 'M123456789012', capturedAt: expect.any(Number), raw: configBody });
  });

  it('caches gateway units from a device-state message and applies them to subsequent probe readings', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const received: unknown[] = [];
    adapter.subscribe(e => received.push(e));
    await adapter.connect();
    simulateMessage('/devices/M123456789012/state', Buffer.from(JSON.stringify({ units: 'C' })));
    simulateMessage(
      '/probes/M123456789012/events',
      Buffer.from(JSON.stringify({
        gatewayId: 'M123456789012',
        channels: [{ number: 1, ts: Date.now(), readings: [{ value: 100.0, type: 'T' }] }],
      })),
    );
    const readingEvent = received.find(e => (e as Record<string, unknown>).temperature !== undefined);
    expect(readingEvent).toMatchObject({ unit: 'C' });
  });
});

// ---------------------------------------------------------------------------
// ThermoWorksAdapter — device meta events
// ---------------------------------------------------------------------------

describe('ThermoWorksAdapter — device meta events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearListeners();
    mockConnectAsync.mockResolvedValue({
      on: mockClientOn,
      subscribeAsync: mockSubscribeAsync,
      endAsync: mockEndAsync,
      publishAsync: mockPublishAsync,
    });
  });

  it('calls meta handler with DeviceStateEvent on /devices/+/state message', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const metaReceived: unknown[] = [];
    adapter.subscribeDeviceMeta(e => metaReceived.push(e));
    await adapter.connect();

    simulateMessage(
      STATE_TOPIC,
      Buffer.from(JSON.stringify({
        device: 'T10061CE92E24',
        firmware: '1.0.10',
        wifi_strength: -66,
        battery: null,
        channels: [
          { number: 1, label: 'Brisket', highAlarm: { alarming: false }, lowAlarm: { alarming: false } },
        ],
      })),
    );

    expect(metaReceived).toHaveLength(1);
    expect(metaReceived[0]).toMatchObject({
      type: 'state',
      deviceId: 'T10061CE92E24',
      firmware: '1.0.10',
      channels: [{ number: 1, label: 'Brisket', highAlarming: false, lowAlarming: false }],
    });
  });

  it('calls meta handler with DeviceBatteryEvent on battery sub-message', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const metaReceived: unknown[] = [];
    adapter.subscribeDeviceMeta(e => metaReceived.push(e));
    await adapter.connect();

    simulateMessage(
      PROBE_TOPIC,
      Buffer.from(JSON.stringify({ gatewayId: 'T10061CE92E24', battery: 85 })),
    );

    expect(metaReceived).toHaveLength(1);
    expect(metaReceived[0]).toEqual({ type: 'battery', deviceId: 'T10061CE92E24', battery: 85 });
  });

  it('calls meta handler with DeviceFirmwareEvent on firmware sub-message', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const metaReceived: unknown[] = [];
    adapter.subscribeDeviceMeta(e => metaReceived.push(e));
    await adapter.connect();

    simulateMessage(
      PROBE_TOPIC,
      Buffer.from(JSON.stringify({ gatewayId: 'T10061CE92E24', firmware: '1.0.10' })),
    );

    expect(metaReceived).toHaveLength(1);
    expect(metaReceived[0]).toEqual({ type: 'firmware', deviceId: 'T10061CE92E24', firmware: '1.0.10' });
  });

  it('does NOT call meta handler for telemetry messages (channels present)', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const metaReceived: unknown[] = [];
    adapter.subscribeDeviceMeta(e => metaReceived.push(e));
    await adapter.connect();

    simulateMessage(
      PROBE_TOPIC,
      Buffer.from(JSON.stringify({
        gatewayId: 'T10061CE92E24',
        channels: [{ number: '1', ts: Date.now(), readings: [{ value: 200, type: 'T' }] }],
      })),
    );

    expect(metaReceived).toHaveLength(0);
  });

  it('state messages produce a gateway-level event but never a per-channel temperature reading', async () => {
    // Gateway-level fields (wifiStrength/battery/firmware/units) from a /state message DO
    // reach subscribe() handlers — TelemetryStore's GatewayState needs them (see the WHY
    // comment above DeviceMetaEvent in ThermoWorksAdapter.ts). What must never happen is a
    // state message's channels[] masquerading as a per-probe temperature reading.
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const tempReceived: unknown[] = [];
    adapter.subscribe(e => tempReceived.push(e));
    await adapter.connect();

    simulateMessage(
      STATE_TOPIC,
      Buffer.from(JSON.stringify({ device: 'T10061CE92E24', wifi_strength: 80, channels: [] })),
    );

    expect(tempReceived).toHaveLength(1);
    expect(tempReceived[0]).toMatchObject({ gatewayId: 'T10061CE92E24', wifiStrength: 80 });
    expect(tempReceived[0]).not.toHaveProperty('probeId');
    expect(tempReceived[0]).not.toHaveProperty('temperature');
  });

  it('meta handler unsubscribe prevents further calls', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const metaReceived: unknown[] = [];
    const unsub = adapter.subscribeDeviceMeta(e => metaReceived.push(e));
    await adapter.connect();
    unsub();

    simulateMessage(
      PROBE_TOPIC,
      Buffer.from(JSON.stringify({ gatewayId: 'T10061CE92E24', battery: 85 })),
    );

    expect(metaReceived).toHaveLength(0);
  });

  it('meta handlers are cleared after disconnect()', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const metaReceived: unknown[] = [];
    adapter.subscribeDeviceMeta(e => metaReceived.push(e));
    await adapter.connect();
    await adapter.disconnect();

    simulateMessage(
      PROBE_TOPIC,
      Buffer.from(JSON.stringify({ gatewayId: 'T10061CE92E24', battery: 85 })),
    );

    expect(metaReceived).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ThermoWorksAdapter — publishDeviceConfig
// ---------------------------------------------------------------------------

describe('ThermoWorksAdapter — publishDeviceConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearListeners();
    mockConnectAsync.mockResolvedValue({
      on: mockClientOn,
      subscribeAsync: mockSubscribeAsync,
      endAsync: mockEndAsync,
      publishAsync: mockPublishAsync,
    });
  });

  it('publishes to /devices/{id}/config with retain=true', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    const config = { label: 'My RFX', transmitIntervalInSeconds: 5 };
    await adapter.publishDeviceConfig('T10061CE92E24', config);
    expect(mockPublishAsync).toHaveBeenCalledWith(
      '/devices/T10061CE92E24/config',
      JSON.stringify(config),
      { retain: true },
    );
  });

  it('throws when not connected', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await expect(adapter.publishDeviceConfig('T10061CE92E24', {})).rejects.toThrow('not connected');
  });
});

// ---------------------------------------------------------------------------
// ThermoWorksAdapter — publishConfig
// ---------------------------------------------------------------------------

describe('ThermoWorksAdapter — publishConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearListeners();
    mockConnectAsync.mockResolvedValue({
      on: mockClientOn,
      subscribeAsync: mockSubscribeAsync,
      endAsync: mockEndAsync,
      publishAsync: mockPublishAsync,
    });
  });

  it('publishConfig merges edits onto the cached baseline and publishes a retained message', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    simulateMessage(
      '/devices/M123456789012/config',
      Buffer.from(JSON.stringify({ label: 'My Device', channels: [{ number: 1, label: 'Old Label' }] })),
    );
    await adapter.publishConfig('M123456789012', { channelLabels: { 1: 'Brisket' } });
    expect(mockPublishAsync).toHaveBeenCalledWith(
      '/devices/M123456789012/config',
      JSON.stringify({ label: 'My Device', channels: [{ number: 1, label: 'Brisket' }] }),
      { retain: true, qos: 1 },
    );
  });

  it('publishConfig uses fallbackBaseline when no config has been cached yet', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    await adapter.publishConfig('M999', { channelLabels: { 1: 'Ribs' } }, { label: 'Fallback Device', channels: [] });
    expect(mockPublishAsync).toHaveBeenCalledWith(
      '/devices/M999/config',
      JSON.stringify({ label: 'Fallback Device', channels: [{ number: 1, label: 'Ribs' }] }),
      { retain: true, qos: 1 },
    );
  });

  it('publishConfig starts from an empty object when there is no cache and no fallback', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    await adapter.publishConfig('M999', { channelLabels: { 1: 'Ribs' } });
    expect(mockPublishAsync).toHaveBeenCalledWith(
      '/devices/M999/config',
      JSON.stringify({ channels: [{ number: 1, label: 'Ribs' }] }),
      { retain: true, qos: 1 },
    );
  });

  it('publishConfig rejects when not connected', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await expect(adapter.publishConfig('M999', {})).rejects.toThrow(/not connected/i);
  });
});
