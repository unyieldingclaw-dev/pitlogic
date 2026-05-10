# Design Spec: RFX Cook Tracker — "Smoke & Fire" Visual Refresh

**Date:** 2026-05-10
**Status:** Approved for implementation

## Context

The app has a solid dark-mode foundation (ember/orange accent, good typography, Recharts charts) but reads as functional rather than polished. The goal is a consistent premium feel across every tab — warm amber gradients, organic radial glows, and breathing animations that make the interface feel alive without being distracting. The active cook view gets the fullest treatment; every other tab gets the same vocabulary at appropriate intensity.

---

## Design Direction: Smoke & Fire

- **Palette**: unchanged — `--ember` (#FF6B35), `--amber` (#F59E0B), near-black backgrounds. No new colors added.
- **Feel**: Warm, premium, organic. Like a high-end BBQ restaurant meets monitoring terminal.
- **Motion philosophy**: Purposeful breathing. The live indicator pulses to signal "this is active." Card glows oscillate gently. Progress bars shimmer once. Nothing spins, bounces, or demands attention constantly.

---

## New Design Tokens (additions to `:root` in `index.css`)

```css
--gradient-warm:  linear-gradient(135deg, #FF6B35, #FBBF24);
--glow-ember:     0 0 24px rgba(255,107,53,0.18);
--glow-ambient:   radial-gradient(circle, rgba(255,107,53,0.25), transparent 70%);
--surface-warm:   linear-gradient(160deg, #0F0B08, #120A06);
```

---

## Animation System (new keyframes + utility classes in `index.css`)

### Keyframes

**`live-pulse`** — expanding ring ripple on the active indicator dot
```css
@keyframes live-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(255,107,53,0.55); }
  70%  { box-shadow: 0 0 0 10px rgba(255,107,53,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,107,53,0); }
}
```

**`breathe-glow`** — card border ember opacity oscillates
```css
@keyframes breathe-glow {
  0%,100% { border-color: rgba(255,107,53,0.18); box-shadow: 0 0 20px rgba(255,107,53,0.04); }
  50%      { border-color: rgba(255,107,53,0.38); box-shadow: 0 0 36px rgba(255,107,53,0.10); }
}
```

**`ambient-orb`** — radial corner glow pulses
```css
@keyframes ambient-orb {
  0%,100% { transform: scale(1);   opacity: 0.7; }
  50%      { transform: scale(1.3); opacity: 1;   }
}
```

**`shimmer-bar`** — probe fill bar brightness flash
```css
@keyframes shimmer-bar {
  0%,100% { filter: brightness(1);   }
  50%      { filter: brightness(1.25); }
}
```

### Utility Classes

| Class | Animation | Duration | Use |
|-------|-----------|----------|-----|
| `.live-pulse` | `live-pulse` | 1.8s infinite | Active indicator dots |
| `.breathe-glow` | `breathe-glow` | 4s infinite | Active/hot cook cards |
| `.ambient-orb` | `ambient-orb` | 3s infinite | Radial corner orbs in temp cards |
| `.shimmer-bar` | `shimmer-bar` | 2.5s infinite | Probe fill progress bars |
| `.gradient-text` | — | static | Ember→amber gradient on key numbers |

**`.gradient-text`**:
```css
.gradient-text {
  background: var(--gradient-warm);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## Per-Screen Changes

### Navigation (`App.jsx` sidebar + bottom nav)
- Active tab indicator: replace solid `--ember` underline/border with a short gradient using `--gradient-warm`
- Sidebar active item: add `box-shadow: var(--glow-ember)` as a faint background glow

### Dashboard (`DashboardTab.jsx`)
- Cook stat values (total cooks, avg rating, etc.): add `.gradient-text`
- Active cook button cards: add `.breathe-glow` animation class
- Hover state on recent cook cards: warm up to `border-color: rgba(255,107,53,0.35)`
- "Start a Cook" primary CTA: already has glow on hover — bump shadow to `0 0 24px rgba(255,107,53,0.5)`

### Active Cook View (`ActiveTab.jsx`, `LiveIntelligencePanel.jsx`, probe cards)
- Live indicator dot: replace current `animation: pulse` with `.live-pulse` (ripple ring instead of opacity flicker)
- Active/hot probe cards: add `.breathe-glow`
- Probe fill bars: add `.shimmer-bar` + gradient fill (`linear-gradient(90deg, rgba(probeColor, 0.3), probeColor)`)
- Temperature inset card (new `.temp-card` inner element within probe card):
  - Background: `linear-gradient(135deg, rgba(255,107,53,0.09), rgba(245,158,11,0.04))`
  - Border: `rgba(255,107,53,0.22)` 1px
  - Corner ambient orb: `::after` pseudo-element with `.ambient-orb` animation
  - Temperature number: large mono, `color: #FFF5EE` (warm white — preserves readability at 60px+)
- ETA and climb rate values in `LiveIntelligencePanel`: add `.gradient-text`
- Stall alert cards (`StallCoach.jsx`): existing `stall-border-pulse` stays; bump amber border opacity range from `0.4/0.9` to `0.5/1.0`

### Temperature Chart (`TempChart.jsx`)
- Add `<Area>` component per probe (under existing `<Line>`) with:
  - Fill: `url(#areaGrad-${i})` vertical gradient from `probeColor @ 0.25 opacity` → transparent
  - No stroke on the Area layer (fill only)
- Add `<linearGradient>` defs for each area (y1="0" y2="1")
- Existing probe line gradients unchanged (horizontal, already good)
- Grid lines: nudge stroke from `rgba(255,255,255,0.06)` → `rgba(255,200,150,0.06)` (barely warmer tint)

### History Tab (`HistoryTab.jsx`)
- Cook cards: `.breathe-glow` on `:hover` (not permanent — history is passive)
- Cook stats (temp values, duration): `.gradient-text`
- Star ratings: already amber — no change needed

### Analytics Tab (`AnalyticsTab.jsx`)
- Bar chart bars: gradient fills (top: `--ember`, bottom: `--ember-deep`) instead of flat color
- Average curve line: add subtle `filter: drop-shadow(0 0 4px rgba(245,158,11,0.4))`
- Cook quality scatter dots: add `filter: drop-shadow(0 0 3px rgba(255,107,53,0.3))`

### Settings Sheet (`SettingsSheet.jsx`)
- No motion changes (passive/utility screen)
- Warm up section headers with `.gradient-text`

---

## What Does NOT Change

- Color token values — `--ember`, `--amber`, `--bg`, `--surface`, etc. all unchanged
- Font system — Oswald, Inter, JetBrains Mono unchanged
- Layout, grid, spacing, z-index — unchanged
- Component JSX structure — only class additions; no refactoring
- Accessibility — no aria or focus changes required

---

## Accessibility Guard

All new animations must be gated:

```css
@media (prefers-reduced-motion: no-preference) {
  .live-pulse   { animation: live-pulse  1.8s ease-in-out infinite; }
  .breathe-glow { animation: breathe-glow 4s  ease-in-out infinite; }
  .ambient-orb  { animation: ambient-orb  3s  ease-in-out infinite; }
  .shimmer-bar  { animation: shimmer-bar 2.5s ease-in-out infinite; }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | New tokens, keyframes, utility classes, motion guard |
| `src/App.jsx` | Nav active indicator gradient |
| `src/components/DashboardTab.jsx` | `.gradient-text` on stats, `.breathe-glow` on active cards |
| `src/components/ActiveTab.jsx` | `.live-pulse` dot, `.breathe-glow` probe cards, temp inset card |
| `src/components/LiveIntelligencePanel.jsx` | `.gradient-text` on ETA/climb rate values |
| `src/components/StallCoach.jsx` | Bump stall-border-pulse opacity range |
| `src/components/TempChart.jsx` | Area fill layers + vertical gradients, warmer grid tint |
| `src/components/HistoryTab.jsx` | `.breathe-glow` on hover, `.gradient-text` on stats |
| `src/components/AnalyticsTab.jsx` | Gradient bar fills, glow on average curve + scatter |
| `src/components/SettingsSheet.jsx` | `.gradient-text` on section headers |

---

## Verification

1. `npm run dev` — open each tab and confirm visual changes are applied
2. Test active cook with a hot probe — confirm `.live-pulse` rings, `.breathe-glow` on hot card
3. DevTools → Rendering → "Emulate prefers-reduced-motion: reduce" — confirm no animations fire
4. `npm test -- --run` — all 58 tests still pass (CSS-only changes, no logic touched)
5. `npm run build` — clean build, no warnings
