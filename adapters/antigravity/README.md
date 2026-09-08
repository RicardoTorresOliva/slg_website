# Antigravity adapter

This project is governed by `AGENTS.md` at the repository root — read and follow it.

Antigravity reads `AGENTS.md`-style context natively, so in most setups **no shim is needed**:
point the agent at `AGENTS.md` and the neutral `commands/` playbooks.

If your Antigravity configuration expects rules in a specific location, add a thin pointer here
(mirroring `adapters/cursor/.cursor/rules/app-builder.md`) that references `AGENTS.md`. Never restate
governance — only point.
