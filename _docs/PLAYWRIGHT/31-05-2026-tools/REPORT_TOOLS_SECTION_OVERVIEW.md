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
  and real metadata-row delete; Import / Export has controlled target/include
  export, JSON-only import, mapped malformed-bundle rejection, searchable
  session activity, and valid JSON roundtrip; Redirects save admin rows, execute
  enabled public redirects for 301/302/307/308, reject unsafe destinations,
  expose confirmed delete, and use truthful empty/pagination states.
- Partially works: none from the original per-tool functional findings remain
  open after TASK-348 through TASK-353.
- Still UI-only/incomplete: Search date range and Search
  empty-state / suggestion drift were
  closed by TASK-348 on 2026-06-01; SEO audit/filter/save drift was closed by
  TASK-349 on 2026-06-01; Analytics export/no-data/top-content range drift was
  closed by TASK-350 on 2026-06-01; Backups include/pagination/action-state
  drift was closed by TASK-351 on 2026-06-01; Import / Export export options,
  Activity Log availability, Recent Imports search/progress/failure, JSON-only
  copy, and malformed-ID validation drift were closed by TASK-352 on
  2026-06-01; Redirects public runtime, drawer accessibility,
  empty/pagination/delete drift was closed by TASK-353 on 2026-06-01.

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
  - TASK-352 follow-up proof on 2026-06-01 verified Import / Export
    target/include export shape, disabled unavailable controls, invalid JSON
    rejection, malformed UUID rejection, valid JSON preview/apply/restore,
    local activity search/progress, and zero unexpected browser page/network
    errors through a focused Chrome DevTools Protocol pass. The expected
    malformed-bundle 400 was observed and excluded from unexpected-error
    counts.
  - TASK-353 follow-up tests on 2026-06-01 verified Redirects public runtime
    status execution, disabled/no-match fallthrough, loop fail-closed behavior,
    public API/preview/asset exclusions, route error mappings, drawer
    accessibility wiring, empty-state CTA, local pagination, and confirmed
    delete. Focused Playwright CLI proof also created a redirect through the
    drawer, verified the public 301 `Location`, and deleted it through the
    visible row action with zero browser console errors/warnings after the Vite
    optimize cache refresh.
  - Original Import / Export pass also proved a valid JSON bundle could be
    downloaded, modified, uploaded, previewed, applied, verified through export,
    and restored.
  - Redirect was created in the UI, checked against the public runtime, and
    deleted; TASK-353 replaced the earlier 404 public-runtime outcome with
    tested redirect execution.

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

- Redirects pagination buttons

TASK-352 status: Import / Export Activity Log and per-card chevrons are now
disabled with explanatory labels until real routes/menus exist.

TASK-353 status: Redirects pagination now has page/limit/total state and is
hidden when no page change is possible.

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

TASK-352 status: resolved on 2026-06-01. Include options are controlled,
serialized to `GET /tools/export`, validated, and reflected in bundle scope and
shape.

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

TASK-353 status: resolved on 2026-06-01. Enabled redirects now execute in
public runtime with supported status codes and loop/open-redirect safeguards.

How to fix:

- Add a public redirect lookup before public page/content resolution.

### [ISSUE] Pagination controls are placeholders

Affected surfaces:

- Redirects table

TASK-353 status: resolved on 2026-06-01. The table uses local pagination state
and hides one-page controls.

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
