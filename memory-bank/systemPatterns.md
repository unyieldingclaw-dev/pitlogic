---
authority: stable
review-cycle: 90d
retention: permanent
staleness-threshold: 90
tags: [architecture, patterns]
last-reviewed: 2026-05-26
compaction_generation: 0
source_type: human
confidence: high
lineage: initial
---

# System Patterns & Architecture Decisions

**Last Updated**: 2026-05-26

## Architecture Pattern: Prop-Drilled State from App.jsx

**Decision**: All application state lives in `src/App.jsx` and flows down as props. No global store (no Redux, no Zustand, no Context for data).

**Rationale**:
- Single-user, relatively shallow component tree — prop drilling is manageable
- Easier to trace data flow for a solo dev
- Avoids setup/maintenance overhead of a state library

**Implementation**:
```
App.jsx (state owner)
├── DashboardTab — reads activeCooks[], navigates to ActiveTab
├── ActiveTab — reads cooks[], activeCooks, all analytics components
│   ├── LiveIntelligencePanel
│   ├── StallCoach
│   └── TempChart
├── HistoryTab — reads cooks[], calls onDelete
├── RecipesTab — receives recipes, add, update, remove, importMany, replaceAll as props
├── GuideTab — static
└── SettingsSheet — receives import handlers for backup/restore
```

## Pattern: Custom Hooks for localStorage

`src/hooks/useStorage.js` — manages the `pitlogic-v5` localStorage key. Exports pure functions: `load()`, `save()`, `replaceAll()`. Components call `load()` on mount; `cooks`/`activeCooks`/`dis` live in App.jsx state.

`src/hooks/useRecipes.js` — manages `pitlogic-recipes-v1`. Exposes: `recipes`, `add()`, `update()`, `remove()`, `importMany()`, `replaceAll()`.

`src/hooks/useMopTimer.js` — countdown timer with browser Notification API.

`src/hooks/usePrefs.js` — per-cut pit/pull temp preferences, manages `pitlogic-prefs-v1` localStorage key.

`src/hooks/useThermoWorksProvider.js` — MQTT adapter lifecycle orchestration; reads config from `pitlogic-mqtt-v1`, constructs `ThermoWorksAdapter`, wires output through `normalizeProviderEvent` → `globalEventBus`; exposes `{ status, error, connect, disconnect }`.

`src/hooks/useLiveProbes.js` — subscribes to `globalStore` (TelemetryStore singleton), manages `startStaleCheck`/`stopStaleCheck` lifecycle, returns `Map<probeId, ProbeState>` for React rendering.

**Rule**: Never access localStorage directly in components — always go through hooks.

## Pattern: Pure Utility Functions for Testability

All complex logic lives in `src/utils/` as pure functions with no React deps:
- `analytics.js` — `computeClimbRate`, `computeETA`, `computeStallProbability`, `buildAverageCurve`, `totalStats`, `cooksByMonth`, `stallPrediction`
- `dataPortability.js` — `buildExport`, `parseImport`, `mergeCooks`, `triggerDownload`
- `helpers.js` — `dur`, `shortDate`, formatting utilities, `PROBE_COLORS`
- `planToEatParser.js` — CSV parsing for Plan to Eat format
- `shareCard.js` — html2canvas screenshot logic
- `csvTemperatureParser.js` — ThermoWorks-style CSV parser for cook temperature readings

**Rule**: Keep these functions pure (no side effects, no localStorage, no React) so they stay trivially testable.

## Component Structure

```
src/
  components/   16 components (tabs + sub-components)
  hooks/        6 hooks + __tests__/
  utils/        6 utility modules + __tests__/
  data/         meats.js, cuts.js, pellets.js (static reference data)
```

## Accessibility Patterns

- All clickable elements are `<button>` — never a div with onClick
- `aria-current`, `aria-expanded`, `aria-label`, `role="alert"/"status"` throughout
- All form inputs have `htmlFor`/`id` associations
- `:focus-visible` styles for keyboard navigation (no mouse outline bleed)
- WCAG 2.1 AA target

## Testing Patterns

- All tests use Vitest `describe`/`it`/`expect` globals
- localStorage mocked in hook tests (`vi.fn()`)
- Math functions use `.toBeCloseTo()` for floating-point assertions
- No component snapshot tests — behavior only

## Git & Version Control

### Commit Format
```
<type>: <short description>

Types: feat, fix, chore, docs, refactor, test, style, a11y
```

### Branch Strategy
- `main` — production, auto-deploys to GitHub Pages on push

## Pattern: Vendor-Agnostic Telemetry Provider Abstraction (src/lib/)

`src/lib/` is a TypeScript-only layer (lib/ only — not a full project migration) providing the provider abstraction pipeline:

```
Provider Adapter → Normalizer (Zod) → EventBus → TelemetryStore → Analytics/UI
```

**Provider Firewall (ADR-001):** Analytics and UI MUST NOT import from `src/lib/providers/` or `src/lib/telemetry/eventBus/`. Only `TelemetryStore` crosses the boundary.

**Semantic Authority (ADR-002):** Each layer owns a single domain — providers own ingress, normalizer owns validity, store owns derived state, analytics owns interpretation. No cross-layer authority claims.

**Session lifecycle** is owned exclusively by `SessionStore`. Providers MUST NOT emit session events or infer session boundaries.

**Staleness derivation** is owned exclusively by `TelemetryStore`. Providers MUST NOT emit `status: 'stale'`.

Full contracts: `src/lib/compliance/ADR-001` through `ADR-004`, `providerGuardrails.md`.

## Never Do This

- ❌ Access localStorage directly in components (use hooks)
- ❌ Add side effects (localStorage, DOM, timers) to utility functions in `src/utils/`
- ❌ Add state management libraries (keep it prop-drilled)
- ❌ Hardcode colors — use CSS variables or Tailwind classes
- ❌ Use `<div>` with onClick instead of `<button>`
- ❌ Force-push to main
- ❌ Skip the Vitest run before committing
- ❌ Import from `src/lib/providers/` or `src/lib/telemetry/eventBus/` outside `src/lib/` (provider firewall — ADR-001)
- ❌ Add ThermoWorks-specific code outside `src/lib/providers/adapters/thermoworks/`
- ❌ Emit session events or staleness from provider adapters (semantic authority — ADR-002)
