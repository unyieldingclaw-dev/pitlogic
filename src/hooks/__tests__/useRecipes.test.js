import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const store = {};
const localStorageMock = {
  getItem: vi.fn(key => store[key] ?? null),
  setItem: vi.fn((key, val) => { store[key] = val; }),
  removeItem: vi.fn(key => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

import { parsePlanToEatCSV } from '../../utils/planToEatParser';

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
