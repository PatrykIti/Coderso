# TASK-353-02: Redirects Drawer Accessibility, Empty State, and Pagination UX
# FileName: TASK-353-02_Redirects_Drawer_Accessibility_Empty_State_and_Pagination_UX.md

**Priority:** High
**Category:** Redirects + Admin UI + Accessibility + API
**Estimated Effort:** Medium
**Dependencies:** TASK-353-01
**Status:** To Do

---

## Overview

Fix the Redirects admin UX findings:

- Drawer emits Radix `DialogContent` title/description warnings.
- Empty table lacks a direct create CTA.
- Pagination controls show at zero/single-page states and do not page data.

## Sub-Tasks

- Add `SheetHeader`, `SheetTitle`, and `SheetDescription` to `RedirectDrawer`.
- Add console-clean UI tests for opening the drawer.
- Add inline empty-state CTA that calls the existing create drawer path.
- Add real pagination metadata or hide/disable pagination when all rows are
  visible.
- If server pagination is added, pass `page`, `limit`, `total`,
  `hasNext`, `hasPrevious` through route/client/UI.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/redirects/RedirectDrawer.tsx` | Add Radix title/description wiring and preserve visible heading. |
| `core/admin/ui/redirects/RedirectsTable.tsx` | Add empty CTA, pagination state, disabled rules, and callbacks. |
| `core/admin/ui/redirects/RedirectsPage.tsx` | Own create callback and optional page state. |
| `core/admin/services/redirectsClient.ts` | Add list pagination options only if server pagination is implemented. |
| `core/server/routes/redirectRoutes.ts` | Add pagination query parsing only if server pagination is implemented. |
| `tests/vitest/ui/redirects.test.tsx` | Cover drawer accessibility and empty CTA. |
| `tests/vitest/ui/redirects-page-leaf.test.tsx` | Cover pagination disabled/page state. |
| `tests/integration/routes/redirects.test.ts` | Cover pagination validation if added. |

## Implementation Pseudocode

```tsx
<SheetContent>
  <SheetHeader className="sr-only">
    <SheetTitle>{mode === "create" ? "New Redirect" : "Edit Redirect"}</SheetTitle>
    <SheetDescription>Define source, destination, status code, and active state.</SheetDescription>
  </SheetHeader>
  <VisibleHeader aria-hidden="true" />
</SheetContent>

if (items.length === 0) {
  return <EmptyRow action={<Button onClick={onCreate}>Create your first redirect</Button>} />;
}

const showPagination = total > limit;
```

Data flow:

- Page owns create drawer state.
- Table receives `onCreate`, pagination metadata, and page callbacks.
- Drawer exposes accessible title/description to Radix while keeping current
  visual design.

Error handling:

- Do not render enabled pagination when no page change is possible.
- Keep `Previous` disabled on first page and `Next` disabled on last page.
- Opening drawer in tests must not emit console accessibility errors.

Regression-test shape:

- Open create drawer and assert no console errors.
- Empty table shows `Create your first redirect` and clicking it opens drawer.
- Zero/single-page list hides/disables pagination.
- Multi-page list emits page callback or route params.

## Security Contract

Pagination route changes, if added:

- Endpoint visibility: internal admin `GET /admin/api/redirects`.
- Auth model: session cookie.
- RBAC: `settings:read`.
- CSRF: not required for GET.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: `page`/`limit` integer bounds and strict search
  query handling.
- Anti-abuse: no public write.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/redirects.test.tsx tests/vitest/ui/redirects-page-leaf.test.tsx`
- `bun test tests/integration/routes/redirects.test.ts` if route pagination is added
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update Redirects report with accessibility and pagination/empty-state
  resolution.

## Acceptance Criteria

- Redirect drawer opens without Radix title/description warnings.
- Empty state contains a direct create action.
- Pagination is functional or unavailable with truthful disabled/hidden state.
