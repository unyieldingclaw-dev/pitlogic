import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockProvider } from '../MockProvider.js';
import type { RawProviderEvent } from '../../../core/ProviderTypes.js';

describe('MockProvider', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('emits active readings on tick interval', async () => {
    const provider = new MockProvider('mock', [
      { probeId: 'p1', startTempF: 100, ratePerTick: 5, tickIntervalMs: 1000 },
    ]);
    const events: RawProviderEvent[] = [];
    provider.subscribe(e => events.push(e));
    await provider.connect();

    vi.advanceTimersByTime(3000);
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ probeId: 'p1', status: 'active', unit: 'F', source: 'synthetic' });
  });

  it('increments temperature by ratePerTick each tick', async () => {
    const provider = new MockProvider('mock', [
      { probeId: 'p1', startTempF: 200, ratePerTick: 10, tickIntervalMs: 1000 },
    ]);
    const temps: number[] = [];
    provider.subscribe(e => { if (typeof e.temperature === 'number') temps.push(e.temperature); });
    await provider.connect();

    vi.advanceTimersByTime(3000);
    expect(temps).toEqual([210, 220, 230]);
  });

  it('stops emitting after disconnect', async () => {
    const provider = new MockProvider('mock', [
      { probeId: 'p1', startTempF: 100, ratePerTick: 1, tickIntervalMs: 1000 },
    ]);
    const events: RawProviderEvent[] = [];
    provider.subscribe(e => events.push(e));
    await provider.connect();

    vi.advanceTimersByTime(2000);
    await provider.disconnect();
    vi.advanceTimersByTime(3000);

    expect(events).toHaveLength(2);
  });

  it('supports multiple probes with independent configs', async () => {
    const provider = new MockProvider('mock', [
      { probeId: 'p1', startTempF: 100, ratePerTick: 1, tickIntervalMs: 500 },
      { probeId: 'p2', startTempF: 200, ratePerTick: 2, tickIntervalMs: 1000 },
    ]);
    const byProbe: Record<string, RawProviderEvent[]> = {};
    provider.subscribe(e => {
      const id = String(e.probeId);
      byProbe[id] = [...(byProbe[id] ?? []), e];
    });
    await provider.connect();

    vi.advanceTimersByTime(2000);
    expect(byProbe['p1']).toHaveLength(4);
    expect(byProbe['p2']).toHaveLength(2);
  });

  it('unsubscribe stops receiving events', async () => {
    const provider = new MockProvider('mock', [
      { probeId: 'p1', startTempF: 100, ratePerTick: 1, tickIntervalMs: 1000 },
    ]);
    const events: RawProviderEvent[] = [];
    const unsub = provider.subscribe(e => events.push(e));
    await provider.connect();

    vi.advanceTimersByTime(1000);
    unsub();
    vi.advanceTimersByTime(2000);

    expect(events).toHaveLength(1);
  });
});
