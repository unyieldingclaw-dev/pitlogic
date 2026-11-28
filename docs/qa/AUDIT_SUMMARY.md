# PitLogic quality audit — 2026-10-23

**Follow-up on 2026-10-28:** QA-001/002 were fixed and integrated locally into `backlog/rfx-sdk-capabilities` at `1b4253c`; the merged checkout passed 326/326 tests and a production build. A [controlled local MQTT/Chrome outage](evidence/controlled-broker-qa005.json) confirmed QA-005: Settings kept saying Connected during a 37-second interruption, though the last probe reading became stale, and a new reading arrived after recovery. The assessment and finding table below document the original `c7b3674` audit snapshot. QA-003/004 and QA-005 remain open; the branch has not been pushed or deployed.

**Follow-up on 2026-10-29:** A reviewed QA-005 fix is committed on isolated branch `codex/broker-reconnect-status` at `1fad7a5`. The [controlled rerun](evidence/controlled-broker-qa005-after-fix.json) showed Reconnecting during a 37-second broker outage, a stale last reading, and Connected with a fresh reading after resubscription. The branch passed 336/336 tests and a production build. It is not merged, pushed, or deployed. QA-003/004 and cloud broker, hardware, mobile, and sustained-session gates remain open.

**Follow-up on 2026-10-30:** QA-005 was integrated locally into `backlog/rfx-sdk-capabilities` at `1fad7a5`. The merged checkout passed 336/336 tests and a production build. It has not been pushed or deployed. QA-003/004 and cloud broker, hardware, mobile, and sustained-session gates remain open, so the release assessment is still not ready.

**Later follow-up on 2026-10-30:** The reviewed QA-003 navigation fix was integrated locally into `backlog/rfx-sdk-capabilities` at `2e53431`. The merged checkout passed 342/342 tests and a production build. A [local Chrome rerun](evidence/qa003-navigation-after-fix.json) on this commit passed six destinations from completed-cook detail at phone and desktop sizes. The fix has not been pushed or deployed. QA-004 and the remaining release gates are open.

## Release assessment

**QA-004 follow-up (2026-10-30):** Reviewed correction `21eef18` is committed on isolated branch `codex/cook-card-contrast`. Four cook-card title types passed [16 browser contrast checks](evidence/qa004-contrast-after-fix.json) in both themes at phone and desktop sizes (16.88:1 dark, 17.45:1 light), plus 342/342 tests and a production build. Local integration is pending. QA-001/002/003/005 are integrated locally; none of these corrections is pushed or deployed. Remaining accessibility, real-device, hardware, and sustained-session release gates are open. The assessment below describes the original audit snapshot.

**Not release-ready under the requested criteria.** No P0 was confirmed in this audit, but two confirmed P1 telemetry presentation/data-ordering defects remain: an old reading can replace a newer one, and a stale or disconnected reading is still presented under a green “Live Readings” indicator without a freshness label. The completed-cook detail navigation and dark-theme History/Dashboard recent cards also have confirmed usability defects. An [adversarial review](ADVERSARIAL_REVIEW.md) independently challenged and broadened these findings. Real RFX hardware, a controlled MQTT broker, iPhone Safari, Android Chrome, and actual unattended cook duration were unavailable, so this is an assessment of the checked-out branch, not a certification of the deployed site.

Audit target: `backlog/rfx-sdk-capabilities` at `c7b367462890de28f66f10ea0b02fc9efb6ba422`. Production application code was not changed. All browser data was synthetic in isolated Chrome contexts against the local Vite server. The prior `handoff.md` and memory bank were read; they are historical context, while repository code and tests are authoritative for this branch.

## Verified system

- React 19, JavaScript/JSX UI with TypeScript telemetry/provider library, Vite 8, Recharts 3, Zod 4, MQTT.js 5, Vitest 4. Static GitHub Pages PWA; no server, auth, database, or cross-device sync. Cook/recipe/preferences data lives in browser `localStorage`.
- One SPA URL (`/pitlogic/`) with Dashboard, Active/New Cook, History/Detail, Analytics, Guides, Recipes, Settings sheet, and BLE setup wizard. Navigation uses component state, not URL routes.
- Live path: MQTT topic → `ThermoWorksAdapter.transformPayload` → `useThermoWorksProvider` → Zod normalizer → event bus → `TelemetryStore` → `useLiveProbes` → Dashboard/Settings. Manual and historical cook readings use a separate `pitlogic-v5` localStorage model. A synthetic live reading during an active cook appeared in the telemetry store but did not enter that cook’s history; no automatic probe-to-cook association UI was found. This is a verified capability boundary, not counted as a defect against an unverified requirement.
- Existing 26 Vitest suites passed: **313/313 tests** after setting `TEMP` and `TMP` to a workspace-local directory. The initial default-temp run was blocked by sandbox `EPERM` before test collection; it was an environment issue. `npm run build` passed with a 1,417.92 kB minified / 394.16 kB gzip JS chunk warning. `npx tsc -p tsconfig.lib.json --noEmit` failed with eight errors. `npx eslint src` found one error and one warning in this branch. `npm run lint` also traversed an unrelated `.claude/worktrees` checkout and reported 37 errors and five warnings in total.
- Browser workflow verified: empty launch → create cook → log 155°F probe and 225°F smoker → reload → inspect `pitlogic-v5` → end cook → inspect persisted completed state. Recipe creation and theme switching also persisted in an isolated browser context. Seven requested viewport sizes were captured for eight page/states; the tested document width had zero horizontal overflow. See [test matrix](TEST_MATRIX.md) and [visual audit](VISUAL_AUDIT.md).

## Priority findings

| ID | Priority | Finding | Evidence |
| --- | --- | --- | --- |
| QA-001 | P1 | Stale 177.3°F remains under green “Live Readings” with no age/status on Dashboard; Settings alone says “stale” | [browser results](evidence/browser-results.json), [screenshot](evidence/stale-live-1440x900.png) |
| QA-002 | P1 | An older 160°F event arriving after a newer 182°F event becomes the displayed/latest value | [browser results](evidence/browser-results.json), `TelemetryStore.ts` |
| QA-003 | P1 | Selecting Dashboard from cook detail leaves detail visible; Analytics/Guides/Recipes show a History placeholder | [adversarial results](evidence/adversarial-results.json), `App.jsx` |
| QA-004 | P1 | Dark-theme History and Dashboard recent-card names are black on `rgb(20,20,16)`; computed contrast is about 1.14:1 | [adversarial results](evidence/adversarial-results.json), [screenshot](evidence/history-dark-390x844.png) |
| QA-005 | P1, runtime unverified | MQTT connection status changes on explicit connect/disconnect only; broker-loss recovery messaging has no verified UI path | `useThermoWorksProvider.js`, [telemetry audit](TELEMETRY_AUDIT.md) |
| QA-006–012 | P2 | Recipe labels and nested controls, muted text contrast, malformed CSV handling, chart semantics, dependency advisories, and missing static-analysis gates | [issues](ISSUES.md) |

The online `npm audit --omit=dev --json` reported two high advisory entries: Zod 4.4.3 and transitive `ip-address` 10.2.0 via `mqtt → socks`. These are dependency findings; a reachable exploit was **not** demonstrated. The offline audit returned zero because its advisory cache did not contain the current entries. See [saved npm audit](evidence/npm-audit.json), [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), and [ip-address advisory](https://github.com/advisories/GHSA-mwp4-54f8-5fhr).

## Coverage and limits

The automated browser was installed Chrome in headless mode on Windows. Playwright emulation of phone-sized viewports is not iPhone Safari or Android hardware testing. No live credentials, production topics, or real cook history were used. There was no controlled MQTT broker, RFX gateway, BLE device, real mobile device, axe-core/Lighthouse installation, or sustained 30-minute to 12-hour run in this environment. The 30-minute/2-hour/8-hour/12-hour results are **data-volume fixtures rendered rapidly**, not unattended session tests. See [performance report](PERFORMANCE_REPORT.md).

## Narrow remediation sequence

1. Correct telemetry ordering and freshness presentation, with deterministic late/duplicate/disconnect/reconnect fixtures and visible age/status on every live temperature surface (QA-001/002/005). Keep source metadata and cook history behavior explicit.
2. Fix detail navigation state and dark-theme history/recent-card text color (QA-003/004). Verify desktop and 375–430 px layouts.
3. Add input/CSV error handling, accessible names/contrast corrections, and separate the nested Recipe controls (QA-006–009/012), then review dependency updates and reachable exposure before changing packages.
4. Restore TypeScript/lint gates and add focused regression tests from [regression plan](REGRESSION_PLAN.md).
5. Independently rerun failed scenarios, then test with a controlled broker and real RFX hardware, actual iPhone Safari/Android Chrome, offline/foreground transitions, and a sustained long cook before release. Confirm broker ACL topic isolation without disclosing credentials.

No fixes, deployment, production data changes, or new dependencies were made during this audit.
