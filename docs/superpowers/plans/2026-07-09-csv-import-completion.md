# CSV Import Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the dead, unused `CsvProvider`/`csvSchemas` code path and let users import a ThermoWorks CSV export into any historical (completed) cook, not just the currently active one.

**Architecture:** `parseCsvReadings`/`handleCSV` already merge parsed rows directly into `cook.probes[].readings` and are already cook-agnostic (`handleCSV(e, cookId)` looks up any cook by ID). The only real gap is UI: `DetailView.jsx` (the historical cook viewer) has no CSV import control. This plan (1) deletes `CsvProvider.ts`/`csvSchemas.ts` and their dead registration in `main.jsx`, and (2) adds an "Import CSV" card to `DetailView.jsx`'s Overview sub-tab, styled like the existing Export card, wired to the same `handleCSV` already used by `ActiveTab.jsx`.

**Tech Stack:** React 19 JSX, Vitest + `@testing-library/react`.

---

## Before You Start

This plan implements the already-approved design in `docs/superpowers/specs/2026-07-03-rfx-csv-import-design.md`. Read that file first if anything below is unclear on the *why*.

Current state (verified immediately before this plan was written — re-verify if time has passed):

- `src/lib/providers/adapters/csv/CsvProvider.ts` + `csvSchemas.ts` — a Zod-validated `TemperatureProvider` implementation. Registered in `src/main.jsx` (`ProviderRegistry.register(new CsvProvider())`) but `connect()`/`subscribe()` are never called on it anywhere. No test file exists for it. Dead code.
- `src/utils/csvTemperatureParser.js` (`parseCsvReadings(text, cook)`) — the parser actually in use, wired to a working "Import CSV" button in `src/components/ActiveTab.jsx` (line 571: `<input type="file" ... onChange={e => onCSV(e, activeCook.id)} />`).
- `src/App.jsx`'s `handleCSV(e, cookId)` (line 185) already takes a `cookId` parameter and looks up the cook by ID from the full `cooks` array — it does not assume the cook is "active". It's currently only passed to `ActiveTab` (line 507: `onCSV={handleCSV}`).
- `src/components/DetailView.jsx` (the historical/completed-cook viewer, reached from History) has no CSV-related code at all. Its Overview sub-tab (`subTab === 'overview'`, starting around line 88) ends with an "Export" card (lines 170–184) — a `<div className="card">` with a heading, a description line, and a button. This plan's new "Import CSV" card goes immediately after that Export card's closing `</div>` (after line 184), before the overview block's closing `</div>` (line 185).
- `ProviderRegistry` (`src/lib/providers/core/ProviderRegistry.ts`) is only ever used by `main.jsx` to register `CsvProvider`. Nothing else calls `.resolve()`/`.getAll()`. Removing the one registration leaves an empty (but otherwise untouched and still valid) registry — do not delete `ProviderRegistry.ts` itself, it's out of scope.

---

## Task 1: Delete the dead `CsvProvider` code path

**Files:**
- Delete: `src/lib/providers/adapters/csv/CsvProvider.ts`
- Delete: `src/lib/providers/adapters/csv/csvSchemas.ts`
- Modify: `src/main.jsx`

This task has no new tests to write — it's a pure deletion of unused code with no assertable new behavior. The existing test suite is the regression safety net.

- [ ] **Step 1: Confirm nothing else references these files**

Run:

```bash
grep -rn "CsvProvider\|csvSchemas\|CsvRowSchema\|CsvHeadersSchema" src --include="*.ts" --include="*.tsx" --include="*.jsx" --include="*.js"
```

Expected: only `src/lib/providers/adapters/csv/CsvProvider.ts` (self-reference to `csvSchemas.js`), `src/lib/providers/adapters/csv/csvSchemas.ts`, and `src/main.jsx` (import + registration). If anything else shows up, STOP and report — the plan's assumptions have drifted and this step needs re-scoping before continuing.

- [ ] **Step 2: Delete the two files**

```bash
rm src/lib/providers/adapters/csv/CsvProvider.ts src/lib/providers/adapters/csv/csvSchemas.ts
```

- [ ] **Step 3: Remove the import and registration from `main.jsx`**

Edit `src/main.jsx`. Remove this line:

```javascript
import { CsvProvider } from './lib/providers/adapters/csv/CsvProvider.js'
```

And remove this line:

```javascript
ProviderRegistry.register(new CsvProvider());
```

The file should read (only the `CsvProvider`-related lines removed, nothing else changed):

```javascript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyMigrations } from './lib/migrations/index.js'
import { ProviderRegistry } from './lib/providers/core/ProviderRegistry.js'

applyMigrations();

if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/pitlogic/sw.js');
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Note: `ProviderRegistry` is now imported but unused in this file after the deletion — that's expected for this task (it becomes genuinely unused since nothing registers with it anymore). Leave the import as-is; do not delete `ProviderRegistry.ts` or its import — that's a separate, out-of-scope cleanup not called for by the spec. If your linter flags the now-unused import, that's expected and not a blocker for this task (confirm in Step 5 whether it fails the build — it won't, unused imports are not a Vite build error).

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run` (check `package.json` for the exact script name if this differs)
Expected: PASS — same test count as before this task (no tests existed for the deleted files, so the count should be unchanged).

- [ ] **Step 5: Typecheck and build**

Run: `npx tsc --noEmit -p tsconfig.lib.json`
Expected: no errors related to the deleted files. (If there were pre-existing unrelated errors in `CsvProvider.ts` before this task — check by running this same command on the pre-deletion state if unsure — those errors simply disappear along with the file; that's a net improvement, not a regression.)

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add -A src/lib/providers/adapters/csv src/main.jsx
git commit -m "chore: delete unused CsvProvider — parseCsvReadings/handleCSV is the real import path"
```

---

## Task 2: Wire `onCSV` into `DetailView.jsx` via `App.jsx`

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/DetailView.jsx`

- [ ] **Step 1: Pass `handleCSV` into `<DetailView>` in `App.jsx`**

Read the current `<DetailView ... />` invocation first to confirm it hasn't drifted from this (it's at line 478 as of this plan being written):

```javascript
          {isDetail && (
            <DetailView cooks={cooks} detailId={detailId}
              onBack={() => { setView('history'); setTab('history'); }}
              onDelete={deleteCook} onSave={saveCookNotes} flash={flash} />
          )}
```

Add `onCSV={handleCSV}` alongside the existing props:

```javascript
          {isDetail && (
            <DetailView cooks={cooks} detailId={detailId}
              onBack={() => { setView('history'); setTab('history'); }}
              onDelete={deleteCook} onSave={saveCookNotes} flash={flash} onCSV={handleCSV} />
          )}
```

- [ ] **Step 2: Accept the new prop in `DetailView.jsx`**

Edit `src/components/DetailView.jsx`. Change the function signature:

```javascript
export default function DetailView({ cooks, detailId, onBack, onDelete, onSave, flash }) {
```

to:

```javascript
export default function DetailView({ cooks, detailId, onBack, onDelete, onSave, flash, onCSV }) {
```

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — no test currently asserts on this new prop (the Import CSV card that uses it doesn't exist yet — that's Task 3), so this is a smoke check that nothing else broke.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/DetailView.jsx
git commit -m "feat: wire handleCSV into DetailView"
```

---

## Task 3: Add the "Import CSV" card to `DetailView.jsx`'s Overview tab

**Files:**
- Create: `src/components/__tests__/DetailView.test.jsx`
- Modify: `src/components/DetailView.jsx`

**Why a new test file:** `DetailView.jsx` currently has no test coverage at all. Rather than leaving this new interactive element (a file input wired to a callback) completely untested, this task adds a minimal, focused test file — it does not attempt to cover the rest of `DetailView`'s existing behavior (that's out of scope; don't expand this into a general `DetailView` test-writing exercise).

**A note on test fixture complexity:** `DetailView` renders `<TempChart>` and `<ShareButton>` (from `./TempChart` and `./ShareCard`) in the Overview tab, both of which do real chart/canvas work that's slow and irrelevant to what this task needs to verify. Mock both. The cook fixture's `cut` field must be a real key in `src/data/cuts.js`'s exported `G` object (e.g. `"Brisket"`) — `DetailView` does `G[detailCook.cut]` unconditionally and will throw on render if the key doesn't exist.

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/DetailView.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DetailView from '../DetailView';

vi.mock('../TempChart', () => ({
  default: () => <div data-testid="temp-chart-stub" />,
  buildChartData: () => [],
  analyzeProbe: () => null,
}));

vi.mock('../ShareCard', () => ({
  default: () => <div data-testid="share-button-stub" />,
}));

const baseCook = {
  id: 'cook1',
  name: 'Test Brisket',
  cut: 'Brisket',
  status: 'complete',
  startTime: 1_700_000_000_000,
  endTime: 1_700_030_000_000,
  notes: '',
  rating: 0,
  probes: [
    { name: 'Probe 1', target: 203, readings: [] },
  ],
  smokerReadings: [],
};

describe('DetailView — Import CSV', () => {
  it('renders an Import CSV control in the Overview tab', () => {
    render(<DetailView cooks={[baseCook]} detailId="cook1" onBack={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} flash={vi.fn()} onCSV={vi.fn()} />);
    expect(screen.getByText(/import csv/i)).toBeTruthy();
  });

  it('calls onCSV with the file input event and the detail cook id', () => {
    const onCSV = vi.fn();
    render(<DetailView cooks={[baseCook]} detailId="cook1" onBack={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} flash={vi.fn()} onCSV={onCSV} />);
    const input = screen.getByLabelText(/import csv/i);
    fireEvent.change(input, { target: { files: [] } });
    expect(onCSV).toHaveBeenCalledTimes(1);
    expect(onCSV.mock.calls[0][1]).toBe('cook1');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/__tests__/DetailView.test.jsx`
Expected: FAIL — no "Import CSV" text/control exists in `DetailView.jsx` yet.

- [ ] **Step 3: Add the Import CSV card**

Edit `src/components/DetailView.jsx`. Find the Export card block (currently lines 170–184):

```jsx
          {/* Export */}
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: '.5rem' }}>Export</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: '.75rem' }}>Save a copy of this cook summary as a printable page.</div>
            <button className="btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => {
              const rows = detailCook.probes.map((p, i) => {
                const a = analyses[i]; const temps = p.readings.map(r => r.temp); const final = temps[temps.length - 1];
                return `<tr><td>${p.name}</td><td>${final || '—'}°F</td><td>${p.target}°F</td><td>${a?.stallMins ? Math.round(a.stallMins) + 'm' : '—'}</td><td>${a?.overallRate || '—'}°F/hr</td></tr>`;
              }).join('');
              const html = `<!DOCTYPE html><html><head><title>${detailCook.name}</title><style>body{font-family:system-ui;max-width:700px;margin:2rem auto}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px 10px;background:#f4f4f2;font-size:12px}td{padding:8px 10px;border-bottom:1px solid #eee}</style></head><body><h1>${detailCook.name}</h1><h2>${shortDate(detailCook.startTime)} · ${dur(detailCook.startTime, detailCook.endTime)}</h2><table><thead><tr><th>Probe</th><th>Final</th><th>Target</th><th>Stall time</th><th>Climb rate</th></tr></thead><tbody>${rows}</tbody></table>${detailCook.notes ? `<p><strong>Notes:</strong> ${detailCook.notes}</p>` : ''}</body></html>`;
              const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.print();
            }}>
              <Share2 size={14} /> Print / Save as PDF
            </button>
          </div>
        </div>
      )}
```

Insert a new card immediately after the Export card's closing `</div>` (i.e., right before the overview block's own closing `</div>`), keeping that closing `</div>` and the `)}` where they are:

```jsx
          {/* Export */}
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: '.5rem' }}>Export</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: '.75rem' }}>Save a copy of this cook summary as a printable page.</div>
            <button className="btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => {
              const rows = detailCook.probes.map((p, i) => {
                const a = analyses[i]; const temps = p.readings.map(r => r.temp); const final = temps[temps.length - 1];
                return `<tr><td>${p.name}</td><td>${final || '—'}°F</td><td>${p.target}°F</td><td>${a?.stallMins ? Math.round(a.stallMins) + 'm' : '—'}</td><td>${a?.overallRate || '—'}°F/hr</td></tr>`;
              }).join('');
              const html = `<!DOCTYPE html><html><head><title>${detailCook.name}</title><style>body{font-family:system-ui;max-width:700px;margin:2rem auto}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px 10px;background:#f4f4f2;font-size:12px}td{padding:8px 10px;border-bottom:1px solid #eee}</style></head><body><h1>${detailCook.name}</h1><h2>${shortDate(detailCook.startTime)} · ${dur(detailCook.startTime, detailCook.endTime)}</h2><table><thead><tr><th>Probe</th><th>Final</th><th>Target</th><th>Stall time</th><th>Climb rate</th></tr></thead><tbody>${rows}</tbody></table>${detailCook.notes ? `<p><strong>Notes:</strong> ${detailCook.notes}</p>` : ''}</body></html>`;
              const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.print();
            }}>
              <Share2 size={14} /> Print / Save as PDF
            </button>
          </div>

          {/* Import CSV */}
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: '.5rem' }}>Import CSV</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: '.75rem' }}>Import readings from a ThermoWorks CSV export into this cook.</div>
            <label htmlFor="detail-csv-import" className="btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
              ↑ Import CSV
              <input id="detail-csv-import" aria-label="Import CSV" type="file" accept=".csv,.txt" multiple style={{ display: 'none' }} onChange={e => onCSV(e, detailCook.id)} />
            </label>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>ThermoWorks CSV export auto-detected</div>
          </div>
        </div>
      )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/DetailView.test.jsx`
Expected: PASS — both new cases.

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all tests project-wide.

- [ ] **Step 6: Build check**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/DetailView.jsx src/components/__tests__/DetailView.test.jsx
git commit -m "feat: add Import CSV card to historical cook detail view"
```

---

## Task 4: Manual verification

**Files:** none — this task runs the app.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server starts with no console errors.

- [ ] **Step 2: Verify the active-cook Import CSV button still works**

Start a new cook (or use an existing active cook if present), open the Active tab, confirm the existing "↑ Import CSV" button in `ActiveTab` is still present and unchanged in behavior — this task must not regress it.

- [ ] **Step 3: Verify the new historical-cook Import CSV card**

Go to History, open a completed cook's detail view, confirm the Overview tab now shows an "Import CSV" card below "Export" with the same visual style (card, heading, description, full-width button). Click it and confirm a file picker opens (don't need a real CSV file to confirm the UI wiring — the click-to-file-picker behavior is enough; the actual parse/merge logic is `parseCsvReadings`, already covered by its own existing test suite in `src/utils/__tests__/csvTemperatureParser.test.js`).

- [ ] **Step 4: Confirm build passes**

Run: `npm run build`
Expected: build succeeds with no TypeScript or bundling errors.

- [ ] **Step 5: Update memory bank**

Add a line to `memory-bank/activeContext.md` under "What's Working" noting historical-cook CSV import ships and `CsvProvider` was deleted as dead code. Follow the existing frontmatter/structure in that file — do not rewrite the whole file.

- [ ] **Step 6: Commit**

```bash
git add memory-bank/activeContext.md
git commit -m "docs: update activeContext — CSV import completion shipped"
```
