import type { TemperatureProvider } from '../../core/TemperatureProvider.js';
import type { RawProviderEvent } from '../../core/ProviderTypes.js';
import { CsvRowSchema } from './csvSchemas.js';

function detectColumns(hdrs: string[]): { timeCol: number; smokerCol: number; probeCols: number[] } {
  const timeCol = hdrs.findIndex(h => /time|date/.test(h));
  const smokerCol = hdrs.findIndex(h => /smoker|ambient|pit|grill/.test(h));
  const probeCols = hdrs.reduce<number[]>((acc, h, i) => {
    if (/probe|ch\s*\d|channel|temp/i.test(h) && !/smoker|ambient|pit/i.test(h)) acc.push(i);
    return acc;
  }, []);
  return { timeCol, smokerCol, probeCols };
}

function parseRows(text: string): RawProviderEvent[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const hdrs = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const { timeCol, smokerCol, probeCols } = detectColumns(hdrs);

  let startTs: number | null = null;
  const events: RawProviderEvent[] = [];

  for (const line of lines.slice(1)) {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const rawTs = timeCol >= 0 ? new Date(cols[timeCol]).getTime() : NaN;
    if (!isNaN(rawTs) && !startTs) startTs = rawTs;
    const capturedAt = !isNaN(rawTs) ? rawTs : (startTs ?? Date.now());

    for (let pi = 0; pi < probeCols.length; pi++) {
      const temperature = parseFloat(cols[probeCols[pi]]);
      if (isNaN(temperature)) continue;
      const raw = { probeId: `probe-${pi}`, status: 'active' as const, temperature, unit: 'F' as const, capturedAt, source: 'csv-import' as const };
      const result = CsvRowSchema.safeParse(raw);
      if (result.success) events.push(result.data);
    }

    if (smokerCol >= 0) {
      const temperature = parseFloat(cols[smokerCol]);
      if (!isNaN(temperature)) {
        const raw = { probeId: 'smoker', status: 'active' as const, temperature, unit: 'F' as const, capturedAt, source: 'csv-import' as const };
        const result = CsvRowSchema.safeParse(raw);
        if (result.success) events.push(result.data);
      }
    }
  }

  return events;
}

/**
 * Batch provider for ThermoWorks CSV exports.
 * Call load() then connect() to replay all rows as RawProviderEvents.
 */
export class CsvProvider implements TemperatureProvider {
  readonly id: string;
  private csvText = '';
  private readonly handlers = new Set<(event: RawProviderEvent) => void>();
  private active = false;

  constructor(id = 'csv') {
    this.id = id;
  }

  load(text: string): void {
    this.csvText = text;
  }

  async connect(): Promise<void> {
    if (!this.csvText) return;
    this.active = true;
    const rows = parseRows(this.csvText);
    for (const row of rows) {
      if (!this.active) break;
      this.emit(row);
    }
  }

  subscribe(handler: (event: RawProviderEvent) => void): () => void {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  async disconnect(): Promise<void> {
    this.active = false;
  }

  private emit(event: RawProviderEvent): void {
    for (const handler of this.handlers) {
      try { handler(event); } catch { /* isolate */ }
    }
  }
}
