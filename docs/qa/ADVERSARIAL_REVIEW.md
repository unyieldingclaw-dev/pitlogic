# Adversarial review of P1 findings — 2026-10-23

## Question and method

This pass tried to disprove or narrow the audit's five P1 findings before any fix. It used fresh, isolated local Chrome contexts, synthetic normalized events, positive controls, alternative navigation targets, rendered colors, source tracing, and existing test coverage. [The independent challenge script](evidence/adversarial-review.mjs) and [raw results](evidence/adversarial-results.json) are retained. No application code, broker topic, real cook data, or credentials were changed.

A test-harness trap was found and corrected: directly importing a dev-server `.js` URL created a different event-bus instance from the module Vite loaded for the app. The first isolated `.js` injection did **not** reach the UI. Vite's actual transformed `.ts` module instance did; the final script uses that instance and confirms both store and visible UI results. The original audit published to both paths, and the relevant UI result was from the `.ts` path. This challenge removes that ambiguity.

The existing focused TelemetryStore, ThermoWorksAdapter, and provider-hook suites still passed **90/90 tests in three files**. Their current assertions do not cover the late/equal-time/disconnect-replay and broker-status cases below; passing them does not overturn the browser results.

## Falsification results

| Finding | Countercheck | Outcome and confidence |
| --- | --- | --- |
| **QA-001, stale shown as live** | With only one 31-second-old probe, check immediately, after the five-second stale sweep, and after an explicit `probe:disconnected` event. Compare Dashboard and Settings. | **Confirmed and broader.** Store status is initially `active` despite a 31-second-old capture, then `stale` after the sweep. The only-probe Dashboard still says “Live Readings” with a green dot (`rgb(74,222,128)`) and 177.3° without age or status. Settings says `(stale)` after the sweep, but drops that suffix after disconnect while retaining 177.3°F. The disconnect event was injected after normalization, so broker delivery is untested. |
| **QA-002, old reading overwrites new** | Use only the actual app bus/store: 182°F at T then 160°F at T−20s; reverse order as a positive control; send two conflicting values at the same timestamp. | **Confirmed.** Latest state and UI changed to 160°F for newer→older. Older→newer correctly ended at 190°F, ruling out a generally inert event path. Equal-time 200°F then 150°F ended at 150°F, showing no duplicate/conflict rule. After an explicit disconnect, replaying a 40-second-old event immediately changed status back to `active` and value to 170°F. These are synthetic normalized events, not actual MQTT retained delivery. |
| **QA-003, top-level navigation from detail** | Enter the same completed-cook detail before selecting each other nav item. | **Confirmed and broader.** Dashboard stays on the detail view while Dashboard is selected. Analytics, Guides, and Recipes select their nav item but show “Select a cook from History.” New Cook works. The source clears `detailId` for some tabs without clearing `view === 'detail'`. A History click from detail may intentionally keep the nested detail view and was not graded. |
| **QA-004, unreadable dark card name** | Measure both History cook title and Dashboard recent-cook title, using the rendered foreground/background. | **Confirmed and broader.** Both are black on `rgb(20,20,16)`, about **1.14:1**. The original light-theme comparison remains a positive control; this pass focused on dark-theme populated cards. |
| **QA-005, broker status after transport loss** | Trace every status write and adapter MQTT lifecycle listener; inspect current adapter/hook tests for outage coverage. | **Code-level gap stands; outage outcome remains unverified.** The hook sets status on connect, explicit disconnect, and initial errors. The adapter's only post-connect lifecycle listener is `connect` for resubscription; no status callback covers `offline`, `close`, or `reconnect`. The existing tests cover initial connect and reconnect subscriptions, not Settings status during a controlled outage. Do not claim a measured outage duration or actual broker result. |

## Implications for the first fix

1. Define latest-reading semantics by source `capturedAt`, with an explicit equal-timestamp policy. A delayed/retained packet must not overwrite a newer value or revive a disconnected probe. Keep capture time and receipt time separate; test clock skew and device reset before choosing a rule for future timestamps.
2. Derive freshness on receipt as well as on the periodic sweep. Continue to show a useful last known temperature, but label it stale or disconnected with an age on every surface. A fresh update should restore live status; a stale retained replay should not. Test one fresh probe mixed with one stale probe so a section-level indicator does not hide the stale member.
3. Navigate out of `view === 'detail'` for each top-level destination and assert both selected nav and visible body. Decide explicitly whether selecting History from its detail view retains detail or returns to the list.
4. Set explicit foreground colors for populated History and Dashboard recent cards in both themes. Measure the rendered text, not just design tokens.
5. Verify QA-005 with a controlled broker or fake MQTT lifecycle emitter before changing connection handling. Record offline→reconnecting→connected status, subscription counts, stale probe status, and cleanup; retain the runtime caveat until then.

## Remaining limits

This was an independent challenge of the initial audit evidence, not a full adversarial security assessment. No live RFX Gateway, MQTT broker outage, native mobile device, screen reader, production build browser run, or sustained long cook was available. The `.js`/`.ts` alias behavior is a Vite development-server test-harness issue observed during this review; no production module split was demonstrated. The release verdict remains **not ready** under the requested criteria, and remediation has not begun.
