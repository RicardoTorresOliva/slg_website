---
type: asset-profile-contract
title: Asset Profile Contract
version: 1.0
---

# Asset Profile Contract

An **Asset Profile** is the pluggable module that tells the APP_Builder core how to produce a specific
*kind* of digital asset. The core (`AGENTS.md`) is asset-agnostic and constant; the profile carries
everything that is asset-specific. One project selects exactly one profile at planning time.

This file defines the schema every profile MUST follow. To create a new profile, copy this contract,
fill every field, and place it at `profiles/<name>/profile.md`.

## Hard rules for every profile

1. **No commercial product names.** Express *categories* ("containerization", "LLM provider",
   "design system"), never products. Products surface only as suggestions during stack exploration.
2. **`stack_candidates` are suggestions, never defaults.** They seed the exploration + human-in-the-loop
   selection. The agent never fixes a stack without the user's choice.
3. **`tooling_candidates` are evaluated cost-aware.** A tool is installed only if it saves more
   context/tokens than it costs.
4. **`knowledge_bundles` are mounted, not embedded.** They reference OKF bundles under `knowledge/`
   or `examples/`. Example bundles must be clearly labeled as examples.
5. **The profile declares behavior; it does not restate `AGENTS.md` rules.** No governance duplication.

## Required fields

```markdown
---
type: asset-profile
title: <profile-name>
---
# Asset Profile: <profile-name>

## design_docs
# Which design documents this asset requires (drives the planning "Design" step).
- <doc>: <one-line purpose> [detail level: HIGH | MEDIUM | LIGHT]

## foundation_unit_examples
# Typical FUs for this asset (foundational, not directly consumable).
- <example FU>

## deliverable_unit_completeness
# What "done" means for a DU of this asset. This is the completeness rule the
# core enforces. Must be end-to-end and consumer-facing.
- <condition 1>
- <condition 2>

## quality_gate
# The checklist applied after each unit and at final audit. Replaces the generic
# software security checklist. List the items, or reference a checklist file.
- <gate item or reference>

## deliverable_format
# What is ultimately delivered.
- <format>

## publication_step      # CATEGORY, never a product
- <how it is published/deployed, as a category>

## stack_candidates      # categories + suggestions; explored + chosen via HITL
- <dimension>: [category options to explore]

## tooling_candidates    # skills/plugins/MCPs to evaluate, cost-aware
- <tool category>: <what it would provide>

## knowledge_bundles     # OKF bundles to mount (examples labeled as such)
- <bundle reference>
```

## How the core consumes a profile

- `AGENTS.md → Asset Profile` reads these fields at planning and execution time.
- The `init-project` playbook selects the profile (first question) and runs stack exploration from
  `stack_candidates`.
- The `review` playbook loads `quality_gate` to verify, and `deliverable_unit_completeness` to check
  that DUs are truly done.
- A profile change is a design decision: record it in `docs/decision_log.md`.

## Composition (hybrid profiles)

Hybrid assets do NOT get a monolithic profile that copies fields from others (that re-creates v1
bloat). Instead, **profiles compose**. Atomic profiles are reusable capabilities; a hybrid is a thin
manifest that combines them.

A composed profile declares `composes:` and supplies only the *glue* (how the capabilities relate):

```markdown
---
type: asset-profile
title: intelligence-product
composes: [research-report, data-product]   # references, never duplicates
---
# Glue only: how the parts relate (e.g. the narrative cites the dataset;
# the dashboard backs the report's claims). No field is restated from the
# composed profiles — they are inherited by reference.
```

Each Deliverable Unit then declares which capability governs it, via `governed_by:`:

```
DU-04  "Section: competitive landscape"   governed_by: research-report
DU-07  "Dashboard: market signals"        governed_by: data-product
```

So DU-04's quality_gate applies citation integrity; DU-07's applies schema/PII — each pulled from its
own capability, with zero duplication. With *n* atomic capabilities you get up to 2ⁿ declarative
hybrids while authoring only *n* profiles (optionality; via negativa; barbell).

**Resolution rules for a composed profile:**
- `design_docs`, `foundation_unit_examples`, `stack_candidates`, `tooling_candidates`,
  `knowledge_bundles` → the **union** of the composed profiles' values.
- `deliverable_unit_completeness` and `quality_gate` → applied **per DU** according to its
  `governed_by` capability (not unioned).
- `deliverable_format`, `publication_step` → declared in the glue (a hybrid may ship one bundle).

## Provided profiles

- `software-app` — reference profile; reproduces v3.1 software behavior, categories only, no lock-in.
- `research-report` — a document that is *read*: synthesized knowledge argued from cited sources.
- `data-product` — a dataset/dashboard that is *queried*: refined data made consultable.
- `intelligence-product` — **composed** (`research-report` + `data-product`): the consulting hybrid —
  an argued report backed by a validated dataset/dashboard. Validation case for v4.1 generalization.
