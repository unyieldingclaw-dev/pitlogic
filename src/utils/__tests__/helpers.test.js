import { describe, it, expect } from 'vitest';
import { PROBE_COLORS, dur, shortDate } from '../helpers';

describe('PROBE_COLORS', () => {
  it('exports an array of 6 hex colors', () => {
    expect(Array.isArray(PROBE_COLORS)).toBe(true);
    expect(PROBE_COLORS.length).toBe(6);
    PROBE_COLORS.forEach(c => expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/));
  });
});

describe('dur', () => {
  it('formats duration correctly', () => {
    const start = Date.now() - 90 * 60 * 1000; // 1h 30m ago
    const result = dur(start);
    expect(result).toMatch(/1h/);
  });

  it('handles start + end timestamps', () => {
    const start = 0;
    const end = 3600000 * 2.5; // 2h 30m
    const result = dur(start, end);
    expect(result).toMatch(/2h/);
  });
});

describe('shortDate', () => {
  it('returns a non-empty string for a valid timestamp', () => {
    const result = shortDate(Date.now());
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
