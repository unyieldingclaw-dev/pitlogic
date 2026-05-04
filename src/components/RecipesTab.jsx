import { useState, useRef } from 'react';
import { FlaskConical, Plus, Trash2, Upload, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useRecipes } from '../hooks/useRecipes';
import { parsePlanToEatCSV } from '../utils/planToEatParser';

const CATEGORIES = ['rub', 'brine', 'injection', 'spray', 'sauce'];
const CAT_LABELS = { rub: 'Rubs', brine: 'Brines', injection: 'Injections', spray: 'Sprays/Mops', sauce: 'Sauces' };

function RecipeCard({ recipe, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ marginBottom: '.625rem' }}>
      <button aria-expanded={open} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', width: '100%', textAlign: 'left', background: 'none', border: 'none', fontFamily: 'inherit', padding: 0 }}
        onClick={() => setOpen(o => !o)}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{recipe.name}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <span className="badge badge-amber">{CAT_LABELS[recipe.category] || recipe.category}</span>
            {recipe.source === 'plantoeat-import' && <span className="badge badge-gray">Plan to Eat</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn-danger" aria-label="Delete recipe" style={{ padding: '4px 10px', fontSize: 12 }}
            onClick={e => { e.stopPropagation(); onDelete(recipe.id); }}>
            <Trash2 size={13} />
          </button>
          {open ? <ChevronUp size={16} color="var(--text3)" /> : <ChevronDown size={16} color="var(--text3)" />}
        </div>
      </button>
      {open && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border2)', paddingTop: '1rem' }}>
          {recipe.ingredients.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 6 }}>Ingredients</div>
              <ul style={{ paddingLeft: '1rem', fontSize: 13, color: 'var(--text2)', marginBottom: '1rem' }}>
                {recipe.ingredients.map((ing, i) => (
                  <li key={i}>{[ing.amount, ing.unit, ing.ingredient].filter(Boolean).join(' ')}</li>
                ))}
              </ul>
            </>
          )}
          {recipe.instructions && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 6 }}>Instructions</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                {recipe.instructions}
              </div>
            </>
          )}
          {recipe.notes && (
            <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>{recipe.notes}</div>
          )}
        </div>
      )}
    </div>
  );
}

function NewRecipeForm({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('rub');
  const [ingredients, setIngredients] = useState([{ ingredient: '', amount: '', unit: '' }]);
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');

  const addIng = () => setIngredients(p => [...p, { ingredient: '', amount: '', unit: '' }]);
  const setIng = (i, field, val) => setIngredients(p => p.map((ing, idx) => idx === i ? { ...ing, [field]: val } : ing));
  const removeIng = i => setIngredients(p => p.filter((_, idx) => idx !== i));

  const submit = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), category, ingredients: ingredients.filter(i=>i.ingredient.trim()), instructions, notes, linkedCuts: [], rating: 0 });
  };

  return (
    <div className="card fadein" style={{ marginBottom: '1rem' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: '1rem' }}>New Recipe</div>
      <div className="g2" style={{ marginBottom: '.75rem' }}>
        <div><label htmlFor="recipe-name">Name *</label><input id="recipe-name" value={name} onChange={e=>setName(e.target.value)} placeholder="Memphis Dry Rub" /></div>
        <div><label htmlFor="recipe-category">Category</label>
          <select id="recipe-category" value={category} onChange={e=>setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: '.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ margin: 0 }}>Ingredients</label>
          <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: '3px 10px' }} onClick={addIng}>+ Add</button>
        </div>
        {ingredients.map((ing, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input style={{ flex: '0 0 70px' }} value={ing.amount} onChange={e=>setIng(i,'amount',e.target.value)} placeholder="2" />
            <input style={{ flex: '0 0 60px' }} value={ing.unit}   onChange={e=>setIng(i,'unit',e.target.value)}   placeholder="tbsp" />
            <input style={{ flex: 1 }}           value={ing.ingredient} onChange={e=>setIng(i,'ingredient',e.target.value)} placeholder="Paprika" />
            {ingredients.length > 1 && <button type="button" style={{ background:'none',border:'none',cursor:'pointer',color:'var(--red)' }} onClick={()=>removeIng(i)}><X size={14}/></button>}
          </div>
        ))}
      </div>
      <div style={{ marginBottom: '.75rem' }}><label htmlFor="recipe-instructions">Instructions</label><textarea id="recipe-instructions" rows={3} value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Mix all dry ingredients..." /></div>
      <div style={{ marginBottom: '1rem' }}><label htmlFor="recipe-notes">Notes</label><input id="recipe-notes" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Great on brisket and pork butt" /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" onClick={submit}>Save Recipe</button>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function RecipesTab({ flash }) {
  const { recipes, add, remove, importMany } = useRecipes();
  const [activeCat, setActiveCat] = useState('rub');
  const [showNew, setShowNew] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();

  const filtered = recipes.filter(r => r.category === activeCat);

  const handleImportFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parsePlanToEatCSV(ev.target.result);
      if (!parsed.length) { flash?.('No recipes found in CSV'); return; }
      setPreview(parsed);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmImport = () => {
    if (!preview) return;
    const result = importMany(preview);
    flash?.(`Imported ${result.added} recipe${result.added !== 1 ? 's' : ''}${result.skipped ? `, skipped ${result.skipped} duplicate${result.skipped !== 1 ? 's' : ''}` : ''}`);
    setPreview(null);
  };

  return (
    <div className="fadein">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '0.03em' }}>Recipes</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportFile} />
          <button className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px' }}
            onClick={() => setShowNew(true)}>
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      {preview && (
        <div className="card fadein" style={{ marginBottom: '1rem', border: '1px solid var(--amber)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--amber)', marginBottom: 8 }}>
            Import Preview — {preview.length} recipe{preview.length !== 1 ? 's' : ''} found
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: '1rem' }}>
            {preview.map((r, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text2)', padding: '4px 0',
                borderBottom: '1px solid var(--border2)' }}>
                {r.name} <span style={{ color: 'var(--text3)', fontSize: 11 }}>({r.ingredients.length} ingredients)</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: '1rem' }}>
            All recipes will import as "Rubs" — you can change the category after import.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={confirmImport}>Import All</button>
            <button className="btn-ghost" onClick={() => setPreview(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="nav-tabs">
        {CATEGORIES.map(c => (
          <button key={c} className={`nav-tab${activeCat === c ? ' active' : ''}`} aria-current={activeCat === c ? 'page' : undefined} onClick={() => setActiveCat(c)}>
            {CAT_LABELS[c]} {recipes.filter(r=>r.category===c).length > 0 && `(${recipes.filter(r=>r.category===c).length})`}
          </button>
        ))}
      </div>

      {showNew && <NewRecipeForm onSave={r => { add(r); setShowNew(false); flash?.('Recipe saved'); }} onCancel={() => setShowNew(false)} />}

      {filtered.length === 0 && !showNew ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text3)' }}>
          <FlaskConical size={40} style={{ color: 'var(--ember)', opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 8 }}>No {CAT_LABELS[activeCat]} yet</div>
          <div style={{ fontSize: 13 }}>Add one manually or import from Plan to Eat CSV.</div>
        </div>
      ) : (
        filtered.map(r => <RecipeCard key={r.id} recipe={r} onDelete={remove} />)
      )}
    </div>
  );
}
