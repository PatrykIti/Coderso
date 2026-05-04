# 784 - Custom Screens read-path definition fallback

**Date:** 2026-05-01
**Version:** Unreleased
**Tasks:** TASK-248

## Key Changes

### Custom Screens

- Made `listCustomScreens` and `getCustomScreen` tolerant to stale or partially
  missing persisted definitions so one legacy row no longer breaks the entire
  `/admin/advanced/custom-screens` section.
- Added a read-path fallback that prefers the persisted V2 definition when it
  is valid, relaxes schema-bound reads when only content-type references drift,
  and finally falls back to the legacy `blocks` / `bindings` projection when
  the stored `definition` is unreadable.
- Updated `updateCustomScreen` to reuse the sanitized read-path definition when
  a request changes metadata without replacing the screen definition, so stale
  records can be repaired instead of being permanently stuck.

## Validation

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/custom-screen-schemas.test.ts tests/vitest/customScreens/customScreenService.test.ts` - passed.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
