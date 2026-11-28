# Test inventory and results

Audit target: branch `backlog/rfx-sdk-capabilities`, commit `c7b3674`. A status of **Pass** requires executed behavior; source inspection alone is **Not tested**. Browser evidence: [script](evidence/browser-audit.mjs), [results](evidence/browser-results.json), and [screenshots](evidence/). Automated test evidence: `npm test -- --run` with workspace-local `TEMP`/`TMP` passed 313 tests in 26 files. The initial default-temp attempt did not collect tests because of sandbox `EPERM`.

## Page and control inventory

All views share `/pitlogic/`; there is no URL router. The sidebar and bottom nav each expose Dashboard, New/Active Cook, History, Analytics/Stats, Guides, and Recipes. A Settings button opens a modal sheet. History opens a DetailView in local component state. BLE setup opens a wizard from Settings.

| View/component | User-facing controls and states found in source | Executed here |
| --- | --- | --- |
| DashboardTab, MultiCookBar | Start New Cook, active cook cards, recent cook cards, Live Readings | Empty/start/live/stale browser checks; multi-cook switch not tested |
| ActiveTab, TempChart, LiveIntelligencePanel, StallCoach, MopTimerBadge | Cook setup name/meat/cut, pit and probe targets, add/remove probe, default saving, More Details, low alarm, mop timer, Start Cook; active cook switch/add, log temperature, CSV import, alarm edit/toggle, chart, alerts, End/Confirm/Cancel | Create/log/end/persistence/empty chart; remaining controls not tested |
| HistoryTab, DetailView, CompareChart, ShareCard | New Cook, active/complete cook cards; detail Back, Overview/Analysis/Compare/Notes, CSV import, notes/rating save, Share Cook, Delete | History card and detail navigation; rest not tested |
| AnalyticsTab | Summary metrics and charts | Opened and screenshotted with one synthetic cook; chart semantics not fully tested |
| GuideTab | Meat categories, cut selection, Start Cook from guide | Opened and screenshotted; interactions beyond default not tested |
| RecipesTab | Category tabs, Import CSV, New, recipe expand/delete, ingredient rows/add/remove, Save/Cancel | Opened, recipe created and persisted; rest not tested |
| SettingsSheet, DeviceSettingsCard | Close, theme, default reset, BLE entry, broker URL/username/password/unit/save/copy/paste/connect/disconnect, live probe list, device health/config, CSV replay/reset, backup download/restore/merge/replace | Settings and theme, stale probe list; broker/device/backup operations not tested |
| BleProvisioningWizard | Device chooser, network scan, provisioning fields, submit/retry/close | Not tested; physical RFX/BLE hardware unavailable |

## Traceable matrix

Evidence identifiers refer to [browser-results.json](evidence/browser-results.json) keys unless a file is named. “Blocked” means a required environment/device was unavailable; “Not tested” means this pass did not exercise it.

| Feature/component | Scenario and preconditions | Expected | Method | Actual/status | Evidence | Severity |
| --- | --- | --- | --- | --- | --- | --- |
| Initial launch | Empty isolated storage | Dashboard empty state, no crash | Playwright Chrome | **Pass**; Start New Cook and empty message visible | `workflow.initial` | — |
| Navigation | Select all six top-level views after completed cook | Matching view body | Playwright | **Pass** for History, Analytics, Guides, Recipes after returning from detail; Dashboard/Active exercised separately | `workflow.history/analytics/guides/recipes` | — |
| Navigation/detail | Dashboard/Analytics/Guides/Recipes selected from completed cook detail | Selected body visible | Playwright | **Fail**; Dashboard retains detail; the other three show “Select a cook from History” | [adversarial results](evidence/adversarial-results.json) | P1 QA-003 |
| Navigation/detail after QA-003 fix | Complete a cook, then select each top-level destination from detail at 390×844 and 1440×900 | Selected body and nav agree; History shows list | Chrome + local production preview | **Pass at `2e53431`, now integrated locally:** six destinations and reload to Dashboard at both sizes; no page errors. Browser back/forward unchanged | [rerun script](evidence/qa003-navigation-rerun.mjs), [results](evidence/qa003-navigation-after-fix.json) | Release gates pending |
| Browser refresh | Active cook with logged values | Cook and reading restored | Playwright + localStorage | **Pass**; active ID and 155°F persisted | `workflow.reloaded` | — |
| Browser back/forward | Move among SPA tabs | Defined navigation behavior | Browser | **Not tested**; SPA does not encode tab in URL | — | — |
| Dashboard empty | No cooks | Start action and useful empty message | Browser screenshots | **Pass** at seven viewports | `empty-*.png` | — |
| Cook creation | Default Brisket setup, synthetic name | One active cook stored | Playwright + localStorage | **Pass** | `workflow.created` | — |
| Cook setup | Empty/invalid name/target, add/remove probes, More Details | Validated or sensible values | Browser | **Not tested** | — | — |
| Multi-cook | Start/switch/end one of several cooks | Correct active cook isolation | Browser | **Not tested** | — | — |
| Manual probe/smoker log | Enter 155°F/225°F | Readings attached to active cook and saved | Playwright + localStorage | **Pass** | `workflow.logged` | — |
| Manual invalid temperatures | Negative/extreme/nonfinite values | Rejected with clear feedback | Browser | **Not tested** | — | — |
| End cook | Confirm end | Active ID removed, cook complete with end time | Playwright + localStorage | **Pass** | `workflow.ended` | — |
| End cook | Cancel end prompt | Remain active | Browser | **Not tested** | — | — |
| History and Dashboard recent cards | Completed cook in dark theme | Readable cook names | Playwright computed styles/screenshot | **Fail**; both black on near-black | [adversarial colors](evidence/adversarial-results.json) | P1 QA-004 |
| Cook-card titles after QA-004 correction | History active/completed and Dashboard active/recent, both themes at phone/desktop sizes | ≥4.5:1 normal title text | Chrome computed styles + settled screenshots | **Pass on isolated `21eef18`:** 16 checks; 16.88:1 dark and 17.45:1 light | [results](evidence/qa004-contrast-after-fix.json), [script](evidence/qa004-contrast-rerun.mjs) | Local integration pending |
| Detail view | Overview/Analysis/Compare/Notes, save rating/notes | Consistent stored detail | Browser | **Not tested** | — | — |
| Chart empty | No readings | Clear empty state | Browser screenshots | **Pass**; message visible | `active-*.png` | — |
| Chart one reading | One probe point | Explain why graph is not drawn | Source + browser after one log | **Not tested as a rendered assertion**; code has a one-more-reading state, and browser flow logged one reading | `workflow.logged` | — |
| Chart 30/120/480/720 points | Synthetic one-minute probe and smoker series | Render and remain legible | Headless Chrome | **Pass for first render only**; 428–810 ms single samples | [performance data](evidence/performance-results.json) | — |
| Chart duplicate time | Same probe/time with different values | Defined representation | Source review | **Not tested in browser**; code selects first | [TempChart.jsx](../../src/components/TempChart.jsx) | P2 QA-009 |
| Chart midnight/timezones/outliers/touch tooltip | Synthetic edge fixtures | Accurate labels/data and usable touch | Browser | **Not tested** | — | — |
| Live valid event | Synthetic normalized 177.3°F | Probe appears in store and dashboard | Browser event injection | **Pass** | `telemetry.injectedStore/initialCard` | — |
| Live stale event | Captured >30 seconds ago, wait stale sweep | Explicit stale status on each surface | Browser event injection | **Fail** on Dashboard; Settings labels stale | `telemetry.staleCard/settings` | P1 QA-001 |
| Live out-of-order event | 182°F at T then 160°F at T−20s | Latest remains 182°F | Browser event injection | **Fail**; 160°F replaces it | `telemetry.outOfOrder` | P1 QA-002 |
| Live retained replay after disconnect | Synthetic 40-second-old event after explicit disconnect | No false fresh state or older overwrite | Browser event injection | **Fail**; status immediately `active`, value replaced | [adversarial results](evidence/adversarial-results.json) | P1 QA-001/002 |
| Live during active cook | Inject synthetic probe event after manual log | Association behavior explicit | Browser + localStorage | **Observed boundary:** store has probe; cook history remains one manual reading; active view has no live card | `telemetry.activeCookLive` | Capability decision |
| Live duplicate/malformed/unit/multi-probe | Deterministic adapter/normalizer fixtures | Safe normalization | Existing Vitest | **Pass within mocked unit scope**; no broker-level verification | 313-test run; [telemetry audit](TELEMETRY_AUDIT.md) | — |
| MQTT disconnect/reconnect/broker outage | Local MQTT-over-WebSocket fixture: terminate socket, reject reconnects for 37 s, then recover | Honest status and recovery | Chrome + in-process broker | **Fail:** Settings stayed Connected during outage; probe became Stale, then recovered with a fresh reading. Real cloud broker/hardware remain untested | [fixture](evidence/controlled-broker-qa005.mjs), [results](evidence/controlled-broker-qa005.json) | P1 confirmed QA-005 |
| MQTT outage after QA-005 fix | Same 37 s local fixture at `1fad7a5`, now integrated locally | Reconnecting through outage; Connected after subscribed recovery | Chrome + in-process broker | **Pass locally:** Reconnecting with stale probe during outage, then Connected with fresh 190°F; no page errors. Cloud broker/hardware and sustained cook remain untested | [after-fix results](evidence/controlled-broker-qa005-after-fix.json) | Release gates pending |
| Device/probe identity change | Hardware topics and association | No misassignment | Real broker/hardware | **Blocked** | — | — |
| Session termination during telemetry | End cook while broker emits | No retained active association | Real broker/hardware | **Blocked** | — | — |
| CSV cook import | Valid real ThermoWorks export | Historical values stored in correct cook | Browser file input | **Not tested**; parser/unit tests exist | Existing tests | — |
| CSV malformed row | Missing Time cell | Error without exception | Pure function | **Fail**; TypeError | [parser](../../src/utils/csvTemperatureParser.js) | P2 QA-008 |
| CSV live replay | Valid file | Live card displays replay | Browser file input | **Not tested**; hook unit tests pass | Existing tests | — |
| Recipe creation | New recipe with synthetic name | Saved in recipes localStorage | Playwright + storage | **Pass** | `workflow.recipeCreated` | — |
| Recipe import/delete/category | Valid/invalid CSV, category selection, delete | Correct state and feedback | Browser | **Not tested** | — | — |
| Settings theme | Toggle Light then Dark | Root theme updates | Playwright | **Pass** | `workflow.lightTheme/darkTheme` | — |
| Settings broker config | Save/copy/paste/connect | Securely scoped, truthful state | Browser/live broker | **Blocked** for connection; no credentials used. UI controls source reviewed | — | — |
| Device health/config | Connected gateway | Correct health and retained config editing | Hardware/broker | **Blocked** | — | — |
| BLE provisioning | Supported browser plus RFX setup device | Complete provision/retry | Real device | **Blocked** | — | — |
| Backup export/import | JSON merge/replace and invalid file | Data integrity and recoverable errors | Browser | **Not tested**; utility tests pass | Existing tests | — |
| PWA/offline | Install then reload without network | Shell opens; data remains local | Real/offline browser | **Not tested**; manifest/service worker source reviewed | [performance report](PERFORMANCE_REPORT.md) | — |
| Accessibility labels | New Recipe ingredient row | Every field named | DOM inspection | **Fail**; three unnamed fields | `accessibility.recipeFormUnlabeled` | P2 QA-006 |
| Recipe card controls | Saved card expand and delete | Independent semantic controls | Source + dev runtime warning | **Fail markup**; nested buttons, behavior untested | [RecipesTab.jsx](../../src/components/RecipesTab.jsx) | P2 QA-012 |
| Accessibility contrast | Dark/light small muted text | ≥4.5:1 normal text | Token calculation + screenshots | **Fail** for sampled `--text3` pairs | [accessibility report](ACCESSIBILITY_REPORT.md) | P2 QA-007 |
| Keyboard, screen reader, zoom, orientation | Representative mobile flows | WCAG 2.2 AA usable | Device/manual | **Not tested** | — | — |
| Responsive layout | Eight captured states at seven sizes | No horizontal overflow/clipping | Playwright screenshots/document width | **Pass for document overflow** (zero px); visual issues recorded separately | `viewports`, [visual audit](VISUAL_AUDIT.md) | — |
| iPhone Safari/Android Chrome/Firefox/Edge | Native representative environments | Compatible interactions | Real browser/device | **Blocked/not tested**; only Chrome headless was run | — | — |
| Long unattended cook | 30 min, 2 h, 8 h, 12 h real elapsed | Stable memory, recovery, chart | Sustained run | **Not tested**; accelerated data-volume fixtures do not prove this | [performance report](PERFORMANCE_REPORT.md) | — |
| Dependencies/security | Locked production packages | No unresolved advisory/reachability decision | Online `npm audit` | **Fail advisory gate**: two high entries, exploitability unverified | [npm audit](evidence/npm-audit.json) | P2 QA-010 |
| Build/type/lint | Local branch | All quality gates clean | CLI | Build **Pass**; typecheck **Fail** (8); source lint **Fail** (1 error/1 warning) | [summary](AUDIT_SUMMARY.md) | P2 QA-011 |
