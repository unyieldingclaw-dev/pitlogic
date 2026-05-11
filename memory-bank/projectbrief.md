# Project Brief

**Last Updated**: 2026-05-10

## Core Purpose

RFX Cook Tracker is a personal BBQ cook logging and analytics tool. It lets a single user record temperature probe data, track active cooks with stall detection and ETA predictions, store cook history, and manage recipes — all as a client-side PWA with no backend.

## Non-Negotiable Constraints

### Business Requirements
- Single-user personal tool — no auth, no multi-tenant
- All data stays local (localStorage) — no external sync
- Works offline after first load (PWA/service worker)

### Technical Constraints
- No backend server — pure static SPA deployed to GitHub Pages
- No external API calls in the critical path
- All state persists in localStorage (keys: `rfx-v5` for cooks, `rfx-recipes-v1` for recipes)
- Windows 11 / PowerShell development environment

### User Experience
- Mobile-responsive — used on phone next to the smoker
- Accessible: WCAG 2.1 AA (keyboard nav, screen reader, aria-*)
- PWA installable on mobile (manifest + service worker)

## Key Goals

### Phase 1 (Complete)
- [x] Cook logging with multi-probe temperature tracking (CSV import from Plan to Eat)
- [x] Active cook dashboard with stall detection (LiveIntelligencePanel, StallCoach)
- [x] Analytics: climb rate, ETA, stall probability, average curves, cook quality scatter
- [x] Cook history with detail view, delete, and share card (html2canvas)
- [x] Recipe management (CRUD + Plan to Eat CSV import)
- [x] Data portability: JSON backup export + import (merge or replace)
- [x] PWA: installable, offline-capable, deployed to GitHub Pages
- [x] Accessibility sprint: semantic HTML, aria-*, focus-visible styles
- [x] Mop timer with browser notifications

### Phase 2 (Parking Lot)
- [ ] ThermoWorks real-time integration (MCP or CLI bridge to live sensor data)
- [ ] Probe target alerts (browser notification when probe hits target temp)
- [ ] Cook comparison charts (overlay temp curves from multiple cooks of same cut)

## Out of Scope

- Server-side storage or sync
- Multi-user or sharing between devices
- Authentication or accounts
- Native mobile app
