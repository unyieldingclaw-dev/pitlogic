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
});
