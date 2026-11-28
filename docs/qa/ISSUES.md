# Prioritized findings

Scope: local branch `c7b367462890de28f66f10ea0b02fc9efb6ba422`, assessed 2026-10-21 through 2026-10-23. “Confirmed” means reproduced in the isolated browser or deterministic local command. “Code-confirmed” means the behavior follows directly from the checked-out implementation but the external trigger was not exercised. “Suspected” requires a controlled integration test. P0/P1/P2/P3 follow the supplied audit definitions.

**2026-10-28 follow-up:** QA-001/002 were corrected and fast-forwarded locally to `backlog/rfx-sdk-capabilities` at `1b4253c` (326 tests and build passed). QA-005 is now reproduced with a local MQTT-over-WebSocket fixture; its original finding below is updated. QA-003/004 remain open. This branch has not been pushed or deployed.

**2026-10-29 follow-up:** QA-005 has a reviewed correction on isolated branch `codex/broker-reconnect-status` at `1fad7a5`. The [same controlled broker scenario after the fix](evidence/controlled-broker-qa005-after-fix.json) showed Reconnecting throughout the 37-second outage, a stale probe reading, and Connected with a fresh 190°F reading after subscribed recovery. All 336 tests and the production build passed. This branch has not been merged, pushed, or deployed; cloud broker, hardware, and sustained-session checks remain open.

**2026-10-30 follow-up:** `backlog/rfx-sdk-capabilities` was fast-forwarded locally to `1fad7a5`. The combined checkout passed 336/336 tests and a production build. The fix has not been pushed or deployed; QA-005 still needs cloud broker, hardware, and sustained-session release verification.

**Later 2026-10-30 follow-up:** QA-003's reviewed correction was integrated locally into `backlog/rfx-sdk-capabilities` at `2e53431`. A [controlled Chrome rerun](evidence/qa003-navigation-after-fix.json) passed all six top-level destinations at mobile and desktop sizes, including History list and reload to Dashboard. The merged checkout passed 342/342 tests and a production build. It has not been pushed or deployed; QA-004 remains open.

## QA-001 — Stale temperature presented as live

- **Category/severity/status:** Telemetry and usability, **P1, confirmed**.
- **Affected feature:** Dashboard Live Readings and Settings probe status.
- **Reproduce:** In an isolated local browser, publish a normalized synthetic 177.3°F reading with `capturedAt` 31 seconds before `Date.now()` into the UI event bus. Inspect immediately and after the store’s five-second stale check. Then publish `probe:disconnected` for that probe and compare Dashboard with Settings.
- **Expected:** All surfaces identify the value as stale/disconnected, show its age, and avoid a green live indicator.
- **Observed:** The store initially marks this already-old reading `active` until the sweep. After the sweep, Dashboard still says “Live Readings” with a green dot and 177.3° without text freshness; Settings shows `177.3°F (stale)`. After disconnect, Dashboard still displays the same live heading/value, and Settings displays `177.3°F` without a disconnected suffix. [Adversarial results](evidence/adversarial-results.json), [Dashboard screenshot](evidence/stale-live-1440x900.png).
- **Likely cause/confidence:** High. `TelemetryStore` derives stale status, but [DashboardTab.jsx](../../src/components/DashboardTab.jsx) only applies status color to the value/border and always renders a green header dot; it never renders status or age.
- **Smallest correction:** Derive stale state immediately for an already-old capture, display status and last-captured age beside each value on both surfaces, derive the section indicator from current probe statuses, and never use “Live” for an all-stale/disconnected set.
- **Regression:** Browser/component test publishes an old timestamp and checks immediately and after the stale timer; assert visible stale label/age and non-green status. Repeat for disconnect, mixed fresh/stale probes, and recovery.

## QA-002 — Out-of-order telemetry overwrites a newer reading

- **Category/severity/status:** Telemetry/data integrity, **P1, confirmed**.
- **Affected feature:** Latest probe state and Dashboard temperature.
- **Reproduce:** Publish an 182°F reading captured at time T, then a 160°F reading captured at T−20 seconds for the same probe. Inspect `TelemetryStore` and Dashboard.
- **Expected:** Latest display remains 182°F; the older event is ignored for current state or handled as historical data without changing latest state.
- **Observed:** Store latest value became 160°F with the older `capturedAt`, and Dashboard showed 160.0°. A separate challenge using only the UI's actual Vite module instance reproduced it; reverse order correctly ended at 190°F. Equal-time conflicting 200→150°F events ended at 150°F. A 40-second-old replay after an explicit disconnect changed the probe back to `active` immediately with 170°F. [Adversarial results](evidence/adversarial-results.json) and [initial browser results](evidence/browser-results.json).
- **Likely cause/confidence:** High. `applyActiveReading` in [TelemetryStore.ts](../../src/lib/telemetry/store/TelemetryStore.ts) replaces the map entry unconditionally and does not compare timestamps.
- **Smallest correction:** Compare source timestamps against the existing reading before updating latest state; define equal-timestamp conflict behavior. An old replay must not restore `active` after disconnect. Keep receipt time distinct from capture time and specify clock-skew/device-reset handling.
- **Regression:** Deterministic same-probe newer→older, equal-time conflict, and older→newer event tests, including disconnect plus retained-message replay.

## QA-003 — Dashboard navigation remains on cook detail

- **Category/severity/status:** Navigation, **P1, confirmed**.
- **Affected feature:** Completed cook detail → Dashboard, Analytics, Guides, and Recipes.
- **Reproduce:** Create and end a cook, enter its detail view, then select each top-level destination in the sidebar.
- **Expected:** Dashboard content appears and the selected nav matches it.
- **Observed:** Dashboard nav became selected while the main area still showed the detail view and its History back button. Analytics, Guides, and Recipes selected their nav items but showed “Select a cook from History.” New Cook rendered correctly as a positive control. [Adversarial results](evidence/adversarial-results.json).
- **Likely cause/confidence:** High. `handleNavClick` in [App.jsx](../../src/App.jsx) changes `tab` but leaves `view === 'detail'`; for some targets it also clears `detailId`, so `isDetail` renders an empty DetailView ahead of tab content.
- **Smallest correction:** Exit detail view when navigating to a different top-level tab; explicitly choose whether History navigation should retain detail or show the list.
- **Regression:** End cook → select each top-level tab from detail → assert the expected tab body and nav state; cover browser reload/back behavior explicitly for this state-based SPA.
- **Remediation status (2026-10-30):** Commit `2e53431` exits detail mode on top-level navigation and clears the selected cook. Six App regressions and a local Chrome rerun at 390×844 and 1440×900 passed. Browser reload returns to Dashboard; browser back/forward was not changed. Integrated locally; release verification remains pending.

## QA-004 — Dark-theme history card title is unreadable

- **Category/severity/status:** Visual/accessibility, **P1, confirmed**.
- **Affected feature:** Active and completed cook cards in History, plus Dashboard active and recent-cook cards.
- **Reproduce:** In dark theme, create or load a completed cook and open History at 390×844.
- **Expected:** Cook name is readable against its card background.
- **Observed:** Both populated History and Dashboard recent-card names compute to `rgb(0,0,0)` on `rgb(20,20,16)` (approximately **1.14:1**). The settled dark screenshot visibly obscures the History name; the light-theme History card is readable. [Adversarial computed colors](evidence/adversarial-results.json), [dark](evidence/history-dark-390x844.png), [light](evidence/history-light-390x844.png).
- **Likely cause/confidence:** High. The interactive buttons in [HistoryTab.jsx](../../src/components/HistoryTab.jsx) and [DashboardTab.jsx](../../src/components/DashboardTab.jsx) have surface backgrounds and no foreground color, so their names inherit the browser button default rather than `--text`.
- **Smallest correction:** Give interactive cards the theme text color in the shared card style or the specific buttons; verify recent-cook cards.
- **Regression:** Computed-color contrast assertion for populated History and Dashboard recent cards in both themes, plus a mobile visual snapshot.
- **Remediation status (2026-10-30):** Reviewed commit `21eef18` on isolated branch `codex/cook-card-contrast` applies `--text` to the shared interactive-card style and Dashboard active button. A visual rerun also identified and reproduced the Dashboard active-title defect before correction. The [browser regression](evidence/qa004-contrast-rerun.mjs) passed 16 checks across four card types, dark/light themes, and 390×844/1440×900: title contrast is now 16.88:1 dark and 17.45:1 light. [Results](evidence/qa004-contrast-after-fix.json), [dark History screenshot](evidence/qa004-dark-mobile-history.png), [dark Dashboard screenshot](evidence/qa004-dark-mobile-dashboard.png). All 342 tests and the production build passed. Local integration is pending; other muted-text contrast findings remain open.

## QA-005 — Broker loss leaves “Connected” status displayed

- **Category/severity/status:** Connectivity/freshness, **P1, confirmed in controlled local broker/browser test**.
- **Affected feature:** Settings Live Device status and reconnection feedback.
- **Reproduce:** Connect Chrome to the local MQTT 3.1.1 WebSocket fixture with synthetic `/probes/QA000/events` data. After 182°F appears, terminate the socket and reject reconnects for 37 seconds without pressing Disconnect. Restore the broker and publish 190°F.
- **Expected:** Status reports interruption/reconnecting and recovery, with clear age/status for last probe values.
- **Observed:** Settings remained `● Connected` throughout the outage. The probe initially showed 182°F as Live, then `Stale · 34s ago` while the broker status still said Connected. After recovery, a subscribed connection delivered 190°F and the probe returned to Live. The fixture recorded one subscription packet on each accepted connection and no page errors. [Fixture](evidence/controlled-broker-qa005.mjs), [results](evidence/controlled-broker-qa005.json).
- **Likely cause/confidence:** High for the local scenario. [useThermoWorksProvider.js](../../src/hooks/useThermoWorksProvider.js) changes UI status only on initial connect, explicit disconnect, or initial error; [ThermoWorksAdapter.ts](../../src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts) does not forward MQTT `offline`/`close`/`reconnect` state. Cloud broker behavior, hardware, ACLs, and long outages remain untested.
- **Smallest correction:** Surface MQTT lifecycle transitions through the adapter and hook, with bounded, visible recovery state; distinguish broker status from per-probe freshness.
- **Regression:** Controlled fake-client and broker integration cases for close/offline/reconnect, retained replay, and unmount cleanup.
- **Remediation status (2026-10-30):** Corrected in commits `50a2742` and `1fad7a5`, including shutdown failure and MQTT error edge cases found in independent review. Integrated locally; controlled broker rerun and merged checkout tests/build passed. Release verification remains pending.

## QA-006 — Recipe ingredient fields have no accessible names

- **Category/severity/status:** Accessibility, **P2, confirmed DOM check**.
- **Affected feature:** New Recipe form, amount/unit/ingredient fields.
- **Reproduce:** Open Recipes → New. Inspect accessible names for the three ingredient inputs.
- **Expected:** Each field has an associated name that identifies its purpose and row.
- **Observed:** All three fields had no `<label>` association or `aria-label`; placeholders `2`, `tbsp`, and `Paprika` were the only hints. [Browser results](evidence/browser-results.json) records `recipeFormUnlabeled`.
- **Likely cause/confidence:** High. [RecipesTab.jsx](../../src/components/RecipesTab.jsx) renders a group heading and three bare inputs.
- **Smallest correction:** Add explicit field labels/accessible names, including row numbers for multiple ingredients.
- **Regression:** Accessible-name assertions when adding/removing ingredient rows; manual screen-reader confirmation.

## QA-007 — Muted normal-size text misses contrast target

- **Category/severity/status:** Accessibility, **P2, confirmed token calculation and screenshots**.
- **Affected feature:** Small labels/help text across Dashboard, Settings, History, and charts.
- **Reproduce:** Compare CSS `--text3` to card/background colors in either theme.
- **Expected:** At least 4.5:1 for normal text under WCAG 2.2 AA 1.4.3.
- **Observed:** Dark `#6B6B65` on `#141410` is **3.44:1**; light `#8A8A84` on white is **3.47:1** (on `#F5F4F0`, **3.15:1**). [Token definitions](../../src/index.css), [mobile screenshots](evidence/settings-live-390x844.png).
- **Likely cause/confidence:** High for these solid-color combinations; translucent/gradient contexts require separate checks.
- **Smallest correction:** Adjust muted text tokens or individual text colors to meet contrast in both themes without changing layout.
- **Regression:** Automated contrast checks on representative settled states plus manual review in bright light.

## QA-008 — Truncated CSV row throws during import

- **Category/severity/status:** Input handling, **P2, confirmed pure-function reproduction**.
- **Affected feature:** Cook CSV import parser.
- **Reproduce:** Call `parseCsvReadings('Probe 1,Time\n123', cookWithOneProbe)`. The row has no Time column value.
- **Expected:** Reject/skip the bad row and show an import error while keeping current history intact.
- **Observed:** `TypeError: Cannot read properties of undefined (reading 'replace')`. [csvTemperatureParser.js](../../src/utils/csvTemperatureParser.js) indexes the absent cell at line 32; [App.jsx](../../src/App.jsx) runs this in `FileReader.onload` without a rejection handler. The actual file chooser was not exercised for this malformed fixture.
- **Likely cause/confidence:** High for parser exception; browser UI consequence remains unverified.
- **Smallest correction:** Check cell presence and parsing result before calling string methods; catch import failure at the UI boundary.
- **Regression:** Truncated/blank/quoted/invalid-date CSV fixture tests and browser import error state.

## QA-009 — Same-time chart samples collapse to the first value

- **Category/severity/status:** Chart/data interpretation, **P2, code-confirmed; input frequency unmeasured**.
- **Affected feature:** Temperature history chart.
- **Reproduce:** Supply two readings for the same probe with equal `time` and different temperatures to `buildChartData`.
- **Expected:** A stated aggregation/deduplication policy, or distinct points using stable timestamps.
- **Observed in code:** [TempChart.jsx](../../src/components/TempChart.jsx) makes a `Set` of times and uses `.find`, which selects the first matching reading. Later equal-time values do not appear in the chart. Browser reproduction of such input was not run.
- **Likely cause/confidence:** High for the pure data transform; low on user frequency. Manual readings round `time` to 0.01 minute, so close-together entries can collide.
- **Smallest correction:** Choose and document a deterministic policy keyed by `ts` or aggregate by time; keep chart/tooltips consistent with stored readings.
- **Regression:** Equal-time, duplicate, out-of-order, missing-interval, and multi-probe chart fixtures.

## QA-010 — Current production dependency advisories

- **Category/severity/status:** Dependency security, **P2, confirmed versions/advisories; exploitability unverified**.
- **Affected feature:** `zod@4.4.3` direct and `ip-address@10.2.0` via `mqtt@5.15.1 → socks@2.8.9`.
- **Reproduce:** Run `npm audit --omit=dev --json` and `npm ls ip-address zod --all` on the lockfile.
- **Expected:** No unresolved high advisory entries in a release candidate, or a documented reachability/acceptance decision.
- **Observed:** Two high entries in the [saved online audit](evidence/npm-audit.json). The [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) concerns oversized constrained arrays; the [ip-address advisory](https://github.com/advisories/GHSA-mwp4-54f8-5fhr) concerns address classification. This static client has no server SSRF boundary, and no affected call path was demonstrated. An offline cached audit misleadingly returned zero.
- **Likely cause/confidence:** High that locked versions match advisory ranges; low that either issue is reachable here.
- **Smallest correction:** Review current patched dependency graph and relevant input paths, then update the smallest dependency set after focused compatibility tests.
- **Regression:** Online audit in release checks and normalization/CSV/MQTT smoke tests after updates.

## QA-011 — TypeScript and source lint checks fail outside CI

- **Category/severity/status:** Build-quality gate, **P2, confirmed**.
- **Affected feature:** `src/lib` type safety and repository lint script.
- **Reproduce:** Run `npx tsc -p tsconfig.lib.json --noEmit`, `npx eslint src`, and `npm run lint`.
- **Expected:** Checks pass, or known exceptions are explicitly scoped.
- **Observed:** TypeScript reported eight errors in CSV and ThermoWorks adapter files. Source lint reported one error (`global` undefined in a BLE wizard test) and one hook warning. Root lint reported 37 errors/five warnings because it also scans an unrelated `.claude/worktrees` checkout. The current GitHub Actions workflow runs tests/build but no typecheck/lint.
- **Likely cause/confidence:** High. Source files have strict optional/index typing issues; lint scope includes nested worktree content.
- **Smallest correction:** Repair the eight type errors and source lint issue in scoped changes, then scope lint to owned source/config files and add verified gates to CI in a separate approved change.
- **Regression:** CI execution of the exact passing commands; no production behavior test needed for lint scope itself.

## QA-012 — Recipe card nests a button inside another button

- **Category/severity/status:** Accessibility/markup, **P2, confirmed source and React runtime warning; interaction impact untested**.
- **Affected feature:** Saved Recipe card expand control and Delete recipe control.
- **Reproduce:** Create a recipe and render its card in the local dev app. React logs `In HTML, <button> cannot be a descendant of <button>` and identifies the Delete recipe button within the `aria-expanded` button. [RecipesTab.jsx](../../src/components/RecipesTab.jsx) renders that exact nesting at lines 12–26.
- **Expected:** Expand and delete are sibling interactive controls with independent focus, name, and activation behavior.
- **Observed:** Invalid nested interactive markup and a React runtime warning. Actual keyboard, screen-reader, and deletion behavior were not exercised in this audit.
- **Likely cause/confidence:** High. `RecipeCard` places the delete button inside the outer expand button; `stopPropagation()` only changes click bubbling and does not fix markup semantics.
- **Smallest correction:** Make the expand and delete buttons siblings within the card header while preserving visual alignment and independent activation.
- **Regression:** DOM assertion that no interactive control is nested in a button, then keyboard focus/Enter/Space and pointer checks for expand versus delete.

## Explicit risks and capability boundaries

- **Live readings and cook history:** A synthetic live event during an active cook entered the telemetry store while that cook’s persisted reading count stayed at one manual entry; the active view showed no live card. No automatic probe association/history capture is currently implemented. Treat this as a product decision to resolve against release criteria, rather than silently grading an unpromised feature as a defect. [Browser results](evidence/browser-results.json).
- **MQTT credentials:** Settings stores broker URL, username, and password in `localStorage` as designed for this single-user static app. This is a browser-compromise exposure risk, not a confirmed credential leak or XSS. No credentials were read or included in evidence. Broker ACL topic isolation still needs a private, authorized check.
- **Real-device and mobile behavior:** BLE provisioning, broker ACLs, MQTT reconnect, PWA offline install, iPhone Safari, Android Chrome, and real 8–12 hour sessions remain blocked/not tested; see the matrix. No severity is assigned from speculation.
