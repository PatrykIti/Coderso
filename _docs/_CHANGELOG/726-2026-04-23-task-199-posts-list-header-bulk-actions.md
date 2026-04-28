# 726. TASK-199 posts list header bulk actions

Date: 2026-04-23
Version: unreleased
Tasks: TASK-199

## Key Changes

### CMS Posts / Admin UI

- Moved Posts bulk controls into the existing header action area, directly to
  the left of the create trigger, so selecting rows no longer inserts a new bar
  above the filters/table area.
- Shortened the Posts list create trigger from `Create New Post` to `New`; the
  create drawer contract is unchanged.
- Added the same filtered-count footer and `Previous` / `Next` controls used by
  Pages and Menus.
- Preserved existing visible-scope bulk behavior for `Publish`, `Move to Draft`,
  and `Delete`, including delete confirmation, partial failure feedback,
  refresh, and clear-selection semantics.

### Docs / QA

- Updated content-list UX docs and added Vitest coverage proving Posts bulk
  controls remain header-owned while existing bulk apply flows still work.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/posts-list.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx`
