# TASK-349: SEO Manager Tools Report Remediation
# FileName: TASK-349_SEO_Manager_Tools_Report_Remediation.md

**Priority:** High
**Category:** Admin Tools + SEO + Public Runtime + API + UI + QA + Docs
**Estimated Effort:** Very Large
**Dependencies:** TASK-347
**Status:** Done (2026-06-01)

---

## Overview

Close every SEO Manager finding from
`_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_SEO_MANAGER.md` plus SEO-specific
Claude UX feedback from
`_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_CLAUDE_UX_REVIEW.md`.

The report proves the admin page can audit real pages and persist title /
description into `seoDocuments`, but the public site does not consume those
documents. It also shows stale scoring after save, unused audit checkboxes,
UI-only controls, and weak empty/pre-scan states.

This family must decide and implement a single source of truth for public SEO
metadata. It must not keep `seoDocuments` as a misleading admin-only table while
the UI claims public SEO control.

## Source Findings

| Area | Current evidence | Owner files |
|---|---|---|
| Public runtime parity | `updateSeoDocumentById` persists into `seoDocuments`; `renderPublicPageHtmlInternal` currently reads root `publishedData.seo.description` / page render metadata instead of `seoDocuments`. | `core/services/seo/seoService.ts`, `core/server/publicSite.tsx`, `core/site/renderPublicPage.tsx`, `_docs/PAGE_MODEL.md` |
| Score drift | `updateSeoDocumentById` updates fields but does not recompute score/status/issues. | `core/services/seo/seoService.ts`, `tests/unit/seo/seoService.test.ts` |
| Audit scope | `SeoAuditDialog` uses uncontrolled checkboxes and calls `onRun()` without selected checks. | `core/admin/ui/seo/SeoAuditDialog.tsx`, `core/admin/ui/seo/SeoManagerPage.tsx`, `core/admin/services/seoClient.ts`, `core/server/routes/seoRoutes.ts` |
| Dead controls | Filter icon has no handler; Drawer `Discard` and `Add Keyword` are UI-only. | `core/admin/ui/seo/SeoManagerPage.tsx`, `core/admin/ui/seo/SeoDrawer.tsx` |
| Empty/pre-scan UX | `Global Scan: 0%` reads as stalled before a scan and `SeoTable` lacks a dedicated empty row. | `core/admin/ui/seo/SeoManagerPage.tsx`, `core/admin/ui/seo/SeoTable.tsx` |

## Sub-Tasks

- [x] TASK-349-01: SEO Public Runtime Metadata Parity
- [x] TASK-349-02: SEO Audit Scope and Scoring Recalculation Contract
- [x] TASK-349-03: SEO Manager UI-Only Controls and Empty-State UX
- [x] TASK-349-04: SEO Manager QA, Docs, and Closure

## Implementation Order

1. Land public runtime metadata parity first. The admin SEO surface is not
   truthful until public pages render the saved metadata.
2. Land scoring and audit scope changes second so saved rows immediately reflect
   current content.
3. Clean up UI-only controls and empty states after the backend contract is
   deterministic.
4. Close with Playwright evidence proving admin save -> public HTML parity.

## Security Contract

This umbrella adds no route by itself. Leaves may change internal admin SEO
routes and public read rendering:

- Endpoint visibility: `/admin/api/seo*` stays internal admin; public page
  rendering remains public read only.
- Auth model: admin routes use session cookie.
- RBAC: SEO read/audit keeps `content:read`; SEO writes keep `content:write`
  unless a leaf explicitly raises the permission with docs.
- CSRF: required for admin POST/PATCH via existing API client.
- Rate-limit bucket: `admin_read` for GET/audit reads as implemented by route
  method; `admin_write` for writes; public rendering uses `public_read`.
- Reject-unknown validation: all SEO update/audit payloads must keep
  `additionalProperties: false` and use explicit enums for audit checks.
- Anti-abuse: no public write surface; nonce/HMAC/reCAPTCHA not applicable.
- Secret handling: public HTML must not leak unpublished draft fields or
  privileged admin-only SEO diagnostics.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/seo/seoService.test.ts tests/unit/seo/seoSchema.test.ts`
- `bun test tests/integration/routes/seo.test.ts`
- Runtime/public HTML test for admin SEO save -> public page `<title>` and
  meta description output
- `bun run test:vitest -- tests/vitest/admin/seoClient.test.ts tests/vitest/ui/seo-manager.test.tsx`
- Focused Playwright pass for `/admin/seo` with an edited published page

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_SEO_MANAGER.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md`
- `docs/guide/screens/` SEO Manager guide if public SEO semantics change
- `_docs/CMS_API.md` and `_docs/PAGE_MODEL.md` if SEO precedence or audit
  payloads change
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New closure changelog when implementation is Done

## Acceptance Criteria

- SEO Manager changes affect public page SEO output or the UI is explicitly
  reworded to stop claiming public SEO control.
- Saving SEO recalculates or refreshes score/status/issues.
- Audit checkboxes either drive a scoped audit payload or are removed/disabled
  truthfully.
- Dead controls are wired, disabled, or removed.
- Empty/pre-scan states explain the actual state without implying a stalled
  scan.

## Closure Notes

Done (2026-06-01): SEO Manager saves now affect public page HTML, preserve and
recalculate saved SEO fields, clear public HTML cache, serialize strict audit
checks, remove or disable UI-only controls, and render truthful pre-scan/table
empty states. Focused Playwright proof covered `/admin/seo` audit + drawer save
-> public `<title>`/meta description output with temporary fixtures cleaned.
