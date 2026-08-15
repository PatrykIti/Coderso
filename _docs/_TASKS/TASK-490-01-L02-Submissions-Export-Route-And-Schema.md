# TASK-490-01-L02: Export route + strict query schema
# FileName: TASK-490-01-L02-Submissions-Export-Route-And-Schema.md

**Parent Subtask:** TASK-490-01
**Priority:** Medium
**Category:** Forms / admin-api
**Estimated Effort:** Small
**Dependencies:** TASK-490-01-L01 (`buildFormSubmissionsExport` + `FormSubmissionsExport`).
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Register `GET /forms/:id/submissions/export?format=csv|json` in the
  forms router, gated `forms:read`, with a strict query schema (reject-unknown,
  `format` enum, default `csv`) and the existing `mapFormError` boundary. The
  handler is orchestration-only: validate → call the L01 builder → return the
  envelope.
- **Owning module(s) to create-or-extend:** `core/server/routes/formsRoutes.ts`
  (add the route inside `registerFormsRoutes`), `core/server/validation/formSchemas.ts`
  (add `formSubmissionsExportQuerySchema`). The schema is **owned** in
  `formSchemas.ts` alongside the other form route schemas; the route imports it,
  never re-declares it.
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/TESTING_STRATEGY.md`.
- **Out-of-scope:** the serialization itself (L01); the client/UI (TASK-490-02);
  DB changes (none — no migration artifacts).

---

## Security Contract

- **Endpoint visibility:** `internal` — `/admin/api/forms/:id/submissions/export`
  (the admin `apiClient` prefixes `/admin/api`; the route file registers the bare
  path `/forms/:id/submissions/export`, exactly like the sibling
  `/forms/:id/submissions`). No public surface; the public submit handler
  (`handleFormSubmissionRoute`) is untouched.
- **Auth model:** admin session cookie (same as every other `forms:*` route in
  `registerFormsRoutes`). No API-key scope is exposed for export.
- **RBAC:** `requirePermission("forms:read")` — identical to the existing
  `GET /forms/:id/submissions` read it derives from. No new permission.
- **CSRF:** N/A — read-only `GET`. Per `_docs/SECURITY_SPEC.md` admin GETs do not
  carry CSRF.
- **Rate-limit bucket:** `admin_read` (`core/server/middleware/rateLimit.ts`;
  buckets enumerated in `_docs/SECURITY_SPEC.md`).
- **Validation schema-owner + reject-unknown:** `formSubmissionsExportQuerySchema`
  in `core/server/validation/formSchemas.ts` with `additionalProperties: false`
  and `format` constrained to `["csv","json"]`. Unknown query params are rejected
  before the handler runs (mirror the analytics `assertKnownQuery` guard so the
  raw query string — not just the coerced payload — is strict). Validation runs at
  the route boundary via the injected `validate` dep.
- **Anti-abuse for public writes:** N/A — internal authenticated GET read, not a
  public write; no nonce/HMAC/captcha applies. (The submit route's bot-protection
  path is untouched.)
- **Secret/PII handling:** the envelope carries only the L01 builder output, which
  already omits `ip`/`userAgent` and contains no secrets. The route logs nothing
  beyond the standard request log; the `content` string is never written to a
  server log.

---

## Implementation Pseudocode

### Schema (`core/server/validation/formSchemas.ts`, append)

```ts
export const formSubmissionsExportQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["format"],
  properties: {
    format: { type: "string", enum: ["csv", "json"] },
  },
};
```

### Route (`core/server/routes/formsRoutes.ts`, inside `registerFormsRoutes`)

```ts
import { buildFormSubmissionsExport } from "../../services/forms/submissionExport";
import {
  formCreateSchema,
  formFieldsSchema,
  formSubmissionsExportQuerySchema, // NEW
  formSubmissionSchema,
  formUpdateSchema,
} from "../validation/formSchemas";

// Strict query guard (mirrors analyticsRoutes.assertKnownQuery): reject any
// query key other than `format` BEFORE coercion, so unknown params 400.
const EXPORT_QUERY_KEYS = new Set(["format"]);
const assertKnownExportQuery = (query: Record<string, string | undefined>) => {
  const unknown = Object.keys(query).find((k) => query[k] !== undefined && !EXPORT_QUERY_KEYS.has(k));
  if (unknown) {
    throw new ApiError("validation_error", "Invalid payload", 400, [
      { path: unknown, message: "must NOT have additional properties", keyword: "additionalProperties" },
    ]);
  }
};

// register order: keep this BEFORE the param-y `/forms/:id/submissions` only if
// the router does longest-match; this codebase's router matches exact static
// segments, so `/forms/:id/submissions/export` and `/forms/:id/submissions` do
// not collide. Register alongside the other submissions routes.
router.get("/forms/:id/submissions/export", requirePermission("forms:read"), async (ctx) => {
  assertKnownExportQuery(ctx.query);
  const format = ctx.query.format ?? "csv";
  validate(formSubmissionsExportQuerySchema, { format }); // enum + reject-unknown
  try {
    return await buildFormSubmissionsExport(ctx.params.id, format as "csv" | "json");
  } catch (error) {
    throwMappedFormError(error); // existing helper: form_not_found -> 404, else rethrow
  }
});
```

**Data flow:** request → permission/rate-limit middleware (`admin_read`) →
`assertKnownExportQuery` (raw strict) → `validate(schema)` (enum) → L01 builder →
JSON envelope serialized by the framework as `application/json` (the admin client
parses it; the UI turns `content` into the Blob download).

**Error handling:** domain errors flow through the existing
`throwMappedFormError`/`mapFormError` boundary — `form_not_found` → `ApiError(404)`.
Bad/missing/extra query → `validation_error` 400 (no new error code needed; the
analytics export sets the precedent of relying on schema validation for `format`).

**Regression-test shape (Bun route lane):** drive `registerFormsRoutes` with a
fake router/deps (as `tests/integration/routes/forms.test.ts` already does) and
assert: the route is registered with `requirePermission("forms:read")`; `?format=csv`
returns `contentType: "text/csv"` + header row; `?format=json` returns
`application/json` + parseable array; unknown query key → 400
`additionalProperties`; `?format=xml` → 400 enum; unknown `:id` → 404
`form_not_found`.

---

## Testing Requirements

Lane: **Bun (route-integration)** — runtime route wiring + RBAC. The route's
permission/no-public-exposure posture is asserted here (route registration +
`requirePermission("forms:read")`), NOT in `tests/security/codersoSecurityGate.test.ts`
— that file is a pure service-level gate (submission/booking access, nonce,
rate-limit defaults) and imports no route registration, so it cannot host a
route-permission/bucket assertion.

- Extend `tests/integration/routes/forms.test.ts`:
  - route registered with `requirePermission("forms:read")` (gated, not anonymous
    — proves there is no public export surface), exactly like the sibling
    `GET /forms/:id/submissions`;
  - CSV path → `text/csv` envelope with the `Submission ID,Received At,Status,...`
    header;
  - JSON path → `application/json` envelope, `JSON.parse(content)` is an array
    without `ip`/`userAgent`;
  - strict query: unknown param → 400 `validation_error`/`additionalProperties`;
    `format` not in enum → 400; missing `format` defaults to `csv`;
  - `form_not_found` → 404.
- DB-backed route tests load env first: `set -a && source .env && set +a`.
- Gates: `bun --cwd core lint`, `bun --cwd core lint:types`.
- **No DB schema change → no migration artifacts** (`*.sql` / `meta/*_snapshot.json`
  / `meta/_journal.json`) are required for this leaf.
