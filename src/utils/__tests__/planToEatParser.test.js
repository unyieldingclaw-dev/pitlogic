import { describe, it, expect } from 'vitest';
import { parsePlanToEatCSV } from '../planToEatParser';

describe('parsePlanToEatCSV', () => {
  it('returns empty array for empty input', () => {
    expect(parsePlanToEatCSV('')).toEqual([]);
    expect(parsePlanToEatCSV('Name\n')).toEqual([]);
  });

  it('returns empty array when Name column is missing', () => {
    // 'Title' would match the nameCol check so use a truly missing name column header instead
    const csvNoName = 'Foo,Ingredients\nMemphis Rub,paprika';
    expect(parsePlanToEatCSV(csvNoName)).toEqual([]);
  });

  it('parses a basic row', () => {
    const csv = 'Name,Ingredients,Directions,Notes\nMemphis Rub,paprika,Mix well,Good on ribs';
    const result = parsePlanToEatCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Memphis Rub');
    expect(result[0].instructions).toBe('Mix well');
    expect(result[0].notes).toBe('Good on ribs');
    expect(result[0].category).toBe('rub');
  });

  it('parses semicolon-separated ingredients', () => {
    const csv = 'Name,Ingredients\nRub,"2 tbsp paprika;1 tbsp sugar"';
    const result = parsePlanToEatCSV(csv);
    expect(result[0].ingredients).toHaveLength(2);
    expect(result[0].ingredients[0].ingredient).toBe('2 tbsp paprika');
  });

  it('handles quoted fields with commas inside', () => {
    const csv = 'Name,Notes\n"Rub, Memphis style","Great on ribs, brisket"';
    const result = parsePlanToEatCSV(csv);
    expect(result[0].name).toBe('Rub, Memphis style');
    expect(result[0].notes).toBe('Great on ribs, brisket');
  });

  it('skips rows with no name', () => {
    const csv = 'Name,Notes\n,Some notes\nValid Rub,notes';
    const result = parsePlanToEatCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid Rub');
  });

  it('sets default category to rub', () => {
    const csv = 'Name\nTest';
    expect(parsePlanToEatCSV(csv)[0].category).toBe('rub');
  });
});
