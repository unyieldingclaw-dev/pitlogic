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
    expect(gw).toEqual({ gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F' });
  });

  it('merges partial gateway:state updates onto the existing entry', () => {
    const { bus, store } = makeStore();
    bus.publish({ type: 'gateway:state', gatewayId: 'gw1', wifiStrength: 88, battery: null, firmware: null, units: 'F', timestamp: Date.now() });
    bus.publish({ type: 'gateway:state', gatewayId: 'gw1', wifiStrength: null, battery: 'C', firmware: null, units: 'F', timestamp: Date.now() });
    expect(store.getGatewayState().get('gw1')).toEqual({ gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: null, units: 'F' });
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
});
