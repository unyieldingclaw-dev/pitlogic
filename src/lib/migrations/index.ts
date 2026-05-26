import { runMigrations } from './MigrationRunner.js';
import { v1RfxKeyRename } from './versions/v1-rfx-key-rename.js';

const ALL_MIGRATIONS = [v1RfxKeyRename];

export function applyMigrations(storage: Storage = globalThis.localStorage): void {
  runMigrations(ALL_MIGRATIONS, storage);
}
