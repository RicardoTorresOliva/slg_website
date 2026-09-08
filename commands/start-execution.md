# Playbook: start-execution — Autonomous Execution

The user approved the plan. `AGENTS.md` governs execution. Verify readiness, then build.

## Pre-flight check
Run `scripts/preflight_check.sh .` — it verifies the spec is complete (user_units, task_tracker,
knowledge/index, project_memory, active_profile). If it fails, complete the spec first. Do not build.

## Execution order
1. Complete all **Foundation Units (FU)** first, in tracker order.
2. Then **Deliverable Units (DU)** in tracker order, grouped by milestone.
3. For each unit, follow the per-unit workflow in `AGENTS.md`, applying the active profile's
   completeness rule and quality gate. If the profile is composed, apply the rule/gate named by the
   unit's `governed_by`.
4. After each unit: update `task_tracker.md` + `work_log.md`.
5. After each milestone: run the `review` playbook; record milestone tokens in `docs/run_metadata.md`.

## Stop and ask the user when
- A requirement is ambiguous and you cannot assume reasonably
- Two design decisions contradict
- An integration/source does not work as expected
- Something is significantly more complex than planned
- A quality or governance concern requires a structural change
- Scope needs to change

State the issue, the options, and your recommendation.

## If a unit is too large for one session
Split it into verifiable sub-steps inside its definition. Complete each sub-step fully before ending
the session. Keep the unit `in_progress` until all sub-steps complete. Note progress in `project_memory.md`.

## Before delivery
1. Create realistic sample content covering all entities/sections of the asset.
2. Verify every output renders/runs correctly with sample content.
3. Verify empty states render gracefully.
4. Final holistic quality audit (the active profile's gate, applied across the whole asset).
5. Prepare publication per the profile's `publication_step` (a category — confirm the concrete target
   with the user if not already chosen).
6. Document findings and residual risks in `work_log.md`.
7. Update `project_memory.md`: phase = "Delivered".
8. Present a completion summary: what was built (by milestone), quality results, residual risks, how to
   publish, known limitations.
