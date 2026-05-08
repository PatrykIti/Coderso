# 801 - TASK-190 detail page binding resolver

**Date:** 2026-05-08
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-05, TASK-190-05-03, TASK-190-05-03-02

## Key Changes

### Detail-page binding contract

- Added `core/services/content/detailPageBindingResolver.ts` as the content-owned
  resolver for strict `entry-field`, `entry-meta`, `detailHref`,
  `formContext`, and `relatedItems` detail-page bindings.
- Required bindings now fail with machine-readable resolver errors, optional
  bindings can use fallback values, and computed resolvers stay on the existing
  route/content-list/form runtime seams instead of creating parallel contracts.

### Shared dot-path helpers

- Extracted shared `split/read/write` binding-path helpers into
  `core/services/utils/bindingPath.ts`.
- Rewired the custom-screen binding resolver to the shared helper so detail
  pages and custom screens keep one compatible dot-path contract.

## Validation

- `bun run test:vitest -- tests/vitest/content/detailPageBindingResolver.test.ts` - passed.
- `bun run test:vitest -- tests/vitest/customScreens/bindingResolver.test.ts` - passed.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
