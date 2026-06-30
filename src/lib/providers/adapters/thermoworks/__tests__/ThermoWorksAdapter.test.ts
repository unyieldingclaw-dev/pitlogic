import { describe, it, expect, beforeEach, vi } from 'vitest';
import { transformPayload } from '../ThermoWorksAdapter.js';

const TOPIC = '/devices/M123456789012/events';

function makePayload(sensors: unknown[], overrides: Record<string, unknown> = {}): Buffer {
  return Buffer.from(JSON.stringify({
    gatewayId: 'T142B2FD392FC',
    deviceId: 'M123456789012',
    ts: Date.now(),
    sensors,
    ...overrides,
  }));
}

describe('transformPayload', () => {
  it('emits one event per sensor in a single-sensor payload', () => {
    const ts = Date.now();
    const payload = makePayload([{ sensorId: '1', value: 225.4, units: 'F' }], { ts });
    const events = transformPayload(TOPIC, payload);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      probeId: 'M123456789012-s1',
      capturedAt: ts,
      temperature: 225.4,
      unit: 'F',
      source: 'live',
    });
  });

  it('emits one event per sensor when multiple sensors are present', () => {
    const payload = makePayload([
      { sensorId: '1', value: 200.0, units: 'F' },
      { sensorId: '2', value: 165.0, units: 'F' },
    ]);
    const events = transformPayload(TOPIC, payload);
    expect(events).toHaveLength(2);
    expect(events[0].probeId).toBe('M123456789012-s1');
    expect(events[1].probeId).toBe('M123456789012-s2');
  });

  it('skips sensors that have no numeric value field', () => {
    const payload = makePayload([{ sensorId: '1', units: 'F' }]);
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('passes Celsius sensors through with unit C', () => {
    const payload = makePayload([{ sensorId: '1', value: 26.5, units: 'C' }]);
    const events = transformPayload(TOPIC, payload);
    expect(events).toHaveLength(1);
    expect(events[0].unit).toBe('C');
    expect(events[0].temperature).toBe(26.5);
  });

  it('discards payload with ts more than 60 s in the future (far-future spoof guard)', () => {
    const futureTs = Date.now() + 120_000;
    const payload = makePayload([{ sensorId: '1', value: 200.0, units: 'F' }], { ts: futureTs });
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('accepts payload with ts within 60 s clock skew tolerance', () => {
    const nearFutureTs = Date.now() + 30_000;
    const payload = makePayload([{ sensorId: '1', value: 200.0, units: 'F' }], { ts: nearFutureTs });
    expect(transformPayload(TOPIC, payload)).toHaveLength(1);
  });

  it('discards payload with ts < 1e10 (seconds-epoch detection)', () => {
    const payload = makePayload([{ sensorId: '1', value: 200.0, units: 'F' }], { ts: 1_716_825_600 });
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('discards payload with non-integer ts', () => {
    const payload = makePayload([{ sensorId: '1', value: 200.0, units: 'F' }], { ts: '2024-05-01T00:00:00Z' });
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('returns empty array for malformed JSON payload', () => {
    expect(transformPayload(TOPIC, Buffer.from('not json'))).toHaveLength(0);
  });

  it('returns empty array for an empty sensors array', () => {
    const payload = makePayload([]);
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('returns empty array when payload has no sensors array (e.g. gateway state message)', () => {
    const payload = Buffer.from(JSON.stringify({ gatewayId: 'T142B2FD392FC', deviceId: 'M123456789012', ts: Date.now() }));
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('returns empty array for an unrecognised topic pattern', () => {
    const payload = makePayload([{ sensorId: '1', value: 200.0, units: 'F' }]);
    expect(transformPayload('/something/else', payload)).toHaveLength(0);
  });

  it('falls back to topic device ID when payload deviceId is absent', () => {
    const payload = Buffer.from(JSON.stringify({
      gatewayId: 'T142B2FD392FC',
      ts: Date.now(),
      sensors: [{ sensorId: '1', value: 100.0, units: 'F' }],
    }));
    const events = transformPayload(TOPIC, payload);
    expect(events).toHaveLength(1);
    expect(events[0].probeId).toBe('M123456789012-s1');
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
        deviceId: 'M123',
        ts: Date.now(),
        sensors: [{ sensorId: '1', value: 200, units: 'F' }],
      })),
    );
    expect(received).toHaveLength(0);
  });

  it('emits one normalized event per sensor on message', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const received: unknown[] = [];
    adapter.subscribe(e => received.push(e));
    await adapter.connect();
    simulateMessage(
      '/devices/M123456789012/events',
      Buffer.from(JSON.stringify({
        gatewayId: 'T142B2FD392FC',
        deviceId: 'M123456789012',
        ts: Date.now(),
        sensors: [
          { sensorId: '1', value: 225.4, units: 'F' },
          { sensorId: '2', value: 165.0, units: 'F' },
        ],
      })),
    );
    expect(received).toHaveLength(2);
    expect(received[0]).toMatchObject({ probeId: 'M123456789012-s1', temperature: 225.4 });
    expect(received[1]).toMatchObject({ probeId: 'M123456789012-s2', temperature: 165.0 });
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

  it('emits event for probe topic /probes/+/events (real gateway topic)', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const received: unknown[] = [];
    adapter.subscribe(e => received.push(e));
    await adapter.connect();
    simulateMessage(
      '/probes/M100280635/events',
      Buffer.from(JSON.stringify({
        gatewayId: 'T142B2FD392FC',
        deviceId: 'M100280635',
        ts: Date.now(),
        sensors: [{ sensorId: '1', value: 195.0, units: 'F' }],
      })),
    );
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ probeId: 'M100280635-s1', temperature: 195.0 });
  });
});
