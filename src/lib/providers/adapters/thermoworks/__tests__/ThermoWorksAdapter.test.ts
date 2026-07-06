import { describe, it, expect, beforeEach, vi } from 'vitest';
import { transformPayload } from '../ThermoWorksAdapter.js';

const TOPIC = '/probes/M123456789012/events';

function makePayload(channels: unknown[]): Buffer {
  return Buffer.from(JSON.stringify({ gatewayId: 'M123456789012', channels }));
}

describe('transformPayload', () => {
  it('emits one event per temperature reading in a single channel', () => {
    const payload = makePayload([
      { number: 1, ts: 2_000_000_000_000, readings: [{ value: 225.4, type: 'T' }] },
    ]);
    const events = transformPayload(TOPIC, payload);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      probeId: 'M123456789012-ch1',
      capturedAt: 2_000_000_000_000,
      temperature: 225.4,
      unit: 'F',
      source: 'live',
    });
  });

  it('emits one event per channel when multiple channels are present', () => {
    const payload = makePayload([
      { number: 1, ts: 2_000_000_000_000, readings: [{ value: 200.0, type: 'T' }] },
      { number: 2, ts: 2_000_000_000_000, readings: [{ value: 165.0, type: 'T' }] },
    ]);
    const events = transformPayload(TOPIC, payload);
    expect(events).toHaveLength(2);
    expect(events[0].probeId).toBe('M123456789012-ch1');
    expect(events[1].probeId).toBe('M123456789012-ch2');
  });

  it('emits zero events when no readings have type T', () => {
    const payload = makePayload([
      { number: 1, ts: 2_000_000_000_000, readings: [{ value: 50.0, type: 'H' }] },
    ]);
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('discards events with ts < 1e10 (seconds-epoch detection)', () => {
    const payload = makePayload([
      { number: 1, ts: 1_716_825_600, readings: [{ value: 200.0, type: 'T' }] },
    ]);
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('discards events with non-integer ts', () => {
    const payload = makePayload([
      { number: 1, ts: '2024-05-01T00:00:00Z', readings: [{ value: 200.0, type: 'T' }] },
    ]);
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('returns empty array for malformed JSON payload', () => {
    expect(transformPayload(TOPIC, Buffer.from('not json'))).toHaveLength(0);
  });

  it('returns empty array when payload has no channels array', () => {
    const payload = Buffer.from(JSON.stringify({ gatewayId: 'M123456789012' }));
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('returns empty array for an unrecognised topic pattern', () => {
    const payload = makePayload([
      { number: 1, ts: 2_000_000_000_000, readings: [{ value: 200.0, type: 'T' }] },
    ]);
    expect(transformPayload('/something/else', payload)).toHaveLength(0);
  });

  it('emits a gateway:state-shaped raw event for a device state topic', () => {
    const payload = Buffer.from(JSON.stringify({
      wifi_strength: 88, battery: 'C', firmware: 'v2.45', units: 'F',
    }));
    const events = transformPayload('/devices/M123456789012/state', payload, { now: 5_000 });
    expect(events).toEqual([
      { gatewayId: 'M123456789012', capturedAt: 5_000, wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F' },
    ]);
  });

  it('gateway:state raw event omits fields absent from the payload', () => {
    const payload = Buffer.from(JSON.stringify({ wifi_strength: 50 }));
    const events = transformPayload('/devices/M123456789012/state', payload, { now: 5_000 });
    expect(events).toEqual([
      { gatewayId: 'M123456789012', capturedAt: 5_000, wifiStrength: 50 },
    ]);
  });

  it('emits a probe-battery raw event when a probe payload has battery but no channels', () => {
    const payload = Buffer.from(JSON.stringify({ gatewayId: 'M123456789012', battery: 42 }));
    const events = transformPayload('/probes/M123456789012/events', payload, { now: 5_000 });
    expect(events).toEqual([
      { probeId: 'M123456789012-ch1', capturedAt: 5_000, battery: 42 },
    ]);
  });

  it('still returns empty array for a probe payload with neither channels nor battery', () => {
    const payload = Buffer.from(JSON.stringify({ gatewayId: 'M123456789012', firmware: '1.1.10' }));
    expect(transformPayload('/probes/M123456789012/events', payload)).toHaveLength(0);
  });

  it('injects gateway units into channel readings via getUnitsForGateway', () => {
    const payload = Buffer.from(JSON.stringify({
      gatewayId: 'M123456789012',
      channels: [{ number: 1, ts: 2_000_000_000_000, readings: [{ value: 100.0, type: 'T' }] }],
    }));
    const events = transformPayload('/probes/M123456789012/events', payload, {
      getUnitsForGateway: () => 'C',
    });
    expect(events[0]).toMatchObject({ unit: 'C' });
  });

  it('defaults to F units when getUnitsForGateway is not provided', () => {
    const payload = Buffer.from(JSON.stringify({
      gatewayId: 'M123456789012',
      channels: [{ number: 1, ts: 2_000_000_000_000, readings: [{ value: 100.0, type: 'T' }] }],
    }));
    const events = transformPayload('/probes/M123456789012/events', payload);
    expect(events[0]).toMatchObject({ unit: 'F' });
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

  it('connect() creates client and subscribes to /probes/+/events', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    expect(mockConnectAsync).toHaveBeenCalledWith(VALID_CONFIG.brokerUrl, {
      username: VALID_CONFIG.username,
      password: VALID_CONFIG.password,
    });
    expect(mockSubscribeAsync).toHaveBeenCalledWith('/probes/+/events');
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
      '/probes/M123/events',
      Buffer.from(JSON.stringify({
        gatewayId: 'M123',
        channels: [{ number: 1, ts: 2_000_000_000_000, readings: [{ value: 200, type: 'T' }] }],
      })),
    );
    expect(received).toHaveLength(0);
  });

  it('emits one normalized event per channel reading on message', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const received: unknown[] = [];
    adapter.subscribe(e => received.push(e));
    await adapter.connect();
    simulateMessage(
      '/probes/M123456789012/events',
      Buffer.from(JSON.stringify({
        gatewayId: 'M123456789012',
        channels: [
          { number: 1, ts: 2_000_000_000_000, readings: [{ value: 225.4, type: 'T' }] },
          { number: 2, ts: 2_000_000_000_000, readings: [{ value: 165.0, type: 'T' }] },
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

  it('connect() also subscribes to /devices/+/state', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    expect(mockSubscribeAsync).toHaveBeenCalledWith('/devices/+/state');
  });

  it('reconnect with sessionPresent=false resubscribes to both topics', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    const callsBefore = mockSubscribeAsync.mock.calls.length;
    simulateReconnect(false);
    await Promise.resolve();
    expect(mockSubscribeAsync.mock.calls.length).toBe(callsBefore + 2);
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
        channels: [{ number: 1, ts: 2_000_000_000_000, readings: [{ value: 100.0, type: 'T' }] }],
      })),
    );
    const readingEvent = received.find(e => (e as Record<string, unknown>).temperature !== undefined);
    expect(readingEvent).toMatchObject({ unit: 'C' });
  });
});
