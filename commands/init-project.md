# Playbook: init-project — Planning Mode

`AGENTS.md` governs your behavior. Do not restate its rules — follow them. This playbook plans a new
project and ends at user approval. **Produce nothing until the user approves.**

## Step 0 — First run? Bootstrap
If this is the first time running in this repo, run the `bootstrap` playbook first (detect platform +
confirm setup). If already bootstrapped this session, skip.

## Step 1 — Select the Asset Profile
Read the project description (from `START_PROJECT.md` or the conversation). Choose the Asset Profile
that fits (`profiles/<name>/profile.md`), or infer it and confirm with the user. If the asset is a
hybrid, choose a composed profile (e.g. `intelligence-product`). Record the choice as `active_profile`
in `docs/project_memory.md`. From here on, read all asset-specific behavior from that profile.

## Step 2 — Understand
Analyze: purpose, consumers/roles, integrations, constraints, what is stated vs must be inferred.

## Step 3 — Clarify
Separate **must answer before planning** from **can assume for now** (state the assumption, proceed).
Write to `planning/questions.md`. Wait for answers on blocking items.

## Step 4 — Requirements, scope, risks
- `planning/requirements.md` — functional + non-functional, each tagged explicit/implied/assumed
- `planning/scope.md` — in / out / future
- `planning/risks.md` — risk, likelihood, impact, mitigation

## Step 5 — Explore the stack and select WITH the user (human-in-the-loop)
- Start from the profile's `stack_candidates` (categories).
- Explore options well-suited to **this specific asset** — do not default.
- Present **2–3 options with trade-offs** (cost, maturity, fit, portability).
- **Wait for the user's choice.** Record it in `docs/decision_log.md`. Never name a product the user
  did not choose.

## Step 6 — Design
Produce the `design_docs` listed by the active profile, at the detail levels it specifies
(HIGH/MEDIUM/LIGHT). Invest detail where it will be re-read during production.

## Step 7 — Decompose into work units
Break all work into **Foundation Units (FU)** and **Deliverable Units (DU)** in
`implementation/user_units.md`, each with acceptance criteria tied to the profile's completeness rule.
Group DUs into milestones (3–6 related units). Populate `implementation/task_tracker.md` with
milestone boundaries, all status `pending`.
- **If the profile is composed**: each unit also declares `governed_by: <capability>` so the right
  completeness rule and quality gate apply per unit.

## Step 8 — Tooling
Analyze need for skills/plugins/MCPs from the profile's `tooling_candidates`. Install only those that
save more context/tokens than they cost. Verify they work. Record selections and one-line rejections
in `mcps/inventory.md` / `skills/inventory.md`.

## Step 9 — Knowledge (OKF) + memory
- Mount the profile's `knowledge_bundles` under `knowledge/`. Generate `knowledge/index.md`
  (progressive-disclosure entry point) and record the mount in `knowledge/log.md`. Bundles follow
  the OKF convention in `knowledge/README.md` (frontmatter with required `type`, relative links,
  `index.md` + `log.md` per bundle). Add YAML frontmatter to design docs.
- Record significant decisions in `docs/decision_log.md`.
- Update `docs/project_memory.md`: active_profile, stack chosen, FU/DU counts, key decisions, next step.

## Step 10 — Present for approval
Show a structured summary: project, profile, stack chosen, FU/DU list grouped by milestone, estimated
effort, open questions, top risks. **Wait for approval.**

## Quality check before presenting
- Every requirement maps to an FU or DU
- Every DU has a completeness definition from the active profile (and `governed_by` if composed)
- The stack was explored and the user chose it (not defaulted)
- design_docs match the active profile's list
- knowledge/index.md exists and links the design docs; knowledge/log.md records the mount
- No commercial product appears that the user did not choose

If planning needs multiple sessions: finish the current step fully, update `project_memory.md`,
resume with `session-start`.
