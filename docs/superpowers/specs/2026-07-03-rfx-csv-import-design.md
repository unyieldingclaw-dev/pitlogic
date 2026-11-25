# CSV Import Completion — Design

**Date:** 2026-07-03
**Status:** Approved, pending implementation plan

## Problem

Two parallel CSV-parsing code paths exist:

- `src/utils/csvTemperatureParser.js` (`parseCsvReadings`) — wired to a working "Import CSV" button in `ActiveTab.jsx`, merging parsed readings directly into `cook.probes[].readings` via `App.jsx`'s `handleCSV`. This works today, but only for the currently active cook.
- `src/lib/providers/adapters/csv/CsvProvider.ts` + `csvSchemas.ts` — a Zod-validated, typed parser implementing the `TemperatureProvider` interface. It's registered in `main.jsx` (`ProviderRegistry.register(new CsvProvider())`) but nothing ever calls `connect()` or `subscribe()` on it. It is dead code.

CSV import is also only available while a cook is active — there's no way to import readings into a historical (completed) cook, e.g. to backfill a cook that was logged offline.

## Design

### Decision: keep the direct-merge path, delete the unused provider

Investigated routing `CsvProvider` through `TelemetryStore` (the pattern used for live MQTT data) and rejected it:

- `TelemetryStore` is keyed by live probe IDs; `CsvProvider` assigns synthetic IDs (`probe-0`, `probe-1`, `smoker`) that don't correspond to a historical cook's actual probe IDs.
- `TelemetryStore` is in-memory only — a write into it doesn't persist. The final step would still need to write directly into `cook.probes[].readings`, making the store a detour with no benefit.
- Analytics (stall detection, ETA) read `cook.probes[].readings` directly, never `TelemetryStore` — routing through it wouldn't unlock any analytics benefit for historical data.

Compared `CsvProvider`'s Zod validation against `parseCsvReadings`'s plain parsing and found the validation adds no practical safety: every field it checks (`temperature` finite, `capturedAt` positive int, `unit` enum) is already guaranteed by the surrounding parse logic before the object is constructed. Meanwhile `parseCsvReadings` has a `thin()` dedup step (drops readings closer than 60s apart) that `CsvProvider` lacks — without it, a densely-logged CSV export would flood `cook.probes[].readings` and degrade chart/localStorage performance.

**Decision: delete `CsvProvider.ts`, `csvSchemas.ts`, and their registration in `main.jsx`. Keep `parseCsvReadings` and `handleCSV` unchanged.**

### New wiring: historical cooks

`handleCSV(e, cookId)` in `App.jsx` is already cook-agnostic — it looks up any cook by ID regardless of active/historical status. The only gap is UI: no CSV import control exists in `DetailView.jsx` (the historical cook viewer).

- `App.jsx` passes `onCSV={handleCSV}` into `DetailView`.
- `DetailView.jsx`'s Overview sub-tab gains an "Import CSV" card (styled like the existing Export card), with a file input calling `onCSV(e, detailCook.id)`.
- Copy: "Import readings from a ThermoWorks CSV export into this cook", plus the same "ThermoWorks CSV export auto-detected" hint used in `ActiveTab`.

No changes to `parseCsvReadings`, `handleCSV`'s merge logic, analytics, or the provider firewall.

## Files Touched

- Delete: `src/lib/providers/adapters/csv/CsvProvider.ts`, `src/lib/providers/adapters/csv/csvSchemas.ts`
- `src/main.jsx` — remove `CsvProvider` import and registration (lines 7, 10)
- `src/App.jsx` — pass `onCSV` prop to `DetailView`
- `src/components/DetailView.jsx` — new Import CSV card in Overview sub-tab

## Compliance

Not ThermoWorks-specific (CSV import works with any ThermoWorks-format export, no live protocol interaction). No ADR-003 filter needed.

## Out of Scope

- Import preview / confirmation modal before merging (considered, rejected as unnecessary complexity for a simple historical-data feature)
- Any change to `parseCsvReadings`'s column-detection heuristics
