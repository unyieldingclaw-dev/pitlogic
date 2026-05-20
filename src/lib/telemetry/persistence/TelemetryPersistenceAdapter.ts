export interface TelemetryPersistenceAdapter {
  read(key: string): unknown;
  write(key: string, value: unknown): void;
  delete(key: string): void;
}
