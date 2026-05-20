# Testing Agent Flow & Claude Code Infrastructure Design

**Date:** 2026-05-20
**Branch:** `chore/update-memory-bank-2026-05-14`
**Status:** Approved — implementation in progress

---

## Problem

rfx-cook-tracker has 169 passing tests but zero component tests and partial hook coverage. The existing `/code-review` command runs 3 subagents but has no test strategy phase, no maintainability review, and no scope enforcement. Claude Code infrastructure (hooks, settings, Cursor rules) is partially configured with some incorrect documentation.

---

## Solution: Three-Layer Governance

Each layer enforces only what it can actually enforce. This prevents the common failure mode of pretending one mechanism can do everything.

| Layer | Mechanism | Enforces | Cannot Enforce |
|---|---|---|---|
| Hook | bash scripts (PreToolUse, UserPromptSubmit) | Path scope, dangerous op patterns | Semantic concepts, architectural intent |
| Opponent-Auditor | main-agent synthesis in `/code-review` phase 8 | Architecture drift, test compliance | Deterministic policy |
| CI | Node.js scripts in `deploy.yml` | File size, test pass/fail | Nuanced design reasoning |

---

## Testing Agents

### `test-strategist` (subagent)
- Scoped to git diff by default; standalone via `/test-audit`
- Outputs HIGH/MEDIUM/LOW prioritized test gaps with `file:path — specific test description`
- Offers to write selected tests after the report
- Runs on Haiku with `effort: low` — reads diffs, no deep reasoning needed

### `maintainability-reviewer` (subagent)
- Reports dead code, abstraction problems, comment quality issues
- Never modifies — report only
- Runs on Haiku with `effort: low`

### `/code-review` upgrade: 5 phases → 8 phases

| Phase | What |
|---|---|
| 1 | Scope — determine diff or target files |
| 2 | Context + Contract Generation — infer scope from diff/branch/commits, propose `active-task.json`, user approves |
| 3–7 | Five parallel subagents: security, performance, style, test-strategist, maintainability |
| 8 | Opponent-Auditor — synthesizes all findings, removes false positives, must explicitly reference all 5 subagent reports |

Phase gate: each phase must output its labeled section header before the next phase begins. No phase may be omitted.

---

## Task Contracts

Machine-checkable scope boundaries for a task.

**V1 Schema** (`.claude/contracts/active-task.json`):
```json
{
  "task": "Short description of what is being done",
  "allowed_paths": ["src/components/CompareChart.jsx", "src/utils/analytics.js"],
  "max_files_changed": 3,
  "allow_new_files": false,
  "allow_architecture_changes": false,
  "require_tests": true
}
```

Escalation semantics (`escalation_required_for`, cross-directory classification) deferred to v2 — hooks cannot enforce semantic concepts reliably.

**Lifecycle:**
1. `/code-review` infers scope from diff + branch + commits, proposes contract conversationally
2. User approves or adjusts in natural language
3. Claude writes `active-task.json`
4. `pre-edit-karpathy.sh` hook warns (not blocks) if edit is outside `allowed_paths`
5. Opponent-Auditor checks semantic fields (`allow_architecture_changes`, `require_tests`)
6. `/handoff` archives and deletes the contract

**Enforcement split:**

| Field | Enforced By |
|---|---|
| `allowed_paths` | `pre-edit-karpathy.sh` hook (path matching) |
| `max_files_changed` | CI or opponent-auditor (count diff files) |
| `allow_new_files` | Opponent-Auditor (semantic) |
| `allow_architecture_changes` | Opponent-Auditor (semantic) |
| `require_tests` | Opponent-Auditor (semantic) |

---

## CI File Size Gate

Thresholds derived from measured codebase distribution (not arbitrary):
- **Warning:** 400 lines — current 90th percentile is ~255 lines, so warning is meaningful pressure without constant exemptions
- **Fail:** 650 lines — current max is 549 (App.jsx) + ~20% buffer
- **Grandfathered:** existing files over 650 lines warn only; new or modified files over 650 fail

Exclusions: `src/dev/`, `__tests__/` directories, `*.test.js` files.

Requires `fetch-depth: 2` on the checkout action so `HEAD~1` exists for the git diff that identifies modified files.

---

## Token Budget Configuration

- `CLAUDE_CODE_SUBAGENT_MODEL: "haiku"` in `.claude/settings.json` env block — applies to all subagents
- `model: haiku` + `effort: low` frontmatter on all review subagent files — belt + suspenders
- `effort: medium` for `researcher.md` — cross-file synthesis warrants slightly deeper reasoning
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "50"` — already active globally in user settings

---

## Cursor Rules

All four rule files use testable, machine-checkable language. A rule must be verifiable by reading code or running a script — vague aspirations are rewritten until they can be.

- `architecture.mdc` — import bans, localStorage firewall, purity constraint on utils, button-not-div, 500-line cap
- `code-quality.mdc` — scope discipline (touch only required files), abstraction threshold (2+ callers before extracting), WHY-only comments, no TODO without issue number
- `accessibility.mdc` — aria-label on icon buttons, aria-pressed on toggles, Enter+Space on checkbox roles, no skipped heading levels
- `memory-bank.mdc` — read all mb files at session start, re-read after compaction, never contradict `projectbrief.md`, always follow `systemPatterns.md`
