# RFX Cook Tracker

A personal BBQ cook logging and analytics tool. Track temperature probes, detect stalls, predict finish times, and review cook history — all client-side with no backend.

**Live**: https://unyieldingclaw-dev.github.io/rfx-cook-tracker/

## Features

- **Active cook dashboard** — one card per active cook with ETA, stall probability, and per-probe climb rates
- **Stall intelligence** — approaching/confirmed stall detection with action coaching
- **Analytics** — gradient bar chart, sigma-band average curves, cook quality scatter
- **Temperature charting** — per-probe gradients, hover tooltips
- **Cook history** — detail view, delete with confirm, share card (screenshot export)
- **Recipes** — CRUD + Plan to Eat CSV import
- **Data portability** — JSON backup export + import (merge or replace)
- **Mop timer** — countdown with browser notification at zero
- **PWA** — installable on mobile, offline-capable after first load
- **Accessible** — WCAG 2.1 AA: keyboard nav, aria-*, semantic HTML

## Tech Stack

- React 19 + Vite (JavaScript/JSX)
- Recharts for charts, Lucide icons
- localStorage only — no backend, no accounts
- Vitest + Testing Library for tests
- GitHub Actions → GitHub Pages for CI/CD

## Getting Started

```powershell
npm install
npm run dev          # http://localhost:5173/rfx-cook-tracker/
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
- `rfx-v5` — cooks, active cook state
- `rfx-recipes-v1` — recipes

Use Settings (gear icon) to export a JSON backup or restore from a previous backup.
