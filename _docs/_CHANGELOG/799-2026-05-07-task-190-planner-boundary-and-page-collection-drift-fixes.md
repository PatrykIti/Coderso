# 799 - TASK-190 planner boundary and page collection drift fixes

**Date:** 2026-05-07
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-02-02, TASK-190-05-01, TASK-190-05-02, TASK-190-05-03-01, TASK-190-07, TASK-190-07-01

## Key Changes

### Planner and provider boundary hardening

- Supported mixed-capability and primary-plus-gated setup requests now stay on
  the composed blueprint planner path before provider drafting can bypass them.
- Provider planning prompt packaging now consumes only the trusted
  `includeResourceCatalog` path, and catalog-backed direct planner calls reject
  missing LLM/provider availability instead of silently degrading.

### Page collection-link and media trust fixes

- `page.upsert` collection-link handling now resolves reviewed content-type
  locators into persisted page-owned ids for supporting/simple pages instead of
  relying only on listing-query derived ids.
- Assistant page block normalization now rejects raw media URLs on the generic
  block-backed `page.upsert` path while still allowing trusted media-library
  asset ids.

### Validation and task-doc alignment

- Added regression coverage for provider gating, trusted page media ids,
  raw-media rejection, supporting-page collection-link resolution, and
  Mabudo-like schema/listing merge fixtures.
- Tightened `TASK-190` task/source docs so the landed detail-page slice no
  longer claims lifecycle helpers that are still deferred to later leaves.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/blueprint-page-section-library.test.ts tests/vitest/assistant/blueprint-schema-merger.test.ts tests/vitest/assistant/blueprint-facet-card-merger.test.ts` - passed.
- `bun test tests/unit/assistant/actionExecutorService.test.ts` - passed.
