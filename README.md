# PitLogic

An independent BBQ cook logging and analytics platform. Track temperature probes, detect stalls, predict finish times, and review cook history — all client-side with no backend.

**Live**: https://unyieldingclaw-dev.github.io/pitlogic/

## Features

- **Active cook dashboard** — one card per active cook with ETA, stall probability, and per-probe climb rates
- **Stall intelligence** — approaching/confirmed stall detection with action coaching
- **Analytics** — gradient bar chart, sigma-band average curves, cook quality scatter, cook comparison charts
- **Temperature charting** — per-probe gradients, hover tooltips
- **Cook history** — detail view, delete with confirm, share card (screenshot export)
- **Recipes** — CRUD + Plan to Eat CSV import
- **Data portability** — JSON backup export + import (merge or replace)
- **Mop timer** — countdown with browser notification at zero
- **PWA** — installable on mobile, offline-capable after first load
- **Accessible** — WCAG 2.1 AA: keyboard nav, aria-*, semantic HTML

## Tech Stack

- React 19 + Vite (JavaScript/JSX); TypeScript in `src/lib/` only
- Recharts for charts, Lucide icons, Zod for provider-boundary validation
- localStorage only — no backend, no accounts
- Vitest + Testing Library for tests (96 passing)
- GitHub Actions → GitHub Pages for CI/CD

## Getting Started

```powershell
npm install
npm run dev          # http://localhost:5173/pitlogic/
```

## Testing

```powershell
npm test -- --run    # run all tests once
npm run test:watch   # watch mode
npm run test:coverage
```

## Deployment

Push to `main` — GitHub Actions deploys automatically to GitHub Pages.

```powershell
npm run build        # verify build is clean locally
git push origin main # triggers deploy
```

## Data Storage

All data is in localStorage:
- `pitlogic-v5` — cooks, active cook state
- `pitlogic-recipes-v1` — recipes
- `pitlogic-prefs-v1` — per-cut cook preferences
- `pitlogic-migrations-v1` — migration state

Use Settings (gear icon) to export a JSON backup or restore from a previous backup.
