---
authority: accumulating
review-cycle: 365d
retention: permanent
staleness-threshold: 365
tags: [progress, completed, archive]
last-reviewed: 2026-05-27
compaction_generation: 0
source_type: human
confidence: high
lineage: split-from-progress
---

# Completed Features Archive

Archived from `progress.md` on 2026-05-27 to reduce file size. All items below are fully shipped to production.

## Core Cook Tracking
- [x] Cook logging (meat, cut, pellets, probe names, start time)
- [x] Multi-probe temperature entry (manual + Plan to Eat CSV import)
- [x] Active cook dashboard (one card per active cook, navigates correctly)
- [x] Cook detail view with inline delete confirm (Yes/No)
- [x] Cook history list

## Stall Intelligence & Analytics
- [x] `computeClimbRate`, `computeETA`, `computeStallProbability`, `buildAverageCurve` — analytics functions
- [x] `LiveIntelligencePanel` — per-probe climb rate, ETA, stall probability dots
- [x] `StallCoach` — approaching/confirmed stall cards with action buttons
- [x] `AnalyticsTab` — gradient bar chart, sigma-band average curve, cook quality scatter
- [x] `TempChart` — EmberTooltip + per-probe gradients
- [x] Compare mode in Analytics tab (`CompareChart` component, checklist selection)
- [x] `CompareChart` fullscreen mode

## Recipes
- [x] Recipe CRUD
- [x] Plan to Eat CSV import (parser + hook integration)

## Data Portability
- [x] JSON backup export + import (merge mode + replace mode)
- [x] `SettingsSheet` gear icon modal — download + restore UI

## PWA & Deployment
- [x] PWA manifest (standalone, theme #FF6B35, flame icon)
- [x] Service worker (stale-while-revalidate)
- [x] GitHub Actions auto-deploy to GitHub Pages on push to main
- [x] Live at https://unyieldingclaw-dev.github.io/pitlogic/

## Accessibility
- [x] All clickable divs → `<button>`, aria-current/expanded/label/pressed, role=alert/status
- [x] htmlFor/id label associations, :focus-visible, Space key on checklist rows

## Utilities
- [x] Mop timer with browser Notification API
- [x] Share card (html2canvas screenshot export)
- [x] Probe target alerts — `useProbeAlert`
- [x] Smoker low temp alarm — `useSmokerAlert` (browser notification + Web Audio beep)
- [x] Mid-cook threshold edit + on/off toggle in active view

## Visual Design — "Smoke & Fire" (2026-05-10)
- [x] CSS Foundation: 4 tokens, 4 keyframes, 6 utility classes with `prefers-reduced-motion` guard
- [x] Navigation, Dashboard, Active Cook View, Live Intelligence Panel, TempChart gradient treatment
- [x] History Tab: card-interactive hover glow, gradient peak temp, live-pulse dot
- [x] Analytics Tab: gradient stat values, amber avg curve, scatter drop-shadow, fade-in on mode switch

## Cuts & Cook Preferences (2026-05-10)
- [x] Expanded MEATS: 21 total cuts across 5 categories including Lamb
- [x] `usePrefs` hook — per-cut pit/pull overrides in `pitlogic-prefs-v1`
- [x] ActiveTab inline "Save as default" amber badge
- [x] SettingsSheet "My Defaults" section with per-cut reset

## Misc
- [x] MIT license (repo root `LICENSE`)

## PitLogic Rebrand + SDK Compliance + Telemetry Architecture (2026-05-19)
- [x] Phase 0: Design spec (`docs/superpowers/specs/2026-05-18-pitlogic-sdk-compliance-rebrand-design.md`)
- [x] Phase 1: `src/lib/compliance/` — ADR-001 through ADR-004, providerGuardrails.md + CLAUDE.md compliance section
- [x] Phase 2: Zod + TypeScript (tsconfig.lib.json, vite.config.js)
- [x] Phase 3: Migration system (rfx-* → pitlogic-* key rename) + 6 tests + wire into main.jsx
- [x] Phase 4: Full rebrand (package.json, manifest, sw.js, App.jsx, hooks, components, data)
- [x] Phases 5–9: src/lib/ domain types, normalizer (Zod), EventBus, TelemetryStore, SessionStore, providers
- [x] Phase 10: CsvProvider adapter + ProviderRegistry wired at startup
- [x] Phase 11: Tests — normalize (6), MockProvider (5), TelemetryStore (7)
- [x] Phase 12: memory-bank/ + auto-memory final cleanup

## Claude Code Infrastructure (2026-05-20 → 2026-05-26)
- [x] `.claude/settings.json` — Haiku env, permission denies, hook registrations
- [x] Hooks: `block-dangerous-ops.sh` (15 patterns), `user-prompt-submit.sh`, `pre-edit-karpathy.sh`, `update-reviewed.sh`
- [x] Agents: test-strategist, maintainability-reviewer, security-reviewer, researcher (all haiku/effort:low)
- [x] Commands: `code-review.md` (8-phase), `test-audit.md`, `comment-pass.md`, `memory-prune.md`, `handoff.md`, `health-check.md`
- [x] CI: test step + file size gate (400 warn / 650 fail, grandfathered, fetch-depth:2)
- [x] 4 Cursor rules: architecture, code-quality, accessibility, memory-bank
- [x] `standards/` directory (8 files): ACCESSIBILITY, AGENTIC-SAFETY, CODE-QUALITY, LOGGING, MCP-SECURITY, SECURITY-GUARDRAILS, WORKFLOW + HOOKS-GUIDE.md
