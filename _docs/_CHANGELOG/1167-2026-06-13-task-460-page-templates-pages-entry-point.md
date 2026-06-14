# 1167 - TASK-460 Page Templates Pages entry point

**Date:** 2026-06-13
**Version:** Unreleased
**Tasks:** TASK-460, TASK-460-01, TASK-460-01-L01

## Key Changes

### Pages And Templates IA

- Moved Page Templates discovery into the Pages list header as a `Templates`
  action placed before `New`.
- Removed Page Templates from the default Advanced sidebar while preserving the
  existing Page Templates module metadata and route family.
- Aligned the Page Templates list shell with Pages navigation/breadcrumb context.

### Compatibility

- Kept existing `/advanced/page-templates` and
  `/advanced/page-templates/:id` admin routes.
- Kept Page Templates admin API, cache keys, data model, and runtime behavior
  unchanged.

## Validation

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/page-list.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/admin/advanced-modules.test.ts tests/vitest/admin/adminPrefetch.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Board

- Done: TASK-460, TASK-460-01, TASK-460-01-L01.
