#!/usr/bin/env bash
# detect_platform.sh — APP_Builder v4.1
# Best-effort detection of the host agent platform via environment signals.
# Prints one of: claude-code | cursor | antigravity | unknown
#
# This is only corroboration. An LLM agent usually knows its own host from context;
# if this prints "unknown", the agent should rely on its own context or ask the user.

# Claude Code sets CLAUDECODE in its shell environment.
if [ -n "${CLAUDECODE:-}" ] || [ -n "${CLAUDE_CODE:-}" ] || [ -n "${CLAUDE_CODE_ENTRYPOINT:-}" ]; then
  echo "claude-code"; exit 0
fi

# Cursor commonly exposes CURSOR* variables.
if [ -n "${CURSOR_TRACE_ID:-}" ] || [ -n "${CURSOR:-}" ] || env | grep -qiE '^CURSOR'; then
  echo "cursor"; exit 0
fi

# Antigravity (best-effort).
if env | grep -qi 'antigravity'; then
  echo "antigravity"; exit 0
fi

echo "unknown"
