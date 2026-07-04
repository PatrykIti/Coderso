# TASK-490-02-L01: `exportFormSubmissions` client method
# FileName: TASK-490-02-L01-Forms-Client-Export-Method.md

**Parent Subtask:** TASK-490-02
**Priority:** Medium
**Category:** Forms / admin-client
**Estimated Effort:** Small
**Dependencies:** TASK-490-01-L02 (the export route must exist).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Add `exportFormSubmissions(formId, format)` to the forms admin client
  that GETs the export route and returns the typed envelope, mirroring
  `analyticsClient.exportTopContent`.
- **Owning module(s) to create-or-extend:** `core/admin/services/formsClient.ts`
  (new exported type `FormSubmissionsExport` + function `exportFormSubmissions`).
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/TESTING_STRATEGY.md`.
- **Out-of-scope:** the UI button (L02); any caching (export must NOT be cached —
  it is a fresh, side-effect-free download, exactly like `listFormSubmissions`,
  which deliberately has no cache key).

---

## Security Contract

- **Endpoint visibility:** `internal` — calls `apiRequest("/forms/:id/submissions/export?...")`
  which the admin `apiClient` prefixes with `/admin/api`.
- **Auth model / RBAC:** the session cookie travels with `apiRequest`; the server
  enforces `forms:read`. The client adds no auth of its own.
- **CSRF:** N/A — `GET` (no `{ withCsrf: true }`, matching the other forms read
  methods such as `listFormSubmissions`).
- **Rate-limit bucket:** server-side `admin_read`; the client does not retry.
- **Validation:** `format` is constrained to the `FormSubmissionsExportFormat`
  union at the type level; the value is `encodeURIComponent`-safe (`csv`/`json`).
- **Anti-abuse for public writes:** N/A — internal read.
- **Secret/PII handling:** the returned `content` may contain submission answers;
  it is **not** persisted to `localStorage`/cache (no `writeLocalCache` call) and
  is never logged. It is handed straight to the UI for a one-shot download.

---

## Implementation Pseudocode

### `core/admin/services/formsClient.ts` (append)

```ts
export type FormSubmissionsExportFormat = "csv" | "json";

export type FormSubmissionsExport = {
  fileName: string;
  contentType: "text/csv" | "application/json";
  content: string;
  totalRows: number;
};

export async function exportFormSubmissions(
  formId: string,
  format: FormSubmissionsExportFormat = "csv",
) {
  const params = new URLSearchParams({ format });
  return apiRequest<FormSubmissionsExport>(
    `/forms/${formId}/submissions/export?${params}`,
    { method: "GET" },
  );
}
```

**Data flow:** `formId, format` → `apiRequest` GET (no CSRF, no cache write) →
typed `FormSubmissionsExport` returned to the caller (L02).

**Error handling:** `apiRequest` throws `ApiClientError` on non-2xx (e.g. 404
`form_not_found`, 400 `validation_error`); the UI catches it via
`isApiClientError`. The client does no error mapping itself.

**Regression-test shape (Vitest):** stub `apiRequest`; assert the URL is
`/forms/<id>/submissions/export?format=csv` (and `=json`), that the resolved
envelope is returned verbatim, and that an `ApiClientError` propagates.

---

## Testing Requirements

Lane: **Vitest (pure admin client)**.

- Extend `tests/vitest/admin/formsClient.test.ts`:
  - `exportFormSubmissions(id)` defaults to `format=csv` and hits the export URL;
  - `exportFormSubmissions(id, "json")` sets `format=json`;
  - returns the envelope object unchanged;
  - does **not** write to local cache (assert no `writeLocalCache` for export);
  - a rejected `apiRequest` propagates as `ApiClientError`.
- Gates: `bun --cwd core lint`, `bun --cwd core lint:types`.
