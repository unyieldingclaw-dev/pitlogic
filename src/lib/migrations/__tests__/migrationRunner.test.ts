import { describe, it, expect, beforeEach } from 'vitest';
import { runMigrations } from '../MigrationRunner.js';
import { v1RfxKeyRename } from '../versions/v1-rfx-key-rename.js';

// Minimal Storage stub backed by a plain Map.
function makeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
  } as Storage;
}

const MIGRATIONS = [v1RfxKeyRename];

describe('MigrationRunner', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = makeStorage();
  });

  it('case 1: fresh install — no old keys, no new keys — runs no-op and marks complete', () => {
    const results = runMigrations(MIGRATIONS, storage);
    expect(results).toHaveLength(1);
    expect(results[0]!.success).toBe(true);

    const state = JSON.parse(storage.getItem('pitlogic-migrations-v1')!);
    expect(state.completed).toHaveLength(1);
    expect(state.completed[0].id).toBe('v1-rfx-key-rename');
  });

  it('case 2: successful migration — old keys present, migrates all three', () => {
    const cooks = JSON.stringify([{ id: '1' }]);
    const recipes = JSON.stringify([{ id: '2' }]);
    const prefs = JSON.stringify({ unit: 'F' });
    storage.setItem('rfx-v5', cooks);
    storage.setItem('rfx-recipes-v1', recipes);
    storage.setItem('rfx-prefs-v1', prefs);

    runMigrations(MIGRATIONS, storage);

    expect(storage.getItem('pitlogic-v5')).toBe(cooks);
    expect(storage.getItem('pitlogic-recipes-v1')).toBe(recipes);
    expect(storage.getItem('pitlogic-prefs-v1')).toBe(prefs);

    expect(storage.getItem('rfx-v5')).toBeNull();
    expect(storage.getItem('rfx-recipes-v1')).toBeNull();
    expect(storage.getItem('rfx-prefs-v1')).toBeNull();
  });

  it('case 3: corrupted legacy data — invalid JSON skipped, app startup not blocked', () => {
    storage.setItem('rfx-v5', 'not-valid-json');
    storage.setItem('rfx-recipes-v1', JSON.stringify([{ id: 'ok' }]));

    const results = runMigrations(MIGRATIONS, storage);
    expect(results[0]!.success).toBe(true);

    // Corrupted key was skipped — not moved to new key
    expect(storage.getItem('pitlogic-v5')).toBeNull();
    // Valid key was migrated
    expect(storage.getItem('pitlogic-recipes-v1')).toBe(JSON.stringify([{ id: 'ok' }]));
  });

  it('case 4: partially migrated — one key done, one not — resumes safely', () => {
    const cooks = JSON.stringify([{ id: '1' }]);
    const recipes = JSON.stringify([{ id: '2' }]);
    // Simulate partial: new cooks key already written, old recipes still there
    storage.setItem('pitlogic-v5', cooks);
    storage.setItem('rfx-recipes-v1', recipes);

    runMigrations(MIGRATIONS, storage);

    expect(storage.getItem('pitlogic-v5')).toBe(cooks);
    expect(storage.getItem('pitlogic-recipes-v1')).toBe(recipes);
    expect(storage.getItem('rfx-recipes-v1')).toBeNull();
  });

  it('case 5: idempotent — runner called twice, no double-write', () => {
    storage.setItem('rfx-v5', JSON.stringify([{ id: '1' }]));

    runMigrations(MIGRATIONS, storage);
    // Modify new key to detect if a second run overwrites it
    storage.setItem('pitlogic-v5', JSON.stringify([{ id: 'modified' }]));

    runMigrations(MIGRATIONS, storage);

    // Second run skips the already-completed migration
    expect(storage.getItem('pitlogic-v5')).toBe(JSON.stringify([{ id: 'modified' }]));

    // Migration state still has exactly one completed entry
    const state = JSON.parse(storage.getItem('pitlogic-migrations-v1')!);
    expect(state.completed).toHaveLength(1);
  });

  it('case 6: new key exists alongside old key — keeps new data, removes old', () => {
    const oldData = JSON.stringify([{ id: 'old' }]);
    const newData = JSON.stringify([{ id: 'new' }]);
    storage.setItem('rfx-v5', oldData);
    storage.setItem('pitlogic-v5', newData);

    runMigrations(MIGRATIONS, storage);

    // New data preserved
    expect(storage.getItem('pitlogic-v5')).toBe(newData);
    // Old key removed
    expect(storage.getItem('rfx-v5')).toBeNull();
  });
});
