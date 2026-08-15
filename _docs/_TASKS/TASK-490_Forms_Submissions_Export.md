# TASK-490: Forms — Submissions Export (CSV/JSON)
# FileName: TASK-490_Forms_Submissions_Export.md

**Priority:** Medium
**Category:** Forms
**Estimated Effort:** Small
**Dependencies:** None. Builds on the shipped read surface (`GET /forms/:id/submissions`, `core/services/forms/submissionService.ts`, `core/admin/ui/forms/FormSubmissionsPage.tsx`) and reuses the established analytics CSV export pattern (`core/services/analytics/analyticsService.ts` → JSON envelope → client Blob download). No DB change.
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Business Goal

Form owners can already *view* responses but cannot get them out of the CMS.
`core/admin/ui/forms/FormSubmissionsPage.tsx` is a strictly read-only viewer — its
only header actions are **Back to form** and **Refresh**, and it paginates a
single in-memory `listFormSubmissions(formId)` result client-side. There is no
download, no spreadsheet hand-off, and no machine-readable feed for downstream
tooling.

This task adds **Submissions Export** so an admin can download a form's responses
as **CSV** (spreadsheet-friendly, one column per form field using the field
*label*) or **JSON** (the submission read-model, for scripts/integrations). It
follows the only existing export precedent in the codebase — the Analytics
top-content export — which returns the file payload in a **JSON envelope**
(`{ fileName, contentType, content, totalRows }`) so the admin UI builds the
browser download client-side (see `core/admin/ui/analytics/TopPagesDrawer.tsx`
`downloadTextFile`). No new data surface is introduced: the export carries a
**subset** of what `forms:read` already returns via `GET /forms/:id/submissions`.

---

## Scope

### In scope

- A new internal admin read route:
  `GET /forms/:id/submissions/export?format=csv|json`
  (`core/server/routes/formsRoutes.ts`), gated `forms:read`, returning the
  analytics-style JSON envelope.
- A pure-domain export builder in the forms service
  (`core/services/forms/submissionExport.ts`) that turns the form's fields +
  submissions into CSV (field-label columns, escaped) or JSON, with the file
  name/`contentType`/`totalRows` envelope.
- A strict export query schema owned in `core/server/validation/formSchemas.ts`
  (`format` enum, reject-unknown), validated at the route boundary.
- An admin client method `exportFormSubmissions(formId, format)` in
  `core/admin/services/formsClient.ts`.
- **Export CSV / Export JSON** actions in `FormSubmissionsPage.tsx`, reusing the
  same Blob/anchor download helper shape as `TopPagesDrawer`.
- Docs: `_docs/CMS_API.md` Forms section (new route + envelope) and a one-line
  confirmation in `_docs/SECURITY_SPEC.md` that the route is an internal
  `admin_read` GET (no CSRF, `forms:read`).

### Out of scope

- Any change to the submission write/automation pipeline
  (`handleFormSubmissionRoute`, `runFormAutomation`, action runs).
- Server-side filtering/pagination/date-range of the export (the export mirrors
  `listSubmissions` — newest-first, all rows). A `limit`/range param is a
  possible future follow-up, intentionally deferred (YAGNI).
- Action-run / diagnostics export (`form_action_runs`).
- Streaming `Content-Disposition`/`Bun.file` responses — see **Notes**; the
  codebase ships CSV via the JSON-envelope pattern, and this task conforms to it.
- Any DB schema change. **No migration artifacts are required** — this is a pure
  read over the existing `form_submissions` table (`core/db/schema.ts`).

### What the TASK-479 reskin already covers vs what this task adds

The TASK-479 admin redesign reskins the *chrome* (sidebar, `AdminShell`,
`PageHeader`, cards) and re-themes the existing submissions viewer. It does **not**
add any export capability — `FormSubmissionsPage.tsx` remains Back/Refresh-only
after the reskin. **TASK-490 is the feature counterpart**: it adds the export
service, route, client method, and the two download actions. The new buttons live
in the existing `PageHeader` `actions` slot, so they inherit the 479 styling with
no extra layout work.

---

## Sub-Tasks

| Subtask | Title | Effort | Status |
|---------|-------|--------|--------|
| TASK-490-01 | Backend export builder service + route | Small | ⏳ To Do |
| TASK-490-02 | Admin client, submissions-page actions & docs | Small | ⏳ To Do |

**Implementation order:** 01 (domain builder → route/schema) must land before 02
(the client method and UI consume the route; docs close the feature).

---

## Testing Requirements

Lanes follow `_docs/TESTING_STRATEGY.md`, chosen by dependency shape:

- **Bun (route-integration):** the new route registration, RBAC arg
  (`requirePermission("forms:read")`, proving the export is gated and has no public
  surface), strict-query reject-unknown, `format` handling, and `form_not_found`
  mapping — all in `tests/integration/routes/forms.test.ts`. (Not
  `tests/security/codersoSecurityGate.test.ts`: that file is a pure service-level
  gate over submission/booking access + nonce + rate-limit defaults and registers
  no routes, so it cannot host a route-permission/bucket assertion.)
- **Vitest (pure domain + admin client + UI):** the CSV/JSON builder
  (`tests/vitest/forms/*`), the client method (`tests/vitest/admin/formsClient.test.ts`),
  and the page actions (`tests/vitest/ui/form-submissions-page.test.tsx`).
- Gates: `bun --cwd core lint`, `bun --cwd core lint:types`.
- No DB-backed migration lane (no schema change). DB-touching route tests still
  load env first: `set -a && source .env && set +a`.

---

## Documentation Updates Required

- `_docs/CMS_API.md` — add `GET /forms/:id/submissions/export?format=csv|json`
  to the Forms endpoint list and document the JSON envelope + column rules
  (mirrors the analytics export doc block).
- `_docs/SECURITY_SPEC.md` — note the route under the internal `admin_read`,
  `forms:read`, no-CSRF GET reads (one line alongside the other admin reads).
- `_docs/_TASKS/README.md` — board bucket + statistics (**orchestrator-synced; do
  not hand-edit in this task**).
- `_docs/_CHANGELOG/` — task-linked entry on closure (**created by the orchestrator,
  not in this task**).

---

## Notes

- **Pattern correction (verified in code):** the discovery brief described the
  route as "server-streamed … content-disposition". The actual and only CSV
  export precedent in this repo (`exportTopContentCsv` →
  `core/server/routes/analyticsRoutes.ts` → `apiRequest<TopContentExport>` →
  `downloadTextFile`) returns a **JSON envelope** and the **client** creates the
  Blob/anchor download; `_docs/CMS_API.md` documents this explicitly
  ("returns the file payload in a JSON envelope so the admin UI can create the
  browser download"). The access-log and audit exports use the same envelope
  shape (`AccessLogExportFileResponse`, `auditExport`). This task conforms to
  that established pattern rather than introducing a one-off streaming response —
  DRY/KISS and consistent with the admin client transport (`apiRequest` parses
  JSON, not raw bodies).
- **PII posture:** the export carries a **subset** of the existing
  `GET /forms/:id/submissions` read-model. `ip` / `userAgent` (the only PII-ish
  columns on `FormSubmission`) are **omitted** from both CSV and JSON so the
  export never widens the data surface the screen shows; they remain reachable
  only via the raw submissions read API. Decided per leaf Security Contracts.
- CSV cell escaping reuses the proven formula from
  `analyticsService.ts` (`escapeCsvCell` — quote/`,`/CR/LF wrapping + leading
  `=,+,-,@` formula-injection guard), owned locally in the forms domain to match
  the existing precedent where analytics/access/audit each own their own escaper.
