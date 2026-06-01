# Tools Section Overview - Playwright Audit

Date: 31-05-2026  
Area: Admin Tools sidebar section  
Runtime: local dev admin UI on `http://localhost:5173/admin`

## Summary

All six Tools entries were reachable from the sidebar and loaded without a
fatal page crash:

- Search
- SEO Manager
- Analytics
- Backups
- Import / Export
- Redirects

The first pass was not deep enough: it clicked controls, but it did not prove
end-to-end behavior for every tool. A deeper follow-up pass on 2026-06-01 added
real fixtures and checked the actual backend/public effects.

Current classification:

- Works end-to-end: Search can find a real page fixture and now applies Date
  Range filtering through the API/service contract; SEO Manager saves now update
  public page HTML metadata and refresh scores; Analytics can surface a real
  published page in range-scoped Top Content and export that ranking as CSV;
  Backups enqueue metadata rows with a documented external-worker boundary,
  controlled include payloads, stateful pagination, disabled action reasons,
  and real metadata-row delete; Import / Export can roundtrip a valid JSON
  bundle.
- Partially works: Redirects save admin rows but do not affect public routing.
- Still UI-only/incomplete: Import / Export card options, Activity Log, Recent
  Imports search, and Redirects pagination. Search date range and Search
  empty-state / suggestion drift were
  closed by TASK-348 on 2026-06-01; SEO audit/filter/save drift was closed by
  TASK-349 on 2026-06-01; Analytics export/no-data/top-content range drift was
  closed by TASK-350 on 2026-06-01; Backups include/pagination/action-state
  drift was closed by TASK-351 on 2026-06-01.

## Evidence

- Playwright clicked each Tools sidebar link and confirmed the target route.
- Search, SEO, Analytics, Backups, Import / Export, and Redirects were exercised
  through their visible controls.
- API-backed writes were verified through response status and follow-up UI/API
  state where possible.
- Related source files were reviewed for each issue to distinguish data-empty
  states from broken UI wiring.
- Deep pass evidence:
  - Published page fixture was created, found in Search, edited in SEO Manager,
    surfaced in Analytics, and deleted after the pass.
  - TASK-349 follow-up proof on 2026-06-01 ran SEO Manager audit and drawer save
    through Playwright, then verified the public page `<title>` and meta
    description contained the saved SEO Manager values.
  - TASK-350 follow-up proof on 2026-06-01 verified Analytics empty no-data
    labels, a temporary published fixture across all visible date ranges,
    drawer CSV export, and zero browser console/page errors through a focused
    Chrome DevTools Protocol pass.
  - TASK-351 follow-up proof on 2026-06-01 verified Backups include request
    serialization, external-worker queued state, real pagination, disabled
    restore/download reasons, real delete, and zero browser console/page
    errors through a focused Chrome DevTools Protocol pass.
  - Import / Export valid JSON bundle was downloaded, modified, uploaded,
    previewed, applied, verified through export, and restored.
  - Redirect was created in the UI, checked against the public runtime, and
    deleted.

## Environment Notes

- `coderso-b.localhost` did not resolve from Node/Playwright
  (`getaddrinfo ENOTFOUND`). The same UI was tested through
  `http://localhost:5173/admin`.
- The admin was still in first-run setup. The audit completed setup through the
  settings API so the admin app could be opened normally.
- The provided credential note was stale for this checkout. To avoid changing a
  shared admin password, the audit created a temporary admin session through the
  backend auth service.
- Claude CLI was available and launched with permissions outside its sandbox, but
  it failed before useful work because its Anthropic API authentication returned
  `401 Invalid authentication credentials`.

## Cross-Cutting Findings

### [ISSUE] Several icon/buttons are visually actionable but have no behavior

Affected surfaces:

- Import / Export Activity Log button
- Import / Export per-card options chevron
- Redirects pagination buttons

Why it happens:

- The React components render buttons without `onClick` handlers, or with
  placeholder handlers that do not execute a real product action.

How to fix:

- Either wire the intended behavior end-to-end or remove/disable the control
  until the feature exists.
- Prefer visible disabled state plus `aria-disabled`/`disabled` for unavailable
  actions.
- Add regression tests that click these controls and assert the resulting menu,
  route, download, pagination, or disabled state.

### [ISSUE] Import / Export checkbox groups are uncontrolled and not sent to services

Affected surfaces:

- Import / Export include options

Why it happens:

- The UI uses `defaultChecked` and does not keep selected values in component
  state.
- Submit handlers call service methods without sending the selected options.

How to fix:

- Store checkbox state in the page/dialog component.
- Include selected options in the API payload or explicitly label them as static
  preview-only details.
- Add tests that toggle each option and assert the request payload.

### [ISSUE] Admin-saved data is not always connected to runtime behavior

Affected surfaces:

- Redirects

Evidence:

- Redirects persisted a 301 redirect row, but requesting the public source path
  returned 404 and stayed on the source URL.

How to fix:

- Add a public redirect lookup before public page/content resolution.

### [ISSUE] Pagination controls are placeholders

Affected surfaces:

- Redirects table

Why it happens:

- Buttons are rendered without pagination state, disabled rules, or request
  parameters.

How to fix:

- Add `page`, `limit`, `total`, and `hasNext`/`hasPrevious` support in the
  client contract.
- Disable pagination controls when pagination is not available.
- Cover first-page, middle-page, last-page, and empty-list states.

## Code Surfaces Reviewed

- `core/admin/ui/navigation/sidebarConfig.ts`
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/search/*`
- `core/admin/ui/seo/*`
- `core/admin/ui/analytics/*`
- `core/admin/ui/backups/*`
- `core/admin/ui/import-export/*`
- `core/admin/ui/redirects/*`
- `core/admin/services/*Client.ts`
- `core/server/routes/*Routes.ts`
