import type { Migration, MigrationResult } from '../types.js';

const KEY_MAP: Array<[string, string]> = [
  ['rfx-v5', 'pitlogic-v5'],
  ['rfx-recipes-v1', 'pitlogic-recipes-v1'],
  ['rfx-prefs-v1', 'pitlogic-prefs-v1'],
];

export const v1RfxKeyRename: Migration = {
  id: 'v1-rfx-key-rename',

  run(storage: Storage): MigrationResult {
    try {
      for (const [oldKey, newKey] of KEY_MAP) {
        const raw = storage.getItem(oldKey);
        if (raw === null) {
          // Old key absent — nothing to migrate for this key.
          continue;
        }

        // Never overwrite newer data.
        if (storage.getItem(newKey) !== null) {
          if (process.env.NODE_ENV !== 'production') {
            console.debug(`[migration] ${this.id}: new key "${newKey}" already exists, skipping`);
          }
          storage.removeItem(oldKey);
          continue;
        }

        // Validate JSON before moving — don't migrate corrupted data.
        try {
          JSON.parse(raw);
        } catch {
          if (process.env.NODE_ENV !== 'production') {
            console.debug(`[migration] ${this.id}: corrupted JSON at "${oldKey}", skipping key`);
          }
          continue;
        }

        storage.setItem(newKey, raw);
        storage.removeItem(oldKey);

        if (process.env.NODE_ENV !== 'production') {
          console.debug(`[migration] ${this.id}: migrated "${oldKey}" → "${newKey}"`);
        }
      }

      return { migrationId: this.id, success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[migration] ${this.id}: error —`, error);
      }
      return { migrationId: this.id, success: false, error };
    }
  },
};
