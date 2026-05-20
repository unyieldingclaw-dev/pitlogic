# /test-audit

Whole-codebase test gap analysis. Not diff-scoped — scans all `src/` files. Use periodically or before a major feature.

## Steps

1. Glob all `src/**/*.{js,jsx}` files, excluding `__tests__/` directories and `*.test.js` files
2. Glob all test files: `src/**/__tests__/*.{js,jsx}` and `src/**/*.test.{js,jsx}`
3. For each source file, check if a corresponding test exists (same base name, different path)
4. Build a coverage map: tested, untested, and partially covered

## Report

**Section 1 — Coverage map**
List all source files with status: tested / untested / partial.

**Section 2 — Highest-priority gaps** (ranked: JSX components first, hooks second, utils third)
Specific test cases that would provide the most value.

**Section 3 — Uncovered surface area**
Percentage of source files with no test. Flag specifically:
- Any JSX component file with no corresponding test file
- Any hook file (`use*.js`) with no test file

## After the report

Ask: "Write any of the missing tests? (list numbers, 'hooks', 'components', or 'all')"

Match existing test style: Vitest globals, jsdom environment, no mocks of localStorage. Read `src/utils/__tests__/` for style reference before writing.
