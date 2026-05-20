import type { NormalizedTelemetryEvent } from '../domain/TelemetryEvents.js';

export type EventHandler = (event: NormalizedTelemetryEvent) => void;

export interface IEventBus {
  subscribe(handler: EventHandler): () => void;
  publish(event: NormalizedTelemetryEvent): void;
}
