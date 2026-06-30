import { useState } from 'react';

const KEY = 'pitlogic-recipes-v1';

const loadRecipes = () => {
  try { const d = localStorage.getItem(KEY); return d ? JSON.parse(d) : []; }
  catch { return []; }
};
const persistRecipes = data => {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
};

export function useRecipes() {
  const [recipes, setRecipes] = useState(() => loadRecipes());

  const save = newRecipes => { setRecipes(newRecipes); persistRecipes(newRecipes); };

  const add = recipe => {
    const r = { ...recipe, id: String(Date.now()), createdAt: Date.now() };
    save([r, ...recipes]);
    return r.id;
  };

  const update = (id, patch) => save(recipes.map(r => r.id === id ? { ...r, ...patch } : r));

  const remove = id => save(recipes.filter(r => r.id !== id));

  const importMany = (incoming) => {
    const existing = new Set(recipes.map(r => r.name.toLowerCase()));
    const newOnes = incoming.filter(r => !existing.has(r.name.toLowerCase()))
      .map((r, idx) => ({ ...r, id: `${Date.now()}-${idx}`, createdAt: Date.now(), source: 'plantoeat-import' }));
    const dupes = incoming.filter(r => existing.has(r.name.toLowerCase()));
    save([...newOnes, ...recipes]);
    return { added: newOnes.length, skipped: dupes.length };
  };

  const replaceAll = newRecipes => save(newRecipes);

  return { recipes, add, update, remove, importMany, replaceAll };
}
