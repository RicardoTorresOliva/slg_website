---
type: asset-profile
title: software-app
---

# Asset Profile: software-app

The reference profile. Reproduces APP_Builder v3.1's software behavior, but expressed in **categories**
with **no product lock-in** and **no default stack**. Everything concrete is chosen during planning
via stack exploration + human-in-the-loop selection.

## design_docs
- data_model: entities, fields, relationships, indexes — [HIGH]
- api_contracts: endpoints, methods, request/response shapes, auth — [HIGH]
- ui_wireframes: navigation, key screen layouts, flows — [MEDIUM]
- architecture: components, communication, integrations — [MEDIUM]
- style_guide: design system, typography, spacing, components — [LIGHT]

## foundation_unit_examples
- Project scaffolding (backend + frontend structure, container setup)
- Data layer setup (models, migrations, seed/sample data)
- Authentication/identity (per chosen category)
- Shared services multiple DUs depend on

## deliverable_unit_completeness
A DU is done only when:
- The backend supports the functionality
- The frontend exposes it to the consumer
- The consumer can perform the action end-to-end
- The quality_gate passes for all new code
- Empty states and error states are handled
- Automated tests exist for critical paths (auth, payments, data mutations, integrations)

## quality_gate
Apply after each FU/DU and at final audit:
- No hardcoded secrets, tokens, passwords, or keys
- No sensitive data in logs, errors, or UI
- Input validation on all external inputs
- Authentication checks on all protected routes
- Authorization checks — consumers cannot access others' resources
- Privileged routes require privileged-access verification
- Database queries use parameterized statements
- Rendered content escaped to prevent injection (XSS)
- API responses do not leak internal details
- File uploads validated for type and size
- Dependencies from trusted sources

## deliverable_format
- An independently deployable repository

## publication_step      # CATEGORY, not a product
- Containerized build, deployed to a deployment platform chosen during planning

## stack_candidates      # categories to explore; chosen via human-in-the-loop, never defaulted
- backend: [language + web framework + ORM/data-access + migration tool]
- frontend: [framework + language + styling/design-system + state management]
- database: [relational | document | other — sized to the data model]
- auth: [application-managed identity | delegated identity provider]
- llm: [provider, accessed through a swappable abstraction layer]
- containerization + deployment platform: [chosen by category, then by product in planning]

## tooling_candidates    # evaluated cost-aware (install only if it saves > it costs)
- schema/design skill: validate the data model before implementing
- UI/design-system skill: accelerate the chosen design system
- database MCP: direct queries instead of shelling out
- browser/automation MCP: automate visual verification of pages

## knowledge_bundles     # OKF bundles to mount — examples labeled as such
- stack-patterns/<chosen-stack> (created per project, reused by similar projects)
- examples/knowledge/pitfalls-* (illustrative only; never required by the core)

## profile-specific rule
- Include an admin/operations surface (logs, credential management, lifecycle visibility)
  **when the asset's users need it** — not as a universal mandate.
