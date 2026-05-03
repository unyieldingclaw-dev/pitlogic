export function parsePlanToEatCSV(text) {
  const lines = text.split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const nameCol  = headers.findIndex(h => h === 'name' || h === 'title' || h === 'recipe name');
  const ingCol   = headers.findIndex(h => /ingredient/i.test(h));
  const dirCol   = headers.findIndex(h => /direction|instruction/i.test(h));
  const noteCol  = headers.findIndex(h => /note/i.test(h));

  if (nameCol === -1) return [];

  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const cols = [];
      let inQ = false, cur = '';
      for (const ch of line + ',') {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      const name = cols[nameCol]?.replace(/^"|"$/g, '').trim();
      if (!name) return null;

      const rawIng = ingCol >= 0 ? (cols[ingCol] || '') : '';
      const ingredients = rawIng
        .split(/\n|;/)
        .map(l => l.replace(/^"|"$/g, '').trim())
        .filter(Boolean)
        .map(l => ({ ingredient: l, amount: '', unit: '' }));

      return {
        name,
        category: 'rub',
        ingredients,
        instructions: dirCol >= 0 ? (cols[dirCol] || '').replace(/^"|"$/g, '').trim() : '',
        notes: noteCol >= 0 ? (cols[noteCol] || '').replace(/^"|"$/g, '').trim() : '',
        linkedCuts: [],
        rating: 0,
      };
    })
    .filter(Boolean);
}
