# Playbook: review — Independent Review

Launch a reviewer with **clean context** (no bias from the work just done). It only knows what it
reads from files. `AGENTS.md` governs.

The reviewer must:
1. Read `implementation/task_tracker.md` — identify recently completed units.
2. Read `implementation/user_units.md` — check acceptance criteria.
3. Read the `active_profile` to know the completeness rule and quality gate to apply (per unit's
   `governed_by` if composed).
4. For each completed **Deliverable Unit**:
   - Verify it satisfies the profile's completeness definition end-to-end.
   - Verify the quality gate was applied (evidence in `work_log.md`).
   - Check for gaps: missing error/empty states, missing navigation/links, orphan claims, unvalidated
     data — whatever the asset type requires.
5. For each completed **Foundation Unit**: verify it works and is integrated; quality gate applied.
6. Run the mechanical checks: `scripts/check_completeness.sh .`, `scripts/check_worklog.sh .`,
   `scripts/check_doc_sync.sh .`. (These are deterministic; the reviewer interprets the results.)
7. Write findings to `docs/work_log.md` under a "## Review" entry.
8. Flag any critical issue that must be fixed before continuing.

If critical issues are found, stop and fix them before advancing to new work.
