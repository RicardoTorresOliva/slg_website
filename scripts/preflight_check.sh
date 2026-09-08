#!/usr/bin/env bash
# preflight_check.sh — APP_Builder v4.1
# Verifies the spec is complete before execution begins.
# Replaces the behavioral pre-flight check. Runs in CI or before /start-execution.
# Exit 0 = ready to build. Exit 1 = spec incomplete.

set -euo pipefail
ROOT="${1:-.}"
fail=0

# Files that must exist AND be non-trivial (more than just a heading).
required=(
  "implementation/user_units.md"
  "implementation/task_tracker.md"
  "knowledge/index.md"
  "docs/project_memory.md"
)

min_lines=5  # a populated planning artifact has more than a title + blank line

echo "APP_Builder preflight — checking spec completeness in: $ROOT"
for f in "${required[@]}"; do
  path="$ROOT/$f"
  if [[ ! -f "$path" ]]; then
    echo "  MISSING: $f"
    fail=1
  elif [[ "$(grep -cvE '^\s*$' "$path")" -lt "$min_lines" ]]; then
    echo "  EMPTY/STUB: $f (fewer than $min_lines non-blank lines)"
    fail=1
  else
    echo "  OK: $f"
  fi
done

# An active Asset Profile must be selected.
if ! grep -rqi "active_profile" "$ROOT/docs/project_memory.md" 2>/dev/null; then
  echo "  WARN: no active_profile recorded in project_memory.md (profile must be selected at planning)"
fi

if [[ "$fail" -ne 0 ]]; then
  echo "PREFLIGHT FAILED — complete the spec before building."
  exit 1
fi
echo "PREFLIGHT OK — ready to build."
