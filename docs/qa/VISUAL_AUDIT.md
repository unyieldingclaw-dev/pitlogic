# Visual and responsive audit

## Method and evidence

Installed Chrome in headless mode rendered the local branch at **1920×1080, 1440×900, 1024×768, 768×1024, 430×932, 390×844, and 375×667**. The browser script captured empty Dashboard, New Cook setup, active cook, Settings with a synthetic stale probe, History, Analytics, Guides, and Recipes at every size: 56 viewport/state captures. It also captured completed-cook detail, stale Dashboard, and a 12-hour *data-volume* chart example. [Browser results](evidence/browser-results.json) recorded **0 px document-level horizontal overflow** in each of the 56 checked states. This does not rule out overflow within an internal scroller or below-the-fold defects. Representative actual screenshots were inspected; no judgment here is based only on CSS.

| State | Screenshot examples | Observation |
| --- | --- | --- |
| Empty Dashboard | [1920](evidence/empty-1920x1080.png), [390](evidence/empty-390x844.png) | Start action is prominent; large desktop empty area is an optional design consideration, not a defect. |
| New Cook | [1024](evidence/setup-1024x768.png), [375](evidence/setup-375x667.png) | Fields and guide content remain within viewport; long form requires scrolling. |
| Active Cook | [768](evidence/active-768x1024.png), [375](evidence/active-375x667.png) | Probe/ambient values and chart remain legible; no reading yet state is explicit. |
| History | [dark settled 390](evidence/history-dark-390x844.png), [light settled 390](evidence/history-light-390x844.png) | Dark card title is effectively invisible; light title is readable. |
| Analytics | [375](evidence/analytics-375x667.png), [1440](evidence/analytics-1440x900.png) | Summary cards rearrange for phone. Chart details/interaction were not fully verified. |
| Guides | [375](evidence/guides-375x667.png), [1024](evidence/guides-1024x768.png) | Narrow two-column guide remains in bounds, though dense text needs scrolling. |
| Recipes | [375](evidence/recipes-375x667.png), [1440](evidence/recipes-1440x900.png) | Empty state and category row render; recipe form accessibility issue is separate. |
| Settings | [390](evidence/settings-live-390x844.png), [1440](evidence/settings-live-1440x900.png) | Sheet fits mobile width and scrolls; a stale probe is labeled only here, not Dashboard. |
| Stale live card | [1440](evidence/stale-live-1440x900.png) | Green dot and “Live Readings” header persist after the probe is stale. |
| Long-data chart | [390](evidence/chart-12h-synthetic-390x844.png) | Chart renders on phone for 721 synthetic readings per series; touch/tooltip not assessed. |

All seven requested sizes for a state are stored as `evidence/<state>-<width>x<height>.png`. Screenshots are viewport captures, not whole-page proof of below-the-fold content. The light/dark history pair was captured after the fade animation settled; early in-transition captures were not used to grade contrast.

## Objective visual defects

1. **QA-004 (P1): dark History and Dashboard recent-card text.** Both populated card names compute to `rgb(0,0,0)` on `rgb(20,20,16)` in dark mode, about 1.14:1. The History screenshot visibly obscures the name. Their `<button>` backgrounds have no matching foreground color. See [adversarial computed-color evidence](evidence/adversarial-results.json).
2. **QA-001 (P1): misleading live status.** The live card’s green dot is unconditional while an old or disconnected reading remains visible. Color alone is insufficient, and the label does not report stale age. Settings uses explicit “(stale)” text but drops the suffix for a disconnected probe, leaving both surfaces ambiguous.
3. **QA-007 (P2): muted text contrast.** `--text3` is used for many 9–13 px labels. Its contrast is about 3.44:1 on dark `--surface` and 3.47:1 on white in light mode, below the 4.5:1 normal-text target. Translucent/gradient backgrounds need further measurement.

## Usability observations, separated from defects

- Critical manual temperatures are large and near the top of the active-cook view. On the 375×667 phone, the chart and logging form are below the fold; the current probe and ambient values remain in the first screen.
- The desktop main column intentionally caps at 800 px, leaving substantial open space on a 1920 px display. This is a layout preference, not a verified failure.
- The decorative flame is visible through empty/guide space. Outdoor bright-light readability, glove/one-hand use, and actual touch target comfort need real-device review.
- Dark/light theme switching worked in the browser. Only the settled History card was visually compared in both themes; broader light-theme states were captured only through the script’s theme toggle result, not a complete visual pass.

## Remaining visual checks

Verify chart tooltip/legend and axis readability with multiple probes, outliers, and long gaps; internal horizontal scrolling in guide/category rows; 200%/400% zoom; landscape orientation; virtual keyboard overlap; iPhone Safari and Android Chrome; actual bright-sunlight use. Playwright viewport sizes do not emulate mobile browser chrome, safe areas, or real touch behavior.
