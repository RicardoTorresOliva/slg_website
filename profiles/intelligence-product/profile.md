---
type: asset-profile
title: intelligence-product
composes: [research-report, data-product]
---

# Asset Profile: intelligence-product (composed)

The consulting hybrid: an argued **report** backed by a validated **dataset/dashboard**, delivered
together so each reinforces the other. This profile does **not** restate any field from the profiles
it composes — it inherits them by reference and supplies only the glue below.

## What is inherited (by reference, not copied)
- From `research-report`: outline/thesis/source_map/evidence_table design docs; the read-completeness
  rule; the citation/credibility/no-fabrication quality gate.
- From `data-product`: data_sources/schema/lineage design docs; the query-completeness rule; the
  schema/PII/provenance quality gate.
- `stack_candidates`, `tooling_candidates`, `knowledge_bundles` → union of both.

## Glue (the only thing this profile declares)

### How the parts relate
- The narrative **cites the dataset**: claims in the report that rest on data must reference a
  specific, validated view/figure produced by the data side.
- The dashboard **backs the report**: every headline figure in the report must be reproducible from
  the data product (no figure exists only in prose).
- Shared definitions: a metric named in the report uses the same definition as in the data product's
  `metric-definitions` bundle. One source of truth for numbers.

### Per-DU governance (governed_by)
Each Deliverable Unit declares which capability governs it. Examples:
```
FU-01  "Gather sources + ingest data"          governed_by: research-report + data-product (foundation)
DU-03  "Dataset: market signals (validated)"   governed_by: data-product
DU-05  "Dashboard: signal explorer"            governed_by: data-product
DU-08  "Section: competitive landscape"        governed_by: research-report
DU-11  "Section: recommendation + thesis"      governed_by: research-report
```
The reviewer applies the data-product quality gate to DU-03/05 and the research-report gate to
DU-08/11 — no duplication, no monolith.

## deliverable_format
- One bundle: the report (document) + the dataset + the dashboard + a one-page executive summary

## publication_step      # CATEGORY, not a product
- Export the report + load the dataset to a data store with access controls + editorial review

## Validation note
This profile is the v4.1 generalization test case: it exercises the asset-agnostic core over an asset
*with* code (the data side) **and** one *without* code (the narrative) in a single project — the
strongest possible proof that APP_Builder generalizes beyond software.
