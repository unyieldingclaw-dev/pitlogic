# Accessibility audit — WCAG 2.2 AA target

## Scope and method

The local app was inspected in headless Chrome at seven desktop, tablet, and phone-sized viewports, including settled dark and light History states. A browser DOM check inspected accessible names in the New Recipe form. Computed colors and theme tokens were compared using WCAG contrast math. Screenshots and raw browser results are in [evidence](evidence/browser-results.json) and the [visual audit](VISUAL_AUDIT.md).

This is a targeted audit, not a WCAG conformance claim. axe-core and Lighthouse were not installed in the environment. A screen reader, full keyboard-only traversal, zoom/reflow, actual touch target use, and native iPhone Safari/Android Chrome were not tested. A passing automated scan would not establish usability by itself.

## Confirmed findings

| ID | Severity | Result | WCAG relationship |
| --- | --- | --- | --- |
| [QA-004](ISSUES.md#qa-004--dark-theme-history-card-title-is-unreadable) | P1 | In dark History **and Dashboard recent cards**, cook names compute to black on `rgb(20,20,16)`, about **1.14:1**. The [settled History screenshot](evidence/history-dark-390x844.png) confirms that name is hard to see; [computed-color evidence](evidence/adversarial-results.json) covers both cards. | Fails [1.4.3 Contrast (Minimum)](https://www.w3.org/TR/WCAG22/#contrast-minimum) for normal text. |
| [QA-006](ISSUES.md#qa-006--recipe-ingredient-fields-have-no-accessible-names) | P2 | New Recipe's amount, unit, and ingredient inputs have no associated labels or accessible names. Their placeholders alone convey purpose. | [3.3.2 Labels or Instructions](https://www.w3.org/TR/WCAG22/#labels-or-instructions) and [4.1.2 Name, Role, Value](https://www.w3.org/TR/WCAG22/#name-role-value) need remediation and assistive-technology verification. |
| [QA-007](ISSUES.md#qa-007--muted-normal-size-text-misses-contrast-target) | P2 | `--text3` on representative solid surfaces measures **3.44:1** dark, **3.47:1** light on white, and **3.15:1** light on the off-white surface. It is used for normal-size labels and help text. | Below the **4.5:1** normal-text target in [1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum). Individual rendered contexts still need review. |
| [QA-012](ISSUES.md#qa-012--recipe-card-nests-a-button-inside-another-button) | P2 | A saved Recipe card places Delete recipe inside its `aria-expanded` button. React emitted an invalid nested-button warning. | Independent keyboard/focus semantics need verification; an exact WCAG outcome was not established. |

The stale or disconnected Dashboard indicator in [QA-001](ISSUES.md#qa-001--stale-temperature-presented-as-live) also lacks a visible text status or age while its header remains green. Settings labels stale values but drops that text when a probe is disconnected. This is a critical understanding problem for all users and warrants a separate status announcement and color-independent check. The browser audit did not establish its exact screen-reader announcement behavior.

## What was observed, without a pass claim

- The seven checked viewport sizes had no document-level horizontal overflow across the 56 captured page/state combinations. This does not prove 200%/400% zoom reflow or absence of internal clipped controls.
- The Settings probe list exposes the word “stale,” showing a text alternative for this state exists on one surface. The Dashboard does not present that text.
- The active-cook chart has an empty state and a code path for a single reading. Chart point names, tooltip keyboard operation, and a nonvisual temperature history were not tested.
- A recipe row can be added or removed in the UI code, but the audit did not run keyboard or screen-reader interaction through those changes.

## Verification required before release

1. Fix QA-004, QA-006, QA-007, and QA-012, then assert accessible names, independent Recipe controls, and computed contrast in populated dark and light states. Include Dashboard recent-cook cards, since they use a similar unset text-color pattern.
2. Run axe-core on the empty, setup, active, completed detail, History, Recipes New, Settings, and stale/reconnecting states; resolve critical and serious results with manual confirmation.
3. Traverse all workflows with keyboard only: focus order/visibility, menus and dialogs, recipe rows, cook logging, settings, chart controls, and escape/close behavior.
4. Use at least one screen reader to verify reading labels, errors, live status changes, alerts, chart summaries, and modal focus. Check status announcements without excessive repetition during telemetry updates.
5. Check 200%/400% zoom, reduced motion, mobile touch targets, landscape, virtual keyboard, and outdoor readability on actual devices. Document browser/device versions and screenshots.

The release criterion is no unresolved critical WCAG 2.2 AA failure in critical cooking workflows; this audit found a confirmed text contrast failure and left several manual criteria untested.
