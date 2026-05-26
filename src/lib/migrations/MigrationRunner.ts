import type { Migration, MigrationResult, MigrationState } from './types.js';

const STATE_KEY = 'pitlogic-migrations-v1';

function readState(storage: Storage): MigrationState {
  try {
    const raw = storage.getItem(STATE_KEY);
    if (raw === null) return { completed: [] };
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'completed' in parsed &&
      Array.isArray((parsed as { completed: unknown }).completed)
    ) {
      return parsed as MigrationState;
    }
    return { completed: [] };
  } catch {
    return { completed: [] };
  }
}

function markComplete(storage: Storage, state: MigrationState, migrationId: string, completedAt: number): void {
  const next: MigrationState = {
    completed: [...state.completed, { id: migrationId, completedAt }],
  };
  storage.setItem(STATE_KEY, JSON.stringify(next));
}

export function runMigrations(
  migrations: Migration[],
  storage: Storage = globalThis.localStorage,
): MigrationResult[] {
  const state = readState(storage);
  const completed = new Set(state.completed.map((r) => r.id));
  const results: MigrationResult[] = [];

  for (const migration of migrations) {
    if (completed.has(migration.id)) continue;

    const result = migration.run(storage);
    results.push(result);

    if (result.success) {
      // Re-read state each time to stay atomic across partial runs.
      const current = readState(storage);
      markComplete(storage, current, migration.id, Date.now());
    }
  }

  return results;
}
