import type { RawProviderEvent } from './ProviderTypes.js';

export interface TemperatureProvider {
  readonly id: string;
  connect(): Promise<void>;
  subscribe(handler: (event: RawProviderEvent) => void): () => void;
  disconnect(): Promise<void>;
}
