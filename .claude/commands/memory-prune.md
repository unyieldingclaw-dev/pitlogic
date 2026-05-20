# /memory-prune

Scans all `memory-bank/` files for staleness, contradictions, and accumulated cruft. Reports all findings first, then offers to apply fixes. Never auto-deletes.

## What to scan for

- Completed tasks still listed as in-progress or planned
- Contradictory instructions between files (flag both locations and both versions)
- Duplicate facts stated in multiple files
- References to code, files, features, or branches that no longer exist in the codebase (cross-reference against actual `src/` contents and `git branch`)
- Oversized files (flag any file over ~100 lines as a candidate for splitting)
- Accidentally stored sensitive data: tokens, keys, passwords, PII, credentials

## Process

1. Read all `memory-bank/` files
2. Run `git status` and `git branch -a` for current state context
3. Cross-reference any file or feature references against actual `src/` contents (Glob + Grep)
4. Report all findings with: file path, line reference, and specific issue description

After the full report, ask: "Apply any of these fixes? (list numbers or 'all')"

When removing contradictions: always show both versions and ask which one is authoritative before deleting either.

Never delete content without explicit approval for each item.
