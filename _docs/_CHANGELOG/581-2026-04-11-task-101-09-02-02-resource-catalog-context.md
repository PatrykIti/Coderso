# 581. TASK-101-09-02-02 resource catalog context

**Date:** 2026-04-11
**Version:** 0.1.0
**Tasks:** TASK-101-09-02-02, TASK-101-09-02-02-01, TASK-101-09-02-02-02, TASK-101-09-02-02-03, TASK-101-09-02-02-04

## Key Changes

### LLM Guide Context
- Added a schema-versioned assistant resource catalog snapshot for content types, custom screens, listings, forms, and widgets/templates.
- Added bounded, deterministic, redacted normalization for resource summaries.
- Added injected-deps catalog aggregation with lazy default deps for DB/runtime-backed services.

### Action Planning
- Added `context.includeResourceCatalog` for `/assistant/actions/plan`.
- The server now hydrates `context.resourceCatalog` internally before planner execution when LLM Guide planning requests it.
- Client-supplied `context.resourceCatalog` remains rejected by strict schema validation.

### Validation
- Added Vitest coverage for catalog normalizer and builder.
- Added route coverage for catalog enrichment and unknown-context rejection.
- Updated architecture, CMS API, security, task board, and parent assistant context audit notes.
