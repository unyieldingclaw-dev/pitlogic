import type { TelemetryPersistenceAdapter } from './TelemetryPersistenceAdapter.js';

export class LocalStorageAdapter implements TelemetryPersistenceAdapter {
  constructor(private readonly storage: Storage = globalThis.localStorage) {}

  read(key: string): unknown {
    try {
      const raw = this.storage.getItem(key);
      return raw !== null ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  write(key: string, value: unknown): void {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage quota exceeded — fail silently; stale data is better than a crash.
    }
  }

  delete(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch {
      // Ignore
    }
  }
}
