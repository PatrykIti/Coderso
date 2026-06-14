# 1168 - TASK-461 hide Advanced Widgets entry point

**Date:** 2026-06-13
**Version:** Unreleased
**Tasks:** TASK-461, TASK-461-01, TASK-461-01-L01

## Key Changes

### Advanced Navigation

- Hid `Widgets` from the default Advanced sidebar.
- Kept the `widgets` module in the Advanced module registry for metadata,
  dependencies, operation-policy context, and future removal planning.
- Preserved direct `/advanced/widgets` route compatibility.

### Compatibility

- Kept widget registry, Page Editor palette, widget catalog internals, route
  registration, and public runtime behavior unchanged.
- Updated docs to describe Widget Library as a hidden direct compatibility
  surface rather than a daily authoring entry point.

## Validation

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/advanced-modules.test.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/admin/adminApp.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Board

- Done: TASK-461, TASK-461-01, TASK-461-01-L01.
