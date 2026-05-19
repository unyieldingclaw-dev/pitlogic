import type { TemperatureProvider } from '../core/TemperatureProvider.js';
import type { RawProviderEvent } from '../core/ProviderTypes.js';

/**
 * Synchronous test double — no timers, caller pushes events explicitly.
 */
export class ManualProvider implements TemperatureProvider {
  readonly id: string;
  private readonly handlers = new Set<(event: RawProviderEvent) => void>();
  connected = false;
  disconnected = false;

  constructor(id = 'manual-test') {
    this.id = id;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  subscribe(handler: (event: RawProviderEvent) => void): () => void {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  async disconnect(): Promise<void> {
    this.disconnected = true;
  }

  /** Push an event to all subscribers. */
  push(event: RawProviderEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }
}
