# /comment-pass

Two-phase dead code scan and comment audit. Never auto-applies anything — always asks for approval before making changes.

## Phase 1 — Dead code scan

Find and report:
- Unused constants, variables, and imports (no references anywhere in the codebase)
- Duplicate function or variable declarations
- Unreachable branches: code after unconditional returns, `if (false)` patterns
- Commented-out code blocks (more than 2 lines)
- Exported symbols with no importers (grep to verify)

For each finding: report `file:line`, describe what it is, explain why removal is safe.

Ask for approval before removing anything. Do not batch removals — confirm each one.

## Phase 2 — WHY comment audit

Find code that lacks explanation for any of:
- Architectural constraints (why this pattern instead of a simpler one)
- Non-obvious business rules (why this specific threshold or formula)
- Failure modes that are silently handled (why the error is swallowed)
- Edge cases that required deliberate handling
- Non-obvious async ordering or dependency constraints
- API quirks or third-party behavior being worked around
- Security or compliance constraints that shaped the code

Rules for adding comments:
- Add a comment only where the WHY is genuinely non-obvious to a reader unfamiliar with the project history
- Do NOT add comments that restate what the adjacent code does
- Prefer a short comment above the function or block; avoid inline comments unless the specific line is uniquely non-obvious
- One sentence is almost always enough

Ask for approval before adding any comments.
