# TASK-209-02: Custom Screens Table, Filters, and Pagination
# FileName: TASK-209-02_Custom_Screens_Table_Filters_and_Pagination.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin/UI + UX
**Estimated Effort:** Large
**Dependencies:** TASK-209-01
**Status:** Done (2026-04-25)

---

## Overview

Move `/admin/coderso/custom-screens` onto the same list shell, filter bar, table
treatment, pagination footer, and visible-row selection model used by Pages.

This round is UI structure and list ergonomics. Mutating action feedback and
confirmations are owned by `TASK-209-03`.

## Sub-Tasks

- [ ] TASK-209-02-01: Custom Screen List Shell and Create Entry Point
- [ ] TASK-209-02-02: Custom Screen Filters for Search, Status, and Content Type
- [ ] TASK-209-02-03: Custom Screen Table, Pagination, and Visible Selection

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenListPage.tsx`
- new `core/admin/ui/custom-screens/CustomScreenTable.tsx`
- new `core/admin/ui/custom-screens/CustomScreenFilters.tsx`
- `core/admin/ui/custom-screens/CustomScreenBulkActionsBar.tsx` is owned by
  `TASK-209-03-03`; this round should only reserve the header action slot that
  lets the later bulk bar sit to the left of `New`.
- new `core/admin/ui/custom-screens/CustomScreenCreateDrawer.tsx`
- new `core/admin/ui/custom-screens/CustomScreenRowActions.tsx` only as a
  presentational shell for the table action slot. Mutating lifecycle/delete
  behavior remains owned by `TASK-209-03`.
- `core/admin/services/userSettingsClient.ts` and
  `core/services/settings/userSettingsService.ts` for the required
  `customScreens.openAfterCreate` create preference.
- `core/admin/ui/shared/useListPagination.ts` only if a shared pagination bug is
  found; otherwise consume the existing helper.
- `core/admin/ui/shared/ListPaginationFooter.tsx` only if a shared footer bug is
  found; otherwise consume the existing footer.
- `tests/vitest/ui/custom-screens-page.test.tsx`
- new mounted list suite, for example
  `tests/vitest/ui/custom-screens-list-wave.test.tsx`
- `tests/vitest/admin/userSettingsClient.test.ts`
- `tests/integration/routes/userSettings.test.ts`

## Security Contract

- Visibility: internal admin UI only.
- Auth model: existing authenticated admin session/admin API key model.
- RBAC: `content:read` for list labels; `content:write` for the create drawer
  submit owned by `TASK-209-02-01`.
- CSRF: create continues through `createCustomScreen` with `withCsrf: true`;
  filter/table/pagination rendering remains read-only.
- Rate-limit bucket: existing `admin_read` for labels/list data and
  `admin_write` for create.
- Reject-unknown validation: create submits only fields accepted by
  `customScreenCreateSchema`; filters add no route query parameters.
- Anti-abuse: visible selection is local UI state and must be trimmed to the
  current filtered/paginated rows before later bulk actions consume it.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-list-wave.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-records.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/userSettingsClient.test.ts`
- `bun test tests/integration/routes/userSettings.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPaths.test.ts` if route aliases or canonical link behavior changes.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. The list shell, header, table surface, and pagination visually match the Pages
   first-screen list pattern.
2. Filters and pagination are stable on desktop and mobile.
3. Selection is scoped to visible rows and does not survive hidden filter/page
   changes.
4. Existing builder and records links keep using canonical admin navigation.
5. Bulk action execution and the concrete bulk bar component remain owned by
   `TASK-209-03-03`, so this round does not run lifecycle/delete mutations.
