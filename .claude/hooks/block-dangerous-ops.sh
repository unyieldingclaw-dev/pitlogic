#!/usr/bin/env bash
# PreToolUse hook (Bash): blocks dangerous shell operations.
# Receives tool invocation JSON on stdin. Exits 1 to block, 0 to allow.

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | node -e "
let d = '';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  try {
    const o = JSON.parse(d);
    process.stdout.write((o.tool_input && o.tool_input.command) || '');
  } catch (e) {}
});
" 2>/dev/null)

[ -z "$COMMAND" ] && exit 0

block() {
  if echo "$COMMAND" | grep -qiE "$1"; then
    echo "[BLOCKED] $2" >&2
    echo "Blocked by .claude/hooks/block-dangerous-ops.sh" >&2
    echo "If intentional, run the command manually in your terminal." >&2
    exit 1
  fi
}

# Destructive git operations
block 'git[[:space:]]+(push[[:space:]]+(--force|-f)|push[[:space:]]+.*--force)' 'git push --force'
block 'git[[:space:]]+reset[[:space:]]+--hard' 'git reset --hard'
block 'git[[:space:]]+checkout[[:space:]]+--[[:space:]]' 'git checkout -- (discards uncommitted changes)'
block 'git[[:space:]]+clean[[:space:]]+-[a-z]*f' 'git clean -f'

# Destructive filesystem
block '\brm[[:space:]]+-[a-z]*r[a-z]*f\b|\brm[[:space:]]+-[a-z]*f[a-z]*r\b' 'rm -rf'

# SQL destructive
block '\bDROP[[:space:]]+(TABLE|DATABASE)\b' 'DROP TABLE/DATABASE'
block '\bDELETE[[:space:]]+FROM\b' 'DELETE FROM (verify WHERE clause is present before running manually)'
block '\bTRUNCATE\b' 'TRUNCATE'

# Git bypass hooks
block '\-\-no\-verify\b' '--no-verify (skips commit hooks)'

# Piped shell execution — supply chain risk
block '(curl|wget)[[:space:]]+[^|]+\|[[:space:]]*(ba)?sh' 'curl/wget piped to shell'

# Secret file reads
block '\bcat\b[^|>]*(\.pem|id_rsa|credentials\.json|aws_credentials)' 'reading secret file'

# History rewriting
block 'git[[:space:]]+filter-branch\b' 'git filter-branch (history rewriting)'
block 'git[[:space:]]+update-ref\b' 'git update-ref (low-level ref mutation)'
block 'git[[:space:]]+rebase[[:space:]]+--onto\b' 'git rebase --onto (complex rebase variant)'

exit 0
