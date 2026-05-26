import { describe, it, expect, beforeEach, vi } from 'vitest';
import { save, load, replaceAll } from '../useStorage';

describe('useStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('load', () => {
    it('returns null when storage is empty', () => {
      expect(load()).toBeNull();
    });

    it('returns parsed object when data exists', () => {
      const data = { cooks: [], activeCooks: [], dis: {} };
      localStorage.setItem('pitlogic-v5', JSON.stringify(data));
      expect(load()).toEqual(data);
    });

    it('returns null when stored value is invalid JSON', () => {
      localStorage.setItem('pitlogic-v5', 'not-json');
      expect(load()).toBeNull();
    });

    it('migrates legacy aid string to activeCooks array', () => {
      localStorage.setItem('pitlogic-v5', JSON.stringify({ cooks: [], aid: 'cook-1' }));
      const result = load();
      expect(result.activeCooks).toEqual(['cook-1']);
      expect(result.aid).toBeUndefined();
    });

    it('migrates empty aid string to empty activeCooks array', () => {
      localStorage.setItem('pitlogic-v5', JSON.stringify({ cooks: [], aid: '' }));
      const result = load();
      expect(result.activeCooks).toEqual([]);
      expect(result.aid).toBeUndefined();
    });

    it('persists migrated data back to localStorage', () => {
      localStorage.setItem('pitlogic-v5', JSON.stringify({ cooks: [], aid: 'cook-1' }));
      load();
      const stored = JSON.parse(localStorage.getItem('pitlogic-v5'));
      expect(stored.activeCooks).toEqual(['cook-1']);
      expect(stored.aid).toBeUndefined();
    });

    it('does not migrate when activeCooks already exists', () => {
      localStorage.setItem('pitlogic-v5', JSON.stringify({ cooks: [], activeCooks: ['cook-2'], aid: 'cook-1' }));
      const result = load();
      expect(result.activeCooks).toEqual(['cook-2']);
    });
  });

  describe('save', () => {
    it('writes JSON-serialized data to pitlogic-v5', () => {
      const data = { cooks: [{ id: '1' }], activeCooks: ['1'], dis: {} };
      save(data);
      expect(JSON.parse(localStorage.getItem('pitlogic-v5'))).toEqual(data);
    });

    it('silently swallows localStorage errors', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      expect(() => save({ cooks: [] })).not.toThrow();
    });
  });

  describe('replaceAll', () => {
    it('saves cooks and activeCooks with a fresh dis object', () => {
      const cooks = [{ id: '1' }];
      const activeCooks = ['1'];
      replaceAll({ cooks, activeCooks });
      expect(JSON.parse(localStorage.getItem('pitlogic-v5'))).toEqual({ cooks, activeCooks, dis: {} });
    });
  });
});
