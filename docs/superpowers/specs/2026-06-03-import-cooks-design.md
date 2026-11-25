# Import Cooks — Design Spec
**Date:** 2026-06-03  
**Status:** Approved for implementation

---

## Context

The existing import flow is buried in Settings → Restore, uses a plain file picker with no drag-and-drop, shows only counts in its preview (no cook names or dates), and offers no rollback after a replace. Users reach for import when restoring after a reinstall, moving between devices, or receiving a friend's cook history — all scenarios where confidence and preview detail matter. This spec replaces the current Restore UI with a discoverable, 3-step modal that adds drag-and-drop, a per-cook checkbox preview, and an auto-snapshot for rollback.

---

## Architecture

**One new component:** `src/components/ImportModal.jsx` — a 3-step modal (Drop → Preview → Confirm).

**Two new utility functions** added to `src/utils/dataPortability.js`:
- `saveSnapshot({ cooks, activeCooks, recipes })` — writes snapshot to `pitlogic-import-snapshot-v1` in localStorage; returns `true` on success, `false` on failure (quota exceeded, private mode, etc.)
- `loadSnapshot()` — reads and returns the snapshot object, or `null` if none exists

**Entry point changes:**
- Import button added to Cook History page header (alongside existing Export button)
- `SettingsSheet.jsx` Restore section replaced with a "Restore snapshot" link — only rendered when `loadSnapshot()` returns non-null

**Existing code reused without modification:**
- `parseImport()` in `dataPortability.js` — extended (see below), not replaced
- `mergeCooks()` in `dataPortability.js` — unchanged
- `handleImportCooks()` and `handleImportRecipes()` in `App.jsx` — called with the user-selected subset; no changes needed
- `importMany()` in `useRecipes.js` — used for recipe auto-import (name-deduped)

---

## parseImport() Extension

Current `parseImport()` validates only top-level structure. It will be extended to also validate individual records:

```js
// Returns:
{
  ok: true,
  data: {
    version,
    exportedAt,
    validCooks,      // Cook objects with required fields present
    invalidCooks,    // Cook objects missing required fields — includes reason string
    validRecipes,
    invalidRecipes,
    activeCooks,
  }
}
```

Required cook fields (at minimum): `id`, `meat`, `startTime`, `probes`.  
Required recipe fields (at minimum): `id`, `name`.

`mergeCooks()` receives only `validCooks`. The modal renders importable and rejected buckets; no validation logic lives in the UI.

---

## Duplicate Detection Contract

Deduplication key is **cook ID only** (`mergeCooks` uses `new Set(existing.map(c => c.id))`).

Explicit behavior (must be documented in tests and this spec):

| Scenario | Result |
|---|---|
| Exact ID match | Incoming cook skipped — local version preserved |
| Re-importing your own export | All incoming skipped |
| Older export imported after local edits | Incoming skipped — ID ownership belongs to the local installation |
| Newer export imported after local edits | Incoming skipped — same rule |
| Same cook name, different IDs | Both imported — name is not a dedup key |

This is **not a merge operation**. Local state wins on any ID collision.

---

## 3-Step Modal Flow

### Step 1 — Drop
- Drag-and-drop zone (dashed border, large target area) with `accept=".json"` file input as fallback
- On file selected: call extended `parseImport()` → advance to Step 2 automatically
- On parse error: show inline error in Step 1, stay on Step 1

### Step 2 — Preview
- Header: `"N cooks found · X will import · Y will skip"`
- Two sections in a scrollable list:
  - **Will Import** (pre-checked by default) — green badge, name + date + duration; these are cooks not already in your library by ID
  - **Will Skip** — gray badge, non-interactive (no checkbox); these are cooks whose ID already exists locally; `mergeCooks()` will always skip them regardless of selection state, so showing a checkbox would be misleading
- Quick-select buttons: **Select all** (all Will Import items checked), **None** (all unchecked). Will Skip items have no checkboxes and are unaffected by these buttons.
- If `invalidCooks.length > 0`: collapsed warning section at bottom — "N cooks couldn't be read" with expand to see details; these are non-selectable
- Recipes: not shown; auto-imported in Step 3 (see below)
- CTA: `"Review import (N selected) →"` — disabled when 0 cooks selected

### Step 3 — Confirm
- Summary: `"X new cooks will be imported. Y existing cooks will be skipped."` No "overwrite" or "replace" language — `mergeCooks()` never modifies an existing cook.
- Snapshot notice: `"A rollback snapshot will be saved before your data is updated. If anything looks wrong, restore it from Settings."`
- On confirm: call `saveSnapshot()` first → on failure, abort with error: *"Couldn't save a safety snapshot — import cancelled. Free up some storage and try again."* (`handleImportCooks` and `handleImportRecipes` must not be called) → on success, call `handleImportCooks({ cooks: selectedCooks, activeCooks: currentActiveCooks, mode: 'merge' })` then `importMany(validRecipes)` → modal closes

---

## Recipe Handling

`linkedRecipes` is initialized as `[]` on every cook and never populated — cooks and recipes are fully independent in the current codebase. No recipe selection UI is needed. All `validRecipes` from the file are auto-imported using `importMany()` (name-deduped, case-insensitive) regardless of which cooks are selected. Recipe-only import is not a supported scenario.

---

## Snapshot Contract

**Format:** Same shape as export — `{ cooks, activeCooks, recipes }`.  
**Storage key:** `pitlogic-import-snapshot-v1`  
**Quantity:** One snapshot, overwritten on each import. No naming, no history, no management UI.  
**Restore path:** Settings "Restore snapshot" link → calls existing replace-mode import handlers with snapshot data → clears snapshot key.  
**Visibility:** Link is hidden when `loadSnapshot()` returns `null`.

**Failure behavior:** `saveSnapshot()` fails → import aborted → show error: *"Couldn't save a safety snapshot — import cancelled. Free up some storage and try again."* `handleImportCooks` and `handleImportRecipes` must not be called.

---

## Non-Goals

The following are deliberate exclusions, not oversights:

- **Replace existing cooks** — incoming cooks with a matching local ID are skipped; local version is always preserved
- **Update / patch existing cooks** from imported data
- **Conflict resolution UI** — no side-by-side diff, no "which version wins?" prompt
- **Two-way merge** — import is one-directional (file → local)
- **Selective recipe import** — all valid recipes auto-import; individual recipe selection is out of scope
- **Multiple snapshots / snapshot history** — one rollback point per import session only

Skipping an existing cook is correct behavior, not a bug.

---

## Removed from Settings

**Removed:**
- Import / Restore section UI from `SettingsSheet.jsx` (the radio buttons, file picker, and merge-mode controls)
- The `handleFile` function in `SettingsSheet.jsx`

**Kept:**
- Export section in `SettingsSheet.jsx` — unchanged
- "Restore snapshot" link — replaces the old Restore section; only visible when a snapshot exists (`loadSnapshot()` returns non-null)
- `handleImportCooks()` and `handleImportRecipes()` in `App.jsx` — still called by `ImportModal`, no changes needed

---

## Verification

**Unit tests** (in `src/utils/__tests__/dataPortability.test.js`):
- `parseImport()` returns `validCooks` / `invalidCooks` split correctly for mixed input
- `saveSnapshot()` / `loadSnapshot()` round-trip — data in equals data out
- `saveSnapshot()` returns `false` when `localStorage.setItem` throws
- `mergeCooks()` — four explicit duplicate-detection cases (exact match, re-import own export, stale import, same name different ID)

**Component tests** (React Testing Library):
- `ImportModal` step progression: file drop → preview renders → confirm advances
- Checkbox defaults: new cooks checked, existing unchecked
- "New only", "Select all", "None" shortcuts update selection correctly
- Confirm button disabled when 0 cooks selected
- On `saveSnapshot()` failure: import handlers not called, error message shown

**Manual smoke test:**
1. Export current data → verify file downloads
2. Open import modal from Cook History page → confirm it's visible without opening Settings
3. Drop the exported file → Step 2 should show all cooks as "HAVE IT" (0 new)
4. Check "Select all" → confirm with 0 actually-new cooks → verify nothing duplicated in cook list
5. Force a quota error (fill localStorage in DevTools) → confirm import aborts with error and cook list is unchanged
6. Restore snapshot from Settings → verify cook list returns to pre-import state
