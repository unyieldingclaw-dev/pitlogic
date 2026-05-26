---
authority: stable
review-cycle: 90d
retention: permanent
staleness-threshold: 90
tags: [tech-stack, environment]
last-reviewed: 2026-05-26
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
| Git Remote | https://github.com/unyieldingclaw-dev/rfx-cook-tracker |
| Package Manager | npm |

## Frontend Stack

- **Framework**: React 19.2.5
- **Language**: JavaScript (JSX) — not TypeScript
- **Build Tool**: Vite
- **Charts**: Recharts 3.8.1
- **Icons**: Lucide-react 1.14.0
- **Screenshot**: html2canvas 1.4.1 (for ShareCard)

## Testing

- **Runner**: Vitest 4.x (configured inline in `vite.config.js`)
- **Environment**: jsdom
- **Libraries**: @testing-library/react, @testing-library/user-event
- **Coverage**: V8 provider + lcov reporter

Test files live in `src/utils/__tests__/`, `src/hooks/__tests__/`, and `src/tests/`.

## Infrastructure

- **Hosting**: GitHub Pages (static, no server)
- **CI/CD**: GitHub Actions — `.github/workflows/deploy.yml` auto-deploys on push to `main`
- **Live URL**: https://unyieldingclaw-dev.github.io/rfx-cook-tracker/
- **Base path**: `/rfx-cook-tracker/` (configured in vite.config.js)

## Data Storage

| Key | Contents |
|-----|----------|
| `rfx-v5` | Cooks array + activeCooks + dis (display state) |
| `rfx-recipes-v1` | Recipes array |
| `rfx-prefs-v1` | Per-cut pit/pull temp preferences |

No server, no IndexedDB, no cookies.

## Key Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.js` | Vite + Vitest config, base path |
| `eslint.config.js` | ESLint rules |
| `public/manifest.json` | PWA manifest (standalone, theme #FF6B35) |
| `public/sw.js` | Service worker (stale-while-revalidate) |
| `.github/workflows/deploy.yml` | GitHub Pages deploy |

## Commands

```powershell
npm run dev          # dev server at http://localhost:5173/rfx-cook-tracker/
npm test -- --run    # run all tests once (98 passing as of 2026-05-26)
npm run test:watch   # watch mode
npm run test:coverage # coverage report
npm run build        # production build
git push origin main # triggers auto-deploy to GitHub Pages
```
