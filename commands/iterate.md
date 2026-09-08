# Playbook: iterate — Post-Delivery Changes

The asset has been delivered. The user wants a change. `AGENTS.md` governs.

## Analyze
1. Read the user's request.
2. Read `docs/project_memory.md`, `implementation/task_tracker.md`, `implementation/user_units.md`.
3. Classify: **bug fix** | **planning gap** (was implicitly in scope, missed) | **enhancement**
   (modifies an existing unit) | **new feature** (a new unit).

## Emit a spec-delta (before any change)
```
## Spec Delta — [date] — [type]
- ADDED:    [new requirement/unit, as GIVEN/WHEN/THEN]
- MODIFIED: [what changes vs the baseline]
- REMOVED:  [what is removed]
- Affected design docs / knowledge: [list]
- Regression risk: [low/medium/high + what could break]
```
Record it in `work_log.md`. For **enhancements** and **new features**, present it to the user and wait
for approval. **Bug fixes** and **planning gaps** proceed directly (already in scope).

## Apply
Follow the standard per-unit workflow in `AGENTS.md`, applying the active profile's completeness rule
and quality gate (per `governed_by` if composed). Then:
- Apply the quality gate to all changed work.
- Verify existing functionality still works (regression check).
- Update `task_tracker.md`, `work_log.md`, and `project_memory.md`.
- Update design docs / `knowledge/` if schema, contracts, structure, or argument changed.

## Never
- Change existing behavior without documenting why.
- Skip regression verification.
- Modify a schema or contract without updating its design doc and knowledge entry.
