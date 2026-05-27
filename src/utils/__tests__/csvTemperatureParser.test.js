import { describe, it, expect } from 'vitest';
import { parseCsvReadings } from '../csvTemperatureParser';

const makeCook = (probeCount = 2, startTime = 0) => ({
  startTime,
  probes: Array.from({ length: probeCount }, (_, i) => ({ id: i, name: `Probe ${i + 1}` })),
  smokerReadings: [],
});

describe('parseCsvReadings', () => {
  it('returns null for empty text', () => {
    expect(parseCsvReadings('', makeCook())).toBeNull();
  });

  it('returns null when only a header row exists', () => {
    expect(parseCsvReadings('Time,Probe 1', makeCook())).toBeNull();
  });

  it('parses probe temperatures into pData arrays', () => {
    const csv = 'Time,Probe 1,Probe 2\n2024-01-01T00:00:00,150,160\n2024-01-01T00:05:00,155,165';
    const result = parseCsvReadings(csv, makeCook(2, new Date('2024-01-01T00:00:00').getTime()));
    expect(result).not.toBeNull();
    expect(result.pData[0]).toHaveLength(2);
    expect(result.pData[0][0].temp).toBe(150);
    expect(result.pData[1][0].temp).toBe(160);
  });

  it('parses smoker column into sData', () => {
    const csv = 'Time,Smoker,Probe 1\n2024-01-01T00:00:00,225,150';
    const result = parseCsvReadings(csv, makeCook(1, new Date('2024-01-01T00:00:00').getTime()));
    expect(result.sData).toHaveLength(1);
    expect(result.sData[0].temp).toBe(225);
  });

  it('computes time as minutes from cook startTime', () => {
    const startTime = new Date('2024-01-01T00:00:00').getTime();
    const csv = `Time,Probe 1\n2024-01-01T00:00:00,150\n2024-01-01T00:10:00,160`;
    const result = parseCsvReadings(csv, makeCook(1, startTime));
    expect(result.pData[0][0].time).toBe(0);
    expect(result.pData[0][1].time).toBeCloseTo(10, 1);
  });

  it('skips rows with non-numeric probe values', () => {
    const csv = 'Time,Probe 1\n2024-01-01T00:00:00,\n2024-01-01T00:05:00,155';
    const result = parseCsvReadings(csv, makeCook(1, new Date('2024-01-01T00:00:00').getTime()));
    expect(result.pData[0]).toHaveLength(1);
    expect(result.pData[0][0].temp).toBe(155);
  });

  it('thins readings within 60 seconds of each other', () => {
    const base = new Date('2024-01-01T00:00:00').getTime();
    // 5 readings at 0, 10s, 20s, 30s, 61s — only first + last should survive
    const rows = [0, 10, 20, 30, 61].map(s => {
      const d = new Date(base + s * 1000).toISOString();
      return `${d},150`;
    }).join('\n');
    const csv = `Time,Probe 1\n${rows}`;
    const result = parseCsvReadings(csv, makeCook(1, base));
    expect(result.pData[0]).toHaveLength(2);
  });

  it('returns empty pData arrays when no probe columns match', () => {
    const csv = 'Time,Smoker\n2024-01-01T00:00:00,225';
    const result = parseCsvReadings(csv, makeCook(1, new Date('2024-01-01T00:00:00').getTime()));
    expect(result.pData[0]).toHaveLength(0);
    expect(result.sData).toHaveLength(1);
  });

  it('matches probe columns case-insensitively', () => {
    const csv = 'time,PROBE 1\n2024-01-01T00:00:00,150';
    const result = parseCsvReadings(csv, makeCook(1, new Date('2024-01-01T00:00:00').getTime()));
    expect(result.pData[0]).toHaveLength(1);
  });
});
