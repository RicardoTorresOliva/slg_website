# adapters/ — Platform pointers (P3: platform agnosticism)

Governance lives once, in `AGENTS.md`. Each agent platform finds it through a thin **pointer** file
that the platform auto-loads.

## You don't need to do anything — pointers ship pre-installed at the repo root

| Platform | Pointer (already at root) | What it does |
|----------|---------------------------|--------------|
| Claude Code | `CLAUDE.md` + `.claude/commands/` | auto-loads → redirects to `AGENTS.md`; exposes slash commands |
| Cursor | `.cursor/rules/app-builder.md` | auto-loads → redirects to `AGENTS.md` |
| Antigravity / other | `AGENTS.md` | read natively — no pointer needed |

Each platform reads only its own pointer and ignores the rest (they are inert). So the project works
on any platform with **zero install step**.

## What this folder is for

This folder holds the **source copies** of the pointers, used only by:
- `install-adapter.sh <platform>` — to **restore** a pointer you deleted, or add a platform later.
- `commands/bootstrap.md` — the one-time check that detects your platform and confirms the pointer.

## Adding a new platform

1. Create `adapters/<new-platform>/` with the thin pointer file(s) that platform auto-loads.
2. The pointer must only *point* to `AGENTS.md` — never restate governance.
3. Add a line to `install-adapter.sh` and to the table above.

**Barbell rationale:** the neutral core (`AGENTS.md`, `commands/`) is the stable position; each pointer
is a small, disposable bet. Delete a platform's pointer and the core is untouched.
