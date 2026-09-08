#!/usr/bin/env bash
# install-adapter.sh — APP_Builder v4.1  (fallback / restore)
# All platform pointers ship pre-installed at the repo root, so you normally do NOT
# need this. Use it only to restore a pointer you deleted, or to add a platform.
#
# Usage: bash install-adapter.sh [claude-code|cursor|antigravity]

set -euo pipefail
case "${1:-}" in
  claude-code)
    cp adapters/claude-code/CLAUDE.md ./ && cp -r adapters/claude-code/.claude ./
    echo "Claude Code adapter restored: CLAUDE.md + .claude/commands/" ;;
  cursor)
    cp -r adapters/cursor/.cursor ./
    echo "Cursor adapter restored: .cursor/rules/app-builder.md" ;;
  antigravity)
    echo "Antigravity reads AGENTS.md natively — no pointer needed." ;;
  *)
    echo "Usage: bash install-adapter.sh [claude-code|cursor|antigravity]"; exit 1 ;;
esac
