# Cook Comparison Chart — Design Spec

## Goal

Add a "Compare" mode to the Analytics tab that overlays multiple past cooks' temperature curves on a single chart, so you can see how different runs of the same cut performed against each other.

## Architecture

The Analytics tab gains a segmented mode toggle ("Average" | "Compare"). Average mode is unchanged. Compare mode renders a new `CompareChart` component that reuses the existing `buildAverageCurve` utility for the reference line and introduces a `buildCompareCurves` utility for per-cook interpolation.

Cook data already stores `probes[].readings = [{temp, time}]` where `time` is minutes elapsed from cook start — no schema changes needed.

## Detailed Design

### Mode Toggle

A segmented control at the top of Analytics (below the cut selector) switches between modes:

- **Average** — existing behavior, no changes
- **Compare** — new view described below

The selected cut carries over between modes.

### Compare Mode Layout

```
[ Cut selector ]          [ Average | Compare ]
[ Probe picker: Meat · Ambient · ... ]   [ Show avg ⬛ ]
[ Chart — overlaid cook lines ]
[ Cook checklist ]
```

### Cook Selection

- On entering Compare mode, auto-load the **3 most recent cooks** for the selected cut.
- A collapsible **inline checklist** below the chart lists all past cooks for that cut, sorted newest-first. Each row shows: date, total cook duration, final temp.
- Checking/unchecking a row adds/removes that cook from the chart. **Maximum 4 cooks** selected at once; checking a 5th when 4 are active has no effect (row appears disabled with a tooltip "Max 4 cooks").
- Each selected cook is assigned a distinct color from a fixed palette (4 colors). Color is consistent between the chart line, the final-temp dot, and the checklist row highlight.

### The Chart

- **X axis:** absolute time from cook start, labeled in hours (e.g. 0h, 4h, 8h, 12h, 16h). Cooks of different lengths simply end at different points — no stretching.
- **Y axis:** temperature in °F.
- **Per-cook line:** one `Line` in Recharts per selected cook. Lines use the cook's assigned color. A dot is rendered at the final reading with the final temp value labeled beside it.
- **Legend:** cook date (e.g. "May 10") in each cook's color, positioned above the chart.
- **Average reference:** the existing `buildAverageCurve` result for the selected cut, rendered as a faint dashed line (white at ~25% opacity) with a ±1σ band (white fill at ~8% opacity). Shown by default.

### Probe Picker

A tab strip above the chart showing the **named probes** from the selected cooks. Probe names come from `probe.name` (the name the user assigned during setup, e.g. "Probe 1", "Meat", "Ambient"). The picker shows one tab per slot index that exists across the selected cooks, labeled with the name from the most recently selected cook that has that slot. Switching probe slot updates all lines simultaneously. Defaults to slot 0 (the first probe).

If a selected cook does not have data for the chosen probe slot, its line is omitted from the chart and a note appears in its checklist row: "No data for this probe."

**Average reference and probe slot:** `buildAverageCurve` computes from probe slot 0 only. The average reference line is shown when slot 0 is active; it is automatically hidden when a different slot is selected (since no cross-cook average exists for other slots).

### Average Reference Toggle

A small "Show avg" toggle (checkbox or pill) in the top-right of the chart area. **On by default.** Toggling it hides/shows the average dashed line and ±1σ band without affecting the selected cook lines.

## Data Layer

### New utility: `buildCompareCurves(cooks, probeIndex)`

Located in `src/analytics.js` alongside `buildAverageCurve`.

- Accepts an array of cook objects and a probe slot index.
- For each cook, interpolates readings at 15-minute buckets (matching `buildAverageCurve` granularity) from `probes[probeIndex].readings`.
- Returns an array of `{ cookId, date, color, points: [{minutesBucket, temp}] }`.
- Cooks missing the requested probe slot are returned with `points: null`.

### Chart data shape for Recharts

The chart uses a unified time axis. Build a merged dataset:

```js
// minutes buckets that appear in any selected cook
[
  { t: 0,   cookA: 72,  cookB: 71,  avg: 70  },
  { t: 15,  cookA: 95,  cookB: 88,  avg: 91  },
  // ...
]
```

Each cook's temp is keyed by `cookId`. Missing buckets for shorter cooks are `null` (Recharts `connectNulls={false}` stops the line there).

## Files to Create / Modify

| File | Change |
|------|--------|
| `src/analytics.js` | Add `buildCompareCurves(cooks, probeIndex)` |
| `src/components/CompareChart.jsx` | New component — the full Compare mode view |
| `src/components/AnalyticsTab.jsx` | Add mode toggle; render `CompareChart` when in compare mode |
| `src/analytics.test.js` | Tests for `buildCompareCurves` |

## What Does NOT Change

- History tab — remains a pure list with no comparison UI.
- Average mode — completely unchanged.
- Cook data schema — no new fields.
- Mop timer, active cook flow, settings — untouched.

## Success Criteria

1. Entering Compare mode for a cut with ≥ 3 past cooks auto-selects the 3 most recent.
2. Checklist correctly adds/removes cooks; 5th selection is blocked.
3. Lines end where the cook ended (no stretching to fill the axis).
4. Probe picker shows user-assigned probe names; switching updates all lines.
5. Average reference line is visible by default and toggles cleanly.
6. A cook with no data for the selected probe slot shows no line and a note in the checklist.
7. Reduced-motion preference respected (no animated transitions on chart updates).
