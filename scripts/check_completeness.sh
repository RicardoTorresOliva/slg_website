#!/usr/bin/env bash
# check_completeness.sh — APP_Builder v4.1
# For every Deliverable Unit marked `completed` in task_tracker.md, verify it is
# actually consumable end-to-end. Attacks the "marked done but not usable" failure.
#
# This is the universal part. The PROFILE-SPECIFIC completeness check is delegated
# to a profile hook if present: scripts/profile_completeness.sh (optional).
#
# Exit 0 = all completed DUs have evidence. Exit 1 = a DU is "done" without evidence.

set -euo pipefail
ROOT="${1:-.}"
tracker="$ROOT/implementation/task_tracker.md"
worklog="$ROOT/docs/work_log.md"
fail=0

[[ -f "$tracker" ]] || { echo "No task_tracker.md found at $tracker"; exit 1; }

# Extract IDs of rows whose Type is DU and Status is completed.
# Convention: markdown table rows "| ID | Type | ... | Status | ..."
completed_dus="$(grep -iE '\|\s*DU' "$tracker" | grep -iE 'completed' | \
  sed -E 's/^\|\s*//; s/\s*\|.*$//' | tr -d ' ' || true)"

if [[ -z "$completed_dus" ]]; then
  echo "No completed DUs yet — nothing to check."
  exit 0
fi

echo "Checking completed Deliverable Units for end-to-end evidence:"
while IFS= read -r id; do
  [[ -z "$id" ]] && continue
  # Every completed DU must have a work_log entry referencing its ID.
  if [[ -f "$worklog" ]] && grep -q "$id" "$worklog"; then
    echo "  OK: $id has a work_log entry"
  else
    echo "  FAIL: $id is 'completed' but has no work_log entry"
    fail=1
  fi
done <<< "$completed_dus"

# Optional profile-specific deeper check (e.g. software: a frontend route exists).
if [[ -x "$ROOT/scripts/profile_completeness.sh" ]]; then
  echo "Running profile-specific completeness check..."
  "$ROOT/scripts/profile_completeness.sh" "$ROOT" || fail=1
fi

[[ "$fail" -eq 0 ]] && echo "COMPLETENESS OK." || { echo "COMPLETENESS FAILED."; exit 1; }
