---
description: Full project health check — memory bank status, test suite, and production build. Reports a summary with pass/warn/fail for each area.
allowed-tools:
  - Bash(mb doctor)
  - Bash(mb validate)
  - Bash(mb audit)
  - Bash(npm test)
  - Bash(npm run build)
  - Bash(git status)
---

# /health-check

Run the following checks in order and print a labeled result for each. At the end, print a one-paragraph summary with overall status (✅ all clear / ⚠️ warnings / ❌ failures).

## 1. Memory Bank

Run `mb doctor` and capture the output. Note any `[WARN]`, `[CAUTION]`, or `[FAIL]` lines.

**Output header:** `### Memory Bank`

Print the mb doctor output. If any check is not `[OK]`, call that out explicitly.

## 2. Tests

Run `npm test` (this project uses `vitest run` — one-shot, no watch). Report:
- Total tests passing / failing
- Any failing test names and the error

**Output header:** `### Tests`

If tests fail, show the failure details. Note the expected baseline: 98 tests across 7 test files.

## 3. Production Build

Run `npm run build`. This project deploys to GitHub Pages — a broken build means a broken deploy. Report success or any build errors.

**Output header:** `### Build`

## 4. Git Status

Run `git status --short`. Note the current branch, any uncommitted changes, and whether the branch is ahead of `main` (which would trigger an auto-deploy on push).

**Output header:** `### Git Status`

## 5. Summary

Print a short paragraph summarizing all four areas. Use ✅ for clean, ⚠️ for warnings, ❌ for failures. Example:

> ✅ Memory bank healthy (all 9 checks OK). ✅ 98/98 tests passing. ✅ Build clean. ⚠️ 2 uncommitted changes on branch `feat/xyz`.
