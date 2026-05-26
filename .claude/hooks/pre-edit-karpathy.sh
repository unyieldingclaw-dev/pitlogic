#!/usr/bin/env bash
# PreToolUse hook (Edit|Write): prints Karpathy reminder, warns if edit is outside contract scope.
# Never blocks — always exits 0.

echo "[Karpathy] Minimal change only. Touch only what is required. No speculative features."

CONTRACT=".claude/contracts/active-task.json"
[ ! -f "$CONTRACT" ] && exit 0

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | node -e "
let d = '';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  try {
    const o = JSON.parse(d);
    process.stdout.write((o.tool_input && o.tool_input.file_path) || '');
  } catch (e) {}
});
" 2>/dev/null)

[ -z "$FILE_PATH" ] && exit 0

echo "$FILE_PATH" | node -e "
const fs = require('fs');
let filePath = '';
process.stdin.on('data', c => filePath += c);
process.stdin.on('end', () => {
  filePath = filePath.trim();
  try {
    const contract = JSON.parse(fs.readFileSync('.claude/contracts/active-task.json', 'utf8'));
    const allowed = contract.allowed_paths || [];
    if (allowed.length === 0) return;
    const inScope = allowed.some(p => filePath.startsWith(p) || filePath === p);
    if (!inScope) {
      process.stderr.write('[TaskContract] WARN: editing ' + filePath + ' is outside allowed_paths for this task\n');
      process.stderr.write('[TaskContract] Allowed: ' + allowed.join(', ') + '\n');
    }
  } catch (e) {}
});
" 2>&1

exit 0
