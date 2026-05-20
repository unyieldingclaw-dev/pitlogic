import type { TemperatureProvider } from '../../core/TemperatureProvider.js';
import type { RawProviderEvent } from '../../core/ProviderTypes.js';

export interface MockProbeConfig {
  probeId: string;
  startTempF: number;
  /** °F per tick. */
  ratePerTick: number;
  /** ms between ticks. Default 1000. */
  tickIntervalMs?: number;
}

/**
 * Deterministic synthetic telemetry for tests and local development.
 * Emits ActiveReading events on a configurable interval.
 */
export class MockProvider implements TemperatureProvider {
  readonly id: string;
  private readonly probes: MockProbeConfig[];
  private readonly handlers = new Set<(event: RawProviderEvent) => void>();
  private intervals: ReturnType<typeof setInterval>[] = [];
  private temperatures: Map<string, number> = new Map();

  constructor(id: string, probes: MockProbeConfig[]) {
    this.id = id;
    this.probes = probes;
  }

  async connect(): Promise<void> {
    for (const probe of this.probes) {
      this.temperatures.set(probe.probeId, probe.startTempF);
      const interval = setInterval(() => {
        const current = this.temperatures.get(probe.probeId) ?? probe.startTempF;
        const next = current + probe.ratePerTick;
        this.temperatures.set(probe.probeId, next);
        this.emit({
          probeId: probe.probeId,
          status: 'active',
          temperature: next,
          unit: 'F',
          capturedAt: Date.now(),
          source: 'synthetic',
        });
      }, probe.tickIntervalMs ?? 1000);
      this.intervals.push(interval);
    }
  }

  subscribe(handler: (event: RawProviderEvent) => void): () => void {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  async disconnect(): Promise<void> {
    for (const interval of this.intervals) clearInterval(interval);
    this.intervals = [];
  }

  private emit(event: RawProviderEvent): void {
    for (const handler of this.handlers) {
      try { handler(event); } catch { /* isolate */ }
    }
  }
}
