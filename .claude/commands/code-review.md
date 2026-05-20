---
description: Deep code review covering security, performance, style, test coverage, and maintainability. Spawns 5 independent subagents in parallel. Generates a task contract in Phase 2. Phases must run in order — no phase may be omitted.
allowed-tools:
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(git status *)
  - Bash(grep -r *)
  - Bash(find * -type f *)
  - Read
  - Write
---

# Deep Code Review

You are a senior engineer running an 8-phase code review. Follow every phase in order. Each phase must output its labeled section header before the next phase begins. No phase may be omitted.

## Phase 1 — Determine Scope

If the user specified a file or folder path, review that target. Otherwise run `git diff HEAD` and `git status`.

If the diff is empty, let the user know and stop.

**Output header:** `## Phase 1 — Scope`

## Phase 2 — Context + Task Contract

Run `git log --oneline -10`. For each changed file run `git log --oneline -5 -- <filename>`.

Then infer the task scope from the diff, branch name, recent commits, and the user's request. Propose a contract in conversational output — for example:

> "Based on the diff, I'd scope this task to: `src/components/CompareChart.jsx, src/utils/analytics.js`. Proposed contract: allow_new_files: no, require_tests: yes, max_files_changed: 3. Confirm or tell me what to adjust."

Wait for user approval or adjustment. Once approved, write `.claude/contracts/active-task.json` with this structure:

    {
      "task": "...",
      "allowed_paths": ["src/..."],
      "max_files_changed": 3,
      "allow_new_files": false,
      "allow_architecture_changes": false,
      "require_tests": true
    }

**Output header:** `## Phase 2 — Context + Contract`

## Phase 3–7 — Independent Subagent Review

Spawn five subagents in parallel. Each subagent sees only the diff and its own lens — no cross-subagent context. All run on Haiku (`model: haiku` in frontmatter + `CLAUDE_CODE_SUBAGENT_MODEL=haiku` env).

**Subagent A — Security**
Use the `security-reviewer` agent. Check for: secrets, injection risks, auth/authz gaps, weak crypto, data exposure, supply chain issues, AI/LLM injection. Rate each: [CRITICAL], [HIGH], [MEDIUM], [LOW].

**Subagent B — Performance**
Check for: N+1 patterns, unbounded loops, large in-memory payloads, blocking I/O, redundant computation, missing pagination. Rate each: [HIGH], [MEDIUM], [LOW].

**Subagent C — Style & Standards**
Check for: functions over 50 lines, deep nesting, ambiguous names, missing WHY comments on non-obvious logic, dead code, debug statements, magic numbers, copy-paste duplication. Rate each: [MEDIUM], [LOW].

**Subagent D — Test Coverage**
Use the `test-strategist` agent. Scope to the diff. Output a prioritized missing-test list (HIGH/MEDIUM/LOW).

**Subagent E — Maintainability**
Use the `maintainability-reviewer` agent. Scope to the diff. Output dead code, abstraction, and comment-quality findings.

**Output header:** `## Phase 3–7 — Subagent Findings`

## Phase 8 — Opponent-Auditor

The main agent (not a subagent) synthesizes all five reports. This phase MUST:

1. Explicitly reference findings from ALL FIVE subagents (A through E) by name
2. Challenge any finding that looks like a false positive — state exactly why
3. Confirm or downgrade severity ratings with rationale
4. Surface anything all five subagents missed
5. Check contract fields from `.claude/contracts/active-task.json`:
   - `allow_architecture_changes: false` — flag if the diff introduces patterns not in `systemPatterns.md`
   - `require_tests: true` — flag if the diff adds behavior with no corresponding test

**Output header:** `## Phase 8 — Opponent-Auditor`

## Final Summary

### Code Review Summary
**Scope:** [diff or path]  
**Contract:** `.claude/contracts/active-task.json`

#### Security [A]
| Severity | Finding | File:Line | Verdict |
|---|---|---|---|
| ... | ... | ... | confirmed / downgraded / false positive |

#### Performance [B]
_(same format)_

#### Style & Standards [C]
_(same format)_

#### Test Coverage [D]
- Missing: ...

#### Maintainability [E]
- ...

#### Overall Verdict
Approve / Request Changes / Needs Discussion

One paragraph on the most important things to address before merging, citing only confirmed findings.

---

## Usage

    /code-review                          # reviews current git diff
    /code-review src/components/          # reviews a specific folder
    /code-review src/utils/analytics.js   # reviews a specific file
