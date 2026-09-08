#!/usr/bin/env bash
# check_doc_sync.sh — APP_Builder v4.1
# Verifies the spec/knowledge stays in sync with the code (SDD: spec is source of truth).
# Generic + profile-aware. The software-app profile checks endpoints/tables; other
# profiles override via scripts/profile_doc_sync.sh.
#
# Exit 0 = in sync (or no profile hook). Exit 1 = drift detected.

set -euo pipefail
ROOT="${1:-.}"
fail=0

# Universal check: knowledge index must reference the design docs that exist.
# NOTE (intentional): this universal check emits WARN only and never fails the run by itself.
# Hard failures are delegated to the profile-specific hook (profile_doc_sync.sh), because only
# the active profile knows what "in sync" means for its asset type.
idx="$ROOT/knowledge/index.md"
if [[ -f "$idx" ]]; then
  while IFS= read -r doc; do
    base="$(basename "$doc")"
    if ! grep -q "$base" "$idx"; then
      echo "  WARN: $base exists but is not linked from knowledge/index.md (progressive disclosure broken)"
    fi
  done < <(find "$ROOT/knowledge" "$ROOT/design" -type f -name '*.md' 2>/dev/null | grep -v 'index.md' || true)
fi

# Profile-specific drift check (e.g. software: every route in code is in api_contracts).
if [[ -x "$ROOT/scripts/profile_doc_sync.sh" ]]; then
  echo "Running profile-specific doc-sync check..."
  "$ROOT/scripts/profile_doc_sync.sh" "$ROOT" || fail=1
else
  echo "  (No profile doc-sync hook; universal index check only.)"
fi

[[ "$fail" -eq 0 ]] && echo "DOC-SYNC OK." || { echo "DOC-SYNC FAILED."; exit 1; }
