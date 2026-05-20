#!/usr/bin/env bash
# UserPromptSubmit hook: injects memory-bank and context reminders at the start of each turn.
# Never blocks — always exits 0.

echo "[Memory-Bank] Read memory-bank/ files if this is a new session or post-compaction."
echo "[Context] Check /usage. If context > 65%, initiate handoff per CLAUDE.md."
exit 0
