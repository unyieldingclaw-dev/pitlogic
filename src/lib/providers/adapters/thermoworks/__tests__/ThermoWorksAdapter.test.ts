import { describe, it, expect, beforeEach, vi } from 'vitest';
import { transformPayload } from '../ThermoWorksAdapter.js';

const PROBE_TOPIC = '/probes/M123456789012/events';
const DEVICE_TOPIC = '/devices/T10061CE92E24/events';

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
});

// Hoisted mock values — must be defined before vi.mock() runs
const { mockConnectAsync, mockSubscribeAsync, mockEndAsync, mockClientOn, simulateMessage, simulateReconnect, clearListeners } =
  vi.hoisted(() => {
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    const mockClient = {
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        listeners[event] = [...(listeners[event] ?? []), cb];
      }),
      subscribeAsync: vi.fn().mockResolvedValue(undefined),
      endAsync: vi.fn().mockResolvedValue(undefined),
    };
    return {
      mockConnectAsync: vi.fn().mockResolvedValue(mockClient),
      mockSubscribeAsync: mockClient.subscribeAsync,
      mockEndAsync: mockClient.endAsync,
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
    });
  });

  it('connect() creates client and subscribes to both /probes/+/events and /devices/+/events', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    expect(mockConnectAsync).toHaveBeenCalledWith(VALID_CONFIG.brokerUrl, {
      username: VALID_CONFIG.username,
      password: VALID_CONFIG.password,
    });
    expect(mockSubscribeAsync).toHaveBeenCalledWith(['/probes/+/events', '/devices/+/events']);
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

  it('reconnect with sessionPresent=false resubscribes once', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    const callsBefore = mockSubscribeAsync.mock.calls.length;
    simulateReconnect(false);
    // Give async _onReconnect a tick
    await Promise.resolve();
    expect(mockSubscribeAsync.mock.calls.length).toBe(callsBefore + 1);
    expect(mockSubscribeAsync).toHaveBeenLastCalledWith(['/probes/+/events', '/devices/+/events']);
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
});
