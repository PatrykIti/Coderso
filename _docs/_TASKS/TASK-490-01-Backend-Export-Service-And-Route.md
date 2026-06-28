# TASK-490-01: Backend export builder service + route
# FileName: TASK-490-01-Backend-Export-Service-And-Route.md

**Parent Task:** TASK-490
**Priority:** Medium
**Category:** Forms / domain-service + admin-api
**Estimated Effort:** Small
**Dependencies:** None (reads the shipped `form_submissions` table + forms service). The route leaf (L02) depends on the builder leaf (L01).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

This subtask produces the server side of submissions export: a **pure-domain
builder** that serializes a form's submissions to CSV or JSON inside the
analytics-style envelope, and the **internal admin route** that exposes it under
`forms:read`. The route stays orchestration-only — all serialization, escaping,
column ordering, and the file-name/`contentType`/`totalRows` envelope live in the
forms service module; the route re-uses the existing `validate` dep and
`mapFormError` boundary.

- **Goal:** Add `GET /forms/:id/submissions/export?format=csv|json` returning
  `{ fileName, contentType, content, totalRows }`, backed by a tested domain
  builder.
- **Owning modules:** `core/services/forms/submissionExport.ts` (NEW — builder +
  envelope type), `core/server/validation/formSchemas.ts` (NEW strict export
  query schema), `core/server/routes/formsRoutes.ts` (route registration only).
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/TESTING_STRATEGY.md`.
- **Out of scope:** client method + UI (TASK-490-02); any write path; DB changes.

---

## Sub-Tasks

| ID | File | Title | Status |
|----|------|-------|--------|
| 490-01-L01 | `TASK-490-01-L01-Submission-Export-Builder-Service.md` | Submission export builder (CSV/JSON envelope) | ⏳ To Do |
| 490-01-L02 | `TASK-490-01-L02-Submissions-Export-Route-And-Schema.md` | Export route + strict query schema | ⏳ To Do |

**Implementation order:** L01 (builder + envelope type, fully unit-tested) →
L02 (route + schema that call into it). L02 imports the builder; never inlines
serialization.

---

## Dependencies

- L02 depends on L01 (the route calls `buildFormSubmissionsExport`).
- Both reuse shipped pieces only: `getForm`, `listFormFields`, `toFieldRecord`
  (`core/services/forms/formsService.ts`), `listSubmissions`
  (`core/services/forms/submissionService.ts`), `mapFormError` +
  `registerFormsRoutes` (`core/server/routes/formsRoutes.ts`), and the CSV
  escaping shape from `core/services/analytics/analyticsService.ts`.

---

## Testing Requirements

Lanes per `_docs/TESTING_STRATEGY.md`:

- **Vitest (pure domain):** builder unit tests under `tests/vitest/forms/`
  (CSV header = field labels in `orderIndex` order, escaping, formula-injection
  guard, JSON shape, `totalRows`, empty-submissions case, extra/unknown payload
  keys appended, `ip`/`userAgent` omitted).
- **Bun (route-integration / security):**
  `tests/integration/routes/forms.test.ts` (registration, `forms:read` arg,
  strict-query reject-unknown, `format` csv/json, `form_not_found` → 404),
  `tests/security/codersoSecurityGate.test.ts` (route visibility/permission
  bucket).
- `bun --cwd core lint`, `bun --cwd core lint:types`.
