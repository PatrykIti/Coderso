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
- Deep pass: a published page fixture appeared in the SEO table after audit.
- Deep pass: editing Meta Title and Meta Description in the drawer sent
  `PATCH /seo/:id` and persisted the new values in the SEO document.

## Resolution Notes - 2026-06-01

- Resolved by TASK-349. Public page rendering now resolves published page SEO
  metadata from `seoDocuments` first, then falls back to published page SEO data
  and page title. Runtime preview remains draft-local and does not read SEO
  Manager documents.
- `PATCH /seo/:id` now preserves omitted canonical/robots fields, recalculates
  score/status/issues, and clears the server-side public HTML cache.
- `/seo/audit` now accepts strict selected checks (`meta`, `links`, `robots`);
  unknown checks and empty arrays are rejected before service execution.
- The audit dialog checkboxes are controlled and serialized to the API. The
  unsupported social/performance checks were removed from the active dialog.
- The filter icon is disabled instead of clickable, the drawer `Discard` button
  resets local edits, keyword authoring no longer shows as a no-op control, and
  the table renders a dedicated empty row with a real audit CTA.
- Final focused Playwright proof on 2026-06-01 used a temporary published page
  fixture through `/admin/seo`, ran audit, saved title/description in the
  drawer, and verified the public page HTML contained the saved `<title>` and
  meta description with no browser console errors. The fixture was deleted after
  the pass.
- TASK-355 follow-up on 2026-06-02 repeated the public-runtime proof through
  the running CMS HTTP stack after priming the page HTML cache. The saved SEO
  Manager document rendered in public HTML `<title>`, meta description,
  canonical URL, and robots metadata; the temporary page and orphaned TASK-355
  SEO docs were cleaned up after the pass.

## Original Findings Closed by TASK-349

### [ISSUE] SEO Manager metadata does not update the public page output

Evidence:

- The deep pass saved a unique Meta Title and Meta Description for a real
  published page.
- A follow-up `GET /seo` confirmed both values persisted in `seoDocuments`.
- Loading the public page returned HTTP 200, but the rendered HTML did not
  contain the SEO Manager title or description.

Why:

- `SeoManagerPage` updates the SEO route/service (`seoDocuments`).
- The public page renderer reads page data/published data; no public render path
  was found that consumes `seoDocuments`.

How to fix:

- Either wire public rendering to resolve SEO metadata from `seoDocuments`, or
  synchronize SEO Manager saves back into the page SEO data used by the public
  renderer.
- Add a regression test that edits SEO in the admin UI, loads the public page,
  and asserts the title/meta description.

### [ISSUE] Saving SEO does not recompute score/issues immediately

Evidence:

- The save response persisted the new description but still returned the stale
  audit score/issues from before the edit.

Why:

- `updateSeoDocumentById` writes title/description/canonical/robots and returns
  the row without recalculating score/status/issues.
- `runSeoAudit` owns scoring separately.

How to fix:

- Recompute score/status/issues during save, or trigger a scoped audit after a
  successful save and refresh the drawer/table from the audited row.

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

- The deep pass used a real page fixture. Drawer editing is now verified for
  title/description persistence into `seoDocuments`.
- Public runtime SEO is now verified through Bun runtime coverage and a focused
  Playwright admin save -> public HTML pass.
- Drawer no-op drift is closed: `Discard` resets drafts and focus keyword
  authoring is not exposed as a clickable placeholder.

## Source References

- `core/admin/ui/seo/SeoManagerPage.tsx`
- `core/admin/ui/seo/SeoAuditDialog.tsx`
- `core/admin/ui/seo/SeoTable.tsx`
- `core/admin/ui/seo/SeoDrawer.tsx`
- `core/admin/services/seoClient.ts`
- `core/server/routes/seoRoutes.ts`
