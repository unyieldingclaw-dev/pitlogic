# RFX Cook Tracker — Premium Redesign & Feature Suite

**Date:** 2026-05-01  
**Status:** Approved for implementation  
**Scope:** Visual overhaul (B+) — dark ember theme, layout redesign, 6 new feature areas

---

## Context

The app is a functional, localStorage-backed meat-smoking companion for ThermoWorks RFX users. It covers temperature monitoring, stall detection, cook history, and guides well. The current design uses system fonts, emoji icons, amber accents on white, and a single-column 720px layout. The goal is to transform it into a premium, visually dramatic tool — "like staring into a smoker" — while adding the feature gaps that exist across competing apps (MEATER, FireBoard, Combustion Inc, Weber Connect).

**User profile:** Personal use first, shareable publicly. Primary setup: 2 wireless meat probes + 1 wired ambient probe.

---

## Visual Identity

### Color Palette — Dark Ember

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0A0A08` | Page background |
| `--surface` | `#141410` | Cards, panels |
| `--surface-raised` | `#1C1C18` | Modals, elevated panels |
| `--surface-input` | `#242420` | Form fields, subtle bg |
| `--ember` | `#FF6B35` | Primary accent — buttons, active states, glows |
| `--ember-hover` | `#FF8C42` | Hover, highlights |
| `--ember-deep` | `#E8510A` | Pressed states |
| `--amber` | `#F59E0B` | Secondary accent — warnings, badges |
| `--text` | `#F5F5F0` | Warm white, primary text |
| `--text2` | `#B5B5AE` | Secondary labels |
| `--text3` | `#6B6B65` | Tertiary, placeholders |
| `--ash` | `#5A5A55` | Borders, dividers |
| `--green` | `#4ADE80` | Success states |
| `--red` | `#EF4444` | Danger/error |

Probe color palette updated to work on dark backgrounds:
`["#FF6B35", "#60A5FA", "#4ADE80", "#FBBF24", "#C084FC", "#34D399"]`
(Ember, Sky Blue, Lime, Yellow, Purple, Teal)

### Typography

| Role | Font | Source |
|------|------|--------|
| Display/headings | `Oswald` | Google Fonts |
| Body | `Inter` | Google Fonts |
| Data/temperatures | `JetBrains Mono` | Google Fonts |

Load via `@import` in `index.css`. Apply `font-display: swap` to avoid flash.

### Icons

Replace all emojis with **Lucide React** (`lucide-react` npm package). Tree-shakeable — import only used icons. Key icons: `Flame`, `Thermometer`, `Clock`, `ChartLine`, `BookOpen`, `FlaskConical`, `LayoutDashboard`, `Bell`, `Share2`, `Download`, `Plus`, `Trash2`, `ChevronRight`, `Star`, `Droplets`, `Wind`, `AlertTriangle`, `CheckCircle`.

### Visual Effects

**Ember glow on active probes:**
```css
box-shadow: 0 0 24px rgba(255, 107, 53, 0.35), 0 0 8px rgba(255, 107, 53, 0.2);
```

**Glass card:**
```css
background: rgba(255, 255, 255, 0.02);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 107, 53, 0.12);
border-radius: 14px;
```

**Gradient header:**
```css
background: linear-gradient(180deg, #141410 0%, #0A0A08 100%);
border-bottom: 1px solid rgba(255, 107, 53, 0.15);
```

**Active pulse:**
```css
@keyframes ember-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(255,107,53,0.4); }
  50% { box-shadow: 0 0 24px rgba(255,107,53,0.8); }
}
```

**Temperature numbers:** JetBrains Mono for all numeric readouts (temperatures, timestamps, durations). Oswald for headings and labels only. Primary temp readouts: `font-size: clamp(2rem, 5vw, 3.5rem)`.

---

## Layout & Navigation

### Header (60px, full-width)

- **Left:** `RFX` in Oswald 700 with subtle ember text-shadow + `COOK TRACKER` in 11px uppercase Inter tracking-widest, stacked
- **Right:** Active cook pill (pulsing red dot + elapsed time `HH:MM:SS`) when cook is running; Settings icon (⚙ Lucide)
- Background: dark gradient

### Navigation

**Mobile (≤768px):** Fixed bottom bar, 64px tall, 5 items with icon + label. Safe area padding for iPhone notch.

**Desktop (>768px):** Left sidebar, 220px wide, collapsible to 60px (icons only). Same 5 nav items as vertical list.

**Nav items:**

| Icon | Label | Route/Tab |
|------|-------|-----------|
| `LayoutDashboard` | Dashboard | Home/overview |
| `Flame` | Active Cook | New cook + live monitor |
| `Clock` | History | Completed cooks |
| `ChartLine` | Analytics | Personal patterns |
| `BookOpen` | Guides | Meat/cut guides |
| `FlaskConical` | Recipes | Rub/brine builder |

### Dashboard Tab (new)

Replaces the old default landing. Layout:

1. **Stats strip** (3 pills): Total Cooks · Hours Smoked · Favorite Cut
2. **Active Cook Card** (only when a cook is running): full-width, ember left border glow, shows cook name, elapsed time, all probe temps live, "View Cook →" button
3. **Recent Cooks strip**: horizontal scroll, last 4 cooks as compact cards (cut, date, duration, star rating)
4. **Quick Start button**: large, ember-filled, "Start New Cook" — navigates to Active tab

### Active Cook Tab (redesigned)

**When no cook is running:** New cook form (unchanged functionality, restyled).

**When a cook is running:**

```
┌─────────────────────────────────────────────┐
│  Cook Name        2:34:17      [End Cook]   │
│  ─────────────────────────────────────────  │
│  AMBIENT  237°F ──── target 250°F           │  ← always-visible smoker strip
│  ─────────────────────────────────────────  │
│  [Cook 1] [Cook 2] [+ Add Cook]             │  ← multi-cook tabs
│  ─────────────────────────────────────────  │
│  [Probe 1 card]  [Probe 2 card]             │  ← 2-col mobile, 4-col desktop
│  ─────────────────────────────────────────  │
│  [Alert cards — stall / wrap / carryover]   │
│  [Mop/Spray timer countdown badge]          │
│  ─────────────────────────────────────────  │
│  [Temperature chart — full width]           │
│  ─────────────────────────────────────────  │
│  [Log Reading panel — docked]               │
└─────────────────────────────────────────────┘
```

**Probe card:**
- Background: `--surface`, border in probe color at 40% opacity
- Glowing border when temp climbed >5°F in last 2 readings
- Large JetBrains Mono temperature (colored per probe)
- Progress bar: ember fill, dark track, percentage label
- Probe name + target temp in smaller Inter

**Ambient strip:** Always visible above probe grid. Shows current smoker temp, target, and a mini progress indicator. Probe color: `--ash` (neutral — it's the environment, not the meat).

**Multi-cook tabs:** Each tab is an independent cook with its own probes, timer, stall detection, and alerts. A mini status strip at screen top (above everything) shows all active cook names + their hottest probe when you're in a different tab.

---

## New Features

### 1. Rich Cook Metadata

Added to the new cook form (collapsible "More Details" section):

- **Meat weight** (lbs/kg toggle)
- **Wood/pellet type** (dropdown from existing `pellets.js` data)
- **Linked rub/brine/injection** (multi-select from Recipes tab)
- **Smoker equipment** (free text, autocompletes from past entries)

Stored in the cook object. Displayed as a compact metadata row in History cards and Detail views.

### 2. Multi-Cook Dashboard

- Tab strip above probe grid: "Cook 1", "Cook 2", "Cook 3", "+ Add Cook" (max 4)
- Each cook is a fully independent cook object in state
- Global mini status bar (fixed, above nav) shows all active cooks when you have more than 1 running: `[🔥 Brisket 195°F] [🔥 Ribs 168°F]`
- "End Cook" ends only the currently-viewed cook tab
- New cook form pre-fills cook number as name if no name given

### 3. Mop/Spray Timer

Set during new cook form setup:

- **Enable toggle:** on/off
- **Interval:** 15 / 30 / 45 / 60 min, or custom (minutes field)
- **What:** free text (e.g., "Apple juice + butter") or linked spray recipe from Recipes tab

During active cook:

- Countdown badge in cook header: `💧 Spray in 12:34`
- When timer fires: in-app alert card (amber, dismissible) + browser `Notification` API push if permission granted
- Dismiss logs the spray event: timestamp recorded, vertical dashed marker line added to temp chart, tooltip shows "Spray: Apple juice + butter"
- Timer auto-resets after each spray
- All spray events stored in cook object for history review

### 4. Personal Analytics Tab

**Summary cards (top row):**
- Total Cooks · Total Hours Smoked · Avg Cook Duration · Most-Used Wood · Highest-Rated Cook

**Your Average Curves chart:**
- Recharts line chart showing average temp trajectory across all past cooks of selected meat type
- Dropdown to filter by cut (e.g., "All Briskets")
- Shaded band showing ±1 stdev range

**Stall predictions:**
- Calculated from past cooks of same cut
- "Your briskets typically stall at **163°F** for **~52 min**"
- Shown as insight card during active cook if cut matches historical data

**Records:**
- Fastest cook (per cut) · Longest cook · Best-rated · Most probes used

**Cook frequency:**
- Simple bar chart: cooks per month (last 12 months)

### 5. Rub/Brine/Injection Recipe Builder

**Categories:** Rubs · Brines · Injections · Sprays/Mops · Sauces

**Recipe card fields:**
- Name (required)
- Category (required)
- Ingredients: list of `{ ingredient, amount, unit }` rows, add/remove dynamically
- Instructions (textarea)
- Notes (textarea)
- Linked cuts (multi-select from cuts data — "good on brisket, chuck roast")
- Star rating (personal)

**Plan to Eat CSV Import:**
- "Import from Plan to Eat" button opens file picker (`.csv` only)
- Parser maps Plan to Eat CSV columns: `Name` → recipe name, `Ingredients` → parsed ingredient list, `Directions` → instructions, `Notes` → notes
- Preview modal: shows parsed recipes before import, user can deselect any
- Duplicates detected by name — user prompted to skip or overwrite
- All imported recipes land in "Uncategorized" category, user assigns category manually

**Storage:** Recipes stored in localStorage under `rfx-recipes-v1` key, separate from cook data.

**Linking:** Any recipe can be linked to a cook at start time. Linked recipes shown in cook detail/history.

### 6. Cook Share Card

"Share" button on completed cook Detail view.

**Generated card (800×500px, dark ember theme):**
- Top: RFX Cook Tracker logo + cook name + date
- Left column: Duration · Meat/cut · Wood · Smoker temp · Probe finals · Star rating
- Right column: mini temp chart (recharts rendered to canvas via `html2canvas`)
- Bottom: brief notes excerpt (truncated to 2 lines)

**Export options:**
- "Download PNG" — `html2canvas` renders to blob, triggers download
- "Copy to Clipboard" — writes PNG blob to clipboard API

**Implementation:** Render share card as a hidden off-screen React component, then capture with `html2canvas`. The temp chart is a Recharts SVG — html2canvas cannot capture SVG reliably. Workaround: before capture, serialize the chart SVG to a `data:image/svg+xml` URL and render it as an `<img>` tag inside the share card instead of the live Recharts component. No server required.

---

## Data Model Changes

### Cook object additions

```javascript
{
  // existing fields unchanged...
  weight: number | null,          // lbs
  equipment: string,              // smoker name
  linkedRecipes: string[],        // recipe IDs from rfx-recipes-v1
  mopTimer: {
    enabled: boolean,
    intervalMin: number,
    label: string,                // "Apple juice + butter"
    events: [{ time: number, ts: number }]  // spray log
  } | null,
}
```

### New: Recipe object (rfx-recipes-v1)

```javascript
{
  id: string,                     // timestamp
  name: string,
  category: 'rub' | 'brine' | 'injection' | 'spray' | 'sauce',
  ingredients: [{ ingredient: string, amount: string, unit: string }],
  instructions: string,
  notes: string,
  linkedCuts: string[],           // cut keys from cuts.js
  rating: number,                 // 0-5
  createdAt: number,
  source: 'manual' | 'plantoeat-import'
}
```

### Multi-cook state

`activeCooks` replaces `activeCookId` — array of cook IDs currently active. UI renders a tab per active cook. Max 4 simultaneous.

**localStorage migration:** On app load, `useStorage.js` checks for legacy `activeCookId` (string). If found, wraps it in `activeCooks: [activeCookId]`, saves the new format, and deletes the old key. One-time migration, no data loss.

---

## Dependencies to Add

| Package | Purpose | Size |
|---------|---------|------|
| `lucide-react` | Icon library | ~2kb per icon (tree-shaken) |
| `html2canvas` | Share card PNG export | ~40kb gzip |

Google Fonts loaded via `<link>` in `index.html` (Oswald, Inter, JetBrains Mono). No npm package needed.

---

## Files Modified

| File | Change |
|------|--------|
| `index.html` | Add Google Fonts `<link>` tags |
| `src/index.css` | Full rewrite — new design tokens, dark theme, typography, effects, Lucide-ready icon styles, bottom nav, sidebar |
| `src/App.jsx` | New nav structure, Dashboard tab, multi-cook state (`activeCooks[]`), mop timer logic, analytics data derivation |
| `src/App.css` | Delete (currently empty, stays empty) |
| `src/components/ActiveTab.jsx` | Ambient strip, multi-cook tabs, probe card redesign, mop timer badge + alert, restyled chart panel |
| `src/components/HistoryTab.jsx` | Dark reskin, metadata row, filter bar |
| `src/components/DetailView.jsx` | Dark reskin, share card button, metadata display |
| `src/components/TempChart.jsx` | Dark recharts theme, spray event markers |
| `src/components/GuideTab.jsx` | Dark reskin, improved layout |
| `src/components/StallCard.jsx` | Dark reskin |

## Files Added

| File | Purpose |
|------|---------|
| `src/components/DashboardTab.jsx` | New home screen |
| `src/components/AnalyticsTab.jsx` | Personal analytics |
| `src/components/RecipesTab.jsx` | Rub/brine/injection builder + Plan to Eat import |
| `src/components/ShareCard.jsx` | Off-screen share card component |
| `src/components/MopTimerBadge.jsx` | Countdown badge + alert |
| `src/components/MultiCookBar.jsx` | Global active-cooks mini status strip |
| `src/utils/planToEatParser.js` | Plan to Eat CSV → recipe object parser |
| `src/utils/analytics.js` | Aggregation functions for analytics tab |
| `src/utils/shareCard.js` | html2canvas capture + download/clipboard logic |
| `src/hooks/useRecipes.js` | localStorage CRUD for rfx-recipes-v1 |
| `src/hooks/useMopTimer.js` | Interval management, browser notification, event logging |

---

## Verification

1. **Visual:** Open app — dark ember theme loads, Oswald/Inter/JetBrains Mono render, all emojis replaced with Lucide icons, no light-mode flash
2. **Multi-cook:** Start a cook, click "+ Add Cook", start a second cook — both show in tab strip with independent timers
3. **Mop timer:** Enable spray timer at 30min, verify countdown badge appears, wait/fast-forward — verify alert fires and chart marker appears
4. **Recipes:** Create a rub manually, export a recipe from Plan to Eat as CSV, import it — verify it appears correctly
5. **Share card:** Complete a cook, click Share, download PNG — verify card renders with chart, stats, dark theme
6. **Analytics:** After 3+ cooks of same cut, open Analytics — verify average curve chart and stall prediction appear
7. **Dashboard:** Active cook card appears when cook running, disappears when ended; recent cooks strip populates from history
8. **Existing data:** localStorage `rfx-v5` loads correctly with new UI — no data loss
