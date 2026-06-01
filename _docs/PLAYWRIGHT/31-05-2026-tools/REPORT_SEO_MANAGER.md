# SEO Manager - Playwright Audit

Date: 31-05-2026  
Route: `/admin/seo`

## What Was Clicked

- Sidebar Tools -> SEO Manager.
- Status filters: All pages, Optimized, Needs work, Critical.
- Search input.
- SEO audit dialog.
- Audit checkboxes.
- Start Audit.
- Filter icon button.

## What Worked

- The route loaded successfully.
- Status filter buttons could be selected.
- Search input accepted text.
- SEO audit dialog opened.
- Audit checkboxes could be toggled visually.
- Start Audit called the backend and returned a successful response.

## What Did Not Work

### [ISSUE] Audit checkbox selections are not used

Evidence:

- Playwright toggled all audit options in the dialog.
- Starting the audit still called the audit action without any selected-check
  payload.

Why:

- `SeoAuditDialog` renders checks with `defaultChecked` and does not store the
  selected checks.
- `SeoAuditDialog` calls `onRun()` without arguments.
- `SeoManagerPage` calls `runSeoAudit()` without passing audit scope.

How to fix:

- Track selected audit check IDs in `SeoAuditDialog`.
- Change `onRun` to receive the selected check list.
- Extend the audit API schema if scoped audits are intended.
- Add a component/API test that toggles each check and asserts the outgoing
  payload.

### [ISSUE] Filter icon button has no behavior

Evidence:

- Playwright clicked the icon button near the SEO table controls.
- No menu, panel, URL change, or table change appeared.

Why:

- The button is rendered without an action handler in `SeoManagerPage`.

How to fix:

- Wire it to the intended advanced filter panel, or remove/disable it.
- Add a test that clicks the button and asserts the visible filter UI or disabled
  state.

### [ISSUE] Empty table state is weak

Evidence:

- The SEO table had no rows in this dataset after audit.
- The page did not expose a clear row-level "no pages found" message in the
  table body.

Why:

- `SeoTable` maps over items but does not render a dedicated empty fallback row.

How to fix:

- Add an explicit empty row such as "No SEO pages found".
- Include the active search/filter context in the empty message.
- Cover empty, filtered-empty, and populated states.

## Data Notes

- The local dataset had no SEO page records, so drawer editing could not be
  validated end-to-end from the UI.
- Source review shows additional drawer controls that should be checked with a
  populated fixture: Discard and Add Keyword currently appear to be UI-only.

## Source References

- `core/admin/ui/seo/SeoManagerPage.tsx`
- `core/admin/ui/seo/SeoAuditDialog.tsx`
- `core/admin/ui/seo/SeoTable.tsx`
- `core/admin/ui/seo/SeoDrawer.tsx`
- `core/admin/api/seoClient.ts`
- `core/server/routes/admin/seoRoutes.ts`

