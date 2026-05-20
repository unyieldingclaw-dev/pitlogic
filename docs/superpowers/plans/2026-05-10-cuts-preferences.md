# Cuts & Cook Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the meat cuts library (~12 new cuts including a new Lamb category), and add a cook preferences system so users can save and manage per-cut temperature defaults.

**Architecture:** New `usePrefs` hook wraps localStorage (`rfx-prefs-v1`) for per-cut preference storage. App.jsx wires prefs into the cut-change form defaults. ActiveTab shows an inline "Save as default" badge when the user changes temps from their saved defaults. SettingsSheet gets a "My Defaults" section to view and reset saved prefs.

**Tech Stack:** React 19, vanilla CSS, localStorage, Vitest

---

## File Map

| File | What changes |
|------|-------------|
| `src/data/meats.js` | Add Plate Ribs, Beef Cheeks, Picanha (Beef); Spare Ribs, Pork Belly, Ham, Pork Chops (Pork); Wings, Cornish Hen (Poultry); new Lamb category |
| `src/data/cuts.js` | Add guide data for all 12 new cuts |
| `src/hooks/usePrefs.js` | New hook — reads/writes `rfx-prefs-v1` in localStorage |
| `src/tests/usePrefs.test.js` | Tests for usePrefs hook |
| `src/App.jsx` | Import usePrefs; use prefs in cut-change effects; pass prefs/setCutPref to ActiveTab and SettingsSheet |
| `src/components/ActiveTab.jsx` | Inline "Save as default" badge when temps differ from saved defaults |
| `src/components/SettingsSheet.jsx` | "My Defaults" section — view and reset per-cut saved prefs |

---

### Task 1: Expand Cuts Data

**Files:**
- Modify: `src/data/meats.js`
- Modify: `src/data/cuts.js`

- [ ] **Step 1: Update meats.js**

Replace the entire file:

```js
export const MEATS = {
  Beef:    ["Brisket","Chuck Roast","Short Ribs","Prime Rib","Tri-Tip","Back Ribs","Plate Ribs","Beef Cheeks","Picanha"],
  Pork:    ["Shoulder / Butt","Baby Back Ribs","St. Louis Ribs","Spare Ribs","Tenderloin","Pork Belly","Ham","Pork Chops"],
  Poultry: ["Whole Chicken","Spatchcock Chicken","Turkey","Thighs / Legs","Wings","Cornish Hen"],
  Fish:    ["Salmon","Trout"],
  Lamb:    ["Leg of Lamb","Lamb Shoulder","Rack of Lamb"]
};
```

- [ ] **Step 2: Add 12 new cut guides to cuts.js**

Append the following entries inside the `G` export object in `src/data/cuts.js`, before the closing `};`:

```js
  "Plate Ribs": {
    p:["Oak","Hickory","Pecan"],
    pn:"Oak = the classic for massive beef ribs, clean and strong. Hickory adds bold smoke. Pecan gives a nuttier finish.",
    pull:203, wrap:175, pit:275, stall:true, sr:"160–175°F", sd:"2–4 hrs", co:8,
    stages:[
      {n:1, t:"275°F", w:"Cook start", d:"1–2 hrs", a:"Bone-side down. Season generously — these are huge. Build a deep smoke crust."},
      {n:2, t:"275°F", w:"After smoke phase", d:"Until 175°F", a:"Stay patient through the stall. Don't spray — the fat cap bastes them continuously."},
      {n:3, t:"275°F", w:"At 175°F", d:"Until 203°F", a:"Wrap in butcher paper — no added liquid needed, the fat handles moisture."},
      {n:4, t:"Off", w:"At 203°F", d:"45–60 min", a:"Rest fully wrapped. Bone will visibly pull back before the probe confirms done."}
    ],
    tip:"Probe should slide between the bone and meat with zero resistance. 275°F pit temp is intentionally hotter than brisket — these thick bones need more heat to break down collagen."
  },
  "Beef Cheeks": {
    p:["Oak","Post Oak","Hickory"],
    pn:"Post Oak or Oak = clean, Texas-style. Hickory = more punch but don't overdo it — the fat in cheeks carries a lot of flavor already.",
    pull:210, wrap:170, pit:250, stall:true, sr:"160–175°F", sd:"2–4 hrs", co:8,
    stages:[
      {n:1, t:"250°F", w:"Cook start", d:"Until 170°F", a:"Silver skin side down, fat side up. Dense cut — build your bark patiently."},
      {n:2, t:"250°F", w:"At 170°F", d:"Until 210°F", a:"Wrap tight in foil with a splash of beef broth. Higher pull temp = full collagen breakdown = silky texture."},
      {n:3, t:"Off", w:"At 210°F", d:"1–2 hrs", a:"Rest 1–2 hrs. Two hours gives noticeably better results — they continue to loosen during the rest."}
    ],
    tip:"Done when they feel like gel under pressure. Probe resistance disappears entirely around 205–210°F. These are extremely forgiving — letting them rest longer only helps."
  },
  "Picanha": {
    p:["Oak","Cherry","Pecan"],
    pn:"Oak = traditional Brazilian style. Cherry adds sweetness and a beautiful crust color. Pecan for a nuttier finish.",
    pull:130, pit:225, stall:false, co:7,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"Until 110–115°F", a:"Fat-cap up. Score the fat cap in a cross-hatch pattern — deep cuts, don't go through to the meat. Smoke until 10°F below target."},
      {n:2, t:"450°F", w:"At 110–115°F", d:"8–10 min", a:"Sear fat-cap down first (2–3 min) to deeply caramelize it, then each side. The fat cap is the feature — render it hard."},
      {n:3, t:"Off", w:"At 128–130°F", d:"10 min", a:"Rest 10 min fat-cap up. Slice against the grain into thick steaks."}
    ],
    tip:"The grain runs toward the fat cap — slice perpendicular to it. Rest with fat-cap up so rendered fat drips back through the meat."
  },
  "Spare Ribs": {
    p:["Hickory","Apple","Cherry","Mesquite"],
    pn:"Hickory = bold bark. Apple or cherry keeps them sweet. Mesquite is aggressive — use sparingly if at all.",
    pull:203, pit:225, stall:false, co:3,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"3 hrs", a:"Bone-side down. Trim the skirt and sternum if not already done. More fat and meat than baby backs — season generously on both sides."},
      {n:2, t:"225°F", w:"After 3 hrs", d:"2 hrs wrapped", a:"Wrap in foil with butter, brown sugar, honey, and apple juice. More aggressive than baby backs — they can handle it."},
      {n:3, t:"275°F", w:"After 2 hrs wrapped", d:"45–60 min", a:"Unwrap, raise temp, sauce if desired. Needs more finish time than baby backs."}
    ],
    tip:"Bite test: meat should pull cleanly from the bone with one gentle bite, not fall off. Spare ribs are more forgiving than baby backs — more fat means more margin for error."
  },
  "Pork Belly": {
    p:["Apple","Maple","Cherry","Hickory"],
    pn:"Apple or maple = sweet and mild, lets the pork shine. Cherry = color and depth. Light hickory for more smoke punch.",
    pull:200, pit:250, stall:true, sr:"160–170°F", sd:"1–3 hrs", co:5,
    stages:[
      {n:1, t:"180°F Super Smoke", w:"Cook start", d:"2 hrs", a:"Skin-side up (or skin-off for burnt ends). Low temp builds color and initial bark slowly."},
      {n:2, t:"250°F", w:"After smoke phase", d:"Until 165°F", a:"Raise temp. Fat will visibly start rendering — you'll see it in the color change and sheen."},
      {n:3, t:"250°F", w:"At 165°F", d:"Until 200°F", a:"Wrap with a splash of apple cider. Powers through the stall, keeps moisture."},
      {n:4, t:"Off", w:"At 200°F", d:"30 min", a:"Rest 30 min. For burnt ends: cube into 1.5\" pieces, toss in sauce, return to 275°F uncovered for 30–45 min until caramelized."}
    ],
    tip:"For burnt ends: pull at 200°F, cube, sauce (honey + BBQ + butter), smoke uncovered at 275°F until edges are sticky and bark-like. The second cook is where they become exceptional."
  },
  "Ham": {
    p:["Apple","Cherry","Pecan","Maple"],
    pn:"Fruit woods and maple = classic ham pairing, sweet and complementary. Avoid strong hardwoods — they fight the cure.",
    pull:160, pit:250, stall:false, co:5,
    stages:[
      {n:1, t:"250°F", w:"After optional 12–24 hr brine", d:"Until 130°F", a:"Score fat cap in diamond pattern. Start low for deep smoke penetration into the thick meat."},
      {n:2, t:"325°F", w:"At 130°F", d:"Until 155°F", a:"Raise temp to push through. Glaze with honey/brown sugar mixture every 15 min for a lacquered crust."},
      {n:3, t:"Off", w:"At 155°F", d:"20–30 min", a:"Rest 20–30 min tented. Carryover brings to 160°F. Slice or pull."}
    ],
    tip:"Pre-cured/smoked ham just needs reheating — pull at 140°F internal. Fresh (uncured) ham needs 160°F. Glaze = honey + brown sugar + Dijon + apple cider vinegar. Apply in layers, not all at once."
  },
  "Pork Chops": {
    p:["Apple","Cherry","Pecan"],
    pn:"Mild woods only — pork chops are lean and over-smoke easily. Apple or cherry is ideal.",
    pull:145, pit:225, stall:false, co:5,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"Until 130–135°F", a:"1–1.5\" bone-in or boneless. This cut dries out fast — watch the probe, don't walk away."},
      {n:2, t:"450°F", w:"At 130–135°F", d:"4–6 min", a:"Sear 2–3 min per side. High heat builds crust fast — don't overdo it."},
      {n:3, t:"Off", w:"At 145°F", d:"5 min", a:"Rest 5 min tented. Slightly pink center at 145°F is safe and ideal per USDA."}
    ],
    tip:"Brine for 2–4 hrs before smoking (1 tbsp salt + 1 tbsp sugar per cup of water). Lean cuts need moisture insurance. Bone-in chops retain moisture better than boneless."
  },
  "Wings": {
    p:["Cherry","Apple","Hickory","Pecan"],
    pn:"Cherry = beautiful mahogany color. Apple = mild and sweet. Hickory and pecan add more smoke depth — wings can handle it.",
    pull:175, pit:375, stall:false, co:3,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"45 min", a:"Smoke phase for color and penetration. Wings handle stronger wood than whole birds."},
      {n:2, t:"375°F", w:"After smoke phase", d:"Until 175°F", a:"Raise to high heat for crispy skin. Flip halfway through."},
      {n:3, t:"375°F", w:"At 175°F (optional)", d:"5–10 min sauced", a:"Toss in sauce, return to 375°F briefly to caramelize."}
    ],
    tip:"Pat wings completely dry, season, then refrigerate uncovered 1 hr before smoking — the pellicle that forms accelerates crispiness. Add 1 tsp baking powder per lb to the dry rub to crisp skin faster."
  },
  "Cornish Hen": {
    p:["Cherry","Apple","Pecan"],
    pn:"Fruit woods pair perfectly with small birds. Cherry adds color; apple keeps it light and sweet.",
    pull:165, pit:300, stall:false, co:5,
    stages:[
      {n:1, t:"300°F", w:"Cook start", d:"Until 150°F breast", a:"Breast-side up. Cooks faster than whole chicken — stay closer to the smoker."},
      {n:2, t:"375°F", w:"At 150°F", d:"Until 165°F", a:"Raise temp to finish and crisp skin. This phase goes fast."},
      {n:3, t:"Off", w:"At 165°F", d:"5–10 min", a:"Rest 5–10 min. Verify thigh at 175°F. Serve whole or split along the backbone."}
    ],
    tip:"Spatchcock it (remove the backbone) for faster, more even cooking and better skin everywhere. One bird per person is the perfect portion."
  },
  "Leg of Lamb": {
    p:["Oak","Cherry","Pecan"],
    pn:"Oak = clean backbone smoke. Cherry adds color and mild sweetness. Avoid heavy hardwoods — lamb has a distinct flavor that competes.",
    pull:145, pit:250, stall:false, co:8,
    stages:[
      {n:1, t:"250°F", w:"Cook start", d:"Until 130°F", a:"Bone-in or boneless, fat-side up. Score the fat cap and stud with garlic cloves. The scoring helps fat render and allows garlic flavor in."},
      {n:2, t:"350°F", w:"At 130°F", d:"Until 138–140°F", a:"Raise temp to finish and form a crust on the exterior."},
      {n:3, t:"Off", w:"At 140°F", d:"15–20 min", a:"Rest well — lamb is forgiving during rest. Carryover + rest brings to 145°F (medium)."}
    ],
    tip:"Medium rare = 130–135°F (rosy pink throughout). Medium = 140–145°F. Beyond 150°F lamb gets tough quickly. Stud generously with garlic and insert fresh rosemary sprigs into the scored cuts."
  },
  "Lamb Shoulder": {
    p:["Oak","Cherry","Pecan"],
    pn:"Oak or cherry = clean and complementary. Lamb shoulder is well-marbled and handles smoke well — don't under-smoke it.",
    pull:195, wrap:165, pit:250, stall:true, sr:"155–165°F", sd:"2–4 hrs", co:8,
    stages:[
      {n:1, t:"250°F", w:"Cook start", d:"Until 165°F", a:"Fat-side up. Lamb shoulder handles low/slow like pork butt. Build your bark first."},
      {n:2, t:"250°F", w:"At 165°F", d:"Until 195°F", a:"Wrap with a splash of red wine or beef broth. Powers through the stall, adds depth."},
      {n:3, t:"Off", w:"At 195°F", d:"30–60 min", a:"Rest 30–60 min. Pull apart or slice — both work at 195°F+."}
    ],
    tip:"For sliceable texture, pull at 185°F. For pulled lamb, take it to 205°F. The flavor is more forgiving of temp variation than beef brisket — this cut is hard to overcook if you rest it."
  },
  "Rack of Lamb": {
    p:["Cherry","Apple","Oak"],
    pn:"Cherry = beautiful pink-mahogany crust. Apple = subtle sweetness. Light oak = neutral backbone. Avoid strong woods — delicate lamb flavor is easily overpowered.",
    pull:130, pit:225, stall:false, co:8,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"Until 115–118°F", a:"Bone-side down, bones frenched if possible. The rack is small and cooks faster than you expect — watch it."},
      {n:2, t:"450°F", w:"At 115–118°F", d:"4–6 min", a:"Sear on all sides, rotating every 90 seconds, until a tight crust forms."},
      {n:3, t:"Off", w:"At 128–130°F", d:"5–10 min", a:"Rest tented 5–10 min. Slice between bones into individual chops."}
    ],
    tip:"Set your RFX alert at 110°F — the rack is small and temp rises fast once you sear. Frenching the bones (cleaning the rib tips) makes for a dramatic presentation."
  }
```

- [ ] **Step 3: Verify build**

```powershell
cd C:\Users\Mizzo\Claude\rfx-cook-tracker
npm run build
```

Expected: clean build, no import or parse errors.

- [ ] **Step 4: Commit**

```powershell
git add src/data/meats.js src/data/cuts.js
git commit -m "feat: expand cuts library — 12 new cuts, Lamb category"
```

---

### Task 2: usePrefs Hook

**Files:**
- Create: `src/hooks/usePrefs.js`
- Create: `src/tests/usePrefs.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/tests/usePrefs.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrefs } from '../hooks/usePrefs';

describe('usePrefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty cutPrefs when localStorage is empty', () => {
    const { result } = renderHook(() => usePrefs());
    expect(result.current.prefs.cutPrefs).toEqual({});
  });

  it('loads existing prefs from localStorage on mount', () => {
    localStorage.setItem('rfx-prefs-v1', JSON.stringify({ cutPrefs: { Brisket: { pit: 250, pull: 203 } } }));
    const { result } = renderHook(() => usePrefs());
    expect(result.current.prefs.cutPrefs.Brisket).toEqual({ pit: 250, pull: 203 });
  });

  it('setCutPref saves a preference and updates state', () => {
    const { result } = renderHook(() => usePrefs());
    act(() => result.current.setCutPref('Brisket', { pit: 250, pull: 205 }));
    expect(result.current.prefs.cutPrefs.Brisket).toEqual({ pit: 250, pull: 205 });
    expect(JSON.parse(localStorage.getItem('rfx-prefs-v1'))).toEqual({ cutPrefs: { Brisket: { pit: 250, pull: 205 } } });
  });

  it('setCutPref merges partial overrides into existing pref', () => {
    const { result } = renderHook(() => usePrefs());
    act(() => result.current.setCutPref('Brisket', { pit: 250, pull: 203 }));
    act(() => result.current.setCutPref('Brisket', { pit: 275 }));
    expect(result.current.prefs.cutPrefs.Brisket).toEqual({ pit: 275, pull: 203 });
  });

  it('resetCutPref removes a cut preference', () => {
    const { result } = renderHook(() => usePrefs());
    act(() => result.current.setCutPref('Brisket', { pit: 250, pull: 203 }));
    act(() => result.current.resetCutPref('Brisket'));
    expect(result.current.prefs.cutPrefs.Brisket).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('rfx-prefs-v1')).cutPrefs.Brisket).toBeUndefined();
  });

  it('hasCutPref returns true when a pref exists', () => {
    const { result } = renderHook(() => usePrefs());
    act(() => result.current.setCutPref('Brisket', { pit: 250 }));
    expect(result.current.hasCutPref('Brisket')).toBe(true);
  });

  it('hasCutPref returns false when no pref exists', () => {
    const { result } = renderHook(() => usePrefs());
    expect(result.current.hasCutPref('Brisket')).toBe(false);
  });

  it('returns empty cutPrefs when localStorage contains invalid JSON', () => {
    localStorage.setItem('rfx-prefs-v1', 'not-json');
    const { result } = renderHook(() => usePrefs());
    expect(result.current.prefs.cutPrefs).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```powershell
npx vitest run src/tests/usePrefs.test.js
```

Expected: all tests fail (module not found).

- [ ] **Step 3: Implement usePrefs.js**

Create `src/hooks/usePrefs.js`:

```js
import { useState, useCallback } from 'react';

const KEY = 'rfx-prefs-v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { cutPrefs: {}, ...parsed };
  } catch {
    return { cutPrefs: {} };
  }
}

export function usePrefs() {
  const [prefs, setPrefs] = useState(load);

  const setCutPref = useCallback((cut, overrides) => {
    setPrefs(p => {
      const next = {
        ...p,
        cutPrefs: {
          ...p.cutPrefs,
          [cut]: { ...p.cutPrefs?.[cut], ...overrides }
        }
      };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetCutPref = useCallback((cut) => {
    setPrefs(p => {
      const { [cut]: _removed, ...rest } = p.cutPrefs || {};
      const next = { ...p, cutPrefs: rest };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const hasCutPref = useCallback((cut) => {
    return Boolean(prefs.cutPrefs?.[cut]);
  }, [prefs.cutPrefs]);

  return { prefs, setCutPref, resetCutPref, hasCutPref };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```powershell
npx vitest run src/tests/usePrefs.test.js
```

Expected: 8/8 tests pass.

- [ ] **Step 5: Run full test suite**

```powershell
npm test -- --run
```

Expected: all 66 tests pass (58 existing + 8 new).

- [ ] **Step 6: Commit**

```powershell
git add src/hooks/usePrefs.js src/tests/usePrefs.test.js
git commit -m "feat: usePrefs hook — per-cut temperature preferences in localStorage"
```

---

### Task 3: Wire Prefs into App.jsx

**Files:**
- Modify: `src/App.jsx`

**Context:** App.jsx manages `form` state for the new cook form. When `form.cut` or `form.meat` changes, useEffects fire to set `smokerTarget` and probe `target` temps from `G` (cuts.js). We need to check saved prefs first, falling back to G defaults. We also need to pass prefs down to ActiveTab and SettingsSheet.

- [ ] **Step 1: Read App.jsx to understand current structure**

Read `src/App.jsx` — pay attention to:
- Where hooks are imported (top of file)
- Where `useStorage` and other hooks are called inside `App()`
- The `useEffect` that updates form when `form.cut` changes
- The `useEffect` that updates form when `form.meat` changes
- Where `<ActiveTab` is rendered and what props it receives
- Where `<SettingsSheet` is rendered and what props it receives

- [ ] **Step 2: Add usePrefs import**

Add to the imports at the top of App.jsx (alongside other hook imports):

```js
import { usePrefs } from './hooks/usePrefs';
```

- [ ] **Step 3: Call usePrefs inside App()**

Inside the `App` function body, near the other hook calls (useStorage, useState, etc.), add:

```js
const { prefs, setCutPref, resetCutPref } = usePrefs();
```

- [ ] **Step 4: Update the cut-change useEffect to use prefs**

Find the `useEffect` that runs when `form.cut` changes and updates `smokerTarget` + probe targets from `G`. Update it to check prefs first:

```js
// BEFORE (approximate — match to actual code)
useEffect(() => {
  const g = G[form.cut];
  if (g) setForm(f => ({ ...f,
    smokerTarget: g.pit || 225,
    probes: f.probes.map(p => ({ ...p, target: g.pull || 165 }))
  }));
}, [form.cut]);

// AFTER
useEffect(() => {
  const g = G[form.cut];
  const pref = prefs.cutPrefs?.[form.cut];
  if (g) setForm(f => ({ ...f,
    smokerTarget: pref?.pit ?? g.pit ?? 225,
    probes: f.probes.map(p => ({ ...p, target: pref?.pull ?? g.pull ?? 165 }))
  }));
}, [form.cut]); // eslint-disable-line react-hooks/exhaustive-deps
```

Note: `prefs` is intentionally omitted from deps — we only want this effect to fire when the cut changes, not every time a pref is saved. The current `prefs` value is captured at render time and is correct.

- [ ] **Step 5: Update the meat-change useEffect similarly**

Find the `useEffect` that fires when `form.meat` changes. Update the first-cut selection to use prefs:

```js
// BEFORE (approximate — match to actual code)
useEffect(() => {
  const cuts = MEATS[form.meat] || [];
  if (!cuts.includes(form.cut)) {
    const cut = cuts[0];
    const g = G[cut];
    setForm(f => ({ ...f, cut,
      smokerTarget: g?.pit || 225,
      probes: f.probes.map(p => ({ ...p, target: g?.pull || 165 }))
    }));
  }
}, [form.meat]);

// AFTER
useEffect(() => {
  const cuts = MEATS[form.meat] || [];
  if (!cuts.includes(form.cut)) {
    const cut = cuts[0];
    const g = G[cut];
    const pref = prefs.cutPrefs?.[cut];
    setForm(f => ({ ...f, cut,
      smokerTarget: pref?.pit ?? g?.pit ?? 225,
      probes: f.probes.map(p => ({ ...p, target: pref?.pull ?? g?.pull ?? 165 }))
    }));
  }
}, [form.meat]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 6: Pass prefs props to ActiveTab**

Find where `<ActiveTab` is rendered. Add `prefs` and `setCutPref` props:

```jsx
<ActiveTab
  // ... all existing props unchanged ...
  prefs={prefs}
  setCutPref={setCutPref}
/>
```

- [ ] **Step 7: Pass prefs props to SettingsSheet**

Find where `<SettingsSheet` is rendered. Add `prefs` and `resetCutPref` props:

```jsx
<SettingsSheet
  // ... all existing props unchanged ...
  prefs={prefs}
  resetCutPref={resetCutPref}
/>
```

- [ ] **Step 8: Verify build**

```powershell
npm run build
```

Expected: clean build. The new props are ignored by child components until Task 4 and 5 add them.

- [ ] **Step 9: Commit**

```powershell
git add src/App.jsx
git commit -m "feat: wire cook preferences into App — prefs override cut-change defaults"
```

---

### Task 4: Inline Save in ActiveTab.jsx

**Files:**
- Modify: `src/components/ActiveTab.jsx`

**Context:** The new cook form (rendered when view is "new") shows a smokerTarget input and probe target inputs. When the user changes either from their saved defaults (or G defaults), show a "Save as my default" badge. Clicking it persists those values via setCutPref.

- [ ] **Step 1: Read ActiveTab.jsx**

Read `src/components/ActiveTab.jsx` in full. Understand:
- How props are destructured at the top
- Where the smokerTarget input is rendered (around line 95-100)
- Where probe target inputs are rendered (around line 90-128)
- Whether `G` is already imported (it is — used for pellets/stages display)
- Where the "More Details" collapsible section starts (the badge goes just before it)

- [ ] **Step 2: Add prefs and setCutPref to destructured props**

Find the component signature and add the two new props:

```jsx
// BEFORE
export default function ActiveTab({ form, setForm, cooks, activeCooks, ... }) {

// AFTER
export default function ActiveTab({ form, setForm, cooks, activeCooks, ..., prefs, setCutPref }) {
```

Match exactly how the existing props are structured — just append `prefs` and `setCutPref` to the destructured list.

- [ ] **Step 3: Add computed values for change detection**

Inside the component, just before the return statement (or in the "new" view section), add these computed values. They rely on `form`, `prefs`, and `G`:

```jsx
// Detect whether user has changed temps from their saved defaults (or G defaults)
const cutPref = prefs?.cutPrefs?.[form.cut];
const defaultPit = cutPref?.pit ?? G[form.cut]?.pit ?? 225;
const defaultPull = cutPref?.pull ?? G[form.cut]?.pull ?? 165;
const pitChanged = form.smokerTarget !== defaultPit;
const pullChanged = form.probes.some(p => p.target !== defaultPull);
const showSaveDefault = (pitChanged || pullChanged) && Boolean(G[form.cut]);
```

- [ ] **Step 4: Add the inline save badge JSX**

Find where the "More Details" collapsible section starts in the new-cook form. Add this block immediately before it:

```jsx
{showSaveDefault && (
  <div style={{
    background: 'rgba(245,158,11,0.07)',
    border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: 10,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  }}>
    <span style={{ fontSize: 12, color: 'var(--amber)', lineHeight: 1.4 }}>
      Different from your defaults for {form.cut}
    </span>
    <button
      type="button"
      onClick={() => setCutPref(form.cut, {
        pit: form.smokerTarget,
        pull: form.probes[0]?.target,
      })}
      style={{
        background: 'rgba(245,158,11,0.15)',
        border: '1px solid rgba(245,158,11,0.4)',
        borderRadius: 8,
        padding: '5px 12px',
        color: 'var(--amber)',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
      }}
    >
      Save as default
    </button>
  </div>
)}
```

- [ ] **Step 5: Verify build**

```powershell
npm run build
```

Expected: clean build, no warnings about missing imports.

- [ ] **Step 6: Commit**

```powershell
git add src/components/ActiveTab.jsx
git commit -m "feat: inline save-as-default when cook temps differ from preferences"
```

---

### Task 5: My Defaults Section in SettingsSheet.jsx

**Files:**
- Modify: `src/components/SettingsSheet.jsx`

**Context:** SettingsSheet already has "Backup" and "Restore" sections. Add a "My Defaults" section above them that lists all saved per-cut preferences with a Reset button per cut.

- [ ] **Step 1: Read SettingsSheet.jsx**

Read `src/components/SettingsSheet.jsx` in full. Understand:
- How props are destructured
- Where the Backup section begins
- The general layout/style patterns used (surface colors, font vars, etc.)

- [ ] **Step 2: Add prefs and resetCutPref to destructured props**

```jsx
// BEFORE
export default function SettingsSheet({ open, onClose, onExport, onImport, ... }) {

// AFTER
export default function SettingsSheet({ open, onClose, onExport, onImport, ..., prefs, resetCutPref }) {
```

- [ ] **Step 3: Add savedCuts computed value**

Inside the component, before the return:

```jsx
const savedCuts = Object.entries(prefs?.cutPrefs || {});
```

- [ ] **Step 4: Add My Defaults section before the Backup section**

Find the opening of the Backup section (`<div ... >Backup</div>` or similar). Insert this entire block immediately before it:

```jsx
{/* My Defaults */}
<div style={{ marginBottom: '1.5rem' }}>
  <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
    My Defaults
  </div>
  {savedCuts.length === 0 ? (
    <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>
      No custom defaults saved yet. Change pit or pull temps in the new cook form and tap &ldquo;Save as default&rdquo; to store your preferences here.
    </p>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {savedCuts.map(([cut, pref]) => (
        <div key={cut} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{cut}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
              {pref.pit != null && `Pit ${pref.pit}°F`}
              {pref.pit != null && pref.pull != null && '  ·  '}
              {pref.pull != null && `Pull ${pref.pull}°F`}
            </div>
          </div>
          <button
            onClick={() => resetCutPref(cut)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '4px 10px',
              color: 'var(--text3)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Reset
          </button>
        </div>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 5: Run full test suite**

```powershell
npm test -- --run
```

Expected: all 66 tests pass.

- [ ] **Step 6: Verify build**

```powershell
npm run build
```

Expected: clean build.

- [ ] **Step 7: Commit**

```powershell
git add src/components/SettingsSheet.jsx
git commit -m "feat: My Defaults section in Settings — view and reset per-cut preferences"
```
