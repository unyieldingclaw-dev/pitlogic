import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TelemetryStore } from '../TelemetryStore.js';
import { EventBus } from '../../eventBus/EventBus.js';
import { STALE_THRESHOLD_MS } from '../StoreTypes.js';
import { fakeActiveReading, fakeDisconnectedReading } from '../../../providers/testing/fakeTelemetry.js';

function makeStore() {
  const bus = new EventBus();
  const store = new TelemetryStore(bus);
  return { bus, store };
}

describe('TelemetryStore', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('registers a probe on probe:reading', () => {
    const { bus, store } = makeStore();
    const reading = fakeActiveReading('p1', 200);
    bus.publish({ type: 'probe:reading', reading });
    const probe = store.getProbes().get('p1');
    expect(probe).toBeDefined();
    expect(probe?.status).toBe('active');
    expect(probe?.lastReading?.temp.valueF).toBe(200);
  });

  it('marks probe disconnected on probe:disconnected', () => {
    const { bus, store } = makeStore();
    bus.publish({ type: 'probe:reading', reading: fakeActiveReading('p1', 200) });
    bus.publish({ type: 'probe:disconnected', reading: fakeDisconnectedReading('p1') });
    expect(store.getProbes().get('p1')?.status).toBe('disconnected');
  });

  it('derives reconnect when disconnected probe emits active reading', () => {
    const { bus, store } = makeStore();
    bus.publish({ type: 'probe:reading', reading: fakeActiveReading('p1', 200) });
    bus.publish({ type: 'probe:disconnected', reading: fakeDisconnectedReading('p1') });
    expect(store.getProbes().get('p1')?.status).toBe('disconnected');

    bus.publish({ type: 'probe:reading', reading: fakeActiveReading('p1', 205) });
    expect(store.getProbes().get('p1')?.status).toBe('active');
  });

  it('derives stale status when capturedAt exceeds threshold', () => {
    vi.useFakeTimers();
    const { bus, store } = makeStore();

    const oldCapturedAt = Date.now() - STALE_THRESHOLD_MS - 1000;
    bus.publish({ type: 'probe:reading', reading: fakeActiveReading('p1', 200, oldCapturedAt) });

    store.startStaleCheck(100);
    vi.advanceTimersByTime(200);
    store.stopStaleCheck();

    expect(store.getProbes().get('p1')?.status).toBe('stale');
  });

  it('does not mark probe stale if reading is recent', () => {
    vi.useFakeTimers();
    const { bus, store } = makeStore();

    bus.publish({ type: 'probe:reading', reading: fakeActiveReading('p1', 200, Date.now()) });
    store.startStaleCheck(100);
    vi.advanceTimersByTime(200);
    store.stopStaleCheck();

    expect(store.getProbes().get('p1')?.status).toBe('active');
  });

  it('notifies listeners on state change', () => {
    const { bus, store } = makeStore();
    const calls: number[] = [];
    store.subscribe(() => calls.push(1));

    bus.publish({ type: 'probe:reading', reading: fakeActiveReading('p1', 200) });
    bus.publish({ type: 'probe:disconnected', reading: fakeDisconnectedReading('p1') });

    expect(calls).toHaveLength(2);
  });

  it('unsubscribe stops listener notifications', () => {
    const { bus, store } = makeStore();
    const calls: number[] = [];
    const unsub = store.subscribe(() => calls.push(1));

    bus.publish({ type: 'probe:reading', reading: fakeActiveReading('p1', 200) });
    unsub();
    bus.publish({ type: 'probe:reading', reading: fakeActiveReading('p1', 205) });

    expect(calls).toHaveLength(1);
  });

  it('registers gateway state on gateway:state', () => {
    const { bus, store } = makeStore();
    bus.publish({
      type: 'gateway:state', gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F', timestamp: Date.now(),
    });
    const gw = store.getGatewayState().get('gw1');
    expect(gw).toEqual({ gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F', editableConfig: null });
  });

  it('merges partial gateway:state updates onto the existing entry', () => {
    const { bus, store } = makeStore();
    bus.publish({ type: 'gateway:state', gatewayId: 'gw1', wifiStrength: 88, battery: null, firmware: null, units: 'F', timestamp: Date.now() });
    bus.publish({ type: 'gateway:state', gatewayId: 'gw1', wifiStrength: null, battery: 'C', firmware: null, units: 'F', timestamp: Date.now() });
    expect(store.getGatewayState().get('gw1')).toEqual({ gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: null, units: 'F', editableConfig: null });
  });

  it('sets battery on the matching probe when probe:battery arrives', () => {
    const { bus, store } = makeStore();
    bus.publish({ type: 'probe:reading', reading: fakeActiveReading('p1', 200) });
    bus.publish({ type: 'probe:battery', probeId: 'p1', battery: 15, timestamp: Date.now() });
    expect(store.getProbes().get('p1')?.battery).toBe(15);
  });

  it('creates a probe entry from probe:battery alone if the probe is unknown', () => {
    const { bus, store } = makeStore();
    bus.publish({ type: 'probe:battery', probeId: 'new-probe', battery: 15, timestamp: Date.now() });
    const probe = store.getProbes().get('new-probe');
    expect(probe?.battery).toBe(15);
    expect(probe?.status).toBe('disconnected');
  });

  it('notifies listeners on gateway:state and probe:battery', () => {
    const { bus, store } = makeStore();
    const calls: number[] = [];
    store.subscribe(() => calls.push(1));
    bus.publish({ type: 'gateway:state', gatewayId: 'gw1', wifiStrength: 1, battery: null, firmware: null, units: 'F', timestamp: Date.now() });
    bus.publish({ type: 'probe:battery', probeId: 'p1', battery: 15, timestamp: Date.now() });
    expect(calls).toHaveLength(2);
  });

  it('extracts editableConfig from a gateway:config event', () => {
    const { bus, store } = makeStore();
    const raw = {
      transmitIntervalInSeconds: 60,
      recordingIntervalInSeconds: 30,
      channels: [
        { number: 1, label: 'Brisket', alarmHigh: { value: 200 }, alarmLow: { value: 50 } },
        { number: 2, label: 'Ribs' },
      ],
    };
    bus.publish({ type: 'gateway:config', gatewayId: 'gw1', raw, timestamp: Date.now() });
    expect(store.getGatewayState().get('gw1')?.editableConfig).toEqual({
      channelLabels: { 1: 'Brisket', 2: 'Ribs' },
      alarms: { 1: { high: 200, low: 50 } },
      transmitIntervalInSeconds: 60,
      recordingIntervalInSeconds: 30,
    });
  });

  it('applying gateway:config to an unknown gateway creates a gateway entry with null sensor fields', () => {
    const { bus, store } = makeStore();
    bus.publish({ type: 'gateway:config', gatewayId: 'gw1', raw: { channels: [] }, timestamp: Date.now() });
    const gw = store.getGatewayState().get('gw1');
    expect(gw?.wifiStrength).toBeNull();
    expect(gw?.battery).toBeNull();
    expect(gw?.firmware).toBeNull();
    expect(gw?.units).toBe('F');
  });

  it('preserves existing sensor fields when a gateway:config event arrives for a known gateway', () => {
    const { bus, store } = makeStore();
    bus.publish({ type: 'gateway:state', gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F', timestamp: Date.now() });
    bus.publish({ type: 'gateway:config', gatewayId: 'gw1', raw: { channels: [] }, timestamp: Date.now() });
    const gw = store.getGatewayState().get('gw1');
    expect(gw?.wifiStrength).toBe(88);
    expect(gw?.battery).toBe('C');
  });

  it('handles a config with no channels array (empty editableConfig)', () => {
    const { bus, store } = makeStore();
    bus.publish({ type: 'gateway:config', gatewayId: 'gw1', raw: {}, timestamp: Date.now() });
    expect(store.getGatewayState().get('gw1')?.editableConfig).toEqual({
      channelLabels: {},
      alarms: {},
      transmitIntervalInSeconds: null,
      recordingIntervalInSeconds: null,
    });
  });

  it('notifies listeners on gateway:config', () => {
    const { bus, store } = makeStore();
    const calls: number[] = [];
    store.subscribe(() => calls.push(1));
    bus.publish({ type: 'gateway:config', gatewayId: 'gw1', raw: {}, timestamp: Date.now() });
    expect(calls).toHaveLength(1);
  });
});
