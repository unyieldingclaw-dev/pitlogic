import { describe, it, expect, beforeEach, vi } from 'vitest';
import { transformPayload, parseStatePayload } from '../ThermoWorksAdapter.js';

const PROBE_TOPIC = '/probes/M123456789012/events';
const DEVICE_TOPIC = '/devices/T10061CE92E24/events';
const STATE_TOPIC = '/devices/T10061CE92E24/state';

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

  it('returns empty array when payload has no channels array (e.g. battery message)', () => {
    const payload = Buffer.from(JSON.stringify({ gatewayId: 'T10061CE92E24', battery: 10 }));
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

  it('emits unit:C when unit param is C', () => {
    const payload = makePayload([makeChannel('1', [{ value: 107.0, type: 'T' }])]);
    const events = transformPayload(PROBE_TOPIC, payload, 'C');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ unit: 'C', temperature: 107.0 });
  });

  it('defaults to unit:F when unit param is omitted', () => {
    const payload = makePayload([makeChannel('1', [{ value: 225.0, type: 'T' }])]);
    const events = transformPayload(PROBE_TOPIC, payload);
    expect(events[0]).toMatchObject({ unit: 'F' });
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
// ThermoWorksAdapter — connection lifecycle and device meta events
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

  it('connect() creates client and subscribes to /probes/+/events, /devices/+/events, and /devices/+/state', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    expect(mockConnectAsync).toHaveBeenCalledWith(VALID_CONFIG.brokerUrl, {
      username: VALID_CONFIG.username,
      password: VALID_CONFIG.password,
    });
    expect(mockSubscribeAsync).toHaveBeenCalledWith([
      '/probes/+/events',
      '/devices/+/events',
      '/devices/+/state',
    ]);
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

  it('reconnect with sessionPresent=false resubscribes to all three topics', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    const callsBefore = mockSubscribeAsync.mock.calls.length;
    simulateReconnect(false);
    await Promise.resolve();
    expect(mockSubscribeAsync.mock.calls.length).toBe(callsBefore + 1);
    expect(mockSubscribeAsync).toHaveBeenLastCalledWith([
      '/probes/+/events',
      '/devices/+/events',
      '/devices/+/state',
    ]);
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

  it('does NOT call temperature handler for state messages', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const tempReceived: unknown[] = [];
    adapter.subscribe(e => tempReceived.push(e));
    await adapter.connect();

    simulateMessage(
      STATE_TOPIC,
      Buffer.from(JSON.stringify({ device: 'T10061CE92E24', channels: [] })),
    );

    expect(tempReceived).toHaveLength(0);
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
