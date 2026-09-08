---
type: asset-profile
title: data-product
---

# Asset Profile: data-product

A digital asset that is **queried**: refined data made consultable (a validated dataset, a pipeline,
a dashboard, a metrics layer). The consumer interrogates, filters, and decides with it.

## design_docs
- data_sources: where data comes from, access method, refresh cadence — [HIGH]
- schema: tables/fields/types, the data dictionary — [HIGH]
- lineage: how each output traces back to sources (transformations) — [HIGH]
- transformation_logic: cleaning, joins, derivations, metric definitions — [MEDIUM]
- exposure_contract: how the consumer queries it (views, API, dashboard) — [MEDIUM]

## foundation_unit_examples
- Data ingestion from sources
- Schema/storage setup
- Cleaning/transformation pipeline
- Storage + access layer

## deliverable_unit_completeness
A DU (a dataset/view/dashboard) is done only when:
- The data is validated (no unexpected nulls/duplicates/out-of-range values)
- The schema is documented (data dictionary current)
- No PII leakage; data-governance rules satisfied
- Lineage is traceable (output → source)
- The consumer can actually query/explore it end-to-end
- It is reproducible (re-running the pipeline yields the same result)

## quality_gate
Apply after each unit and at final audit:
- Schema correctness — types/constraints match the dictionary
- Data quality — nulls, duplicates, ranges, referential integrity checked
- PII / compliance — sensitive fields masked/governed per policy
- Provenance — lineage from output back to source is intact
- Reproducibility — pipeline is deterministic and documented
- Metric definitions — every metric defined unambiguously

## deliverable_format
- A dataset + a dashboard/notebook + a data dictionary

## publication_step      # CATEGORY, not a product
- Load to a data store + apply access controls

## stack_candidates      # categories; chosen via human-in-the-loop
- storage: [relational warehouse | lakehouse | document store]
- pipeline: [batch | streaming | notebook-driven]
- exposure: [SQL views | API | BI dashboard | notebook]

## tooling_candidates    # cost-aware
- database/warehouse MCP: direct queries instead of shelling out
- data-profiling skill: validate quality before exposing
- visualization skill: build the dashboard/charts

## knowledge_bundles
- data-governance/<org-policy> (PII rules, retention, access conventions)
- metric-definitions/<domain> (canonical metric and dimension definitions)
- schema-conventions/<house-style> (naming, typing, PK strategy)
