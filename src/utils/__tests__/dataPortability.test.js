import { describe, it, expect } from 'vitest';
import { buildExport, parseImport, mergeCooks } from '../dataPortability';

const makeCookState = (overrides = {}) => ({
  cooks: [{ id: '1', cut: 'Brisket' }, { id: '2', cut: 'Pork Butt' }],
  activeCooks: [],
  dis: { stall_1_0: true },
  ...overrides,
});

describe('buildExport', () => {
  it('sets version to 1', () => {
    const result = buildExport(makeCookState(), []);
    expect(result.version).toBe(1);
  });

  it('includes cooks and activeCooks', () => {
    const state = makeCookState();
    const result = buildExport(state, []);
    expect(result.cooks).toEqual(state.cooks);
    expect(result.activeCooks).toEqual(state.activeCooks);
  });

  it('includes recipes', () => {
    const recipes = [{ id: 'r1', name: 'Rub' }];
    const result = buildExport(makeCookState(), recipes);
    expect(result.recipes).toEqual(recipes);
  });

  it('sets exportedAt close to now', () => {
    const before = Date.now();
    const result = buildExport(makeCookState(), []);
    const after = Date.now();
    expect(result.exportedAt).toBeGreaterThanOrEqual(before);
    expect(result.exportedAt).toBeLessThanOrEqual(after);
  });

  it('does not include dis (transient state)', () => {
    const result = buildExport(makeCookState(), []);
    expect(result.dis).toBeUndefined();
  });
});

describe('parseImport', () => {
  const validPayload = JSON.stringify({
    version: 1,
    exportedAt: Date.now(),
    cooks: [{ id: '1' }],
    activeCooks: [],
    recipes: [{ id: 'r1' }],
  });

  it('returns ok:true for a valid backup', () => {
    const result = parseImport(validPayload);
    expect(result.ok).toBe(true);
    expect(result.data.cooks).toHaveLength(1);
    expect(result.data.recipes).toHaveLength(1);
  });

  it('returns ok:false for invalid JSON', () => {
    const result = parseImport('{not json}');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Invalid JSON');
  });

  it('returns ok:false for wrong version', () => {
    const result = parseImport(JSON.stringify({ version: 99, cooks: [], recipes: [] }));
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Unknown backup version');
  });

  it('returns ok:false when version is missing', () => {
    const result = parseImport(JSON.stringify({ cooks: [], recipes: [] }));
    expect(result.ok).toBe(false);
  });

  it('returns ok:false when cooks is not an array', () => {
    const result = parseImport(JSON.stringify({ version: 1, cooks: null, recipes: [] }));
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Missing cooks array');
  });

  it('returns ok:false when recipes is not an array', () => {
    const result = parseImport(JSON.stringify({ version: 1, cooks: [], recipes: 'oops' }));
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Missing recipes array');
  });
});

describe('mergeCooks', () => {
  it('adds cooks not in existing', () => {
    const existing = [{ id: '1' }];
    const incoming = [{ id: '2' }, { id: '3' }];
    const { merged, added, skipped } = mergeCooks(existing, incoming);
    expect(merged).toHaveLength(3);
    expect(added).toBe(2);
    expect(skipped).toBe(0);
  });

  it('skips cooks whose id already exists', () => {
    const existing = [{ id: '1' }, { id: '2' }];
    const incoming = [{ id: '1' }, { id: '3' }];
    const { merged, added, skipped } = mergeCooks(existing, incoming);
    expect(merged).toHaveLength(3);
    expect(added).toBe(1);
    expect(skipped).toBe(1);
  });

  it('returns all existing when incoming is empty', () => {
    const existing = [{ id: '1' }];
    const { merged, added, skipped } = mergeCooks(existing, []);
    expect(merged).toEqual(existing);
    expect(added).toBe(0);
    expect(skipped).toBe(0);
  });

  it('returns all incoming when existing is empty', () => {
    const incoming = [{ id: '1' }, { id: '2' }];
    const { merged, added, skipped } = mergeCooks([], incoming);
    expect(merged).toHaveLength(2);
    expect(added).toBe(2);
    expect(skipped).toBe(0);
  });

  it('preserves order: existing first, then new', () => {
    const existing = [{ id: '1' }];
    const incoming = [{ id: '2' }];
    const { merged } = mergeCooks(existing, incoming);
    expect(merged[0].id).toBe('1');
    expect(merged[1].id).toBe('2');
  });
});
