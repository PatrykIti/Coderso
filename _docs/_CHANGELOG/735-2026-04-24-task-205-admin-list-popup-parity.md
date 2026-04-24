# 735. TASK-205 admin list popup parity

**Date:** 2026-04-24  
**Version:** Unreleased  
**Tasks:** TASK-205, TASK-205-01, TASK-205-02, TASK-205-03, TASK-205-03-01, TASK-205-03-02, TASK-205-03-03, TASK-205-04, TASK-205-05

## Key Changes

### Admin List Pagination

- Added one shared admin list pagination contract in
  `core/admin/ui/shared/useListPagination.ts` with default page size `10` and
  page-size options `10`, `20`, `30`, `50`, `100`, `150`, `200`, and `500`.
- Added `core/admin/ui/shared/ListPaginationFooter.tsx` so Content Types,
  Pages, Posts, and Menus share range copy, page-size selection, and functional
  `Previous` / `Next` controls.
- Adapted Content Types, Pages, Posts, and Menus to paginate after their
  existing filtering/sorting while keeping resource-specific action ownership in
  the existing list components.

### Popup Token Compliance

- Added a shared token-backed confirmation dialog for targeted Content Types,
  Pages, Posts, and Menus row, bulk, and revision confirmations.
- Replaced targeted native `window.confirm()` flows with Admin UI dialog state.
- Added the shared `Alert` warning variant and removed targeted hard-coded
  rose/amber popup callouts from Content Types and Menus item deletion surfaces.

### Content Types Parity

- Added page-visible Content Types selection and inline bulk actions for
  Publish, Move to Draft, and Delete.
- Bulk actions reuse existing `updateContentType` and `deleteContentType`
  client/write contracts; no bulk endpoint or route behavior was added.
- Bulk delete keeps the existing guarded delete behavior and reports partial
  failures truthfully.

### Docs and QA

- Updated `_docs/CONTENT_LIST_UX.md` with the shared pagination owner,
  page-size contract, filter/sort-before-pagination behavior, and Content Types
  bulk behavior.
- Updated `_docs/DESIGN_TOKENS.md` with the Admin popup state surface contract.
- Synced TASK-205 task files and `_docs/_TASKS/README.md`.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/list-pagination.test.tsx tests/vitest/ui/content-type-preview-panel.test.tsx tests/vitest/ui/content-type-editor.test.tsx tests/vitest/ui/content-type-table.test.tsx tests/vitest/ui/content-type-list-parity.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx tests/vitest/ui/menu-item-delete-dialog.test.tsx tests/vitest/ui/page-revision-drawer.test.tsx tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx tests/vitest/ui/page-list.test.tsx tests/vitest/ui/posts-list.test.tsx tests/vitest/ui/menu-list-page.test.tsx tests/vitest/admin/contentTypesClient.test.ts tests/vitest/ui-integration/contentTypes.test.tsx`
- `bun run test:vitest`

## Notes

- Bun route tests were not required because the implementation did not change
  API routes, payload schemas, auth, RBAC, CSRF, rate limits, or type service
  invariants.
- Admin cache docs were not changed because cache keys, TTLs, and invalidation
  ownership stayed on the existing clients.
