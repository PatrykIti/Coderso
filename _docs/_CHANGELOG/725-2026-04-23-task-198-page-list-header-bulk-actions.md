# 725. TASK-198 page list header bulk actions

Date: 2026-04-23
Version: unreleased
Tasks: TASK-198

## Key Changes

### CMS Pages / Admin UI

- Moved Pages bulk controls into the existing page header action area, directly
  to the left of the create trigger, so selecting rows no longer inserts a new
  bar above the table or pushes the table down.
- Shortened the create trigger from `Create New Page` to `New` on the Pages
  list; the create drawer contract is unchanged.
- Added a compact inline variant for `PageBulkActionsBar` while preserving the
  existing bulk action behavior, confirmation flow, refresh, and clear-selection
  semantics.

### Docs / QA

- Updated the Pages parity section in content-list UX docs and added Vitest
  coverage proving the inline bulk controls remain header-owned.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/page-list.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx`
