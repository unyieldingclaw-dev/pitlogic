export interface MigrationRecord {
  id: string;
  completedAt: number;
}

export interface MigrationState {
  completed: MigrationRecord[];
}

export interface MigrationResult {
  migrationId: string;
  success: boolean;
  error?: string;
}

export interface Migration {
  id: string;
  run(storage: Storage): MigrationResult;
}
