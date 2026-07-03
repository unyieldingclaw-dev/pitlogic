---
authority: stable
review-cycle: 90d
retention: permanent
staleness-threshold: 90
tags: [tech-stack, environment]
last-reviewed: 2026-07-03
compaction_generation: 0
source_type: human
confidence: high
lineage: initial
---

# Technical Context & Stack

**Last Updated**: 2026-05-26

## Development Environment

| Component | Value |
|-----------|-------|
| OS | Windows 11 Home |
| Shell | PowerShell (pwsh) |
| IDE | Cursor |
| Git Remote | https://github.com/unyieldingclaw-dev/pitlogic.git |
| Package Manager | npm |

## Frontend Stack

- **Framework**: React 19.2.5
- **Language**: JavaScript (JSX) — not TypeScript (except `src/lib/` which is TypeScript-only)
- **Build Tool**: Vite
- **Charts**: Recharts 3.8.1
- **Icons**: Lucide-react 1.14.0
- **Screenshot**: html2canvas 1.4.1 (for ShareCard)
- **Validation**: Zod (at provider boundary in `src/lib/telemetry/normalization/`)
- **TypeScript config**: `tsconfig.lib.json` — composite project reference targeting `src/lib/**` only

## Testing

- **Runner**: Vitest 4.x (configured inline in `vite.config.js`)
- **Environment**: jsdom
- **Libraries**: @testing-library/react, @testing-library/user-event
- **Coverage**: V8 provider + lcov reporter

Test files live in `src/utils/__tests__/`, `src/hooks/__tests__/`, and `src/tests/`.

## Infrastructure

- **Hosting**: GitHub Pages (static, no server)
- **CI/CD**: GitHub Actions — `.github/workflows/deploy.yml` auto-deploys on push to `main`
- **Live URL**: https://unyieldingclaw-dev.github.io/pitlogic/
- **Base path**: `/pitlogic/` (configured in vite.config.js)

## Data Storage

| Key | Contents |
|-----|----------|
| `pitlogic-v5` | Cooks array + activeCooks + dis (display state) |
| `pitlogic-recipes-v1` | Recipes array |
| `pitlogic-prefs-v1` | User preferences |
| `pitlogic-migrations-v1` | Migration state (which one-time migrations have run) |

Legacy keys (`rfx-v5`, `rfx-recipes-v1`, `rfx-prefs-v1`) migrated on first app load via `src/lib/migrations/MigrationRunner.ts`.

No server, no IndexedDB, no cookies.

## Key Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.js` | Vite + Vitest config, base path, handles .ts in src/lib/ |
| `tsconfig.lib.json` | TypeScript composite project — src/lib/ only |
| `eslint.config.js` | ESLint rules |
| `public/manifest.json` | PWA manifest (standalone, theme #FF6B35) |
| `public/sw.js` | Service worker (stale-while-revalidate) |
| `.github/workflows/deploy.yml` | GitHub Pages deploy |

## src/lib/ Architecture (Phase 2 milestone)

```
src/lib/
├── migrations/     one-time idempotent localStorage key migrations
├── providers/      TemperatureProvider interface + adapters (csv, thermoworks, mock)
├── telemetry/
│   ├── domain/     TelemetryModels.ts — NormalizedTemperature, ProbeState, ActiveReading
│   ├── eventBus/   EventBus.ts + globalEventBus singleton (providers publish here)
│   ├── normalization/  Zod normalizer — RawProviderEvent → ActiveReading
│   ├── store/      TelemetryStore.ts + globalStore.ts singleton (React reads from here)
│   └── session/    SessionStore.ts
└── compliance/     ADR-001 through ADR-004, providerGuardrails.md
```

`globalStore.ts` is the domain-boundary singleton: `new TelemetryStore(globalEventBus)`. UI hooks import ONLY from here, never from eventBus or providers directly (ADR-001).

## Commands

```powershell
npm run dev          # dev server at http://localhost:5173/pitlogic/
npm test -- --run    # run all tests once (218 passing, 19 files, as of 2026-07-03)
npm run test:watch   # watch mode
npm run test:coverage # coverage report
npm run build        # production build
git push origin main # triggers auto-deploy to GitHub Pages
```
