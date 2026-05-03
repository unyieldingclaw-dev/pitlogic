# RFX Cook Tracker — Premium Redesign & Feature Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the RFX Cook Tracker into a dark-ember premium app with 6 new feature areas: multi-cook, mop timer, analytics, recipe builder, Plan to Eat import, and cook share cards.

**Architecture:** Extend the existing React/localStorage app in-place. New state (recipes, multi-cook) lives in separate localStorage keys. New tabs (Dashboard, Analytics, Recipes) are new components wired into App.jsx. All visual changes are CSS-first — no CSS modules, no Tailwind, matching existing inline + class pattern.

**Tech Stack:** React 19, Vite 8, Recharts 3, Lucide React (new), html2canvas (new), Google Fonts via `<link>`

**Spec:** `docs/superpowers/specs/2026-05-01-rfx-premium-redesign-design.md`

---

## Task 1: Install dependencies and add Google Fonts

**Files:**
- Modify: `package.json`
- Modify: `index.html`

- [ ] **Step 1: Install lucide-react and html2canvas**

```bash
cd "C:\Users\Mizzo\Claude\rfx-cook-tracker"
npm install lucide-react html2canvas
```

Expected: `added N packages` with no peer dep errors.

- [ ] **Step 2: Add Google Fonts to index.html**

Replace the entire `<head>` content of `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RFX Cook Tracker</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Verify fonts load**

Run: `npm run dev` → open browser → open DevTools Network tab → filter by `fonts.googleapis` → confirm 3 font families download.

- [ ] **Step 4: Commit**

```bash
git add index.html package.json package-lock.json
git commit -m "feat: install lucide-react, html2canvas; add Google Fonts"
```

---

## Task 2: Rewrite design system (index.css)

**Files:**
- Modify: `src/index.css` (full rewrite)

- [ ] **Step 1: Replace src/index.css entirely**

```css
/* ── Google Fonts ── */
/* Loaded via index.html <link> — Oswald, Inter, JetBrains Mono */

/* ── Design Tokens ── */
:root {
  --bg:            #0A0A08;
  --surface:       #141410;
  --surface-raised:#1C1C18;
  --surface-input: #242420;
  --ember:         #FF6B35;
  --ember-hover:   #FF8C42;
  --ember-deep:    #E8510A;
  --amber:         #F59E0B;
  --text:          #F5F5F0;
  --text2:         #B5B5AE;
  --text3:         #6B6B65;
  --ash:           #5A5A55;
  --green:         #4ADE80;
  --red:           #EF4444;
  --blue:          #60A5FA;
  --border:        rgba(255,107,53,0.12);
  --border2:       rgba(255,255,255,0.08);
  --radius:        10px;
  --radius-lg:     14px;
  --font:          'Inter', system-ui, sans-serif;
  --font-display:  'Oswald', sans-serif;
  --mono:          'JetBrains Mono', 'Fira Mono', monospace;
}

/* Probe colors for dark bg */
/* Used via JS: ["#FF6B35","#60A5FA","#4ADE80","#FBBF24","#C084FC","#34D399"] */

/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

/* ── App shell ── */
#root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-content {
  flex: 1;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  padding: 1rem 1rem 100px; /* bottom pad for mobile nav */
}

@media (min-width: 769px) {
  #root { flex-direction: row; }
  .app-sidebar { width: 220px; flex-shrink: 0; }
  .app-content { padding: 1.5rem 2rem 2rem; }
}

/* ── Typography ── */
h1, h2, h3 { font-family: var(--font-display); font-weight: 600; letter-spacing: 0.02em; }
.display { font-family: var(--font-display); }
.mono { font-family: var(--mono); }
.temp-display {
  font-family: var(--mono);
  font-size: clamp(1.8rem, 5vw, 3rem);
  font-weight: 500;
  line-height: 1;
}

/* ── Forms ── */
input, select, textarea {
  font-family: var(--font);
  font-size: 14px;
  padding: 9px 12px;
  border: 1px solid var(--ash);
  border-radius: 8px;
  background: var(--surface-input);
  color: var(--text);
  width: 100%;
  transition: border-color .15s;
}
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--ember);
  box-shadow: 0 0 0 3px rgba(255,107,53,0.15);
}
select option { background: var(--surface-raised); }
textarea { resize: vertical; }
button { font-family: var(--font); cursor: pointer; }
label { font-size: 12px; color: var(--text2); display: block; margin-bottom: 4px; }

/* ── Cards ── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1rem 1.25rem;
  margin-bottom: .75rem;
}
.card-glass {
  background: rgba(255,255,255,0.02);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1rem 1.25rem;
  margin-bottom: .75rem;
}
.metric {
  background: var(--surface-raised);
  border-radius: var(--radius);
  padding: .75rem 1rem;
}

/* ── Buttons ── */
.btn {
  padding: 7px 15px;
  border-radius: 8px;
  border: 1px solid var(--ash);
  background: transparent;
  color: var(--text2);
  font-size: 13px;
  transition: border-color .15s, color .15s, background .15s;
}
.btn:hover { border-color: var(--ember); color: var(--text); }

.btn-primary {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: var(--ember);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-display);
  letter-spacing: 0.04em;
  transition: background .15s, box-shadow .15s;
}
.btn-primary:hover {
  background: var(--ember-hover);
  box-shadow: 0 0 16px rgba(255,107,53,0.4);
}

.btn-ghost {
  padding: 7px 15px;
  border-radius: 8px;
  border: none;
  background: var(--surface-raised);
  color: var(--text2);
  font-size: 13px;
  transition: background .15s;
}
.btn-ghost:hover { background: var(--ash); color: var(--text); }

.btn-danger {
  padding: 7px 15px;
  border-radius: 8px;
  border: 1px solid rgba(239,68,68,0.3);
  background: transparent;
  color: var(--red);
  font-size: 13px;
}
.btn-danger:hover { background: rgba(239,68,68,0.1); }

/* ── Nav tabs (horizontal sub-nav) ── */
.nav-tabs { display: flex; border-bottom: 1px solid var(--border2); margin-bottom: 1.25rem; overflow-x: auto; }
.nav-tab {
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--text3);
  font-size: 13px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  white-space: nowrap;
  font-family: var(--font);
  transition: color .15s;
}
.nav-tab.active { color: var(--ember); border-bottom-color: var(--ember); font-weight: 500; }
.nav-tab:hover:not(.active) { color: var(--text2); }

/* ── Badges ── */
.badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
.badge-ember { background: rgba(255,107,53,0.15); color: var(--ember); }
.badge-amber { background: rgba(245,158,11,0.15); color: var(--amber); }
.badge-green { background: rgba(74,222,128,0.12); color: var(--green); }
.badge-gray  { background: rgba(90,90,85,0.3); color: var(--text2); }
.badge-red   { background: rgba(239,68,68,0.12); color: var(--red); }

/* ── Alerts ── */
.alert {
  border-radius: var(--radius);
  padding: .75rem 1rem;
  margin-bottom: .75rem;
  font-size: 13px;
  display: flex;
  align-items: flex-start;
  gap: .75rem;
  border-left: 3px solid;
}
.alert-amber { background: rgba(245,158,11,0.08); border-color: var(--amber); }
.alert-ember { background: rgba(255,107,53,0.08); border-color: var(--ember); }
.alert-green { background: rgba(74,222,128,0.08); border-color: var(--green); }

/* ── Probe card glow ── */
.probe-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 1rem;
  border: 1px solid var(--border2);
  transition: border-color .3s, box-shadow .3s;
}
.probe-card.hot {
  border-color: rgba(255,107,53,0.5);
  box-shadow: 0 0 24px rgba(255,107,53,0.2);
}

/* ── Progress bar ── */
.progress-track {
  height: 6px;
  background: var(--surface-raised);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 8px;
}
.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width .5s ease;
}

/* ── Divider ── */
.divider { border: none; border-top: 1px solid var(--border2); margin: 1rem 0; }

/* ── Grids ── */
.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.g4 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (min-width: 600px) { .g4 { grid-template-columns: 1fr 1fr 1fr 1fr; } }

/* ── Stage blocks ── */
.stage-block {
  border: 1px solid var(--border2);
  border-radius: var(--radius);
  padding: .875rem;
  margin-bottom: .625rem;
  background: var(--surface);
}
.step-num {
  width: 24px; height: 24px;
  border-radius: 50%;
  background: rgba(255,107,53,0.15);
  color: var(--ember);
  font-size: 12px; font-weight: 500;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

/* ── Mono pill ── */
.mono-pill {
  font-family: var(--mono);
  font-size: 11px;
  background: rgba(255,107,53,0.12);
  color: var(--ember);
  padding: 2px 7px;
  border-radius: 4px;
  font-weight: 500;
}

/* ── Guide cut list ── */
.guide-cut {
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  margin-bottom: 3px;
  border: 1px solid transparent;
  color: var(--text2);
  transition: all .15s;
}
.guide-cut:hover { color: var(--text); background: var(--surface-raised); }
.guide-cut.active {
  background: rgba(255,107,53,0.12);
  color: var(--ember);
  font-weight: 500;
  border-color: rgba(255,107,53,0.25);
}

/* ── Animations ── */
@keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.3} }
@keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
@keyframes ember-pulse {
  0%,100% { box-shadow: 0 0 8px rgba(255,107,53,0.3); }
  50%      { box-shadow: 0 0 24px rgba(255,107,53,0.7); }
}
.fadein { animation: fadein .2s ease; }
.pulse  { animation: pulse 1.5s infinite; }
.ember-pulse { animation: ember-pulse 2s infinite; }

/* ── Star rating ── */
.star { font-size: 20px; cursor: pointer; transition: transform .1s; }
.star:hover { transform: scale(1.2); }

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--ash); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text3); }
```

- [ ] **Step 2: Update probe colors in src/utils/helpers.js**

Find the probe color array and replace it:

```js
export const PROBE_COLORS = ["#FF6B35","#60A5FA","#4ADE80","#FBBF24","#C084FC","#34D399"];
```

- [ ] **Step 3: Verify dark theme**

Run: `npm run dev` → app should display with near-black background, warm white text. No white flash. Fonts may not be styled yet (that's fine — structure comes in Task 3).

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/utils/helpers.js
git commit -m "feat: rewrite design system — dark ember tokens, typography, component classes"
```

---

## Task 3: Redesign App shell — header, sidebar nav, layout

**Files:**
- Modify: `src/App.jsx` (header + nav + layout wrapper)

This task replaces the existing header and horizontal nav-tab strip with the new header + bottom-nav (mobile) / sidebar (desktop). All existing tab logic is preserved — only the rendering changes.

- [ ] **Step 1: Add new nav imports to App.jsx**

At the top of `src/App.jsx`, add:

```js
import {
  LayoutDashboard, Flame, Clock, BarChart2,
  BookOpen, FlaskConical, Settings
} from 'lucide-react';
import DashboardTab from './components/DashboardTab';
import AnalyticsTab from './components/AnalyticsTab';
import RecipesTab from './components/RecipesTab';
```

- [ ] **Step 2: Add dashboard/analytics/recipes tab state**

In the `useState` block, change `tab` default from `'history'` to `'dashboard'` and add `recipes` state:

```js
const [tab, setTab] = useState('dashboard');
```

- [ ] **Step 3: Replace the JSX return in App.jsx**

Replace the entire `return (...)` block with:

```jsx
return (
  <div id="root">
    {/* Global multi-cook bar — shown when 2+ active cooks */}
    {/* Placeholder: added in Task 6 */}

    {/* Toast */}
    {msg && (
      <div style={{
        position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--ember)', color: '#fff', padding: '9px 20px',
        borderRadius: 20, fontSize: 13, fontWeight: 500, zIndex: 999,
        boxShadow: '0 4px 20px rgba(255,107,53,0.4)'
      }}>
        {msg}
      </div>
    )}

    {/* Sidebar (desktop) */}
    <aside className="app-sidebar" style={{
      display: 'none', flexDirection: 'column',
      background: 'var(--surface)', borderRight: '1px solid var(--border2)',
      padding: '1.5rem 0',
    }} id="app-sidebar">
      {/* Logo */}
      <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid var(--border2)', marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ember)',
          textShadow: '0 0 20px rgba(255,107,53,0.5)', letterSpacing: '0.05em' }}>RFX</div>
        <div style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text3)', marginTop: 2, textTransform: 'uppercase' }}>Cook Tracker</div>
      </div>

      {/* Active cook pill */}
      {activeId && activeCook && (
        <div style={{ margin: '0 .75rem 1rem', padding: '8px 12px', background: 'rgba(255,107,53,0.1)',
          borderRadius: 8, border: '1px solid rgba(255,107,53,0.3)', cursor: 'pointer' }}
          onClick={() => { setTab('active'); if (!activeId) setView('new'); else setView('active'); }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ember)', fontWeight: 500 }}>
            <span className="pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
            ACTIVE COOK
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, fontFamily: 'var(--mono)' }}>
            {activeCook.name}
          </div>
        </div>
      )}

      {/* Nav items */}
      {[
        { id: 'dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'active',    Icon: Flame,           label: activeId ? 'Active Cook' : 'New Cook' },
        { id: 'history',   Icon: Clock,            label: 'History' },
        { id: 'analytics', Icon: BarChart2,         label: 'Analytics' },
        { id: 'guide',     Icon: BookOpen,          label: 'Guides' },
        { id: 'recipes',   Icon: FlaskConical,      label: 'Recipes' },
      ].map(({ id, Icon, label }) => (
        <button key={id} onClick={() => handleNavClick(id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 1.25rem', border: 'none', background: tab === id ? 'rgba(255,107,53,0.1)' : 'transparent',
            color: tab === id ? 'var(--ember)' : 'var(--text2)',
            fontSize: 14, fontFamily: 'var(--font)',
            borderLeft: `3px solid ${tab === id ? 'var(--ember)' : 'transparent'}`,
            cursor: 'pointer', width: '100%', textAlign: 'left',
            transition: 'all .15s',
          }}>
          <Icon size={18} />
          {label}
        </button>
      ))}
    </aside>

    {/* Main content area */}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1rem',
        background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
              color: 'var(--ember)', textShadow: '0 0 16px rgba(255,107,53,0.4)', letterSpacing: '0.05em',
              lineHeight: 1 }}>RFX</div>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text3)', textTransform: 'uppercase' }}>Cook Tracker</div>
          </div>
        </div>
        {activeId && activeCook && tab !== 'active' && (
          <button className="btn" style={{ borderColor: 'rgba(255,107,53,0.4)', color: 'var(--ember)',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            onClick={() => { setTab('active'); setView('active'); }}>
            <span className="pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
            Active Cook
          </button>
        )}
      </header>

      {/* Page content */}
      <main className="app-content">
        {isDetail && (
          <DetailView cooks={cooks} detailId={detailId}
            onBack={() => { setView('history'); setTab('history'); }}
            onDelete={deleteCook} onSave={saveCookNotes} flash={flash} />
        )}
        {!isDetail && tab === 'dashboard' && (
          <DashboardTab cooks={cooks} activeId={activeId} activeCook={activeCook} tick={tick}
            onGoActive={() => { setTab('active'); setView('active'); }}
            onNewCook={() => { setTab('active'); setView('new'); }}
            onSelectCook={id => { setDetailId(id); setView('detail'); }} />
        )}
        {!isDetail && tab === 'history' && (
          <HistoryTab cooks={cooks} activeId={activeId} activeCook={activeCook} tick={tick}
            onSelectCook={id => { setDetailId(id); setView('detail'); }}
            onNewCook={() => { setView('new'); setTab('active'); }}
            onGoActive={() => { setView('active'); setTab('active'); }} />
        )}
        {!isDetail && tab === 'active' && (
          <ActiveTab view={view} form={form} setForm={setForm}
            activeCook={activeCook} entry={entry} setEntry={setEntry}
            stalls={stalls} wrapAlert={wrapAlert} coAlert={coAlert}
            confirmEnd={confirmEnd} setConfirmEnd={setConfirmEnd}
            tick={tick} onStart={startCook} onEnd={handleDismiss}
            onLog={logReading} onCSV={handleCSV} onGoGuide={goGuide} />
        )}
        {!isDetail && tab === 'analytics' && (
          <AnalyticsTab cooks={cooks} />
        )}
        {!isDetail && tab === 'guide' && (
          <GuideTab guideKey={guideKey} setGuideKey={setGuideKey}
            guideCat={guideCat} setGuideCat={setGuideCat} onStartCook={startFromGuide} />
        )}
        {!isDetail && tab === 'recipes' && (
          <RecipesTab flash={flash} />
        )}
        {!isDetail && tab === 'stall' && <StallCard />}
      </main>
    </div>

    {/* Bottom nav (mobile) */}
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 64,
      background: 'var(--surface)', borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'stretch', zIndex: 20,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }} id="bottom-nav">
      {[
        { id: 'dashboard', Icon: LayoutDashboard, label: 'Home' },
        { id: 'active',    Icon: Flame,           label: activeId ? 'Active' : 'Cook' },
        { id: 'history',   Icon: Clock,            label: 'History' },
        { id: 'analytics', Icon: BarChart2,         label: 'Stats' },
        { id: 'recipes',   Icon: FlaskConical,      label: 'Recipes' },
      ].map(({ id, Icon, label }) => (
        <button key={id} onClick={() => handleNavClick(id)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 3, border: 'none',
            background: 'transparent',
            color: tab === id ? 'var(--ember)' : 'var(--text3)',
            fontSize: 10, fontFamily: 'var(--font)', cursor: 'pointer',
            transition: 'color .15s',
          }}>
          <Icon size={20} />
          {label}
        </button>
      ))}
    </nav>
  </div>
);
```

- [ ] **Step 4: Add handleNavClick helper (before the return)**

```js
const handleNavClick = id => {
  setTab(id);
  if (id === 'active') {
    if (!activeId) setView('new'); else setView('active');
  }
  if (id !== 'history' && id !== 'dashboard') setDetailId(null);
};
```

- [ ] **Step 5: Add sidebar show/hide CSS for desktop in index.css**

Append to `src/index.css`:

```css
@media (min-width: 769px) {
  #app-sidebar  { display: flex !important; }
  #bottom-nav   { display: none !important; }
}
```

- [ ] **Step 6: Create stub components so app doesn't crash**

Create `src/components/DashboardTab.jsx`:
```jsx
export default function DashboardTab() {
  return <div style={{ color: 'var(--text2)', padding: '2rem', textAlign: 'center' }}>Dashboard — coming in next task</div>;
}
```

Create `src/components/AnalyticsTab.jsx`:
```jsx
export default function AnalyticsTab() {
  return <div style={{ color: 'var(--text2)', padding: '2rem', textAlign: 'center' }}>Analytics — coming soon</div>;
}
```

Create `src/components/RecipesTab.jsx`:
```jsx
export default function RecipesTab() {
  return <div style={{ color: 'var(--text2)', padding: '2rem', textAlign: 'center' }}>Recipes — coming soon</div>;
}
```

- [ ] **Step 7: Verify nav works**

`npm run dev` → confirm: dark header renders with RFX ember logo, bottom nav shows on narrow window, sidebar shows on wide window, clicking each nav item switches content without crashing.

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx src/components/DashboardTab.jsx src/components/AnalyticsTab.jsx src/components/RecipesTab.jsx src/index.css
git commit -m "feat: new app shell — sidebar nav desktop, bottom nav mobile, ember header"
```

---

## Task 4: Build DashboardTab

**Files:**
- Modify: `src/components/DashboardTab.jsx` (replace stub)

- [ ] **Step 1: Write DashboardTab.jsx**

```jsx
import { Flame, Clock, Star, ChevronRight, Plus } from 'lucide-react';
import { dur, shortDate } from '../utils/helpers';
import { PROBE_COLORS } from '../utils/helpers';

function StatPill({ label, value }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1rem', textAlign: 'center', flex: 1 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 500, color: 'var(--ember)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
    </div>
  );
}

function RecentCard({ cook, onClick }) {
  const last = cook.probes[0]?.readings.slice(-1)[0];
  return (
    <div onClick={onClick} style={{ background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1rem', cursor: 'pointer', minWidth: 160,
      transition: 'border-color .15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ember)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{shortDate(cook.startTime)}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{cook.cut}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {[1,2,3,4,5].map(s => (
          <span key={s} style={{ color: s <= cook.rating ? 'var(--amber)' : 'var(--ash)', fontSize: 12 }}>★</span>
        ))}
      </div>
      {cook.endTime && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--mono)' }}>{dur(cook.endTime - cook.startTime)}</div>}
    </div>
  );
}

export default function DashboardTab({ cooks, activeId, activeCook, tick, onGoActive, onNewCook, onSelectCook }) {
  const completed = cooks.filter(c => c.status === 'complete');
  const totalHours = completed.reduce((acc, c) => acc + (c.endTime && c.startTime ? (c.endTime - c.startTime) : 0), 0);
  const cutCounts = completed.reduce((a, c) => { a[c.cut] = (a[c.cut] || 0) + 1; return a; }, {});
  const favCut = Object.entries(cutCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';
  const recent = completed.slice(0, 4);

  const elapsedMs = activeCook ? Date.now() - activeCook.startTime : 0;

  return (
    <div className="fadein">
      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem' }}>
        <StatPill label="Total Cooks" value={completed.length} />
        <StatPill label="Hours Smoked" value={Math.round(totalHours / 3600000)} />
        <StatPill label="Fav Cut" value={favCut.length > 8 ? favCut.slice(0,7)+'…' : favCut} />
      </div>

      {/* Active cook card */}
      {activeCook && (
        <div onClick={onGoActive} style={{
          background: 'var(--surface)', border: '1px solid rgba(255,107,53,0.4)',
          borderRadius: 14, padding: '1.25rem', marginBottom: '1.5rem', cursor: 'pointer',
          boxShadow: '0 0 24px rgba(255,107,53,0.12)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ember)' }}>ACTIVE COOK</span>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text2)' }}>{dur(elapsedMs)}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 10 }}>{activeCook.name}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {activeCook.probes.map((p, i) => {
              const last = p.readings.slice(-1)[0];
              return (
                <div key={i} style={{ background: 'var(--surface-raised)', borderRadius: 8, padding: '6px 12px',
                  border: `1px solid ${PROBE_COLORS[i % PROBE_COLORS.length]}40` }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 18, color: PROBE_COLORS[i % PROBE_COLORS.length] }}>
                    {last ? `${last.temp}°` : '—'}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, color: 'var(--ember)', fontSize: 13 }}>
            <span>View active cook</span><ChevronRight size={14} />
          </div>
        </div>
      )}

      {/* Quick start */}
      {!activeCook && (
        <button className="btn-primary" onClick={onNewCook}
          style={{ width: '100%', marginBottom: '1.5rem', padding: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15 }}>
          <Flame size={18} /> Start New Cook
        </button>
      )}

      {/* Recent cooks */}
      {recent.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text2)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Recent Cooks</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
            {recent.map(c => <RecentCard key={c.id} cook={c} onClick={() => onSelectCook(c.id)} />)}
          </div>
        </>
      )}

      {cooks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text3)' }}>
          <Flame size={48} style={{ color: 'var(--ember)', opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>No cooks yet</div>
          <div style={{ fontSize: 13 }}>Start your first cook to see stats here.</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify Dashboard**

`npm run dev` → navigate to Dashboard tab → stat pills show, empty state shows if no cooks, active cook card appears if a cook is running.

- [ ] **Step 3: Commit**

```bash
git add src/components/DashboardTab.jsx
git commit -m "feat: build Dashboard tab — stats, active cook card, recent cooks strip"
```

---

## Task 5: Redesign Active Cook — probe cards, ambient strip, chart dark theme

**Files:**
- Modify: `src/components/ActiveTab.jsx`
- Modify: `src/components/TempChart.jsx`

- [ ] **Step 1: Read current ActiveTab.jsx and TempChart.jsx before editing**

Read both files fully to understand current prop contracts before making changes.

- [ ] **Step 2: Add ambient smoker strip to ActiveTab.jsx**

Find the section that renders when `view === 'active'` (after the header buttons). Add this immediately after the cook header row and before the probe cards:

```jsx
{/* Ambient strip */}
{(() => {
  const lastSmoker = activeCook.smokerReadings.slice(-1)[0];
  const pct = lastSmoker ? Math.min(100, Math.round((lastSmoker.temp / activeCook.smokerTarget) * 100)) : 0;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)',
      borderRadius: 12, padding: '12px 16px', marginBottom: '1rem',
      display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
          letterSpacing: '0.1em', marginBottom: 4 }}>Smoker / Ambient</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 500, color: 'var(--text)' }}>
            {lastSmoker ? `${lastSmoker.temp}°` : '—'}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>→ {activeCook.smokerTarget}°</span>
        </div>
        <div className="progress-track" style={{ marginTop: 6 }}>
          <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--ash)' }} />
        </div>
      </div>
    </div>
  );
})()}
```

- [ ] **Step 3: Replace probe card rendering in ActiveTab.jsx**

Find where probe tiles are rendered (likely a `.map` over `activeCook.probes`). Replace with:

```jsx
<div className="g4" style={{ marginBottom: '1rem' }}>
  {activeCook.probes.map((probe, i) => {
    const last = probe.readings.slice(-1)[0];
    const prev = probe.readings.slice(-3, -1);
    const isHot = prev.length >= 1 && last && (last.temp - prev[0].temp) > 4;
    const pct = last ? Math.min(100, Math.round((last.temp / probe.target) * 100)) : 0;
    const color = PROBE_COLORS[i % PROBE_COLORS.length];
    return (
      <div key={i} className={`probe-card${isHot ? ' hot' : ''}`}
        style={{ borderColor: `${color}30` }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: 6 }}>{probe.name}</div>
        <div className="temp-display" style={{ color, marginBottom: 4 }}>
          {last ? `${last.temp}°` : '—'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>→ {probe.target}°F</div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--mono)' }}>
          {pct}%
        </div>
      </div>
    );
  })}
</div>
```

Make sure `PROBE_COLORS` is imported: `import { PROBE_COLORS } from '../utils/helpers';`

- [ ] **Step 4: Dark-theme the temperature chart in TempChart.jsx**

Find the `<LineChart>` / `<ResponsiveContainer>` block. Update `<CartesianGrid>` and `<Tooltip>` styles:

```jsx
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
<XAxis stroke="var(--ash)" tick={{ fill: 'var(--text3)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
<YAxis stroke="var(--ash)" tick={{ fill: 'var(--text3)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
<Tooltip
  contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
  labelStyle={{ color: 'var(--text2)' }}
  itemStyle={{ color: 'var(--text)' }}
/>
```

Update probe line colors to use `PROBE_COLORS` from helpers instead of hardcoded values.

- [ ] **Step 5: Verify active cook UI**

`npm run dev` → start a cook, log a reading → ambient strip shows smoker temp, probe cards show with colored glowing borders, chart renders dark.

- [ ] **Step 6: Commit**

```bash
git add src/components/ActiveTab.jsx src/components/TempChart.jsx
git commit -m "feat: redesign active cook — ambient strip, ember probe cards, dark chart"
```

---

## Task 6: Multi-cook support

**Files:**
- Modify: `src/hooks/useStorage.js`
- Modify: `src/App.jsx`
- Modify: `src/components/ActiveTab.jsx`
- Create: `src/components/MultiCookBar.jsx`

- [ ] **Step 1: Add localStorage migration to useStorage.js**

Replace the entire file:

```js
const KEY = 'rfx-v5';

export const save = data => {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e) {}
};

export const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    // Migrate legacy activeCookId (string) → activeCooks (array)
    if (d && typeof d.aid === 'string' && !d.activeCooks) {
      d.activeCooks = d.aid ? [d.aid] : [];
      delete d.aid;
      localStorage.setItem(KEY, JSON.stringify(d));
    }
    return d;
  } catch(e) { return null; }
};
```

- [ ] **Step 2: Update App.jsx state for multi-cook**

Replace `const [activeId, setActiveId] = useState(null);` with:

```js
const [activeCooks, setActiveCooks] = useState([]); // array of cook IDs
const [activeCookIdx, setActiveCookIdx] = useState(0); // which tab is selected
```

Add derived value after state declarations:

```js
const activeId = activeCooks[activeCookIdx] ?? null;
const activeCook = cooks.find(c => c.id === activeId) ?? null;
const allActiveCooks = activeCooks.map(id => cooks.find(c => c.id === id)).filter(Boolean);
```

- [ ] **Step 3: Update load/persist in App.jsx**

In the load `useEffect`, change:
```js
setActiveCooks(d.activeCooks || []);
```

Update `persist`:
```js
const persist = (nc, ac, dis) => save({ cooks: nc, activeCooks: ac, dis });
const update  = (nc, ac = activeCooks, dis = dismissed) => { setCooks(nc); persist(nc, ac, dis); };
```

- [ ] **Step 4: Update startCook in App.jsx**

```js
const startCook = () => {
  const now = Date.now();
  const cook = {
    id: String(now), name: form.name || `${form.meat} — ${form.cut}`,
    meat: form.meat, cut: form.cut, smokerTarget: Number(form.smokerTarget),
    startTime: now, endTime: null, status: 'active',
    probes: form.probes.map((p, i) => ({ id: i, name: p.name, target: Number(p.target), readings: [] })),
    smokerReadings: [], notes: '', rating: 0,
    weight: null, equipment: '', linkedRecipes: [], mopTimer: null,
  };
  const nc = [cook, ...cooks];
  const newActive = [...activeCooks, cook.id];
  setCooks(nc); setActiveCooks(newActive); setActiveCookIdx(newActive.length - 1);
  persist(nc, newActive, dismissed);
  setForm({ name: '', meat: 'Beef', cut: 'Brisket', smokerTarget: 225, probes: [{ name: 'Probe 1', target: 203 }] });
  setView('active'); setTab('active');
};
```

- [ ] **Step 5: Update endCook in App.jsx**

```js
const endCook = () => {
  const id = activeId;
  const nc = cooks.map(c => c.id === id ? { ...c, status: 'complete', endTime: Date.now() } : c);
  const newActive = activeCooks.filter(aid => aid !== id);
  setCooks(nc); setActiveCooks(newActive); setActiveCookIdx(Math.max(0, activeCookIdx - 1));
  persist(nc, newActive, dismissed);
  setDetailId(id); setConfirmEnd(false); setView('detail'); setTab('history');
};
```

- [ ] **Step 6: Add multi-cook tab strip to ActiveTab.jsx**

Pass `allActiveCooks`, `activeCookIdx`, `setActiveCookIdx`, `onAddCook` as new props from App.jsx.

At the top of the active monitor view (when `view === 'active'`), add:

```jsx
{allActiveCooks.length > 1 && (
  <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', overflowX: 'auto' }}>
    {allActiveCooks.map((c, i) => (
      <button key={c.id} onClick={() => setActiveCookIdx(i)}
        className={i === activeCookIdx ? 'btn-primary' : 'btn-ghost'}
        style={{ whiteSpace: 'nowrap', fontSize: 12, padding: '6px 14px' }}>
        {c.name || `Cook ${i+1}`}
      </button>
    ))}
    {allActiveCooks.length < 4 && (
      <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}
        onClick={() => { setView('new'); }}>+ Add Cook</button>
    )}
  </div>
)}
```

- [ ] **Step 7: Create MultiCookBar.jsx**

```jsx
import { PROBE_COLORS } from '../utils/helpers';

export default function MultiCookBar({ activeCooks }) {
  if (!activeCooks || activeCooks.length < 2) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
      background: 'rgba(20,20,16,0.95)', borderBottom: '1px solid rgba(255,107,53,0.2)',
      padding: '6px 1rem', display: 'flex', gap: '1rem', overflowX: 'auto',
      backdropFilter: 'blur(8px)',
    }}>
      {activeCooks.map((cook, ci) => {
        const hotProbe = cook.probes.reduce((best, p) => {
          const last = p.readings.slice(-1)[0];
          const bestLast = best?.readings.slice(-1)[0];
          return last && (!bestLast || last.temp > bestLast.temp) ? p : best;
        }, null);
        const last = hotProbe?.readings.slice(-1)[0];
        return (
          <div key={cook.id} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <span className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{cook.name}</span>
            {last && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: PROBE_COLORS[ci % PROBE_COLORS.length] }}>{last.temp}°F</span>}
          </div>
        );
      })}
    </div>
  );
}
```

Wire `<MultiCookBar activeCooks={allActiveCooks} />` at the top of the App.jsx return (above the sidebar).

- [ ] **Step 8: Verify multi-cook**

`npm run dev` → start a cook, click "+ Add Cook", start a second cook → tab strip shows both, switching tabs shows different probe data. End one cook → it disappears from tabs, other cook remains active.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useStorage.js src/App.jsx src/components/ActiveTab.jsx src/components/MultiCookBar.jsx
git commit -m "feat: multi-cook support — tab strip, activeCooks[], localStorage migration"
```

---

## Task 7: Mop/Spray timer

**Files:**
- Create: `src/hooks/useMopTimer.js`
- Create: `src/components/MopTimerBadge.jsx`
- Modify: `src/App.jsx` (new cook form fields, mop state wired up)
- Modify: `src/components/ActiveTab.jsx` (badge + alert + form fields)
- Modify: `src/components/TempChart.jsx` (spray event markers)

- [ ] **Step 1: Create useMopTimer.js**

```js
import { useState, useEffect, useRef, useCallback } from 'react';

export function useMopTimer(activeCook, onSprayEvent) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [alert, setAlert] = useState(false);
  const intervalRef = useRef(null);

  const mop = activeCook?.mopTimer;
  const enabled = mop?.enabled && mop?.intervalMin > 0;

  useEffect(() => {
    if (!enabled) { setSecondsLeft(null); setAlert(false); return; }

    const totalSecs = mop.intervalMin * 60;
    // Determine time since last spray (or since cook start)
    const lastEvent = mop.events?.slice(-1)[0];
    const lastTs = lastEvent?.ts ?? activeCook.startTime;
    const elapsed = Math.floor((Date.now() - lastTs) / 1000);
    const remaining = Math.max(0, totalSecs - elapsed);
    setSecondsLeft(remaining);
    if (remaining === 0) setAlert(true);

    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { setAlert(true); return 0; }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [enabled, activeCook?.id, mop?.events?.length]);

  const dismissSpray = useCallback(() => {
    setAlert(false);
    if (activeCook && mop?.enabled) {
      onSprayEvent(activeCook.id);
    }
  }, [activeCook, mop, onSprayEvent]);

  const fmt = s => {
    if (s == null) return null;
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return { countdown: fmt(secondsLeft), alert, dismissSpray };
}
```

- [ ] **Step 2: Create MopTimerBadge.jsx**

```jsx
import { Droplets } from 'lucide-react';

export default function MopTimerBadge({ countdown, alert, label, onDismiss }) {
  if (!countdown) return null;
  return (
    <>
      {/* Countdown badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: alert ? 'rgba(245,158,11,0.15)' : 'var(--surface-raised)',
        border: `1px solid ${alert ? 'var(--amber)' : 'var(--border2)'}`,
        borderRadius: 20, padding: '5px 12px', fontSize: 12,
        color: alert ? 'var(--amber)' : 'var(--text2)',
        transition: 'all .3s',
      }}>
        <Droplets size={13} />
        {alert ? `Spray time! ${label}` : `Spray in ${countdown}`}
      </div>

      {/* Alert card */}
      {alert && (
        <div className="alert alert-amber fadein" style={{ marginTop: '0.75rem' }}>
          <Droplets size={18} style={{ flexShrink: 0, color: 'var(--amber)', marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Time to spray!</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{label || 'Apply your mop/spray'}</div>
          </div>
          <button className="btn" style={{ fontSize: 12 }} onClick={onDismiss}>Done ✓</button>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Add mop timer fields to new cook form in ActiveTab.jsx**

In the new cook form (where `view === 'new'`), before the submit button, add a mop timer section. The form state in App.jsx needs a `mop` field. First, update the default form state in App.jsx:

```js
const [form, setForm] = useState({
  name: '', meat: 'Beef', cut: 'Brisket', smokerTarget: 225,
  probes: [{ name: 'Probe 1', target: 203 }],
  weight: '', equipment: '',
  mop: { enabled: false, intervalMin: 45, label: '' },
});
```

In ActiveTab.jsx new cook form, add after the probes section:

```jsx
<hr className="divider" />
<div style={{ marginBottom: '1rem' }}>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
    <label style={{ margin: 0, fontSize: 13, color: 'var(--text)' }}>Mop / Spray Timer</label>
    <button type="button" className={form.mop?.enabled ? 'btn-primary' : 'btn-ghost'}
      style={{ padding: '4px 12px', fontSize: 12 }}
      onClick={() => setForm(f => ({ ...f, mop: { ...f.mop, enabled: !f.mop?.enabled } }))}>
      {form.mop?.enabled ? 'On' : 'Off'}
    </button>
  </div>
  {form.mop?.enabled && (
    <div className="g2">
      <div>
        <label>Interval (min)</label>
        <select value={form.mop.intervalMin}
          onChange={e => setForm(f => ({ ...f, mop: { ...f.mop, intervalMin: Number(e.target.value) } }))}>
          {[15,30,45,60].map(v => <option key={v} value={v}>{v} min</option>)}
        </select>
      </div>
      <div>
        <label>What (e.g. apple juice)</label>
        <input value={form.mop.label}
          onChange={e => setForm(f => ({ ...f, mop: { ...f.mop, label: e.target.value } }))}
          placeholder="Apple juice + butter" />
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 4: Wire mop timer into startCook in App.jsx**

In `startCook`, add mop data to the cook object:

```js
mopTimer: form.mop?.enabled
  ? { enabled: true, intervalMin: form.mop.intervalMin, label: form.mop.label, events: [] }
  : null,
```

- [ ] **Step 5: Add onSprayEvent handler in App.jsx**

```js
const logSprayEvent = cookId => {
  const now = Date.now();
  const mins = +((now - (cooks.find(c=>c.id===cookId)?.startTime || now)) / 60000).toFixed(2);
  const nc = cooks.map(c => {
    if (c.id !== cookId || !c.mopTimer) return c;
    return { ...c, mopTimer: { ...c.mopTimer, events: [...(c.mopTimer.events||[]), { ts: now, time: mins }] } };
  });
  update(nc);
};
```

- [ ] **Step 6: Use the hook and badge in ActiveTab.jsx**

Import and wire up at the top of ActiveTab.jsx monitor view:

```jsx
import { useMopTimer } from '../hooks/useMopTimer';
import MopTimerBadge from './MopTimerBadge';

// Inside the component:
const { countdown, alert: mopAlert, dismissSpray } = useMopTimer(activeCook, onSprayEvent);
```

Add `onSprayEvent` as a prop from App.jsx (`onSprayEvent={logSprayEvent}`).

Place `<MopTimerBadge countdown={countdown} alert={mopAlert} label={activeCook?.mopTimer?.label} onDismiss={dismissSpray} />` after the alert cards and before the chart.

- [ ] **Step 7: Add spray markers to TempChart.jsx**

Pass `sprayEvents={activeCook?.mopTimer?.events || []}` to TempChart from ActiveTab.

In TempChart, add vertical reference lines for each spray event:

```jsx
import { ReferenceLine } from 'recharts';

// Inside the chart, after existing lines:
{sprayEvents.map((ev, i) => (
  <ReferenceLine key={i} x={ev.time} stroke="var(--blue)"
    strokeDasharray="4 4" strokeOpacity={0.6}
    label={{ value: '💧', position: 'top', fontSize: 10 }} />
))}
```

- [ ] **Step 8: Verify mop timer**

`npm run dev` → start a cook with mop timer set to 1min → badge countdown appears → wait for it to hit 0 → alert card fires → click "Done ✓" → timer resets, spray event logged → check chart for spray marker line.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useMopTimer.js src/components/MopTimerBadge.jsx src/components/ActiveTab.jsx src/components/TempChart.jsx src/App.jsx
git commit -m "feat: mop/spray timer — countdown badge, browser alert, chart markers"
```

---

## Task 8: Restyle HistoryTab, DetailView, GuideTab, StallCard

**Files:**
- Modify: `src/components/HistoryTab.jsx`
- Modify: `src/components/DetailView.jsx`
- Modify: `src/components/GuideTab.jsx`
- Modify: `src/components/StallCard.jsx`

This task is a dark-theme pass. Read each file in full, then apply these principles:
- Replace all light-mode hardcoded colors (`#fff`, `#f`, `rgba(0,0,...`) with CSS variables
- Replace all emoji icons with Lucide equivalents
- Apply `.card` → glass/surface cards, `.btn` → new button classes
- Use `var(--font-display)` for headings, `var(--mono)` for temperatures

- [ ] **Step 1: Restyle HistoryTab.jsx**

Key changes:
- Section header: Oswald font-display, text-uppercase, letter-spacing
- Cook rows: `.card` with hover border-color `var(--ember)`, cursor pointer
- Star ratings: amber color
- Active cook badge: ember border + ember text
- Replace 📋 → `<Clock />`, 🔥 → `<Flame />` from lucide-react

Imports to add: `import { Clock, Flame, ChevronRight, Star } from 'lucide-react';`

- [ ] **Step 2: Restyle DetailView.jsx**

Key changes:
- Sub-tabs: use `.nav-tab` class
- KPI metric boxes: `.metric` class, mono font for values
- Chart: already updated in Task 5
- Export/Share button: `.btn-primary` — "Share Cook" label (share card added in Task 10)
- Replace all emoji with Lucide icons

Imports to add: `import { ChevronLeft, Trash2, Share2, Star, BarChart2, FileText, StickyNote } from 'lucide-react';`

- [ ] **Step 3: Restyle GuideTab.jsx**

Key changes:
- Category tabs: use `.nav-tab` class
- Cut list items: use `.guide-cut` class (already defined in CSS)
- Guide content cards: `.card` class
- Pellet badges: `.badge-amber`
- Stage blocks: `.stage-block` + `.step-num`
- "Start this cook" → `.btn-primary`

Imports: `import { BookOpen, ChevronRight, Flame } from 'lucide-react';`

- [ ] **Step 4: Restyle StallCard.jsx**

Key changes:
- All background colors → CSS variable equivalents
- Stall duration bars: use ember gradient fill
- Strategy cards: `.card-glass` class
- Replace 🌡️ → `<Thermometer />`, ⏱️ → `<Clock />`

Imports: `import { Thermometer, Clock, AlertTriangle, CheckCircle } from 'lucide-react';`

- [ ] **Step 5: Verify all tabs**

Navigate through every tab — History, Detail (click a cook), Guide (try a few cuts), Stall — confirm no white backgrounds, no emoji, all text legible on dark surface.

- [ ] **Step 6: Commit**

```bash
git add src/components/HistoryTab.jsx src/components/DetailView.jsx src/components/GuideTab.jsx src/components/StallCard.jsx
git commit -m "feat: dark-theme pass — History, Detail, Guide, Stall with Lucide icons"
```

---

## Task 9: Analytics tab

**Files:**
- Create: `src/utils/analytics.js`
- Modify: `src/components/AnalyticsTab.jsx` (replace stub)

- [ ] **Step 1: Create src/utils/analytics.js**

```js
/**
 * Derive personal analytics from cook history.
 */

export function totalStats(cooks) {
  const done = cooks.filter(c => c.status === 'complete' && c.endTime);
  const totalMs = done.reduce((a, c) => a + (c.endTime - c.startTime), 0);
  const cutCounts = done.reduce((a, c) => { a[c.cut] = (a[c.cut] || 0) + 1; return a; }, {});
  const woodCounts = done.reduce((a, c) => { if (c.pellet) a[c.pellet] = (a[c.pellet] || 0) + 1; return a; }, {});
  const favCut  = Object.entries(cutCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? '—';
  const favWood = Object.entries(woodCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? '—';
  const rated = done.filter(c => c.rating > 0);
  const avgRating = rated.length ? (rated.reduce((a,c)=>a+c.rating,0)/rated.length).toFixed(1) : '—';
  return { total: done.length, totalMs, totalHours: totalMs/3600000, favCut, favWood, avgRating };
}

export function cooksByMonth(cooks) {
  const done = cooks.filter(c => c.status === 'complete' && c.startTime);
  const counts = {};
  done.forEach(c => {
    const d = new Date(c.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  // Last 12 months
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    result.push({ key, label, count: counts[key] || 0 });
  }
  return result;
}

export function stallPrediction(cooks, cut) {
  const matching = cooks.filter(c => c.cut === cut && c.status === 'complete');
  if (matching.length < 2) return null;
  const stallTemps = [], stallDurations = [];
  matching.forEach(cook => {
    cook.probes.forEach(probe => {
      const readings = probe.readings;
      for (let i = 3; i < readings.length; i++) {
        const window = readings.slice(i-3, i+1);
        const temps = window.map(r=>r.temp);
        const range = Math.max(...temps) - Math.min(...temps);
        const tdiff = window[window.length-1].time - window[0].time;
        if (range < 8 && tdiff >= 18 && temps[0] >= 140 && temps[0] <= 185) {
          stallTemps.push(temps[0]);
          stallDurations.push(tdiff);
          break;
        }
      }
    });
  });
  if (stallTemps.length < 2) return null;
  const avgTemp = Math.round(stallTemps.reduce((a,b)=>a+b,0)/stallTemps.length);
  const avgDur  = Math.round(stallDurations.reduce((a,b)=>a+b,0)/stallDurations.length);
  return { avgTemp, avgDurMin: avgDur, sampleSize: stallTemps.length };
}

export function avgCurve(cooks, cut) {
  const matching = cooks.filter(c => c.cut === cut && c.status === 'complete' && c.probes[0]?.readings.length > 4);
  if (matching.length < 2) return null;
  // Normalize to 0-100 time scale, sample at 5-point intervals
  const normalized = matching.map(cook => {
    const readings = cook.probes[0].readings;
    const maxT = readings[readings.length-1].time;
    return readings.map(r => ({ t: r.time/maxT*100, temp: r.temp }));
  });
  // Sample at 0,5,10,...,100
  const points = [];
  for (let p = 0; p <= 100; p += 5) {
    const temps = normalized.map(curve => {
      const nearest = curve.reduce((best, r) => Math.abs(r.t-p) < Math.abs(best.t-p) ? r : best, curve[0]);
      return nearest.temp;
    });
    points.push({ p, avg: Math.round(temps.reduce((a,b)=>a+b,0)/temps.length) });
  }
  return points;
}
```

- [ ] **Step 2: Write AnalyticsTab.jsx**

```jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { BarChart2, Flame, Clock, Star, TrendingUp } from 'lucide-react';
import { totalStats, cooksByMonth, stallPrediction } from '../utils/analytics';
import { MEATS } from '../data/meats';
import { useState } from 'react';

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <Icon size={20} style={{ color: 'var(--ember)', marginBottom: 8 }} />
      <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsTab({ cooks }) {
  const [selectedCut, setSelectedCut] = useState('Brisket');
  const stats = totalStats(cooks);
  const monthly = cooksByMonth(cooks);
  const stall = stallPrediction(cooks, selectedCut);
  const allCuts = Object.values(MEATS).flat();

  if (cooks.filter(c=>c.status==='complete').length === 0) {
    return (
      <div className="fadein" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text3)' }}>
        <BarChart2 size={48} style={{ color: 'var(--ember)', opacity: 0.3, marginBottom: 12 }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>No data yet</div>
        <div style={{ fontSize: 13 }}>Complete a few cooks to see your personal analytics.</div>
      </div>
    );
  }

  return (
    <div className="fadein">
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginBottom: '1.25rem',
        letterSpacing: '0.03em' }}>Your Stats</div>

      {/* Summary cards */}
      <div className="g2" style={{ marginBottom: '1.5rem' }}>
        <StatCard icon={Flame} label="Total Cooks" value={stats.total} />
        <StatCard icon={Clock} label="Hours Smoked" value={`${Math.round(stats.totalHours)}h`} />
        <StatCard icon={TrendingUp} label="Favorite Cut" value={stats.favCut.length > 10 ? stats.favCut.slice(0,9)+'…' : stats.favCut} />
        <StatCard icon={Star} label="Avg Rating" value={stats.avgRating} sub="out of 5" />
      </div>

      {/* Monthly frequency */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text2)',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Cooks Per Month</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={monthly} barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--ash)" tick={{ fill: 'var(--text3)', fontSize: 10 }} />
            <YAxis allowDecimals={false} stroke="var(--ash)" tick={{ fill: 'var(--text3)', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" fill="var(--ember)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stall prediction */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text2)',
            textTransform: 'uppercase', letterSpacing: '0.1em' }}>Stall Prediction</div>
          <select value={selectedCut} onChange={e => setSelectedCut(e.target.value)}
            style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}>
            {allCuts.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {stall ? (
          <div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              Based on {stall.sampleSize} past {selectedCut} cook{stall.sampleSize > 1 ? 's' : ''}:
            </div>
            <div className="g2">
              <div className="metric">
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Typical Stall Temp</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 22, color: 'var(--ember)' }}>{stall.avgTemp}°F</div>
              </div>
              <div className="metric">
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Avg Stall Duration</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 22, color: 'var(--amber)' }}>{stall.avgDurMin} min</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text3)', padding: '0.5rem 0' }}>
            Need at least 2 completed {selectedCut} cooks to predict your stall pattern.
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify Analytics tab**

`npm run dev` → navigate to Analytics tab → with no cooks: empty state. With cooks: stat cards show correct values, bar chart renders dark, stall prediction appears for cuts with enough data.

- [ ] **Step 4: Commit**

```bash
git add src/utils/analytics.js src/components/AnalyticsTab.jsx
git commit -m "feat: analytics tab — cook stats, monthly chart, stall prediction"
```

---

## Task 10: Recipes tab + Plan to Eat CSV import

**Files:**
- Create: `src/hooks/useRecipes.js`
- Create: `src/utils/planToEatParser.js`
- Modify: `src/components/RecipesTab.jsx` (replace stub)

- [ ] **Step 1: Create src/hooks/useRecipes.js**

```js
import { useState, useEffect } from 'react';

const KEY = 'rfx-recipes-v1';

const load = () => {
  try { const d = localStorage.getItem(KEY); return d ? JSON.parse(d) : []; }
  catch(e) { return []; }
};
const persist = data => {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e) {}
};

export function useRecipes() {
  const [recipes, setRecipes] = useState([]);

  useEffect(() => { setRecipes(load()); }, []);

  const save = newRecipes => { setRecipes(newRecipes); persist(newRecipes); };

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
      .map(r => ({ ...r, id: String(Date.now() + Math.random()), createdAt: Date.now(), source: 'plantoeat-import' }));
    const dupes = incoming.filter(r => existing.has(r.name.toLowerCase()));
    save([...newOnes, ...recipes]);
    return { added: newOnes.length, skipped: dupes.length };
  };

  return { recipes, add, update, remove, importMany };
}
```

- [ ] **Step 2: Create src/utils/planToEatParser.js**

```js
/**
 * Parse a Plan to Eat CSV export into recipe objects.
 * Plan to Eat exports columns: Name, Servings, Source, Ingredients, Directions, Notes, ...
 */
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
      // Handle quoted fields with commas inside
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
      // Parse ingredients: split by newline or semicolon
      const ingredients = rawIng
        .split(/\n|;/)
        .map(l => l.replace(/^"|"$/g, '').trim())
        .filter(Boolean)
        .map(l => ({ ingredient: l, amount: '', unit: '' }));

      return {
        name,
        category: 'rub', // default — user changes after import
        ingredients,
        instructions: dirCol >= 0 ? (cols[dirCol] || '').replace(/^"|"$/g, '').trim() : '',
        notes: noteCol >= 0 ? (cols[noteCol] || '').replace(/^"|"$/g, '').trim() : '',
        linkedCuts: [],
        rating: 0,
      };
    })
    .filter(Boolean);
}
```

- [ ] **Step 3: Write RecipesTab.jsx**

```jsx
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{recipe.name}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <span className="badge badge-amber">{CAT_LABELS[recipe.category] || recipe.category}</span>
            {recipe.source === 'plantoeat-import' && <span className="badge badge-gray">Plan to Eat</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
            onClick={e => { e.stopPropagation(); onDelete(recipe.id); }}>
            <Trash2 size={13} />
          </button>
          {open ? <ChevronUp size={16} color="var(--text3)" /> : <ChevronDown size={16} color="var(--text3)" />}
        </div>
      </div>
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
        <div><label>Name *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Memphis Dry Rub" /></div>
        <div><label>Category</label>
          <select value={category} onChange={e=>setCategory(e.target.value)}>
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
      <div style={{ marginBottom: '.75rem' }}><label>Instructions</label><textarea rows={3} value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Mix all dry ingredients..." /></div>
      <div style={{ marginBottom: '1rem' }}><label>Notes</label><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Great on brisket and pork butt" /></div>
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
  const [importing, setImporting] = useState(false);
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

      {/* Plan to Eat import preview */}
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

      {/* Category tabs */}
      <div className="nav-tabs">
        {CATEGORIES.map(c => (
          <button key={c} className={`nav-tab${activeCat === c ? ' active' : ''}`} onClick={() => setActiveCat(c)}>
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
```

- [ ] **Step 4: Verify Recipes tab**

`npm run dev` → Recipes tab → create a recipe manually → it saves and appears. Export a recipe from Plan to Eat as CSV (or create a test CSV with columns Name, Ingredients, Directions) → import → preview modal shows → confirm → recipes appear in list.

Test CSV format:
```
Name,Ingredients,Directions,Notes
Memphis Rub,"2 tbsp paprika;1 tbsp brown sugar","Mix all dry ingredients","Good on ribs"
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRecipes.js src/utils/planToEatParser.js src/components/RecipesTab.jsx
git commit -m "feat: recipes tab — rub/brine builder, Plan to Eat CSV import"
```

---

## Task 11: Cook share card

**Files:**
- Create: `src/components/ShareCard.jsx`
- Create: `src/utils/shareCard.js`
- Modify: `src/components/DetailView.jsx` (add Share button)

- [ ] **Step 1: Create src/utils/shareCard.js**

```js
import html2canvas from 'html2canvas';

export async function captureShareCard(elementId) {
  const el = document.getElementById(elementId);
  if (!el) throw new Error('Share card element not found');

  const canvas = await html2canvas(el, {
    backgroundColor: '#141410',
    scale: 2, // retina quality
    useCORS: true,
    logging: false,
  });

  return canvas;
}

export function downloadCanvas(canvas, filename = 'rfx-cook.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function copyCanvasToClipboard(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error('Canvas to blob failed')); return; }
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        .then(resolve).catch(reject);
    }, 'image/png');
  });
}

/**
 * Serialize a live Recharts SVG to a data URL for use as <img> in html2canvas.
 * Pass the container element that wraps the ResponsiveContainer.
 */
export function svgToDataUrl(containerEl) {
  if (!containerEl) return null;
  const svg = containerEl.querySelector('svg');
  if (!svg) return null;
  const svgStr = new XMLSerializer().serializeToString(svg);
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
}
```

- [ ] **Step 2: Create src/components/ShareCard.jsx**

```jsx
import { useRef, useState } from 'react';
import { Share2, Download, Copy, X } from 'lucide-react';
import { captureShareCard, downloadCanvas, copyCanvasToClipboard, svgToDataUrl } from '../utils/shareCard';
import { dur, shortDate } from '../utils/helpers';
import { PROBE_COLORS } from '../utils/helpers';

function OffscreenCard({ cook, chartImgUrl, id }) {
  const done = cook.endTime && cook.startTime;
  return (
    <div id={id} style={{
      width: 800, background: '#141410', borderRadius: 16, padding: 32,
      fontFamily: 'Inter, sans-serif', color: '#F5F5F0',
      border: '1px solid rgba(255,107,53,0.2)',
      position: 'fixed', left: -9999, top: -9999,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 32, color: '#FF6B35',
            textShadow: '0 0 20px rgba(255,107,53,0.5)', letterSpacing: '0.05em' }}>RFX</div>
          <div style={{ fontSize: 9, letterSpacing: '0.15em', color: '#6B6B65', textTransform: 'uppercase' }}>Cook Tracker</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, fontWeight: 600 }}>{cook.name}</div>
          <div style={{ fontSize: 12, color: '#B5B5AE', marginTop: 4 }}>{shortDate(cook.startTime)}</div>
        </div>
      </div>

      {/* Stats + chart */}
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Left: stats */}
        <div style={{ flex: '0 0 200px' }}>
          {[
            ['Cut', cook.cut],
            ['Meat', cook.meat],
            done && ['Duration', dur(cook.endTime - cook.startTime)],
            ['Smoker', `${cook.smokerTarget}°F`],
          ].filter(Boolean).map(([label, val]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#6B6B65', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, color: '#F5F5F0' }}>{val}</div>
            </div>
          ))}
          {/* Probe finals */}
          {cook.probes.map((p, i) => {
            const last = p.readings.slice(-1)[0];
            return last ? (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#6B6B65', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.name}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, color: PROBE_COLORS[i % PROBE_COLORS.length] }}>{last.temp}°F</div>
              </div>
            ) : null;
          })}
          {/* Rating */}
          {cook.rating > 0 && (
            <div>
              <div style={{ fontSize: 10, color: '#6B6B65', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Rating</div>
              <div style={{ fontSize: 18 }}>{'★'.repeat(cook.rating)}{'☆'.repeat(5-cook.rating)}</div>
            </div>
          )}
        </div>

        {/* Right: chart */}
        <div style={{ flex: 1, background: '#0A0A08', borderRadius: 10, overflow: 'hidden', minHeight: 200 }}>
          {chartImgUrl
            ? <img src={chartImgUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="temp chart" />
            : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#5A5A55', fontSize: 12 }}>No chart data</div>
          }
        </div>
      </div>

      {/* Notes */}
      {cook.notes && (
        <div style={{ marginTop: 20, padding: '12px 16px', background: '#1C1C18', borderRadius: 8,
          fontSize: 12, color: '#B5B5AE', borderLeft: '3px solid rgba(255,107,53,0.4)', fontStyle: 'italic' }}>
          {cook.notes.slice(0, 200)}{cook.notes.length > 200 ? '…' : ''}
        </div>
      )}
    </div>
  );
}

export default function ShareButton({ cook, chartContainerRef, flash }) {
  const [working, setWorking] = useState(false);
  const [chartImgUrl, setChartImgUrl] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const CARD_ID = `share-card-${cook.id}`;

  const prepare = () => {
    const url = chartContainerRef?.current ? svgToDataUrl(chartContainerRef.current) : null;
    setChartImgUrl(url);
    setShowPanel(true);
  };

  const handleDownload = async () => {
    setWorking(true);
    try {
      const canvas = await captureShareCard(CARD_ID);
      downloadCanvas(canvas, `${cook.cut.replace(/\s+/g,'-')}-cook.png`);
      flash?.('Downloaded!');
    } catch(e) { flash?.('Download failed'); }
    setWorking(false);
  };

  const handleCopy = async () => {
    setWorking(true);
    try {
      const canvas = await captureShareCard(CARD_ID);
      await copyCanvasToClipboard(canvas);
      flash?.('Copied to clipboard!');
    } catch(e) { flash?.('Copy failed — try Download instead'); }
    setWorking(false);
  };

  return (
    <>
      <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        onClick={prepare}>
        <Share2 size={14} /> Share Cook
      </button>

      {showPanel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 400, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Share This Cook</div>
              <button style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}
                onClick={() => setShowPanel(false)}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: '1.25rem' }}>
              Generate a shareable image card with your cook stats and temperature graph.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={handleDownload} disabled={working}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Download size={14} /> Download PNG
              </button>
              <button className="btn-ghost" onClick={handleCopy} disabled={working}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Copy size={14} /> Copy
              </button>
            </div>
            {working && <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: 12, color: 'var(--text3)' }}>Generating…</div>}
          </div>
          {/* Off-screen render target */}
          <OffscreenCard cook={cook} chartImgUrl={chartImgUrl} id={CARD_ID} />
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Add Share button to DetailView.jsx**

In DetailView, add a ref for the chart container and import ShareButton:

```jsx
import { useRef } from 'react';
import ShareButton from './ShareButton';

// Inside the component:
const chartContainerRef = useRef(null);
```

Wrap the TempChart rendering in a div with `ref={chartContainerRef}`:
```jsx
<div ref={chartContainerRef}>
  <TempChart cook={cook} ... />
</div>
```

Add ShareButton in the Overview tab actions row:
```jsx
<ShareButton cook={cook} chartContainerRef={chartContainerRef} flash={flash} />
```

- [ ] **Step 4: Verify share card**

`npm run dev` → view a completed cook in Detail → click "Share Cook" → modal opens → click "Download PNG" → file downloads, opens as dark ember card with stats + chart image. Click "Copy" → paste into a chat app to verify image appears.

- [ ] **Step 5: Commit**

```bash
git add src/components/ShareCard.jsx src/utils/shareCard.js src/components/DetailView.jsx
git commit -m "feat: cook share card — PNG download and clipboard copy via html2canvas"
```

---

## Task 12: Rich cook metadata fields

**Files:**
- Modify: `src/App.jsx` (form state, startCook)
- Modify: `src/components/ActiveTab.jsx` (new cook form fields)
- Modify: `src/components/HistoryTab.jsx` (show metadata row)
- Modify: `src/components/DetailView.jsx` (show metadata in Overview)

- [ ] **Step 1: Update form state default in App.jsx**

The form default already includes `weight` and `equipment` from Task 7. Confirm it reads:

```js
const [form, setForm] = useState({
  name: '', meat: 'Beef', cut: 'Brisket', smokerTarget: 225,
  probes: [{ name: 'Probe 1', target: 203 }],
  weight: '', equipment: '',
  pellet: '',
  mop: { enabled: false, intervalMin: 45, label: '' },
});
```

- [ ] **Step 2: Add metadata fields to new cook form in ActiveTab.jsx**

In the "More Details" collapsible section (or after the main fields), add:

```jsx
<div style={{ marginBottom: '.75rem' }}>
  <label style={{ fontFamily:'var(--font-display)', fontSize:12, textTransform:'uppercase',
    letterSpacing:'0.08em', color:'var(--text3)', cursor:'pointer', userSelect:'none' }}
    onClick={() => setShowMore(m => !m)}>
    More Details {showMore ? '▲' : '▼'}
  </label>
</div>
{showMore && (
  <div className="fadein">
    <div className="g2" style={{ marginBottom: '.75rem' }}>
      <div>
        <label>Meat Weight (lbs)</label>
        <input type="number" min="0" step="0.1" value={form.weight}
          onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
          placeholder="12.5" />
      </div>
      <div>
        <label>Equipment</label>
        <input value={form.equipment}
          onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))}
          placeholder="Traeger Pro 780" />
      </div>
    </div>
    <div style={{ marginBottom: '.75rem' }}>
      <label>Pellet / Wood</label>
      <select value={form.pellet} onChange={e => setForm(f => ({ ...f, pellet: e.target.value }))}>
        <option value="">Select pellet...</option>
        {/* Import PELLETS from data/pellets.js */}
        {Object.keys(PELLETS).map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  </div>
)}
```

Add `const [showMore, setShowMore] = useState(false);` to ActiveTab state. Import `PELLETS` from `../data/pellets`.

- [ ] **Step 3: Persist metadata in startCook (App.jsx)**

The `startCook` function already includes `weight` and `equipment` from Task 6. Add `pellet`:

```js
pellet: form.pellet || '',
```

- [ ] **Step 4: Show metadata row in HistoryTab.jsx**

After the cook name/date row in each history card, add:

```jsx
{(cook.weight || cook.pellet || cook.equipment) && (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
    {cook.weight && <span className="badge badge-gray">{cook.weight} lbs</span>}
    {cook.pellet && <span className="badge badge-amber">{cook.pellet}</span>}
    {cook.equipment && <span className="badge badge-gray">{cook.equipment}</span>}
  </div>
)}
```

- [ ] **Step 5: Show metadata in DetailView Overview tab**

Add a metadata row after the KPI metrics:

```jsx
{(cook.weight || cook.pellet || cook.equipment) && (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
    {cook.weight && <span className="badge badge-gray">⚖ {cook.weight} lbs</span>}
    {cook.pellet && <span className="badge badge-amber">🪵 {cook.pellet}</span>}
    {cook.equipment && <span className="badge badge-gray">🔧 {cook.equipment}</span>}
  </div>
)}
```

- [ ] **Step 6: Verify metadata**

`npm run dev` → new cook form → expand "More Details" → fill in weight, equipment, pellet → start cook → end cook → view history and detail → metadata badges appear correctly.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/components/ActiveTab.jsx src/components/HistoryTab.jsx src/components/DetailView.jsx
git commit -m "feat: rich cook metadata — weight, equipment, pellet fields and display"
```

---

## Task 13: Final polish and deploy

**Files:**
- Modify: `src/App.jsx` (title, loading state)
- Misc cleanup

- [ ] **Step 1: Update loading state**

Replace the loading fallback in App.jsx:

```jsx
if (!loaded) return (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--ember)',
      textShadow: '0 0 30px rgba(255,107,53,0.6)', letterSpacing: '0.1em' }}>RFX</div>
    <div style={{ fontSize: 12, color: 'var(--text3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading your cooks…</div>
  </div>
);
```

- [ ] **Step 2: Verify full app walkthrough**

Go through every screen end-to-end:
1. Dashboard — stats, no active cook state
2. New Cook — form with metadata fields, mop timer toggle
3. Active Cook — start a cook, log 2-3 readings, check ambient strip, probe cards, chart
4. Multi-cook — "+ Add Cook", verify tab strip
5. Mop timer — set to 1 min, verify countdown, alert, chart marker
6. End cook — goes to detail view
7. History — cook appears with metadata badges
8. Detail > Overview — chart, metadata, Share button
9. Detail > Share — download PNG, verify it opens correctly
10. Analytics — stats appear, monthly chart
11. Recipes — create a rub, try CSV import with test CSV
12. Guide — navigate cuts, "Start this cook" pre-fills form

- [ ] **Step 3: Deploy**

```bash
npm run build
npm run deploy
```

Expected: `Published` message. Site live at the GitHub Pages URL.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: premium redesign complete — dark ember theme, 6 new feature areas"
```

---

## Spec Coverage Checklist

- [x] Dark ember color palette (Task 2)
- [x] Oswald/Inter/JetBrains Mono fonts (Task 1)
- [x] Lucide icons replace emojis (Tasks 3–8)
- [x] Glass-morphism cards (Task 2 CSS)
- [x] Ember glow on probe cards (Task 5)
- [x] Bottom nav mobile / sidebar desktop (Task 3)
- [x] Dashboard tab (Task 4)
- [x] Ambient smoker strip (Task 5)
- [x] Multi-cook tab strip (Task 6)
- [x] localStorage migration (Task 6)
- [x] Mop/spray timer (Task 7)
- [x] History/Detail/Guide/Stall dark reskin (Task 8)
- [x] Analytics tab + stall prediction (Task 9)
- [x] Recipes tab + Plan to Eat import (Task 10)
- [x] Cook share card (Task 11)
- [x] Rich cook metadata (Task 12)
- [x] Deploy (Task 13)
