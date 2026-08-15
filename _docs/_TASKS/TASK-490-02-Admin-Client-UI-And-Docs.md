# TASK-490-02: Admin client, submissions-page actions & docs
# FileName: TASK-490-02-Admin-Client-UI-And-Docs.md

**Parent Task:** TASK-490
**Priority:** Medium
**Category:** Forms / admin-ui + docs
**Estimated Effort:** Small
**Dependencies:** TASK-490-01 (the export route + envelope must exist before the client/UI can call it).
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

This subtask wires the shipped backend export into the admin: an `apiRequest`
client method, two header actions on the submissions viewer (**Export CSV** /
**Export JSON**) that build the browser download from the JSON envelope, and the
doc updates that close the feature.

- **Goal:** Let an admin download a form's submissions as CSV or JSON from
  `FormSubmissionsPage`, using the analytics download pattern, and document the
  new route.
- **Owning modules:** `core/admin/services/formsClient.ts` (new
  `exportFormSubmissions`), `core/admin/ui/forms/FormSubmissionsPage.tsx`
  (header actions + download helper), `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`.
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/TESTING_STRATEGY.md`.
- **Out of scope:** the route/service (TASK-490-01); any new screen; server-side
  filtering.

---

## Sub-Tasks

| ID | File | Title | Status |
|----|------|-------|--------|
| 490-02-L01 | `TASK-490-02-L01-Forms-Client-Export-Method.md` | `exportFormSubmissions` client method | ⏳ To Do |
| 490-02-L02 | `TASK-490-02-L02-Submissions-Page-Export-Buttons.md` | Export CSV/JSON actions on the submissions page | ⏳ To Do |
| 490-02-L03 | `TASK-490-02-L03-Docs-And-Closure.md` | CMS_API + SECURITY_SPEC docs & closure | ⏳ To Do |

**Implementation order:** L01 (client) → L02 (UI consumes the client) → L03 (docs
reflect the shipped contract).

---

## Dependencies

- All three leaves depend on TASK-490-01 having shipped the route + envelope.
- L02 depends on L01 (`exportFormSubmissions`).
- L03 depends on L01 + L02 (documents the real, shipped shape).

---

## Testing Requirements

Lanes per `_docs/TESTING_STRATEGY.md` — all **Vitest** (pure TS client + admin-UI
render flow; no runtime/DB/plugin dependency):

- `tests/vitest/admin/formsClient.test.ts` — `exportFormSubmissions` requests the
  right URL/query, returns the envelope, surfaces `ApiClientError`.
- `tests/vitest/ui/form-submissions-page.test.tsx` — Export buttons present,
  disabled while loading / when there are no submissions, invoke the client per
  format, trigger the Blob/anchor download, and surface export errors.
- L03 is docs-only (no test lane); verified by the board/closure checklist.
- Gates: `bun --cwd core lint`, `bun --cwd core lint:types`.
