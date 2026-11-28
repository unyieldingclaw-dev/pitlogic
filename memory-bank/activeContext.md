---
authority: volatile
review-cycle: 7d
retention: rolling-3-months
staleness-threshold: 7
tags: [current-focus, active]
last-reviewed: 2026-11-01
compaction_generation: 0
source_type: human
confidence: high
lineage: initial
---

# Active Context - Current State

## PR #12 merged and deployed — 2026-11-27

PR #12 (`backlog/rfx-sdk-capabilities`, head `e6f2887`, including all QA-001–005 fixes, Stage A and the realistic flame background) merged to `main` as `a3b505d` on 2026-11-25 and auto-deployed to GitHub Pages (`https://unyieldingclaw-dev.github.io/pitlogic/`). Live smoke test passed with no console errors: start cook, manual 155°F/225°F reading persisted across reload, Settings, Devices/gateway setup render, end-cook confirmation stored the cook as complete. Not verified live: broker connection, BLE provisioning, real hardware, native mobile, long cooks. The release gates in `docs/qa/AUDIT_SUMMARY.md` still apply even though the code is deployed.

Local repo housekeeping: local `main` had an unpushed July commit `c3daab7` (PMB tooling 1.2.0→1.2.1, 43 files: hooks, settings, scripts, standards, CLAUDE.md). It is preserved on local-only branch `chore/pmb-1.2.1`; local `main` was reset to `origin/main`. That upgrade still needs its own PR. The Compare/Temp chart fixes below are on branch `fix/chart-rendering`. `.flame-spike-tmp/` is a full repo copy from flame experiments; vitest picks up its tests (doubling the count), so delete it or exclude it.

## Compare chart verification — 2026-11-25

Isolated Chrome reproduction with synthetic completed Brisket cooks confirmed the inline Compare chart and expanded overlay render four plotted lines at desktop and mobile widths without horizontal overflow. Expanding previously emitted two transient Recharts `width(-1)/height(-1)` warnings before container measurement; `CompareChart.jsx` now provides a positive initial dimension only for the expanded chart. Browser rerun measured 1400×803 expanded and 316×220 mobile SVGs with no sizing warnings. Current shared snapshot: 359/359 tests; build and changed-file ESLint passed for this edit. Existing large-chunk build warning remains. No storage work was changed or merged; Stage B remains separately gated. Local dev preview is available at `http://127.0.0.1:5190/pitlogic/`.

**Last Updated**: 2026-11-27

## RFX setup documentation verified — 2026-11-12

Read current official ThermoWorks-Integrations/ThermaConnect README through authenticated GitHub CLI (connector lacked repository access) and official RFX setup, operating, app, Cloud and transmission documentation. RFX MEAT has four internal sensors; Advanced Mode shows those plus a minimum-derived Probe reading, not five physical probes. Gateway Pro-Series air-probe cadence (15/30/60 seconds) is separate from meat-probe temperature-change triggers (1/1.5/3 degrees). GitHub additionally distinguishes per-probe readInterval and heartbeatInterval; its examples are not verified device defaults. RFX Gateway maintains a persistent MQTT connection; NODE sleep/wake guidance does not apply to it. Probe association in gateway config is required. Cloud cook/session start/end/save semantics are distinct from sensor accuracy and MQTT telemetry. No real data or device configuration was changed; existing historical records have not been validated or rejected.

Important B3 follow-up: StoreTypes.ts currently fixes stale threshold at 30 seconds. This may mislabel valid temperature-triggered RFX updates; prove configured heartbeat/cadence/liveness semantics with hardware before changing policy or treating missing packets as collection gaps. Do not blame user session operation for unverified temperature inaccuracies. Suggested next practical step is a deliberately named short test session with fresh meat and ambient readings, explicit save and archive verification.

Sources: https://github.com/ThermoWorks-Integrations/ThermaConnect ; https://help.thermoworks.com/knowledge-base/setup-thermoworks-rfx-gateway-and-rfx-meat/ ; https://blog.thermoworks.com/setup-thermoworks-rfx/ ; https://www.thermoworks.com/content/pdf/rfx-starter-kit-operating-instructions.pdf ; https://help.thermoworks.com/knowledge-base/thermoworks-cloud/ .

## Realistic flame background and ThermoWorks usability — 2026-11-12

Replaced the decorative SVG flame and sway animations with a generated photographic fire texture, optimized to a 64.5 KB local WebP. CSS luminance masking blends away the black backdrop in dark/light themes; decorative layer remains hidden from assistive technology and cannot intercept input. User explicitly likes the new flames. Verified 357/357 tests, production build (existing chunk warning), App ESLint and diff check; visually inspected desktop dark and mobile dark/light in real Chrome. Preview runs on loopback port 5184. Stage B proof remains separate and B3 is still the next development gate.

User clarified that their immediate usability difficulty is ThermoWorks' own app, especially starting/monitoring new cooks and finding past cooks; PitLogic also needs more friendliness. With explicit account-view permission, inspected the already open Cloud UI read-only and verified device menu > Sessions > New Session and Archives > Saved Sessions navigation. No account/device/session changes or data exports. Follow up with a practical ThermoWorks walkthrough, then use this feedback when reviewing PitLogic's flow. No private account content is recorded here.

## Stage B isolated storage/recording proof — 2026-11-01

User agreed to the recommended Stage B storage/recording proof after the Stage A walkthrough. Existing managed worktree now uses `codex/recording-storage-proof`, base `1067690`, head `a40df15` (repository foundation `91928e1`, recorder/review fixes `04a4746`, then resume notes). Native IndexedDB is confined to the proof; App still uses Stage A's localStorage/manual recording semantics. No real user data migration, source UI integration, merge, push or deployment occurred. Primary remains `1067690`; all prior audit/memory edits preserved.

384/384 tests (35 files), build/changed-file lint/diff/script checks passed. Same eight baseline TS diagnostics and build chunk warning remain. Seventeen real Chromium scenarios pass; an accelerated four-channel/12-hour/1-Hz fixture saved 172,800 exact samples with zero pending, 29.49s elapsed and 38.8ms p95 full-batch flush. This is accelerated retention proof with an absent legacy key, not actual unattended duration or full performance-budget acceptance. Independent adversarial findings on lifecycle failures, missed gaps at finish, end-time ordering, imported binding/ownership validation and bounded recovery acknowledgment were reproduced and corrected; final follow-ups found no concrete remaining blocker in reviewed paths. Report: `docs/qa/STORAGE_RECORDING_PROOF.md`; evidence: `docs/qa/evidence/storage-recording-proof/`. Proof server stopped; scratch/worktree preserved. Next gate is B3 cadence/history/analytics proof before B4 source/application integration and B5 full resource/device/PWA acceptance. Stage B is not complete. Stage A walkthrough preview on5181 remains available intentionally.

## Interactive walkthrough preview — 2026-11-01

After user agreed to a walkthrough, opened integrated production preview at `http://127.0.0.1:5181/pitlogic/` (separate origin from prior QA port). CUA verified initially empty Home, essentials-first setup, 250 F target and named-probe draft preserved through Devices, manual 155 F food/225 F smoker logging, end confirmation, completed History and Home return. Only synthetic local cook data was created; no broker credentials or hardware used. Current screenshot: `docs/qa/evidence/stage-a/walkthrough-home.png`. Chrome tab 795625493 is left on Home for user feedback; loopback preview session 21816 remains running intentionally. User's own usability assessment is pending; no product code changes in this walkthrough.

## Stage A local integration — 2026-11-01

User approved the recommended local merge. Primary `backlog/rfx-sdk-capabilities` fast-forwarded from `2e53431` to `1067690`, integrating reviewed QA-004 and Stage A. The merged checkout passed 357/357 tests (32 files), production build and diff check; existing bundle warning remains. Application/script files match the reviewed feature branch. Four overlapping untracked planning/report originals were moved to `docs/qa/evidence/stage-a-integration-premerge/` before merge and verified against SHA-256 manifest; all other audit notes and existing memory edits were preserved. Host-managed worktree, feature branch and its scratch remain available. No push, PR, deployment or Stage B implementation occurred. Next product gate is a user walkthrough of the locally integrated flow; native iPhone/hardware/sustained-cook checks and separate Stage B/storage approval remain outstanding.

## Approved Stage A delivered in isolation — 2026-11-01

User approved Stage A only. Branch `codex/usability-stage-a` in the managed `telemetry-freshness-order/rfx-cook-tracker` worktree ends at `1067690`, based on QA-004 `21eef18`. Commits `2b2925d` and `ffe44e9` simplify Home/Cook/History/More navigation and essentials-first manual setup, introduce Devices with edited-config Save and connect, preserve drafts and advanced tools, and clarify that device readings are not saved into cooks. Final verification fixes effective-disabled dialog trapping, stale Saved feedback, one-cook Add Cook visibility, route scroll/focus recovery and connected-settings disclosure. Independent branch/follow-up review found no remaining concrete regression in reviewed changes.

Final verification: 357/357 tests in 32 files; production build and diff check passed; four synthetic local Playwright flows (dark/light, mobile/desktop) passed with zero page errors, broker recovery, actual backup restoration and unchanged cook schema. Existing lint BLE test `global` error/provider cleanup warning, eight library TS diagnostics and bundle warning remain. See `docs/qa/STAGE_A_VERIFICATION.md` and `docs/qa/evidence/stage-a/`. Preview stopped. Worktree tracked files committed; `.qa-temp/` scratch is preserved. Primary remains `2e53431` with prior planning/audit/memory edits preserved. No merge, push or deploy. Next decision: local integration including QA-004 prerequisite versus PR/keeping branch. Stage B, automatic RFX recording and storage amendment remain unapproved; hardware/native iPhone/long-cook/novice testing still required.

## Revised two-stage flow plan — 2026-10-31

The user approved revising the rejected plan into separately reviewed stages, not implementation or database migration. Active documents are `docs/superpowers/plans/2026-10-31-intuitive-cook-flow-v2.md` and `docs/specs/2026-10-31-cook-recording-storage-v2.md`; originals remain historical review baselines. Stage A improves navigation, essential manual setup, Devices and edited-config connection without changing cook storage or enabling RFX cook recording. Stage B separately proves repository/migration, recorder, history/analytics, then equal-source integration. All eleven original findings now have concrete contracts/tests. Independent follow-up reviewers caught and then rechecked additional StallCoach hydration/duration and cross-tab recipe-import ownership/hook-persistence gaps; final result is no remaining approval-blocking design omission in reviewed lenses, NOT implementation proof. See `docs/qa/FLOW_PLAN_REVISION_2_REVIEW.md`. Recommend Stage A execution approval first; Stage B and localStorage exception remain unapproved. No application code, migration, branch integration, or deployment was performed. Primary remains `2e53431`, QA-004 worktree clean at `21eef18`; planning/audit notes remain uncommitted.

## Adversarial plan review — 2026-10-31

At the user's request before storage/implementation approval, three independent reviewers and a final opponent reviewed the flow, storage amendment, implementation plan, evidence, and source. Verdict: request changes; see `docs/qa/FLOW_PLAN_ADVERSARIAL_REVIEW.md`. Eleven actionable plan gaps (seven P1 approval blockers and four P2 contract/test gaps) cover dense-sample analytics, large detail rendering, archived-history hydration, older-client migration divergence, dataset replacement fencing, probe reassignment intervals/repair UI, async cook+recipe import, per-cook recording status, stale advice, full-size backup/performance acceptance, and collision-safe migration IDs. Primary independently reproduced sparse/dense stall disagreement and Chrome spread-max failure at 172,800 samples in `docs/qa/evidence/plan-adversarial-checks.{mjs,json}`. Additional storage comparison shows 12h four-probe 1Hz fails but slower tested capture policies fit in Chrome; IndexedDB is defensible for preserving every sample, not established as the only solution. Reviewed plans were left unchanged, with no app implementation or migration. Next action is revise contracts/tests and re-review changed sections before approval; consider independent UX delivery to limit migration scope. Equal manual/RFX flow direction remains approved; storage amendment and implementation remain unapproved.

## Approved flow and storage planning — 2026-10-31

The user approved the full equal-manual/RFX flow and Home/Cook/History/More navigation. Planning is complete in `docs/superpowers/plans/2026-10-31-intuitive-cook-flow.md`, with sequential persistence, recorder, monitoring, Devices, setup/navigation, and end-to-end verification tasks. No product code or migration was executed. An isolated Chrome storage fixture (`docs/qa/evidence/recording-storage-capacity.{mjs,json}`) showed a synthetic four-probe 1-Hz history saving at 1h (1,787,978 JSON characters) but failing with QuotaExceededError at 4h (7,169,994), 8h, and 12h. Actual hardware rate is not established. Proposed `docs/specs/2026-10-31-cook-recording-storage.md` moves authoritative cook records/readings to local IndexedDB, keeps settings/recipes in localStorage, preserves original legacy data, and specifies transactional migration, rollback limits, self-contained backups, bounded queues, and truthful error states. This requires explicit approval because projectbrief currently mandates all state in localStorage. Awaiting plan review, storage amendment approval, and execution-method confirmation; recommend inline sequential execution with independent final review. QA-004 remains isolated at `21eef18`; primary checkout remains `2e53431` with uncommitted audit/planning notes. No server remains running from the capacity fixture.

## Intuitive cooking-flow design — 2026-10-30

The user requested friendly/intuitive PitLogic flows and clarified that ThermoWorks' own app is the confusing reference. We have not reviewed the official app. The user explicitly chose equal support for manual temperature entry and RFX automatic cook recording. The updated draft `docs/specs/2026-10-30-intuitive-cook-flow.md` presents equal source choices during cook setup, a direct manual path without device setup, and a shared monitoring/history layout. Proposed defaults for probe ownership, shared ambient channels, cook-local targets, and supported recording conditions are labeled as design calls awaiting full design review. No UX implementation is approved or started. The local mobile walkthrough in `docs/qa/evidence/ux-flow-walkthrough.{mjs,json}` verified hidden device setup, separate provisioning/app connection, Save versus Connect mismatch, advice before essential form actions, inconsistent navigation labels, and live readings not currently associated with cook history. Source/data semantics must be designed before promising automatic recording. Local preview was stopped. QA-004 commit `21eef18` remains isolated pending its integration decision.

## Isolated QA-004 contrast correction — 2026-10-30

The user said to continue with QA-004. Reviewed commit `21eef18` on `codex/cook-card-contrast` in the existing managed worktree adds two theme color declarations: shared `.card-interactive` and the Dashboard active-cook button. Browser tests first reproduced 1.14:1 dark title contrast on History active/completed and Dashboard recent cards; settled screenshot inspection exposed the same Dashboard active-title defect, which was also reproduced before correction. Final Chrome production-preview evidence passed 16 contrast checks in dark/light themes at 390×844 and 1440×900: 16.88:1 dark and 17.45:1 light. See `docs/qa/evidence/qa004-contrast-after-fix.json` and settled screenshots. All 342 tests, the build, changed-JSX lint, and independent review passed; the existing build chunk warning remains. The worktree is clean and the preview server was stopped. The branch is not locally integrated, pushed, or deployed. Original checkout remains at `2e53431` with uncommitted audit notes. Next gate is local integration; muted-text accessibility and real mobile/hardware/sustained-session release checks remain open.

## QA-003 local integration — 2026-10-30

The user explicitly authorized the recommended local merge. `backlog/rfx-sdk-capabilities` was fast-forwarded from `1fad7a5` to reviewed QA-003 commit `2e53431`. The merged checkout passed 342/342 tests and a production build with the existing large-chunk warning. Uncommitted audit reports and memory notes were preserved. The managed worktree and feature branch remain available. No push, PR, or deployment occurred. QA-004 is the next confirmed P1 correction; real mobile, hardware, and sustained-cook release gates remain open.

## Isolated QA-003 navigation correction — 2026-10-30

The user agreed to address QA-003 next. In the managed worktree, branch `codex/detail-navigation` starts from locally integrated QA-005 head `1fad7a5` and contains reviewed commit `2e53431`. The root cause was that `handleNavClick` changed `tab` while leaving `view='detail'`, so detail took precedence over the selected tab or showed an empty detail placeholder. The handler now exits detail mode for top-level destinations and clears `detailId`; selecting History shows the list. A failing six-case App regression was observed before the two-line fix. The branch passed 342/342 tests, changed-file ESLint, and a production build. A local Chrome production-preview rerun passed six destinations and reload to Dashboard at 390×844 and 1440×900 with no page errors; see `docs/qa/evidence/qa003-navigation-after-fix.json`. Independent read-only review found no code issues. The branch is clean and remains isolated; no push or deployment. QA-004 and real mobile/hardware/long-cook release checks remain open. Browser back/forward semantics were not changed.

## Local QA-005 integration — 2026-10-30

The user said to continue after the QA-005 integration options. `backlog/rfx-sdk-capabilities` was fast-forwarded locally from `1b4253c` to reviewed QA-005 head `1fad7a5`; existing uncommitted audit reports and memory notes were preserved. The merged checkout passed 336/336 Vitest tests, a production build, and changed-file ESLint with zero errors and one pre-existing hook warning. The build retains its large-chunk warning. The controlled local broker rerun remains the only runtime outage evidence. No push, PR, or deployment occurred. The managed worktree and branch remain available. QA-003/004 and cloud broker, hardware, mobile, and sustained-session checks are still open, so the release is not ready.

## Isolated QA-005 remediation — 2026-10-29

The user authorized a narrow broker-status fix after the controlled outage reproduced QA-005. The fix is committed on `codex/broker-reconnect-status` in the managed worktree `C:/Users/Mizzo/.codex/worktrees/telemetry-freshness-order/rfx-cook-tracker` at `1fad7a5` (`50a2742` plus reviewer-driven follow-up `1fad7a5`). MQTT loss now reaches Settings as Reconnecting; Connected returns only after a successful resubscription. Explicit disconnect and failed shutdown detach listeners. Independent review found the failed-shutdown and connected-error edge cases, then confirmed the follow-up resolved both. The worktree is clean; the branch has not been merged, pushed, or deployed.

The final branch passed 336/336 Vitest tests, a production build, and changed-file lint with zero errors and one pre-existing hook warning. Library TypeScript retains eight pre-existing diagnostics. A rerun of the local MQTT 3.1.1 WebSocket/Chrome fixture showed Reconnecting through a 37-second outage while the 182°F probe became stale, followed by Connected and a fresh 190°F probe after resubscription. Evidence: `docs/qa/evidence/controlled-broker-qa005-after-fix.json`. The original checkout remains on `backlog/rfx-sdk-capabilities` at `1b4253c`, with uncommitted audit docs and memory notes. Next decision: whether to integrate the isolated branch. QA-003/004 and cloud broker, RFX hardware, mobile, and sustained-cook verification remain open; the release is not ready.

## Local integration and broker audit — 2026-10-28

The QA-001/QA-002 branch was independently reviewed. Review found that disconnect timestamps were not included in ordering and no-time CSV replay could collapse same-millisecond rows. Focused tests first reproduced both; a follow-up fix was committed as `1b4253c` after `55200a8`. The original `backlog/rfx-sdk-capabilities` checkout fast-forwarded locally to `1b4253c` without touching its uncommitted audit reports or memory notes. The merged checkout passed 326/326 tests, production build, and changed JavaScript lint. Library TypeScript retains only the eight pre-existing diagnostics. No push, PR, or deployment occurred.

QA-005 is now confirmed in a local MQTT 3.1.1 WebSocket/Chrome fixture: the broker rejected reconnects for 37 seconds, but Settings kept `Connected` while the last 182°F probe reading became stale. On recovery, one subscribed connection delivered a fresh 190°F reading. Evidence is in `docs/qa/evidence/controlled-broker-qa005.{mjs,json}` and the issue record was updated. This does not cover a cloud broker, RFX hardware, ACLs, or long sessions. The next code correction should be separately scoped to surfacing broker lifecycle state; QA-003/004 also remain open.

## Approved telemetry correction — 2026-10-24

The user approved a narrow fix for QA-001/QA-002 after the audit and adversarial review. It was implemented and committed in the managed worktree `C:/Users/Mizzo/.codex/worktrees/telemetry-freshness-order/rfx-cook-tracker` on branch `codex/telemetry-freshness-order`, commit `55200a8c6aa6d1cdba86aae8cc2b662005099df5`. The original audit checkout and its reports remain separate. The store now keeps the first reading for an equal source timestamp, rejects older readings, and marks an already-old reading stale on arrival. Dashboard and Settings show per-probe status and age; all-stale Dashboard readings no longer use a green live heading. Five-second local age updates are scoped to the status component.

Verification in the fix worktree: 27 Vitest files/322 tests passed, production build passed, changed UI files passed ESLint, and a synthetic browser rerun kept 182°F after a late 160°F packet, showed stale/disconnected labels and age, and kept disconnect state after old replay. Source-wide ESLint still has the pre-existing BLE-test error and hook warning; library TypeScript still has eight pre-existing errors. A real broker/hardware outage, mobile devices, and long unattended cook are still unverified. QA-003/004 and code-reviewed QA-005 remain open; do not call the release ready.

## Current audit state — 2026-10-23

The user requested an audit-first, gated QA review of `backlog/rfx-sdk-capabilities` at `c7b367462890de28f66f10ea0b02fc9efb6ba422`. Eight audit reports and synthetic evidence are in `docs/qa/`, starting with `docs/qa/AUDIT_SUMMARY.md`. No production code fixes, deployment, or commit were made. Release assessment is not ready under the user's criteria: confirmed P1 issues are stale readings presented as live, older telemetry overwriting newer readings, navigation remaining on cook detail, and unreadable dark History card names. Broker-loss status is a P1 code-level gap awaiting controlled runtime verification. See `docs/qa/ISSUES.md` for severity and reproduction.

After the user agreed to an adversarial pass, `docs/qa/ADVERSARIAL_REVIEW.md` challenged all five P1 findings in isolated Chrome and source. QA-001/002 were reconfirmed through the actual UI module path: an old value overwrites a new one, an already-stale value enters as active until the sweep, disconnected text status disappears, and an old synthetic replay reactivates the probe. QA-003 affects Analytics/Guides/Recipes as well as Dashboard; QA-004 also affects Dashboard recent cards. QA-005 still needs controlled broker runtime proof. The challenge found a Vite dynamic-import alias trap in its first script run, corrected it, and saved final values in `docs/qa/evidence/adversarial-results.json`. Application code remains untouched.

Verification baseline: 26 Vitest files/313 tests pass with workspace-local `TEMP`/`TMP`; Vite build passes with a large-chunk warning; `tsc -p tsconfig.lib.json --noEmit` has eight errors; `eslint src` has one error and one warning. Headless Chrome used synthetic isolated browser state at seven viewport sizes. A React runtime warning revealed invalid nested Recipe buttons (QA-012), bringing triaged findings to twelve. Controlled MQTT/RFX hardware, native mobile browsers, axe/Lighthouse, and actual unattended long-cook testing remain open gates. The next step is user review and narrow authorization of fixes, followed by the focused `docs/qa/REGRESSION_PLAN.md` and independent rerun.

The historical project status below predates this audit and may describe older test counts or deployment state.

## Current Focus

ThermoWorks live probe pipeline is merged to main and deployed. Recent work has layered on top of it: CSV replay (PR #7), copy/paste Live Device config for cross-device transfer, ThermoWorks channel labels, and a settings-sheet backdrop-click fix (PRs #9, #10). In parallel, `backlog/rfx-sdk-capabilities` (PR #12) built Device Health, bidirectional device config, completed-cook CSV import, and the BLE provisioning wizard on the same telemetry foundation — merged into this branch from main to reconcile both feature sets before landing.

**Branch**: `backlog/rfx-sdk-capabilities`, merging `origin/main` to reconcile with PRs #7/#9/#10. GitHub Pages auto-deploying from `main`.

## What's Working

- 218 tests passing (19 files) — production build clean
- GitHub Pages deployed and auto-deploying on push to main
- PWA installable on mobile
- Full data export/import (JSON backup with merge/replace modes)
- Stall Intelligence v2 with real-time ETA, climb rate, stall probability
- Accessibility: keyboard nav, aria-*, semantic HTML throughout
- Expanded cuts library: 21 total cuts across 5 categories including Lamb
- Per-cut cook preferences: inline save + Settings manager with reset
- Compare mode in Analytics tab (CompareChart, HistoryTab updates)
- PitLogic branding throughout — no RFX visible in UI
- Migration system: first-run key rename `rfx-* → pitlogic-*`, idempotent
- Telemetry architecture: domain types, normalizer, EventBus, TelemetryStore, SessionStore, providers
- **Live probe pipeline**: MQTT → ThermoWorksAdapter → useThermoWorksProvider → globalEventBus → globalStore (TelemetryStore) → useLiveProbes → DashboardTab "Live Readings" card + SettingsSheet probe list
- **CSV replay pipeline**: CSV file → `useCsvProvider` → `CsvProvider` → telemetry pipeline → Live Readings card (Settings "Replay CSV" card)
- **Live Device config copy/paste**: SettingsSheet — copy current MQTT config to clipboard, paste-and-apply with overwrite confirmation, for cross-device transfer
- **ThermoWorks channel labels**: per-channel high/low alarm labels rendered from `device.channels[]` in SettingsSheet, delivered via `subscribeDeviceMeta()` and kept in hook-local `deviceState` (not the event bus)
- Device Health panel in Settings: per-gateway wifi/battery/firmware and per-probe battery, sourced from `TelemetryStore` via `useTelemetryStore()`; hidden entirely when no gateway is known
- Bidirectional device config: `ThermoWorksAdapter` subscribes to `/devices/+/config`, caches the full retained baseline per gateway, and exposes `publishConfig(gatewayId, edits, fallbackBaseline?)` which merges edits onto that baseline and republishes the complete object (retained) — never a partial config, which the RFX SDK would otherwise silently wipe. Settings now has a "Device Settings"/"Initialize Configuration" card per gateway (`DeviceSettingsCard.jsx`) for editing channel labels, alarm thresholds, and transmit/recording intervals
- CSV import completion: historical (completed) cooks can now import a CSV export too, via a new "Import CSV" card in `DetailView.jsx`'s Overview tab (mirrors `ActiveTab.jsx`'s existing control, wired to the same cook-agnostic `handleCSV`). The unused `CsvProvider`/`csvSchemas.ts` (dead `TemperatureProvider` implementation, registered but never connected) was deleted
- BLE provisioning wizard ships: `ThermoWorksBleProvisioner.ts` (connect/scanWifiNetworks/provision over the ThermaConnect open BLE GATT protocol) behind `useBleProvisioning.js` (the ADR-001 crossing point), driving `BleProvisioningWizard.jsx` — a single-screen idle→connecting→form→provisioning→success/error flow reachable from a new "Set Up New Device" card in Settings, gated on `navigator.bluetooth` support. Manually verified in-browser: entry point renders/gates correctly, wizard opens, `connect()` invokes the real native device chooser and a cancelled/failed pick correctly lands on the error phase with retry, unsupported-browser fallback text replaces the button when `navigator.bluetooth` is absent, no console errors, production build clean

## Claude Code Infrastructure (2026-05-20 → 2026-05-26)

All 22 operations from the testing agent flow plan are complete:

**Hooks** (`.claude/hooks/`):
- `block-dangerous-ops.sh` — blocks 15 dangerous patterns (force-push, reset --hard, DROP TABLE, curl|bash, etc.)
- `user-prompt-submit.sh` — memory-bank + context reminder at each turn
- `pre-edit-karpathy.sh` — Karpathy reminder + task contract path warning

**Agents** (`.claude/agents/`):
- `test-strategist.md` — diff-scoped test gap analysis, haiku/effort:low
- `maintainability-reviewer.md` — dead code + abstraction + comment audit, haiku/effort:low
- `security-reviewer.md` — updated: model:haiku, effort:low
- `researcher.md` — updated: model:haiku, effort:medium

**Commands** (`.claude/commands/`):
- `code-review.md` — upgraded to 8-phase: Scope → Context+Contract → 5 parallel subagents → Opponent-Auditor
- `test-audit.md` — whole-codebase test gap analysis
- `comment-pass.md` — dead code scan + WHY comment audit
- `memory-prune.md` — stale/duplicate/sensitive data scan in memory-bank/
- `handoff.md` — graceful context handoff with contract archival

**Settings** (`.claude/settings.json` — new tracked file):
- Env: `MAX_THINKING_TOKENS: 10000`, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: 50`, `CLAUDE_CODE_SUBAGENT_MODEL: haiku`, `DISABLE_NON_ESSENTIAL_MODEL_CALLS: 1`
- Permission denies: .env, .env.*, settings.local.json
- Hook registrations: block-dangerous-ops (PreToolUse/Bash), pre-edit-karpathy (PreToolUse/Edit|Write), user-prompt-submit (UserPromptSubmit), update-reviewed.sh (PostToolUse/Write|Edit)

**CI** (`.github/workflows/deploy.yml`):
- `fetch-depth: 2` on checkout
- `npm test -- --run` step (tests must pass before build)
- File size gate: warn at 400 lines, fail new/modified files at 650 (grandfathered)

**Cursor Rules** (`.cursor/rules/`):
- `architecture.mdc` — state/localStorage/purity/button/size constraints
- `code-quality.mdc` — augmented with 3 testable constraints
- `accessibility.mdc` — aria-label, aria-pressed, keyboard, heading order
- `memory-bank.mdc` — augmented with 4 testable rules section

## Immediate Next Steps

1. **Verify HiveMQ Cloud ACL** topic isolation before first live use (each device locked to its own `devices/{id}/events`; see Broker Setup Reference in plan)
2. **End-to-end smoke test** with a real RFX Gateway + HiveMQ Cloud broker (manual — requires hardware) — open deployed app at https://unyieldingclaw-dev.github.io/pitlogic/, connect via Settings → Live Device, confirm temps appear in Dashboard "Live Readings" card

## Open Issues

- iOS silent switch bypasses all browser audio/notifications — investigate PWA push notifications
- BLE provisioning wizard has **not** been verified against real hardware (an actual RFX/NODE device in SETUPMODE) — Web Bluetooth's GATT connect/scan/provision flow can only be exercised end-to-end with physical hardware and a Chrome/Edge browser. Flag for a follow-up manual test with real hardware before considering it fully production-verified.

## Environment Status

**Dev server**: run `npm run dev` → http://localhost:5173/pitlogic/
**Git**: on `main`, fully merged and pushed; remote URL updated to `https://github.com/unyieldingclaw-dev/pitlogic.git`
**GitHub Pages**: live at https://unyieldingclaw-dev.github.io/pitlogic/

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root — all state, nav, wiring; imports `useLiveProbes`/`useTelemetryStore`/`useCsvProvider`, passes `liveProbes`/`gatewayHealth` to DashboardTab + SettingsSheet |
| `src/hooks/useLiveProbes.js` | Subscribes to globalStore, manages stale check, returns `Map<probeId, ProbeState>` |
| `src/lib/telemetry/store/globalStore.ts` | Singleton: `TelemetryStore` wired to `globalEventBus` — the domain boundary crossing point |
| `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts` | ThermaConnect MQTT adapter: topics `/probes/+/events`, `/devices/+/events`, `/devices/+/state`, `/devices/+/config`; `channels[]` array; probeId `{topicId}-ch{channelNumber}`. Gateway-level state summary (wifi/battery/firmware/units) flows through `subscribe()`/globalEventBus for Device Health; full per-channel state (labels/alarms) stays hook-local via `subscribeDeviceMeta()` for Channel Labels |
| `src/lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.ts` | Web Bluetooth GATT provisioning (connect/scanWifiNetworks/provision) behind `useBleProvisioning.js` |
| `src/components/BleProvisioningWizard.jsx` | BLE device setup wizard, reachable from Settings' "Set Up New Device" card |
| `src/components/DeviceSettingsCard.jsx` | Per-gateway channel labels/alarms/interval editor, backed by `publishConfig()` |
| `src/utils/deviceHealth.js` | `computeGatewayHealth(gatewayState, telemetryProbes)` — derives the Device Health panel's per-gateway view |
| `src/hooks/useStorage.js` | localStorage `pitlogic-v5` (cooks, activeCooks, dis) |
| `src/hooks/useRecipes.js` | localStorage `pitlogic-recipes-v1` |
| `src/hooks/useProbeAlert.js` | Browser notification when probe hits target temp |
| `src/hooks/useSmokerAlert.js` | Browser notification + Web Audio when pit drops below threshold |
| `src/lib/migrations/` | Idempotent key-rename migration, run at startup |
| `src/lib/telemetry/` | Domain types, normalizer (Zod), EventBus, TelemetryStore, SessionStore |
| `src/lib/providers/` | TemperatureProvider interface + adapters (CSV, Mock, ThermoWorks) |
| `src/lib/compliance/` | ADR-001 through ADR-004, providerGuardrails.md |
| `src/utils/analytics.js` | All analytics + stall detection |
| `src/utils/dataPortability.js` | Export/import pure functions |
| `src/components/DashboardTab.jsx` | Dashboard — includes "Live Readings" card when `liveProbes.size > 0` |
| `src/components/SettingsSheet.jsx` | Backup/restore + My Defaults + Live Device section with probe list |
| `src/hooks/usePrefs.js` | Per-cut temp preferences, localStorage `pitlogic-prefs-v1` |
| `src/data/meats.js` | Meat categories + cuts lists |
| `src/data/cuts.js` | Cut guides (temps, stages, pellets, tips) |
| `.github/workflows/deploy.yml` | CI/CD auto-deploy + test gate + file size gate |
| `.claude/settings.json` | Hooks, permission denies, Haiku subagent config |

