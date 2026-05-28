# PitLogic

An independent BBQ cook logging and analytics platform. Track temperature probes, get low-temp alarms, detect stalls, predict finish times, and review cook history — all client-side with no backend.

**Live**: https://unyieldingclaw-dev.github.io/pitlogic/

## Features

- **Active cook dashboard** — one card per active cook with ETA, stall probability, and per-probe climb rates
- **Temperature alarms** — browser notification + audio beep when a meat probe hits its target; configurable low-temp alarm for the ambient/smoker probe (editable mid-cook, re-fires on repeated drops)
- **Stall intelligence** — approaching/confirmed stall detection with action coaching
- **Analytics** — gradient bar chart, sigma-band average curves, cook quality scatter, cook comparison charts
- **Temperature charting** — per-probe gradients, hover tooltips
- **Cook history** — detail view, delete with confirm, share card (screenshot export)
- **Recipes** — CRUD + Plan to Eat CSV import
- **Data portability** — JSON backup export + import (merge or replace)
- **Live device integration** — ThermoWorks RFX Gateway via ThermaConnect MQTT over WebSocket; auto-discovers all probes; no backend required
- **Mop timer** — countdown with browser notification at zero
- **PWA** — installable on mobile, offline-capable after first load
- **Accessible** — WCAG 2.1 AA: keyboard nav, aria-*, semantic HTML

## Tech Stack

- React 19 + Vite (JavaScript/JSX); TypeScript in `src/lib/` only
- Recharts for charts, Lucide icons, Zod for provider-boundary validation
- localStorage only — no backend, no accounts
- Vitest + Testing Library (146 passing)
- GitHub Actions → GitHub Pages for CI/CD

## Getting Started

```bash
npm install
npm run dev          # http://localhost:5173/pitlogic/
```

## Testing

```bash
npm test -- --run       # run all tests once
npm run test:watch      # watch mode
npm run test:coverage   # coverage report
```

## Deployment

Push to `main` — GitHub Actions deploys automatically to GitHub Pages.

```bash
npm run build        # verify build is clean locally
git push origin main # triggers deploy
```

## Data Storage

All data stays in localStorage — nothing leaves your device:

| Key | Contents |
|-----|----------|
| `pitlogic-v5` | Cooks, active cook state |
| `pitlogic-recipes-v1` | Recipes |
| `pitlogic-prefs-v1` | Per-cut cook preferences |
| `pitlogic-migrations-v1` | Migration state |
| `pitlogic-mqtt-v1` | MQTT broker URL + credentials (ThermoWorks live integration) |

Use the Settings gear to export a JSON backup or restore from a previous backup.
