import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock localStorage
const store = {};
const localStorageMock = {
  getItem: vi.fn(key => store[key] ?? null),
  setItem: vi.fn((key, val) => { store[key] = val; }),
  removeItem: vi.fn(key => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

import { parsePlanToEatCSV } from '../../utils/planToEatParser';
import { useRecipes } from '../useRecipes';

describe('parsePlanToEatCSV — integration with useRecipes importMany logic', () => {
  beforeEach(() => { localStorageMock.clear(); });

  it('parsed CSV produces valid recipe objects for importMany', () => {
    const csv = 'Name,Ingredients,Directions\nTest Rub,"2 tbsp paprika;1 tbsp sugar",Mix well';
    const parsed = parsePlanToEatCSV(csv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('Test Rub');
    expect(parsed[0].ingredients).toHaveLength(2);
    expect(parsed[0].linkedCuts).toEqual([]);
    expect(parsed[0].rating).toBe(0);
  });
});

describe('useRecipes', () => {
  beforeEach(() => { localStorageMock.clear(); });

  it('starts with empty recipes when storage is empty', () => {
    const { result } = renderHook(() => useRecipes());
    expect(result.current.recipes).toEqual([]);
  });

  it('loads recipes from localStorage on mount', () => {
    const stored = [{ id: '1', name: 'Brisket Rub', ingredients: [] }];
    localStorageMock.setItem('pitlogic-recipes-v1', JSON.stringify(stored));
    const { result } = renderHook(() => useRecipes());
    expect(result.current.recipes).toEqual(stored);
  });

  describe('add', () => {
    it('prepends a new recipe with a generated id and returns the id', () => {
      const { result } = renderHook(() => useRecipes());
      let returnedId;
      act(() => { returnedId = result.current.add({ name: 'Dry Rub', ingredients: [] }); });
      expect(result.current.recipes).toHaveLength(1);
      expect(result.current.recipes[0].name).toBe('Dry Rub');
      expect(result.current.recipes[0].id).toBe(returnedId);
      expect(typeof returnedId).toBe('string');
    });

    it('prepends to existing recipes', () => {
      localStorageMock.setItem('pitlogic-recipes-v1', JSON.stringify([{ id: 'old-1', name: 'Old Rub', ingredients: [] }]));
      const { result } = renderHook(() => useRecipes());
      act(() => { result.current.add({ name: 'New Rub', ingredients: [] }); });
      expect(result.current.recipes[0].name).toBe('New Rub');
      expect(result.current.recipes[1].name).toBe('Old Rub');
    });

    it('persists the new recipe to localStorage', () => {
      const { result } = renderHook(() => useRecipes());
      act(() => { result.current.add({ name: 'Salt Rub', ingredients: [] }); });
      const persisted = JSON.parse(localStorageMock.getItem('pitlogic-recipes-v1'));
      expect(persisted).toHaveLength(1);
      expect(persisted[0].name).toBe('Salt Rub');
    });
  });

  describe('update', () => {
    it('patches the matching recipe by id', () => {
      const { result } = renderHook(() => useRecipes());
      let id;
      act(() => { id = result.current.add({ name: 'Base Rub', ingredients: [], rating: 0 }); });
      act(() => { result.current.update(id, { rating: 5 }); });
      expect(result.current.recipes[0].rating).toBe(5);
      expect(result.current.recipes[0].name).toBe('Base Rub');
    });

    it('persists the patched recipe to localStorage', () => {
      const { result } = renderHook(() => useRecipes());
      let id;
      act(() => { id = result.current.add({ name: 'Base Rub', ingredients: [], rating: 0 }); });
      act(() => { result.current.update(id, { rating: 5 }); });
      const persisted = JSON.parse(localStorageMock.getItem('pitlogic-recipes-v1'));
      expect(persisted[0].rating).toBe(5);
    });

    it('leaves non-matching recipes unchanged', () => {
      const initial = [
        { id: 'r-1', name: 'Rub A', ingredients: [], rating: 0 },
        { id: 'r-2', name: 'Rub B', ingredients: [], rating: 0 },
      ];
      localStorageMock.setItem('pitlogic-recipes-v1', JSON.stringify(initial));
      const { result } = renderHook(() => useRecipes());
      act(() => { result.current.update('r-1', { rating: 3 }); });
      const rubB = result.current.recipes.find(r => r.id === 'r-2');
      expect(rubB.rating).toBe(0);
    });
  });

  describe('remove', () => {
    it('filters out the recipe with the given id', () => {
      const { result } = renderHook(() => useRecipes());
      let id;
      act(() => { id = result.current.add({ name: 'Gone Rub', ingredients: [] }); });
      act(() => { result.current.remove(id); });
      expect(result.current.recipes).toHaveLength(0);
    });

    it('persists the removal to localStorage', () => {
      const { result } = renderHook(() => useRecipes());
      let id;
      act(() => { id = result.current.add({ name: 'Gone Rub', ingredients: [] }); });
      act(() => { result.current.remove(id); });
      const persisted = JSON.parse(localStorageMock.getItem('pitlogic-recipes-v1'));
      expect(persisted).toHaveLength(0);
    });
  });

  describe('importMany', () => {
    it('adds new recipes and returns { added, skipped } counts', () => {
      const { result } = renderHook(() => useRecipes());
      let stats;
      act(() => {
        stats = result.current.importMany([
          { name: 'Brisket Rub', ingredients: [] },
          { name: 'Chicken Rub', ingredients: [] },
        ]);
      });
      expect(stats).toEqual({ added: 2, skipped: 0 });
      expect(result.current.recipes).toHaveLength(2);
    });

    it('skips duplicates case-insensitively', () => {
      const { result } = renderHook(() => useRecipes());
      act(() => { result.current.add({ name: 'Brisket Rub', ingredients: [] }); });
      let stats;
      act(() => {
        stats = result.current.importMany([
          { name: 'brisket rub', ingredients: [] },
          { name: 'New Sauce', ingredients: [] },
        ]);
      });
      expect(stats).toEqual({ added: 1, skipped: 1 });
      expect(result.current.recipes).toHaveLength(2);
    });

    it('stamps imported recipes with plantoeat-import source', () => {
      const { result } = renderHook(() => useRecipes());
      act(() => { result.current.importMany([{ name: 'Smoke Rub', ingredients: [] }]); });
      expect(result.current.recipes[0].source).toBe('plantoeat-import');
    });
  });

  describe('replaceAll', () => {
    it('overwrites all recipes', () => {
      const { result } = renderHook(() => useRecipes());
      act(() => { result.current.add({ name: 'Old Recipe', ingredients: [] }); });
      const fresh = [{ id: 'new-1', name: 'Fresh Recipe', ingredients: [] }];
      act(() => { result.current.replaceAll(fresh); });
      expect(result.current.recipes).toEqual(fresh);
    });

    it('persists the replacement to localStorage', () => {
      const { result } = renderHook(() => useRecipes());
      act(() => { result.current.add({ name: 'Old Recipe', ingredients: [] }); });
      const fresh = [{ id: 'new-1', name: 'Fresh Recipe', ingredients: [] }];
      act(() => { result.current.replaceAll(fresh); });
      const persisted = JSON.parse(localStorageMock.getItem('pitlogic-recipes-v1'));
      expect(persisted).toEqual(fresh);
    });
  });
});
