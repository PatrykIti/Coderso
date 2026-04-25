# 738 - TASK-208 admin list action toasts

Date: 2026-04-24
Version: Unreleased
Tasks: TASK-208, TASK-208-01, TASK-208-01-01, TASK-208-01-02, TASK-208-01-03, TASK-208-02, TASK-208-02-01, TASK-208-02-02, TASK-208-02-03, TASK-208-03, TASK-208-03-01, TASK-208-03-02, TASK-208-04, TASK-208-04-01, TASK-208-04-02, TASK-208-05, TASK-208-05-01, TASK-208-05-02, TASK-208-06, TASK-208-06-01, TASK-208-06-02

## Key Changes

### Admin UI Toast Tokens
- Kept the single AdminApp toaster host top-right, closeable, duration-bound,
  accessible, and Sonner `richColors` enabled.
- Mapped normal, success, warning, info, and error toast state variables to
  active Admin UI Theme tokens through the shared Sonner wrapper.
- Added scoped `.toaster` CSS for description text, borders, close/action/cancel
  controls, loading indicators, hover, focus, and shadow so visible toast
  surfaces no longer rely on Sonner bundled palettes.

### List Action Feedback
- Added `core/admin/ui/shared/listActionToasts.ts` as the shared success/error
  and bulk-result owner for admin list mutations.
- Routed Pages, Posts, Menus, Content Types, and Entries list create,
  publish/unpublish/draft/archive, delete, and bulk feedback through the shared
  helper while preserving each list's cache refresh, navigation, selection, and
  inline partial-failure behavior.
- Kept reusable create drawer/dialog local validation inline-only and added
  list-scoped create error callbacks only for rejected create mutations.
- Preserved Entries all-items read model via `GET /content-entries` and existing
  editor route aliases.

### Docs
- Documented the shared Admin UI floating toast token contract in
  `_docs/DESIGN_TOKENS.md`.
- Documented the shared admin list action toast behavior in
  `_docs/CONTENT_LIST_UX.md`.

### Validation
- Passed targeted Vitest:
  `tests/vitest/admin/adminApp.test.tsx`,
  `tests/vitest/admin/sonner.test.tsx`,
  `tests/vitest/ui/list-action-toasts.test.ts`,
  `tests/vitest/ui/page-post-list-wave.test.tsx`,
  `tests/vitest/ui/menu-list-page-actions.test.tsx`,
  `tests/vitest/ui/menu-leaf-components.test.tsx`,
  `tests/vitest/ui/content-type-list-parity.test.tsx`,
  `tests/vitest/ui/content-type-create-drawer.test.tsx`,
  `tests/vitest/ui/entry-list-wave.test.tsx`,
  and `tests/vitest/ui/entry-page-support-wave.test.tsx`.
- Passed `bun --cwd core lint`.
- Passed `bun --cwd core lint:types`.
