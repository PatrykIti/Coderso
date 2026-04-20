# TASK-191-01: Pages Admin Route Contract and Security Coverage
# FileName: TASK-191-01_Pages_Admin_Route_Contract_and_Security_Coverage.md

**Priority:** High
**Category:** QA + CMS/Pages + Admin API
**Estimated Effort:** Medium
**Dependencies:** TASK-191
**Status:** To Do

---

## Overview

Expand Bun-owned coverage for `core/server/routes/pageRoutes.ts` beyond route
registration.

The current route test only verifies that endpoints are registered. It does not
exercise handler behavior, required permissions, validation calls, not-found
paths, auth-required paths, audit calls, or revision discard restrictions.

This task should add focused route handler tests without turning them into a
full HTTP server suite unless needed for CSRF/rate-limit coverage. Use injected
dependencies/mocks where possible, and use real HTTP middleware tests only for
CSRF/rate-limit assertions that live outside `pageRoutes.ts`.

## Sub-Tasks

- Capture the registered handler chain for each `/pages*` route and assert the
  expected `requirePermission` values:
  - `content:read`: list, template options, detail, preview, revisions list.
  - `content:write`: create, patch, autosave, duplicate, delete, restore,
    discard autosave revision.
  - `content:publish`: publish, unpublish.
- Exercise handler happy paths with mocked service functions or an isolated DB
  fixture, depending on import shape.
- Add validation-call assertions for create/update/autosave/publish/preview.
- Cover known route errors:
  - `page_not_found` for detail/update/preview/publish/unpublish/duplicate/delete.
  - `auth_required` for autosave/publish without `ctx.user.id`.
  - `revision_not_found` for restore/discard.
  - `revision_delete_forbidden` for deleting non-autosave revisions.
- Cover audit side effects for publish, delete, restore, and autosave discard.
- Add explicit route registration assertion for the current endpoint list so
  future route drift stays visible.

## Security Contract

- Visibility: internal admin API only (`/admin/api/pages*`).
- Auth model: authenticated admin session / admin API key where supported by the
  shared admin API layer.
- RBAC:
  - `content:read` for reads and preview token creation.
  - `content:write` for draft mutations, autosave, duplicate, delete, restore,
    and autosave discard.
  - `content:publish` for publish/unpublish.
- CSRF: mutating routes must be protected by the shared admin HTTP middleware;
  add HTTP-level coverage if no existing test proves `/admin/api/pages*`
  participates in that middleware.
- Rate-limit bucket: `admin_read` for read methods, `admin_write` for mutating
  methods through `httpServer`.
- Reject-unknown validation: create/update/autosave/publish/preview payloads
  must reject unknown fields through `pageSchemas`.
- Anti-abuse: destructive route tests must create disposable pages and clean up.
- Public write hardening: not applicable; no public write endpoint is added.
  Nonce/signature/HMAC and reCAPTCHA are not applicable.

## Testing Requirements

- Update or add Bun tests near:
  - `tests/integration/routes/pages.test.ts`
  - optionally `tests/integration/routes/pages-security.test.ts`
- Run:
  - `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts`
  - `set -a && source .env && set +a && bun test tests/unit/pages`
- If HTTP-level CSRF/rate-limit coverage is added, run the exact new suite and
  any impacted `tests/security/*` suite.

## Documentation Updates Required

- `_docs/CMS_API.md` only if observed route behavior differs from the current
  documented contract.
- `_docs/SECURITY_SPEC.md` only if route security expectations change.
- `_docs/_TASKS/README.md` when status changes.
- `_docs/_CHANGELOG/*` on completion.
