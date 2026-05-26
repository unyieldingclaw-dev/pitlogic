import type { NormalizedTelemetryEvent } from '../domain/TelemetryEvents.js';
import type { EventHandler, IEventBus } from './types.js';

/**
 * Typed pub/sub — transport-level fanout only.
 * MUST NOT: deduplicate, derive state, persist, manage sessions.
 */
export class EventBus implements IEventBus {
  private readonly handlers = new Set<EventHandler>();

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  publish(event: NormalizedTelemetryEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch {
        // Isolate handler failures — one bad subscriber must not drop others.
      }
    }
  }
}

export const globalEventBus = new EventBus();
