# Redirects - Playwright Audit

Date: 31-05-2026  
Route: `/admin/redirects`

## What Was Clicked

- Sidebar Tools -> Redirects.
- Search input with a non-matching term.
- Create redirect drawer.
- Empty Save button state.
- Source and destination fields.
- Status select: 301, 302, 307, 308.
- Active switch.
- Save redirect.
- Search for the created redirect.
- Row edit action.
- Update redirect destination/status.
- Row enable/disable action.
- Pagination buttons.

## What Worked

- The route loaded successfully.
- Empty search showed an empty state.
- Create drawer opened.
- Save was disabled until required fields were present.
- Status options were selectable.
- Active switch toggled correctly.
- Creating a redirect returned a successful backend response and the row appeared
  in the table.
- Searching by the created redirect found the row.
- Editing the row prefilled the drawer fields.
- Updating destination/status returned a successful backend response.
- Enable/disable action returned a successful backend response.
- The created redirect was cleaned up through the API after the test.

## What Did Not Work

### [ISSUE] Redirect drawer is missing Radix dialog accessibility wiring

Evidence:

- Opening the drawer produced console messages that `DialogContent` requires a
  `DialogTitle` and description/`aria-describedby` handling.

Why:

- `RedirectDrawer` uses `SheetContent` without `SheetTitle` and
  `SheetDescription`.
- Visible header text is rendered as plain text, so Radix cannot use it as the
  accessible title/description.

How to fix:

- Add `SheetHeader`, `SheetTitle`, and `SheetDescription` inside the drawer.
- If the description should not be visible, use the established visually-hidden
  pattern.
- Add a UI test that opens the drawer and asserts no console accessibility
  errors.

### [ISSUE] Pagination buttons are placeholders

Evidence:

- Previous and Next were both rendered as enabled in an empty/single-page list.
- Clicking them did not page data.

Why:

- `RedirectsTable` renders pagination buttons without disabled rules, state, or
  handlers.

How to fix:

- Add real pagination contract support or disable the controls when all rows are
  already visible.
- Add tests for empty list and single-page list pagination state.

### [ISSUE] Delete exists in the API but not in the UI

Evidence:

- The test redirect had to be removed through the API cleanup path.
- The table exposed edit and enable/disable actions only.

Why:

- `RedirectsTable` does not render a delete action even though the admin route
  supports deleting redirects.

How to fix:

- If redirect deletion is intended, add a confirm-delete UI and cache
  invalidation.
- If deletion is intentionally API-only, document that product decision and keep
  the UI focused on disabling redirects.

## Source References

- `core/admin/ui/redirects/RedirectsPage.tsx`
- `core/admin/ui/redirects/RedirectDrawer.tsx`
- `core/admin/ui/redirects/RedirectsTable.tsx`
- `core/admin/api/redirectsClient.ts`
- `core/server/routes/admin/redirectRoutes.ts`

