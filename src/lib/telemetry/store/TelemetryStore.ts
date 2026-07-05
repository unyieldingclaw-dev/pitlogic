import type { NormalizedTelemetryEvent } from '../domain/TelemetryEvents.js';
import type { ProbeState } from '../domain/ProbeSemantics.js';
import type { ActiveReading } from '../domain/TelemetryModels.js';
import type { IEventBus } from '../eventBus/types.js';
import { STALE_THRESHOLD_MS } from './StoreTypes.js';

type StateListener = (probes: ReadonlyMap<string, ProbeState>) => void;

/**
 * Authoritative probe state. Derives stale status from capturedAt delta.
 * Derives reconnect when a disconnected probe emits an ActiveReading.
 * MUST NOT import from providers/ or be imported by UI directly.
 */
export class TelemetryStore {
  private readonly probes = new Map<string, ProbeState>();
  private readonly listeners = new Set<StateListener>();
  private staleCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly eventBus: IEventBus) {
    this.eventBus.subscribe(this.handleEvent.bind(this));
  }

  getProbes(): ReadonlyMap<string, ProbeState> {
    return this.probes;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  startStaleCheck(intervalMs = 5_000): void {
    if (this.staleCheckInterval !== null) return;
    this.staleCheckInterval = setInterval(() => {
      this.recomputeStale();
    }, intervalMs);
  }

  stopStaleCheck(): void {
    if (this.staleCheckInterval !== null) {
      clearInterval(this.staleCheckInterval);
      this.staleCheckInterval = null;
    }
  }

  private handleEvent(event: NormalizedTelemetryEvent): void {
    if (event.type === 'probe:reading') {
      this.applyActiveReading(event.reading);
    } else if (event.type === 'probe:disconnected') {
      this.applyDisconnect(event.reading.probeId);
    }
  }

  private applyActiveReading(reading: ActiveReading): void {
    const existing = this.probes.get(reading.probeId);
    const probe: ProbeState = {
      probeId: reading.probeId,
      label: existing?.label ?? reading.probeId,
      occupancy: 'occupied',
      status: 'active',
      lastReading: reading,
      targetTemp: existing?.targetTemp ?? null,
      battery: existing?.battery ?? null,
    };
    this.probes.set(reading.probeId, probe);
    this.notify();
  }

  private applyDisconnect(probeId: string): void {
    const existing = this.probes.get(probeId);
    const probe: ProbeState = {
      probeId,
      label: existing?.label ?? probeId,
      occupancy: existing?.occupancy ?? 'occupied',
      status: 'disconnected',
      lastReading: existing?.lastReading ?? null,
      targetTemp: existing?.targetTemp ?? null,
      battery: existing?.battery ?? null,
    };
    this.probes.set(probeId, probe);
    this.notify();
  }

  private recomputeStale(): void {
    const now = Date.now();
    let changed = false;
    for (const [id, probe] of this.probes) {
      if (probe.status === 'active' && probe.lastReading !== null) {
        const age = now - probe.lastReading.timestamp.capturedAt;
        if (age > STALE_THRESHOLD_MS) {
          this.probes.set(id, { ...probe, status: 'stale' });
          changed = true;
        }
      }
    }
    if (changed) this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try { listener(this.probes); } catch { /* isolate */ }
    }
  }
}
