# TASK-353: Redirects Tools Report Remediation
# FileName: TASK-353_Redirects_Tools_Report_Remediation.md

**Priority:** High
**Category:** Admin Tools + Redirects + Public Runtime + API + UI + QA + Docs
**Estimated Effort:** Very Large
**Dependencies:** TASK-347
**Status:** Done (2026-06-01)

---

## Overview

Close every Redirects finding from
`_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_REDIRECTS.md` plus Redirects-specific
Claude UX feedback from
`_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_CLAUDE_UX_REVIEW.md`.

The report proves admin redirect CRUD/update/toggle works through the API, but
the product contract is incomplete:

- Admin redirects do not affect public runtime requests.
- Redirect drawer lacks Radix title/description wiring.
- Pagination buttons are placeholders.
- Empty state lacks an inline create CTA and shows pagination at zero rows.
- Delete exists in the API but not the UI.

## Source Findings

| Area | Current evidence | Owner files |
|---|---|---|
| Public runtime | `handlePublicRequest` resolves booking/search/assets/preview/pages/content without redirect lookup. | `core/server/publicSite.tsx`, `core/services/redirects/redirectService.ts` |
| Admin API | `deleteRedirect` and DELETE route exist, but UI exposes edit/toggle only. | `core/server/routes/redirectRoutes.ts`, `core/admin/services/redirectsClient.ts`, `core/admin/ui/redirects/RedirectsTable.tsx` |
| A11y | `RedirectDrawer` uses `SheetContent` without `SheetTitle`/`SheetDescription`. | `core/admin/ui/redirects/RedirectDrawer.tsx` |
| Pagination/empty | `RedirectsTable` always renders Previous/Next and no inline create CTA. | `core/admin/ui/redirects/RedirectsTable.tsx`, `core/admin/ui/redirects/RedirectsPage.tsx` |

## Sub-Tasks

- [x] TASK-353-01: Public Redirect Runtime Resolver and Loop Prevention
- [x] TASK-353-02: Redirects Drawer Accessibility, Empty State, and Pagination UX
- [x] TASK-353-03: Redirect Delete UI, Confirmation, and Cache/State Contract
- [x] TASK-353-04: Redirects QA, Docs, and Closure

## Closure Notes

Done (2026-06-01): enabled redirects now execute in public runtime with
supported 301/302/307/308 statuses, internal-only destination validation, loop
fail-closed behavior, route error mapping, drawer accessibility wiring,
truthful empty/pagination state, cached list hydration, selection plus bulk
enable/disable/delete actions, confirmed delete UI, docs, reports, and
changelog 1042.

## Implementation Order

1. Land public runtime redirect resolution first; admin rows must affect public
   requests before polish can claim functional completion.
2. Land drawer accessibility and table empty/pagination UX.
3. Add delete UI and confirm destructive state handling.
4. Close with public HTTP tests for all status codes and Playwright admin proof.

## Security Contract

Redirects bridge internal admin writes and public read behavior:

- Endpoint visibility: admin CRUD is internal; redirect execution is public
  read and must not expose admin data.
- Auth model: admin CRUD uses session cookie.
- RBAC: `settings:read` for list; `settings:write` for create/update/delete.
- CSRF: required for POST/PATCH/DELETE.
- Rate-limit bucket: `admin_read`/`admin_write` for admin routes and
  `public_read` for public redirect lookup.
- Reject-unknown validation: strict path/status/enabled schemas, clamped
  pagination, and safe destination validation.
- Anti-abuse: no public write.
- Loop/open-redirect hardening: prevent redirect loops, unsafe source paths,
  and unsafe external destinations per product policy.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/redirects/redirectService.test.ts`
- `bun test tests/integration/routes/redirects.test.ts`
- Bun runtime/public tests for 301/302/307/308, disabled redirects, no-match
  paths, and loop prevention
- `bun run test:vitest -- tests/vitest/admin/redirectsClient.test.ts tests/vitest/ui/redirects.test.tsx tests/vitest/ui/redirects-page-leaf.test.tsx`
- Focused Playwright pass for `/admin/redirects`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_REDIRECTS.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md`
- Redirects user guide if public runtime/delete/pagination behavior changes
- `_docs/CMS_API.md`, `_docs/ARCHITECTURE.md`, and `_docs/SECURITY_SPEC.md` for
  public redirect execution, loop/open-redirect policy, delete/pagination
  shape, and error mapping
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` for Redirects list
  cache hydration and cache-bus patching on create/update/delete
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Enabled admin redirect rows affect public HTTP responses.
- Disabled/no-match/loop cases are safe and tested.
- Drawer opens without Radix accessibility console errors.
- Pagination and delete controls are no longer placeholders or hidden API-only
  behavior.
- Route registration and `mapRedirectError` coverage prove known redirect
  failures are machine-readable at the route boundary.
- Redirects list state hydrates from cache on revisit and still broadcasts
  create/update/delete changes that affect public routing.
