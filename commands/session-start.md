# Playbook: session-start — Session Initialization

`AGENTS.md` governs your behavior. At the start of every new session:

1. Read `docs/project_memory.md` — current state, last completed unit, next unit, blockers, active_profile.
2. Read `implementation/task_tracker.md` — identify the next unit; check for any `in_progress` unit.
3. Load `knowledge/index.md` for orientation (do not open full design docs yet).
4. State the resumption point explicitly:

## Session Start Summary
- **Active Profile**: [name]
- **Current State**: [what's done, what's in progress]
- **Last Completed**: [unit]
- **Next Unit**: [unit]
- **Blockers**: [list or none]

Then resume from the next unit. Do not re-read files already captured in project_memory unless they changed.
