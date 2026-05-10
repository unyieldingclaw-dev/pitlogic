# Smoke & Fire Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the "Smoke & Fire" visual treatment across all tabs — warm amber gradients, breathing glow animations, and ambient radial orbs — to make the app feel premium and alive.

**Architecture:** CSS-first approach — add design tokens, keyframes, and utility classes to `index.css`, then apply those classes to existing JSX elements. No new components, no restructuring. Recharts `TempChart` switches from `LineChart` to `ComposedChart` to gain `Area` fill layers under probe lines.

**Tech Stack:** React 19, vanilla CSS (CSS variables), Recharts 3.x

---

## File Map

| File | What changes |
|------|-------------|
| `src/index.css` | 4 tokens, 4 keyframes, 6 utility classes, motion guard, enhanced .probe-card.hot |
| `src/App.jsx` | `.pulse` → `.live-pulse` on 2 dots; sidebar active item: gradient bg + glow |
| `src/components/DashboardTab.jsx` | StatPill value → `.gradient-text`; active card → `.breathe-glow`; recent card hover warm-up |
| `src/components/ActiveTab.jsx` | probe card hot → `.breathe-glow` via CSS; wrap temp in `.temp-card`; progress fill gradient + `.shimmer-bar` |
| `src/components/LiveIntelligencePanel.jsx` | climb rate + ETA values → `.gradient-text` |
| `src/components/TempChart.jsx` | `LineChart` → `ComposedChart`; add Area fills with vertical gradients; warm grid |
| `src/components/HistoryTab.jsx` | history cards → `.card-interactive` for hover glow |
| `src/components/AnalyticsTab.jsx` | avg curve → amber stroke + drop-shadow; scatter → drop-shadow; StatCard value → `.gradient-text` |
| `src/components/SettingsSheet.jsx` | section header text → `.gradient-text` |

---

### Task 1: CSS Foundation

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add design tokens to `:root`**

Insert after the `--border2` line (currently line 22), before `--radius`:

```css
  --gradient-warm:  linear-gradient(135deg, #FF6B35, #FBBF24);
  --glow-ember:     0 0 24px rgba(255,107,53,0.18);
  --glow-ambient:   radial-gradient(circle, rgba(255,107,53,0.25), transparent 70%);
  --surface-warm:   linear-gradient(160deg, #0F0B08, #120A06);
```

- [ ] **Step 2: Enhance `fadein` and update `stall-border-pulse`**

Replace the existing animations block (lines 307–328) with:

```css
/* ── Animations ── */
@keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.3} }
@keyframes fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
@keyframes ember-pulse {
  0%,100% { box-shadow: 0 0 8px rgba(255,107,53,0.3); }
  50%      { box-shadow: 0 0 24px rgba(255,107,53,0.7); }
}
.fadein { animation: fadein .2s ease; }
.pulse  { animation: pulse 1.5s infinite; }
.ember-pulse { animation: ember-pulse 2s infinite; }

@keyframes stall-border-pulse {
  0%,100% { border-color: rgba(245,158,11,.5); box-shadow: 0 0 10px rgba(245,158,11,.18); }
  50%      { border-color: rgba(245,158,11,1);  box-shadow: 0 0 28px rgba(245,158,11,.40); }
}
.stall-coach-active { animation: stall-border-pulse 2.5s ease-in-out infinite; }

@keyframes approaching-pulse {
  0%,100% { border-left-color: rgba(245,158,11,.5); }
  50%      { border-left-color: rgba(245,158,11,1); }
}
.stall-approaching { animation: approaching-pulse 3s ease-in-out infinite; }
```

- [ ] **Step 3: Add new keyframes and utility classes**

Append before the `/* ── Star rating ── */` comment (after `.stall-approaching`):

```css
/* ── Smoke & Fire animation system ── */
@keyframes live-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(255,107,53,0.55); }
  70%  { box-shadow: 0 0 0 10px rgba(255,107,53,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,107,53,0); }
}
@keyframes breathe-glow {
  0%,100% { border-color: rgba(255,107,53,0.18); box-shadow: 0 0 20px rgba(255,107,53,0.04); }
  50%      { border-color: rgba(255,107,53,0.38); box-shadow: 0 0 36px rgba(255,107,53,0.10); }
}
@keyframes ambient-orb {
  0%,100% { transform: scale(1);   opacity: 0.7; }
  50%      { transform: scale(1.3); opacity: 1;   }
}
@keyframes shimmer-bar {
  0%,100% { filter: brightness(1);   }
  50%      { filter: brightness(1.25); }
}

/* Utility classes — animations gated by prefers-reduced-motion */
@media (prefers-reduced-motion: no-preference) {
  .live-pulse   { animation: live-pulse   1.8s ease-in-out infinite; }
  .breathe-glow { animation: breathe-glow 4s   ease-in-out infinite; }
  .shimmer-bar  { animation: shimmer-bar  2.5s ease-in-out infinite; }
}

/* gradient-text: ember→amber on key numbers */
.gradient-text {
  background: var(--gradient-warm);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* card-interactive: hover breathing for passive cards (history) */
.card-interactive {
  transition: border-color 0.4s ease, box-shadow 0.4s ease;
}
.card-interactive:hover {
  border-color: rgba(255,107,53,0.32) !important;
  box-shadow: 0 0 28px rgba(255,107,53,0.09);
}

/* temp-card: inset framed temperature display with ambient orb */
.temp-card {
  background: linear-gradient(135deg, rgba(255,107,53,0.09), rgba(245,158,11,0.04));
  border: 1px solid rgba(255,107,53,0.22);
  border-radius: 12px;
  padding: 12px;
  position: relative;
  overflow: hidden;
  margin-bottom: 8px;
}
.temp-card::after {
  content: '';
  position: absolute;
  top: -24px; right: -24px;
  width: 90px; height: 90px;
  background: radial-gradient(circle, rgba(255,107,53,0.28), transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
@media (prefers-reduced-motion: no-preference) {
  .temp-card::after { animation: ambient-orb 3s ease-in-out infinite; }
}

/* Hot probe cards: breathing glow */
@media (prefers-reduced-motion: no-preference) {
  .probe-card.hot { animation: breathe-glow 4s ease-in-out infinite; }
}
```

- [ ] **Step 4: Verify CSS compiles with no errors**

Run the dev server and confirm no CSS parse errors in the browser console:

```powershell
npm run dev
```

Expected: server starts at http://localhost:5173/rfx-cook-tracker/, no red errors in terminal or browser console.

- [ ] **Step 5: Commit**

```powershell
git add src/index.css
git commit -m "feat: Smoke & Fire CSS — tokens, keyframes, utility classes"
```

---

### Task 2: Navigation — Live Pulse Dots & Active Item Glow

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Replace `pulse` class with `live-pulse` on both live indicator dots**

There are two live indicator dots in App.jsx. Replace both `className="pulse"` spans:

**Sidebar (line ~392):**
```jsx
// BEFORE
<span className="pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />

// AFTER
<span className="live-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ember)', display: 'inline-block' }} />
```

**Mobile header button (line ~440):**
```jsx
// BEFORE
<span className="pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />

// AFTER
<span className="live-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ember)', display: 'inline-block' }} />
```

Note: color changes from `var(--red)` to `var(--ember)` — ember ring looks better than red for the ripple animation.

- [ ] **Step 2: Upgrade sidebar active nav item styling**

Find the `<button>` in the `NAV_ITEMS.map` inside `<aside>` (line ~401). Update its style:

```jsx
// BEFORE
style={{
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '11px 1.25rem', border: 'none',
  background: tab === id ? 'rgba(255,107,53,0.1)' : 'transparent',
  color: tab === id ? 'var(--ember)' : 'var(--text2)',
  fontSize: 14, fontFamily: 'var(--font)',
  borderLeft: `3px solid ${tab === id ? 'var(--ember)' : 'transparent'}`,
  cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all .15s',
}}

// AFTER
style={{
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '11px 1.25rem', border: 'none',
  background: tab === id
    ? 'linear-gradient(90deg, rgba(255,107,53,0.14), rgba(245,158,11,0.04))'
    : 'transparent',
  color: tab === id ? 'var(--ember)' : 'var(--text2)',
  fontSize: 14, fontFamily: 'var(--font)',
  borderLeft: `3px solid ${tab === id ? 'var(--ember)' : 'transparent'}`,
  boxShadow: tab === id ? 'var(--glow-ember)' : 'none',
  cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all .15s',
}}
```

- [ ] **Step 3: Visual check**

With dev server running, open http://localhost:5173/rfx-cook-tracker/ and confirm:
- The live indicator dot (when an active cook exists) shows the ripple-ring pulse instead of opacity flicker
- The active sidebar nav item has a warm gradient background with a subtle glow
- No visual regressions on other nav items

- [ ] **Step 4: Commit**

```powershell
git add src/App.jsx
git commit -m "feat: live-pulse dots, gradient active nav item"
```

---

### Task 3: Dashboard Tab

**Files:**
- Modify: `src/components/DashboardTab.jsx`

- [ ] **Step 1: Apply `.gradient-text` to `StatPill` values**

Find the `StatPill` component (lines 4–12). Change the value `<div>`:

```jsx
// BEFORE
function StatPill({ label, value }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1rem', textAlign: 'center', flex: 1 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 500, color: 'var(--ember)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
    </div>
  );
}

// AFTER
function StatPill({ label, value }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1rem', textAlign: 'center', flex: 1 }}>
      <div className="gradient-text" style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 500 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
    </div>
  );
}
```

- [ ] **Step 2: Add `.breathe-glow` to active cook button cards**

Find the active cook `<button>` in the `.map` (line ~52). Add `breathe-glow` to className and upgrade the initial border opacity:

```jsx
// BEFORE
<button key={cook.id} onClick={() => onGoActive(cook.id)} style={{
  background: 'var(--surface)', border: '1px solid rgba(255,107,53,0.4)',
  borderRadius: 14, padding: '1.25rem', marginBottom: '1rem', cursor: 'pointer',
  boxShadow: '0 0 24px rgba(255,107,53,0.12)',
  width: '100%', textAlign: 'left', fontFamily: 'inherit',
}}>

// AFTER
<button key={cook.id} onClick={() => onGoActive(cook.id)}
  className="breathe-glow"
  style={{
    background: 'var(--surface)', border: '1px solid rgba(255,107,53,0.4)',
    borderRadius: 14, padding: '1.25rem', marginBottom: '1rem', cursor: 'pointer',
    boxShadow: '0 0 24px rgba(255,107,53,0.12)',
    width: '100%', textAlign: 'left', fontFamily: 'inherit',
  }}>
```

- [ ] **Step 3: Add `.card-interactive` to `RecentCard`**

Find the `RecentCard` button (line ~15). Add `card-interactive` to className and remove the inline `onMouseEnter`/`onMouseLeave` handlers (the CSS class handles hover now):

```jsx
// BEFORE
function RecentCard({ cook, onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1rem', cursor: 'pointer', minWidth: 160,
      transition: 'border-color .15s', textAlign: 'left', fontFamily: 'inherit' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ember)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>

// AFTER
function RecentCard({ cook, onClick }) {
  return (
    <button onClick={onClick} className="card-interactive"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '1rem', cursor: 'pointer', minWidth: 160,
        textAlign: 'left', fontFamily: 'inherit' }}>
```

- [ ] **Step 4: Visual check**

Confirm in browser:
- Dashboard stat pills (Total Cooks, Hours Smoked, Fav Cut) show ember→amber gradient text
- Active cook button card pulses its border glow
- Recent cook cards warm to ember glow on hover (no longer snaps to solid ember)

- [ ] **Step 4: Replace `.pulse` with `.live-pulse` on the ACTIVE COOK indicator dot**

Find line ~60 in the active cook button map:

```jsx
// BEFORE
<span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />

// AFTER
<span className="live-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ember)', display: 'inline-block' }} />
```

- [ ] **Step 5: Commit**

```powershell
git add src/components/DashboardTab.jsx
git commit -m "feat: Dashboard gradient stats, breathing active card, live-pulse dot, warm recent hover"
```

---

### Task 4: Active Cook View — Temp Card, Breathing Probes, Shimmer Bar

**Files:**
- Modify: `src/components/ActiveTab.jsx`

- [ ] **Step 1: Wrap temp display in `.temp-card` and add gradient progress fill**

Find the probe card map starting at line ~355. Replace the inner contents of each `probe-card` div:

```jsx
// BEFORE (inside the probe-card div)
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

// AFTER
<div key={i} className={`probe-card${isHot ? ' hot' : ''}`}>
  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 6 }}>{probe.name}</div>
  <div className="temp-card">
    <div className="temp-display" style={{ color: '#FFF5EE', marginBottom: 2 }}>
      {last ? `${last.temp}°` : '—'}
    </div>
    <div style={{ fontSize: 11, color: 'var(--text3)' }}>→ {probe.target}°F</div>
  </div>
  <div className="progress-track">
    <div className="progress-fill shimmer-bar"
      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}50, ${color})` }} />
  </div>
  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--mono)' }}>
    {pct}%
  </div>
</div>
```

Note: `borderColor` is removed from the probe card style — the CSS `.probe-card.hot` and `.breathe-glow` rules handle the hot state now.

- [ ] **Step 2: Visual check**

Confirm in browser with an active cook (add a probe reading to get `isHot = true` if possible, or inspect the element):
- Probe cards show the warm inset `.temp-card` box with ambient orb in the corner
- Temperature number shows in `#FFF5EE` warm white
- Progress fill has a gradient (dim→bright) and shimmer
- Hot probe card shows the breathing border glow (CSS `.probe-card.hot` animation)

- [ ] **Step 3: Commit**

```powershell
git add src/components/ActiveTab.jsx
git commit -m "feat: probe cards — temp-card inset, ambient orb, shimmer fill"
```

---

### Task 5: Live Intelligence Panel — Gradient Text on Values

**Files:**
- Modify: `src/components/LiveIntelligencePanel.jsx`

- [ ] **Step 1: Add `.gradient-text` to climb rate value**

Find the climb rate `<span>` (line ~30). Change:

```jsx
// BEFORE
<span style={{ fontFamily: 'var(--mono)', fontSize: 14,
  color: rate === null ? 'var(--text3)' : rate > 0 ? 'var(--ember)' : 'var(--text2)' }}>
  {rate === null ? '—' : `${rate > 0 ? '+' : ''}${rate}°/hr`}
</span>

// AFTER
<span className={rate !== null && rate > 0 ? 'gradient-text' : ''}
  style={{ fontFamily: 'var(--mono)', fontSize: 14,
    color: rate === null ? 'var(--text3)' : rate > 0 ? undefined : 'var(--text2)' }}>
  {rate === null ? '—' : `${rate > 0 ? '+' : ''}${rate}°/hr`}
</span>
```

Note: `color` is set to `undefined` when using `.gradient-text` (so the CSS `color` property doesn't override the background-clip gradient). Only positive rates get the gradient; null or negative keep their existing colors.

- [ ] **Step 2: Add `.gradient-text` to ETA value**

Find the ETA `<span>` (line ~36):

```jsx
// BEFORE
<span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)' }}>
  {eta === null ? '' : eta === 0 ? 'Done' : `~${eta}m`}
</span>

// AFTER
<span className={eta !== null && eta > 0 ? 'gradient-text' : ''}
  style={{ fontFamily: 'var(--mono)', fontSize: 12,
    color: eta === null || eta === 0 ? 'var(--text3)' : undefined }}>
  {eta === null ? '' : eta === 0 ? 'Done' : `~${eta}m`}
</span>
```

- [ ] **Step 3: Commit**

```powershell
git add src/components/LiveIntelligencePanel.jsx
git commit -m "feat: gradient text on live ETA and climb rate values"
```

---

### Task 6: Temperature Chart — Area Fills Under Probe Lines

**Files:**
- Modify: `src/components/TempChart.jsx`

- [ ] **Step 1: Update Recharts import to include `ComposedChart` and `Area`**

Replace line 1:

```jsx
// BEFORE
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer
} from 'recharts';

// AFTER
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer
} from 'recharts';
```

- [ ] **Step 2: Switch `<LineChart>` to `<ComposedChart>` and add area gradient defs**

Find the `<defs>` block (line ~91) and the chart opening tag (line ~89). Replace:

```jsx
// BEFORE
<LineChart data={data} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
  <defs>
    {cook.probes.map((_, i) => (
      <linearGradient key={i} id={`probeGrad-${i}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={PROBE_COLORS[i % PROBE_COLORS.length]} stopOpacity={0.6} />
        <stop offset="100%" stopColor={PROBE_COLORS[i % PROBE_COLORS.length]} stopOpacity={1} />
      </linearGradient>
    ))}
  </defs>

// AFTER
<ComposedChart data={data} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
  <defs>
    {cook.probes.map((_, i) => (
      <linearGradient key={i} id={`probeGrad-${i}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={PROBE_COLORS[i % PROBE_COLORS.length]} stopOpacity={0.6} />
        <stop offset="100%" stopColor={PROBE_COLORS[i % PROBE_COLORS.length]} stopOpacity={1} />
      </linearGradient>
    ))}
    {cook.probes.map((_, i) => (
      <linearGradient key={`fill${i}`} id={`areaFill-${i}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PROBE_COLORS[i % PROBE_COLORS.length]} stopOpacity={0.22} />
        <stop offset="100%" stopColor={PROBE_COLORS[i % PROBE_COLORS.length]} stopOpacity={0} />
      </linearGradient>
    ))}
  </defs>
```

- [ ] **Step 3: Warm up grid stroke color**

Find `<CartesianGrid` (line ~98):

```jsx
// BEFORE
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />

// AFTER
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,200,150,0.07)" />
```

- [ ] **Step 4: Add `<Area>` fills before the `<Line>` components**

Find where the probe `<Line>` components are mapped (line ~112). Insert `<Area>` components immediately before them:

```jsx
// Add BEFORE the existing cook.probes.map for Lines:
{cook.probes.map((p, i) => (
  <Area key={`a${i}`} type="monotone" dataKey={`p${i}`}
    fill={`url(#areaFill-${i})`} stroke="none" fillOpacity={1}
    isAnimationActive={false} connectNulls legendType="none" />
))}
{cook.probes.map((p, i) => (
  <Line key={i} type="monotone" dataKey={`p${i}`} name={p.name}
    stroke={PROBE_COLORS[i % PROBE_COLORS.length]} dot={{ r: 3, fill: PROBE_COLORS[i % PROBE_COLORS.length] }} strokeWidth={2} connectNulls />
))}
```

- [ ] **Step 5: Close `ComposedChart` instead of `LineChart`**

At the end of the chart JSX (line ~119):

```jsx
// BEFORE
        </LineChart>

// AFTER
        </ComposedChart>
```

- [ ] **Step 6: Visual check**

With a cook that has readings, open the Active tab. Confirm:
- Each probe line has a gradient-shaded area below it
- Lines render on top of area fills (correct layering)
- Chart grid has a very subtle warm tint (vs. cool white)
- No console errors about unknown Recharts props

- [ ] **Step 7: Commit**

```powershell
git add src/components/TempChart.jsx
git commit -m "feat: TempChart area fills with vertical gradients per probe"
```

---

### Task 7: History Tab — Interactive Card Hover

**Files:**
- Modify: `src/components/HistoryTab.jsx`

- [ ] **Step 1: Add `card-interactive` to the active cook card at the top**

Find the active cook `<button className="card"` (line ~9):

```jsx
// BEFORE
<button
  className="card"
  style={{ borderColor: 'rgba(255,107,53,0.35)', cursor: 'pointer', marginBottom: '1.25rem',
    width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
  onClick={onGoActive}
>

// AFTER
<button
  className="card card-interactive"
  style={{ borderColor: 'rgba(255,107,53,0.35)', cursor: 'pointer', marginBottom: '1.25rem',
    width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
  onClick={onGoActive}
>
```

- [ ] **Step 2: Add `card-interactive` to completed cook history cards**

Find the completed cook `<button className="card"` (line ~51):

```jsx
// BEFORE
<button
  key={cook.id}
  className="card"
  style={{ cursor: 'pointer', marginBottom: '.75rem', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
  onClick={() => onSelectCook(cook.id)}
>

// AFTER
<button
  key={cook.id}
  className="card card-interactive"
  style={{ cursor: 'pointer', marginBottom: '.75rem', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
  onClick={() => onSelectCook(cook.id)}
>
```

- [ ] **Step 3: Replace `.pulse` with `.live-pulse` on the active cook dot in the history banner**

Find line ~18 in the active cook `<button className="card"`:

```jsx
// BEFORE
<span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />

// AFTER
<span className="live-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ember)', display: 'inline-block' }} />
```

- [ ] **Step 4: Apply `.gradient-text` to peak temp display**

Find the `peak` value display (line ~71):

```jsx
// BEFORE
{peak && (
  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--mono)' }}>
    Peak {peak}°F
  </div>
)}

// AFTER
{peak && (
  <div className="gradient-text" style={{ fontSize: 11, marginTop: 2, fontFamily: 'var(--mono)' }}>
    Peak {peak}°F
  </div>
)}
```

- [ ] **Step 5: Commit**

```powershell
git add src/components/HistoryTab.jsx
git commit -m "feat: history cards hover glow, live-pulse dot, gradient peak temp"
```

---

### Task 8: Analytics Tab — Chart Glows and Gradient Stat Values

**Files:**
- Modify: `src/components/AnalyticsTab.jsx`

- [ ] **Step 1: Add `.gradient-text` to `StatCard` values**

Find the `StatCard` component (lines 8–17). Change the value `<div>`:

```jsx
// BEFORE
<div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>{value}</div>

// AFTER
<div className="gradient-text" style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 500, marginBottom: 4 }}>{value}</div>
```

- [ ] **Step 2: Add drop-shadow filter to stall prediction metric values**

Find the stall prediction metrics (lines ~117–124). The `.metric` divs contain big mono numbers. Wrap their text in gradient-text:

```jsx
// BEFORE
<div className="metric">
  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Typical Stall Temp</div>
  <div style={{ fontFamily: 'var(--mono)', fontSize: 22, color: 'var(--ember)' }}>{stall.avgTemp}°F</div>
</div>
<div className="metric">
  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Avg Stall Duration</div>
  <div style={{ fontFamily: 'var(--mono)', fontSize: 22, color: 'var(--amber)' }}>{stall.avgDurMin} min</div>
</div>

// AFTER
<div className="metric">
  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Typical Stall Temp</div>
  <div className="gradient-text" style={{ fontFamily: 'var(--mono)', fontSize: 22 }}>{stall.avgTemp}°F</div>
</div>
<div className="metric">
  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Avg Stall Duration</div>
  <div className="gradient-text" style={{ fontFamily: 'var(--mono)', fontSize: 22 }}>{stall.avgDurMin} min</div>
</div>
```

- [ ] **Step 3: Add glow filter to the average curve Line**

Find the avg curve `<ComposedChart>` section (line ~144). Add a `<filter>` def and apply it to the `<Line>`:

In the `<defs>` inside the avg curve chart (line ~145), add:

```jsx
<defs>
  <linearGradient id="sigmaFill-curve" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.18} />
    <stop offset="100%" stopColor="#FF6B35" stopOpacity={0.03} />
  </linearGradient>
  <filter id="avgLineGlow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="rgba(245,158,11,0.5)" />
  </filter>
</defs>
```

Then on the `<Line dataKey="avg"` (line ~165), add the filter:

```jsx
// BEFORE
<Line dataKey="avg" name="Avg Temp" stroke="#FF6B35" strokeWidth={2.5}
  dot={false} isAnimationActive={false} />

// AFTER
<Line dataKey="avg" name="Avg Temp" stroke="#F59E0B" strokeWidth={2.5}
  dot={false} isAnimationActive={false}
  style={{ filter: 'url(#avgLineGlow)' }} />
```

Note: stroke changes from `#FF6B35` (ember) to `#F59E0B` (amber) per spec.

- [ ] **Step 4: Add drop-shadow to scatter dots**

Find the `<Scatter` elements (line ~192):

```jsx
// BEFORE
<Scatter key={cut} name={cut} data={data} fill={color} fillOpacity={0.8} />

// AFTER
<Scatter key={cut} name={cut} data={data} fill={color} fillOpacity={0.85}
  style={{ filter: 'drop-shadow(0 0 3px rgba(255,107,53,0.3))' }} />
```

- [ ] **Step 5: Commit**

```powershell
git add src/components/AnalyticsTab.jsx
git commit -m "feat: analytics gradient stats, avg curve amber glow, scatter drop-shadow"
```

---

### Task 9: Settings Sheet — Gradient Section Headers

**Files:**
- Modify: `src/components/SettingsSheet.jsx`

- [ ] **Step 1: Apply `.gradient-text` to the two section header labels**

Find the "Backup" header (line ~80) and "Restore" header (line ~92):

```jsx
// BEFORE
<div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Backup</div>

// AFTER
<div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Backup</div>
```

```jsx
// BEFORE
<div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Restore</div>

// AFTER
<div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Restore</div>
```

- [ ] **Step 2: Commit**

```powershell
git add src/components/SettingsSheet.jsx
git commit -m "feat: gradient text on Settings section headers"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Run full test suite**

```powershell
npm test -- --run
```

Expected output: all 58 tests pass. CSS and JSX class changes don't touch any utility logic.

- [ ] **Step 2: Run production build**

```powershell
npm run build
```

Expected: clean build, no warnings about missing imports or unused variables.

- [ ] **Step 3: Full visual walkthrough**

With `npm run dev` running, open http://localhost:5173/rfx-cook-tracker/ and check each tab:

| Tab | What to verify |
|-----|---------------|
| Dashboard | Stat pills show gradient text; active cook card breathes; recent cards warm-glow on hover |
| Active (new form) | No regressions — form is unchanged |
| Active (with cook) | Probe cards show `.temp-card` inset with ambient orb; live dot shows ripple; progress bar shimmers; hot probe card breathes |
| Active chart | Area fill visible under each probe line; grid has warm tint |
| History | Cards glow on hover; peak temp shows gradient |
| Analytics | Stat values gradient; avg curve amber with glow; scatter dots have drop-shadow |
| Settings | Backup/Restore headers show gradient |
| Sidebar nav | Active item has gradient-warm background + glow; ember left border |
| Live indicator dot | Ripple ring (not opacity flicker) |

- [ ] **Step 4: Check `prefers-reduced-motion`**

Open DevTools → Rendering panel → "Emulate CSS media feature prefers-reduced-motion: reduce". Confirm that all animated elements stop animating (live dot becomes static, card glows are static, etc.). Static visual treatments (gradient-text, temp-card bg, area fills) should still be visible.

- [ ] **Step 5: Final commit**

```powershell
git add -A
git commit -m "feat: Smoke & Fire visual refresh — complete"
```
