# Execution ledger — plan: docs/superpowers/plans/2026-10-31-intuitive-cook-flow-v2.md

Approved scope: Stage A only, user 2026-11-01. Base: 21eef18; branch codex/usability-stage-a. Stage B/storage migration is unapproved.

Pre-flight: A1 navigation/form must supply A2 Devices entry and preserve pending form. A2 connection submission must pass edited values to provider without touching cook state. A3 verifies both without new cook fields.

Ruling: use a committed Windows-native ledger rather than Bash workspace scripts — preserve resumable evidence with available PowerShell tools.
Ruling: NewCookSetup retains prefs/setCutPref/onGoGuide presentation props — existing defaults and guide-to-start behavior must survive extraction.

- A1: in progress; red navigation/form regression pending.
- A2: pending.
- A3: pending.

A1: complete — 8 focused tests green; lint and production build passed. Existing Devices/settings route remains functional until A2 replaces its presentation. No new cook fields/storage writes. Ruling: retain a native details section for all optional controls rather than multiple competing form steps.

A2: complete — 353/353 full-suite tests passed; production build passed; changed-product lint has zero errors and the pre-existing provider cleanup warning. Save/connect tests were red before implementation. Configuration normalization and dialog focus had observed red-to-green regressions. Device controls moved from Settings into Devices with advanced disclosures, live-source verification and explicit no-cook-recording copy.
Ruling: add reusable dialog focus/Escape/return behavior and field associations for the touched flows — necessary for planned keyboard/error recovery. No persistence shape change. Connection errors are generic to avoid leaking credentials; advanced config capabilities remain accessible.
