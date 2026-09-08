# knowledge/ — OKF knowledge layer

Design knowledge for the active project, navigated via `index.md` (progressive disclosure).
Ships as a stub in the template: `init-project` (Step 9) mounts the active profile's
`knowledge_bundles` here and generates the index.

This folder holds **OKF bundles** (Open Knowledge Format): knowledge in plain Markdown files with
YAML frontmatter. Zero new dependencies, Git-native as-is, and interoperable with the
`conocimiento/` layer of **AGE_Builder** (SLG's agent-harness factory): knowledge researched in
one factory can be reused in the other without converting anything.

## The convention (rules of a bundle)

- **One file = one concept.** Each atomic concept lives in its own `.md`, with a short, clear
  name — no spaces, no accents.
- **YAML frontmatter** at the top of every concept: `type` is **required**; `title`,
  `description`, `tags` and `timestamp` are recommended.
- **Relative Markdown links** between related concepts (`[other concept](other-concept.md)`).
- **`index.md` is required:** the bundle's entry point. Progressive disclosure: what the bundle
  contains and where to start. Updated whenever a concept is added, changed or deprecated.
- **`log.md` is required:** chronological record of additions, changes and deprecations. Every
  write to the bundle leaves an entry here.

Example concept:

```markdown
---
type: practice
title: Proposal structure that converts
description: What makes a commercial proposal close
tags: [proposals, conversion]
timestamp: 2026-07-22
---

A proposal converts when it is short, speaks to the client's
problem before the company, and closes with one clear next step.
See [commercial tone](commercial-tone.md).
```

## What goes here

- The design knowledge the agent must read before producing (per `AGENTS.md`).
- Stable domain knowledge, standards and references the asset depends on.
- What changes often is not frozen here — it is retrieved live.

## What does NOT go here

- Governance. That lives in `AGENTS.md`, and only there.
- Example bundles. Those live in `examples/`, clearly labeled as examples and never referenced by
  the core (`profiles/_contract.md`, rule 4).

## Structure of a bundle

```
knowledge/
├── README.md           ← this file (the convention)
├── index.md            ← the bundle's entry point (progressive disclosure)
├── log.md              ← the bundle's chronological log
├── <concept-1>.md
├── <concept-2>.md
└── ...
```
