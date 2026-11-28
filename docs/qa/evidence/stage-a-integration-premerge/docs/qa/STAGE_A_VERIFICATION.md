# Stage A usability verification

Date: 2026-11-01 (America/Chicago). Branch: `codex/usability-stage-a`; prerequisite: reviewed QA-004 `21eef18`. Implementation commits: `2b2925d` (A1), `ffe44e9` (A2), followed by the A3 verification/recovery commit containing this report. Primary checkout remains separate at `2e53431`.

## Delivered scope

Home/Cook/History/More now share labels across mobile and desktop. Manual setup puts essential fields and Start Cook before optional details. Devices is a distinct destination that preserves a pending cook draft. Save and connect submits the edited connection values; Bluetooth success offers an explicit connection continuation. Connected and fresh readings are separate states. Connected settings collapse so readings remain visible; errors reopen editable fields. Advanced gateway configuration, clipboard and CSV tools remain available.

Cook storage and version-1 backups retain their existing schema. Device/replay readings explicitly say they are not saved into a cook. Automatic RFX recording, migration, source parity and the proposed Stage B repository are not implemented or approved here.

## Verification

| Check | Result |
| --- | --- |
| Full Vitest, one fork worker | 357/357 tests, 32 files passed |
| Production build | Passed; existing large-chunk warning, JS 1,427.17 kB / gzip 397.15 kB |
| Changed JS/JSX lint | One pre-existing BLE test `global` no-undef error at line 30; one pre-existing provider ref-cleanup warning at line 163; no new diagnostic |
| Library TypeScript | Eight known diagnostics: four CsvProvider, four ThermoWorksAdapter; no TypeScript product source changed |
| Diff whitespace check | Passed |
| Production-preview Playwright | Four cases passed: 390x844 and 1440x900, dark/light; zero page errors |
| Independent branch review | Verified findings fixed; final follow-ups found no concrete regression |

The deterministic loopback WebSocket/MQTT fixture exercises edited config, connected-but-waiting, 182 F readings, outage/reconnection and 190 F recovery. Each browser case also exercises draft return, manual start/log/end, two concurrent cooks, History, Stats/Guides/Recipes access, backup export and actual restore into a fresh context, Settings Tab/Shift+Tab/Escape, and reload. Assertions check existing cook/sample fields, not merely visible success text. All credentials and readings are synthetic; no production broker or hardware is contacted.

Settled screenshots were inspected in both themes and sizes. Mobile Start Cook is at y=629.6 instead of the earlier walkthrough's roughly y=1284. Initial wrong turns found during the expert walkthrough were persistent deep scroll after navigation, no direct Add Cook action with one active cook, and connected configuration pushing readings below the first screen. These were corrected and rerun. This is an expert walkthrough, not evidence from novice users or a complete accessibility certification.

Independent review found a focus-trap bug with fieldset-disabled controls and a stale Saved indicator after rejected persistence. Both received observed failing regressions before correction. Review also caught an export-only backup claim; the browser script now performs a real fresh-context restore and compares cook/active IDs. Security review of the scoped diff found no added secrets, unsafe HTML/eval, injection path or hardware publish from normal cook setup. Connection failures use generic messages; existing clipboard credential disclosure is retained.

## Reproduce

Run `npm test -- --pool=forks --maxWorkers=1`, `npm run build`, and preview on loopback port 5180. Run `node scripts/qa/usability-flow.mjs` with Playwright available. `PLAYWRIGHT_MODULE` may point to the installed Codex runtime's Playwright module; `CHROME_PATH`, `QA_BASE` and `QA_OUTPUT_DIR` override the local defaults. The script uses existing transitive `ws` and `mqtt-packet` modules and adds no dependency. Default evidence output is `.qa-temp/usability-evidence`.

Final results and 16 screenshots are preserved in the primary checkout at `docs/qa/evidence/stage-a/`. The primary audit notes remain separate from the implementation commits. Local preview is stopped at handoff.

## Remaining gates

Local integration is a separate decision. No push, merge or deployment occurred. Native iPhone Safari, physical RFX/BLE, screen-reader/critical WCAG coverage, novice-user evaluation and sustained cook performance remain unverified. Existing audit findings outside these flows remain open. Stage A is not a release-ready verdict or completion of equal manual/RFX recording support.
