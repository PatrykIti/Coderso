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
- Deep pass: creating a 301 redirect through the drawer returned HTTP 200, the
  row was visible, and API cleanup succeeded.
- Searching by the created redirect found the row.
- Editing the row prefilled the drawer fields.
- Updating destination/status returned a successful backend response.
- Enable/disable action returned a successful backend response.
- The created redirect was cleaned up through the API after the test.

## TASK-353 Resolution - 2026-06-01

- Enabled redirect rows now execute in public runtime before page/content
  resolution and after public API, preview, and site-asset exclusions.
- Public runtime tests cover 301/302/307/308 responses, disabled/no-match
  fallthrough, loop fail-closed behavior, and non-shadowing of public API,
  preview, and site assets.
- Redirect destinations are internal-only; absolute, protocol-relative, and
  backslash/network-path variants are rejected to prevent open redirects.
- The drawer now provides Radix `SheetTitle` and `SheetDescription` wiring.
- The table has cause-specific empty states, an inline create CTA for first
  setup, local pagination with truthful disabled/hidden state, keyboard-visible
  row actions, and a confirmed delete action.
- Focused Playwright CLI proof created a redirect through the drawer, verified
  the public 301 `Location`, deleted it through the visible row action, and saw
  zero browser console errors/warnings after the Vite optimize cache refresh.
- Admin route failures now map through `mapRedirectError` for
  `redirect_not_found`, `redirect_exists`, `redirect_invalid`,
  `redirect_target_external`, and `redirect_loop`.

## TASK-355 Follow-Up - 2026-06-02

- Redirects now hydrates from cached list data on revisit without forcing a
  foreground wait when fresh cache exists.
- Mutations revalidate in the background after the changed redirect is saved,
  toggled, or deleted.
- The primary action is the concise `Create` label.
- Single-row delete uses the shared destructive confirmation dialog instead of
  a native browser confirm.
- Selection and bulk enable/disable/delete controls are covered by the
  Redirects page Vitest suite.

## What Did Not Work

### [RESOLVED 2026-06-01] Admin redirects do not affect the public runtime

Evidence:

- The deep pass created a 301 redirect from a unique source path to a target
  path.
- Requesting the public source path returned HTTP 404 and the final URL stayed
  on the source path instead of redirecting to the target.

Why:

- The admin redirect service persists redirect rows.
- Source review did not find a public request lookup that checks the redirects
  table before resolving pages/content.

How to fix:

- Add a public runtime middleware/lookup before page/content resolution:
  normalize the request path, find an enabled redirect, and return a redirect
  response with the stored status code and destination.
- Add integration tests for 301/302/307/308, disabled redirects, no-match paths,
  and loop prevention.

### [RESOLVED 2026-06-01] Redirect drawer is missing Radix dialog accessibility wiring

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

### [RESOLVED 2026-06-01] Pagination buttons are placeholders

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

### [RESOLVED 2026-06-01] Delete exists in the API but not in the UI

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
- `core/admin/services/redirectsClient.ts`
- `core/server/routes/redirectRoutes.ts`
