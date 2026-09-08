#!/usr/bin/env bash
# check_worklog.sh — APP_Builder v4.1
# Enforces rule 6 (document as you work): the most recently completed unit must
# have a corresponding work_log entry. Cheap, deterministic, runs in CI/hooks.
#
# Exit 0 = documented. Exit 1 = a completed unit is undocumented.

set -euo pipefail
ROOT="${1:-.}"
tracker="$ROOT/implementation/task_tracker.md"
worklog="$ROOT/docs/work_log.md"

[[ -f "$tracker" ]] || { echo "No task_tracker.md"; exit 1; }
[[ -f "$worklog" ]] || { echo "No work_log.md — create it before marking units done."; exit 1; }

# Last completed unit ID in the tracker (FU or DU).
last_id="$(grep -iE '\|\s*(FU|DU)' "$tracker" | grep -iE 'completed' | tail -n1 | \
  sed -E 's/^\|\s*//; s/\s*\|.*$//' | tr -d ' ' || true)"

if [[ -z "$last_id" ]]; then
  echo "No completed units yet — nothing to check."
  exit 0
fi

if grep -q "$last_id" "$worklog"; then
  echo "WORKLOG OK — last completed unit ($last_id) is documented."
else
  echo "WORKLOG FAILED — last completed unit ($last_id) has no work_log entry."
  exit 1
fi
