import type { NormalizedTelemetryEvent } from '../domain/TelemetryEvents.js';
import type { ProbeState } from '../domain/ProbeSemantics.js';
import type { GatewayState, EditableDeviceConfig } from '../domain/GatewayState.js';
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
  private readonly gatewayStateMap = new Map<string, GatewayState>();
  private readonly listeners = new Set<StateListener>();
  private staleCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly eventBus: IEventBus) {
    this.eventBus.subscribe(this.handleEvent.bind(this));
  }

  getProbes(): ReadonlyMap<string, ProbeState> {
    return this.probes;
  }

  getGatewayState(): ReadonlyMap<string, GatewayState> {
    return this.gatewayStateMap;
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
    } else if (event.type === 'gateway:state') {
      this.applyGatewayState(event);
    } else if (event.type === 'probe:battery') {
      this.applyProbeBattery(event.probeId, event.battery);
    } else if (event.type === 'gateway:config') {
      this.applyGatewayConfig(event);
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

  private applyGatewayState(event: Extract<NormalizedTelemetryEvent, { type: 'gateway:state' }>): void {
    const existing = this.gatewayStateMap.get(event.gatewayId);
    const state: GatewayState = {
      gatewayId: event.gatewayId,
      wifiStrength: event.wifiStrength ?? existing?.wifiStrength ?? null,
      battery: event.battery ?? existing?.battery ?? null,
      firmware: event.firmware ?? existing?.firmware ?? null,
      // no null-fallback: every gateway:state payload carries a resolved unit, unlike the sensor fields above
      units: event.units,
      editableConfig: existing?.editableConfig ?? null,
    };
    this.gatewayStateMap.set(event.gatewayId, state);
    this.notify();
  }

  private applyProbeBattery(probeId: string, battery: number): void {
    const existing = this.probes.get(probeId);
    const probe: ProbeState = {
      probeId,
      label: existing?.label ?? probeId,
      occupancy: existing?.occupancy ?? 'occupied',
      // preserve current connectivity status — a battery ping isn't a connectivity signal
      status: existing?.status ?? 'disconnected',
      lastReading: existing?.lastReading ?? null,
      targetTemp: existing?.targetTemp ?? null,
      battery,
    };
    this.probes.set(probeId, probe);
    this.notify();
  }

  private applyGatewayConfig(event: Extract<NormalizedTelemetryEvent, { type: 'gateway:config' }>): void {
    const existing = this.gatewayStateMap.get(event.gatewayId);
    const state: GatewayState = existing ?? {
      gatewayId: event.gatewayId,
      wifiStrength: null,
      battery: null,
      firmware: null,
      units: 'F',
      editableConfig: null,
    };
    this.gatewayStateMap.set(event.gatewayId, { ...state, editableConfig: extractEditableConfig(event.raw) });
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

function extractEditableConfig(raw: Record<string, unknown>): EditableDeviceConfig {
  const channels = Array.isArray(raw.channels) ? (raw.channels as Record<string, unknown>[]) : [];
  const channelLabels: Record<number, string> = {};
  const alarms: Record<number, { high?: number; low?: number }> = {};

  for (const ch of channels) {
    const num = ch.number;
    if (typeof num !== 'number') continue;
    if (typeof ch.label === 'string') channelLabels[num] = ch.label;

    const alarmHigh = ch.alarmHigh as Record<string, unknown> | undefined;
    const alarmLow = ch.alarmLow as Record<string, unknown> | undefined;
    const entry: { high?: number; low?: number } = {};
    if (alarmHigh && typeof alarmHigh.value === 'number') entry.high = alarmHigh.value;
    if (alarmLow && typeof alarmLow.value === 'number') entry.low = alarmLow.value;
    if (entry.high !== undefined || entry.low !== undefined) alarms[num] = entry;
  }

  return {
    channelLabels,
    alarms,
    transmitIntervalInSeconds: typeof raw.transmitIntervalInSeconds === 'number' ? raw.transmitIntervalInSeconds : null,
    recordingIntervalInSeconds: typeof raw.recordingIntervalInSeconds === 'number' ? raw.recordingIntervalInSeconds : null,
  };
}
