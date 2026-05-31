# 794 - TASK-190 listing facet and card merge slice

**Date:** 2026-05-07
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-04, TASK-190-04-02, TASK-190-07, TASK-190-07-01

## Key Changes

### Listing facet and card composition

- Added `blueprintFacetMerger.ts` and `blueprintCardConfigMerger.ts` as the
  owner seams for composed listing filter and card config merge.
- Compatible facet arrays now merge deterministically across composed fragments,
  including checkbox/range/sort options, while card bindings and actions dedupe
  by stable ids/keys with primary-over-adjunct presentation precedence.
- Merged filter and card source paths now validate against the composed content
  schema instead of silently accepting fields that the catalog model does not
  own.

### Assembler/runtime integration

- The blueprint assembler now widens `listing-query.upsert.fields`
  automatically so merged listing facets and listing-template card bindings keep
  the runtime projection data required by filter metrics and card rendering.
- Missing facet/card source fields now fail closed through typed
  `facet_field_missing` needs-input behavior.
- Fixed a live preset drift in `createListingTemplateConfig(...)` so the product
  catalog card config reads `data.category` instead of the unrelated
  `data.location` field.

### Docs and task sync

- Closed `TASK-190-04-02`, closed the parent `TASK-190-04`, updated task-board
  counts, and refreshed assistant/core source docs to reflect that schema,
  facet, and card merge are now part of the landed foundation slice.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/blueprint-facet-card-merger.test.ts tests/vitest/assistant/blueprint-action-assembler.test.ts` - passed.
- `bun test tests/unit/content/listingTemplatesService.test.ts` - passed.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
