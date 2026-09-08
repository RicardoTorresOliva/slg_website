# APP_Builder v4.1 — Template

A reusable, asset-agnostic, platform-neutral template for AI-assisted production of digital assets
(software, research reports, data products, and hybrids). Governance lives in one file (`AGENTS.md`);
everything asset-specific lives in pluggable Asset Profiles. **Works on any platform with no install step.**

## ▶ Start here: read `QUICKSTART.md`

`QUICKSTART.md` is the procedure — set up the template once, then run each project. Read that first.

## Layout

```
AGENTS.md            ★ single source of governance (neutral, no products, token-aware)
QUICKSTART.md        ★ the procedure (read this first)
START_PROJECT.md     describe your project here, then run init-project

CLAUDE.md            pointer (Claude Code) — pre-installed, redirects to AGENTS.md
.claude/commands/    slash commands (Claude Code) — pre-installed
.cursor/rules/       pointer (Cursor) — pre-installed
                     (Antigravity & others read AGENTS.md natively — no pointer needed)

commands/            the 6 neutral playbooks: bootstrap, init-project, start-execution,
                     session-start, review, iterate
profiles/            Asset Profiles (the pluggable, asset-specific layer)
  _contract.md         the profile schema + composition rules
  software-app/        reference profile (software, no lock-in)
  research-report/     a document that is read
  data-product/        a dataset/dashboard that is queried
  intelligence-product/ composed (report + data) — the consulting hybrid
scripts/             deterministic verifiers + detect_platform.sh
ci/                  example CI gates + neutral pre-commit alternative
adapters/            source copies of the platform pointers (for restore/extend)
install-adapter.sh   restore/add a platform pointer (rarely needed — they are pre-installed)
examples/            reference examples only — never referenced by the core
```

The knowledge layer (`knowledge/`, mounted by `init-project`) uses **OKF** (Open Knowledge Format):
atomic Markdown concepts + YAML frontmatter, interoperable with the `conocimiento/` bundles of
**AGE_Builder** — knowledge moves between both SLG factories without conversion. Convention:
`knowledge/README.md`.

## The flow (one line)

Use the template → open in any IDE (it just works) → `/bootstrap` (detects platform, optional) →
describe the project in `START_PROJECT.md` → `/init-project` (picks profile, explores stack, you
choose, it plans) → approve → `/start-execution` → `/iterate` for changes.

## Principles (antifragility)

No stack/product lock-in (categories only) · stack chosen by you, not defaulted (HITL) · runs on any
platform with no install step · examples never constitutive · tokens optimized as a first-class
criterion · tooling installed only if it saves more than it costs.
