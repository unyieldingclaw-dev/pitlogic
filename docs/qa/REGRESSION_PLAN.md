# Focused regression and independent verification plan

The audit is read-only. Fixes should be authorized after review, scoped to one issue group at a time, and checked against the original failure before any broader cleanup. Existing Vitest tests and the local Chrome/Playwright setup provide the starting point; new dependencies need a specific justification.

## Test order after narrowly scoped fixes

| Gate | Deterministic fixture and assertion | Level | Related issue |
| --- | --- | --- | --- |
| Latest reading order | For one probe, emit 182°F at T, then 160°F at T−20s; latest remains 182°F. Define equal-time conflict behavior; cover older→newer and disconnect→old retained replay without false reactivation. | TelemetryStore unit test, then browser event path | QA-002 |
| Freshness presentation | Emit 177.3°F with capture time older than the stale threshold; assert immediate stale state, then advance through the sweep. Assert visible status/age on Dashboard and Settings for stale and disconnected probes, both alone and mixed with a fresh probe. Recover with a newer event. | Store/component and browser | QA-001 |
| Broker interruption | Controlled broker or fake MQTT client emits connect → offline/close → reconnect → connect; status and last-value freshness remain truthful and subscriptions recover once. | Adapter/hook integration, then controlled broker | QA-005 |
| Cook detail navigation | Create/end a synthetic cook, open detail, select Dashboard, Analytics, Guides, Recipes, and Active/New; visible body matches selected navigation. Decide History-from-detail behavior and verify it separately. | Browser | QA-003 |
| Theme contrast | Populate History and Dashboard recent cards in both themes and calculate rendered foreground/background contrast; assert at least 4.5:1 for normal names. | Browser computed style + screenshot review | QA-004 |
| Recipe input names | Add two ingredient rows and inspect amount, unit, and ingredient accessible names; each is distinct and remains correct after row removal. | Component/browser and manual screen reader | QA-006 |
| Muted text contrast | Sample representative labels/help text in dark and light settled states, including cards and sheets; assert 4.5:1 where text is normal size. | Browser computed style + manual | QA-007 |
| Recipe controls | Render a saved recipe; expand and delete are sibling buttons with distinct focus and activation. No button contains another interactive control. | DOM/component and keyboard browser check | QA-012 |
| Malformed CSV | Import a CSV missing a required temperature header and one with bad numbers; show a useful error and preserve stored cook data. Include a valid import control case. | Parser unit and browser upload | QA-008 |
| Duplicate chart timestamp | Two readings for one probe at the same timestamp follow the agreed duplicate policy; rendered chart data matches stored history. | Chart-data unit and browser spot check | QA-009 |

Use fixed timestamps, isolated `localStorage`, synthetic probe IDs, and deterministic event fixtures. Avoid production topics, live cooking data, and credentials. For MQTT, use a controlled broker and topics restricted to the test namespace; record broker version and exact interruption method. The current [browser audit script](evidence/browser-audit.mjs) is exploratory evidence, not a committed regression suite.

## Critical workflow rerun

After issue-specific tests pass, independently repeat: empty launch → start cook → log multiple probe and smoker readings → reload → review chart/history → end cook → reopen detail → export/import or backup/restore where supported. Exercise a second cook, probe switching, alarm editing, and recipe creation. Verify data values and timestamps before and after each persistence boundary, not just presence of a card.

Run `npm test -- --run`, `npm run build`, `npx tsc -p tsconfig.lib.json --noEmit`, and source-scoped ESLint. This audit baseline is **313 tests passing** with `TEMP`/`TMP` directed to a workspace-local directory, build passing with a chunk warning, TypeScript failing with eight errors, and source-scoped ESLint failing with one error and one warning. Record any baseline exceptions explicitly; do not infer a clean static-analysis gate from the passing build. Review the two [dependency advisory entries](evidence/npm-audit.json) for reachable exposure and verified patched versions before package changes.

## Environment and duration gates

- Test actual RFX Gateway and probe formats against a controlled broker, including Fahrenheit/Celsius metadata, multiple probes, retained messages, duplicate/out-of-order events, malformed payloads, and broker ACL isolation. Confirm whether live readings are intended to populate cook history; the current UI does not do that automatically.
- Test real iPhone Safari and Android Chrome, plus desktop Firefox/Edge, with keyboard, touch, screen reader, zoom, and offline/foreground transitions. Playwright viewport emulation is supplementary evidence.
- Run an unattended cook session at **30 minutes, 2 hours, 8 hours, and 12 hours** with logged reconnects, state changes, memory, storage growth, and chart responsiveness. The [current measurements](PERFORMANCE_REPORT.md) are only accelerated point-count renders and cannot satisfy this gate.
- Run Lighthouse and axe-core where available, then manually inspect critical flows. Compare performance to a recorded baseline and investigate sustained deterioration rather than treating a single score as release approval.

## Release decision record

The reviewer should sign off only when no P0 or critical-workflow P1 remains; probe readings/history are checked against source fixtures; interruption and recovery never imply fresh data when it is old; mobile and WCAG 2.2 AA critical checks pass; sustained sessions show no material deterioration; and focused regression tests pass. Keep optional appearance preferences separate from these gates. List any blocked hardware, browser, or duration check as an explicit release risk rather than a pass.
