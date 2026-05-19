import type { TemperatureProvider } from './TemperatureProvider.js';

class ProviderRegistryImpl {
  private readonly providers = new Map<string, TemperatureProvider>();

  register(provider: TemperatureProvider): void {
    this.providers.set(provider.id, provider);
  }

  resolve(id: string): TemperatureProvider | undefined {
    return this.providers.get(id);
  }

  getAll(): ReadonlyMap<string, TemperatureProvider> {
    return this.providers;
  }

  unregister(id: string): void {
    this.providers.delete(id);
  }
}

export const ProviderRegistry = new ProviderRegistryImpl();
