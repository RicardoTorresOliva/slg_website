# Playbook: bootstrap — One-time platform check

Run this once when you first open a APP_Builder project (or let `init-project` call it). All platform
pointers ship **pre-installed at the repo root**, so the asset already works on any platform — this
playbook just confirms which platform you're on and, if you want, tidies up.

## Step 1 — Identify the platform
Determine your host platform, in this order:
1. **Your own context** — you typically already know whether you are Claude Code, Cursor, Antigravity,
   or another agent. State it.
2. **Corroborate** by running: `bash scripts/detect_platform.sh`
3. **If still unknown**, ask the user: "¿En qué plataforma me estás ejecutando?"

State the detected platform explicitly.

## Step 2 — Confirm the adapter is active
The pointers are pre-installed at the repo root. Confirm the one for your platform exists:
- **Claude Code** → `CLAUDE.md` + `.claude/commands/`
- **Cursor** → `.cursor/rules/app-builder.md`
- **Antigravity / other** → `AGENTS.md` (read natively — no pointer needed)

If somehow missing, restore it: `bash install-adapter.sh <platform>`.

## Step 3 — (Optional) Tidy up
If the user wants the repo clean for a single platform, remove the other platforms' pointer files.
Otherwise leave them — they are inert on platforms that don't read them. Ask before deleting.

## Step 4 — Confirm readiness
Report concisely:
```
Platform: <detected>
Governance: AGENTS.md (active via <pointer>)
Commands: available (init-project, start-execution, session-start, review, iterate)
Ready — describe your project in START_PROJECT.md, or run init-project.
```
