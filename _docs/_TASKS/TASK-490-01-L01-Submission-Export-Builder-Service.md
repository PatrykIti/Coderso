# TASK-490-01-L01: Submission export builder (CSV/JSON envelope)
# FileName: TASK-490-01-L01-Submission-Export-Builder-Service.md

**Parent Subtask:** TASK-490-01
**Priority:** Medium
**Category:** Forms / domain-service
**Estimated Effort:** Small
**Dependencies:** None (composes shipped forms-service reads).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** A pure, deterministic builder that turns a form's fields +
  submissions into the export envelope `{ fileName, contentType, content,
  totalRows }` for `format: "csv" | "json"` — CSV with one column per form field
  (header = field **label**, ordered by `orderIndex`), JSON as the submission
  read-model array. No HTTP, no DB writes, no global state.
- **Owning module(s) to create-or-extend:** **create**
  `core/services/forms/submissionExport.ts` (builder + `FormSubmissionsExport`
  type + local CSV escaper). It composes existing reads — `getForm`,
  `listFormFields`, `toFieldRecord` (`core/services/forms/formsService.ts`) and
  `listSubmissions` (`core/services/forms/submissionService.ts`) — but may also
  accept already-loaded inputs for unit-testability (see pseudocode).
- **Source-of-truth docs:** `_docs/CMS_API.md` (envelope shape mirrors the
  Analytics export block), `_docs/SECURITY_SPEC.md` (PII posture),
  `_docs/TESTING_STRATEGY.md`.
- **Out-of-scope:** the route + query schema (L02); the client/UI (TASK-490-02);
  any pagination/filtering; `form_action_runs` export.

---

## Security Contract

This is a **data** leaf (it reads submissions and shapes the export payload), so a
contract applies even though it is not itself a route.

- **Endpoint visibility:** N/A (pure service) — it is only ever reached through
  the internal `/admin/api/*` route in L02; it exposes no surface of its own.
- **Auth model / RBAC:** enforced by the caller (L02 → `forms:read`). The builder
  performs no auth; it must not be importable into any public/anonymous handler.
- **CSRF:** N/A (no write).
- **Rate-limit bucket:** N/A here (applied at the route — `admin_read`).
- **Validation schema-owner:** N/A for input HTTP (the route validates `format`
  via the L02 schema). The builder defensively treats any non-`"json"` format as
  CSV-or-throws — see pseudocode; it does not parse untrusted query strings.
- **Anti-abuse for public writes:** N/A — this is an internal authenticated read,
  not a public write; no nonce/HMAC/captcha applies.
- **Secret/PII handling (load-bearing):** the export carries a **subset** of the
  existing `GET /forms/:id/submissions` read-model. `submission.ip` and
  `submission.userAgent` (the only PII-ish columns on the `form_submissions` row)
  are **omitted** from BOTH CSV and JSON, so the export never widens the data the
  admin already sees on the page. No secrets are read; nothing is logged. CSV
  cells are guarded against formula injection (leading `= + - @ \t \r` are
  prefixed with `'`) exactly as `analyticsService.escapeCsvCell` does.

---

## Implementation Pseudocode

### Module: `core/services/forms/submissionExport.ts`

```ts
import { getForm, listFormFields, toFieldRecord } from "./formsService";
import { listSubmissions } from "./submissionService";

export type FormSubmissionsExportFormat = "csv" | "json";

export type FormSubmissionsExport = {
  fileName: string;
  contentType: "text/csv" | "application/json";
  content: string;
  totalRows: number;
};

// --- CSV primitives (mirror analyticsService; owned locally per repo precedent) ---
const shouldGuardCsvCell = (v: string) => /^[=+\-@\t\r]/.test(v.trimStart());
const escapeCsvCell = (v: string) => {
  const guarded = shouldGuardCsvCell(v) ? `'${v}` : v;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
};
const serializeCsvRow = (values: readonly string[]) => values.map(escapeCsvCell).join(",");

// Mirrors FormSubmissionsPage.formatPayloadValue for string/number/boolean/object
// EXCEPT the empty case: that page renders null/undefined as the placeholder "-",
// while the CSV builder emits "" (a genuinely empty cell is the CSV-correct
// representation of a missing answer; "-" would be a fake value in the data file).
const formatCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
};

const slugifyForFile = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "form";
const formatDay = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD

type FieldColumn = { key: string; label: string };

// Column order: every schema field (by orderIndex) first, then any extra payload
// keys that exist in submissions but not in the schema (legacy/renamed), so no
// captured answer is silently dropped. ip/userAgent are intentionally excluded.
const buildColumns = (
  fields: { name: string; label: string; orderIndex: number }[],
  rows: { payload: Record<string, unknown> }[],
): FieldColumn[] => {
  const ordered = [...fields].sort((a, b) => a.orderIndex - b.orderIndex);
  const seen = new Set(ordered.map((f) => f.name));
  const columns: FieldColumn[] = ordered.map((f) => ({ key: f.name, label: f.label }));
  for (const r of rows) {
    for (const k of Object.keys(r.payload ?? {})) {
      if (!seen.has(k)) { seen.add(k); columns.push({ key: k, label: k }); }
    }
  }
  return columns;
};

const BASE_HEADERS = ["Submission ID", "Received At", "Status"] as const;

export function serializeSubmissionsCsv(
  columns: FieldColumn[],
  rows: { id: string; createdAt: Date | string; status: string; payload: Record<string, unknown> }[],
): string {
  const header = serializeCsvRow([...BASE_HEADERS, ...columns.map((c) => c.label)]);
  const body = rows.map((r) =>
    serializeCsvRow([
      r.id,
      new Date(r.createdAt).toISOString(),
      r.status,
      ...columns.map((c) => formatCell(r.payload?.[c.key])),
    ]),
  );
  return [header, ...body].join("\n");
}

export function serializeSubmissionsJson(
  rows: { id: string; createdAt: Date | string; status: string; payload: Record<string, unknown> }[],
): string {
  // Subset of the read-model: ip/userAgent deliberately omitted.
  return JSON.stringify(
    rows.map((r) => ({
      id: r.id,
      createdAt: new Date(r.createdAt).toISOString(),
      status: r.status,
      data: r.payload,
    })),
    null,
    2,
  );
}

export async function buildFormSubmissionsExport(
  formId: string,
  format: FormSubmissionsExportFormat,
  now: Date = new Date(),
): Promise<FormSubmissionsExport> {
  const form = await getForm(formId);
  if (!form) throw new Error("form_not_found"); // mapped to 404 by mapFormError at the route

  const [fields, rows] = await Promise.all([listFormFields(formId), listSubmissions(formId)]);
  const columns = buildColumns(fields.map(toFieldRecord), rows);
  const base = `coderso-form-${slugifyForFile(form.slug ?? form.name ?? formId)}-submissions-${formatDay(now)}`;

  if (format === "json") {
    return {
      fileName: `${base}.json`,
      contentType: "application/json",
      content: serializeSubmissionsJson(rows),
      totalRows: rows.length,
    };
  }
  return {
    fileName: `${base}.csv`,
    contentType: "text/csv",
    content: serializeSubmissionsCsv(columns, rows),
    totalRows: rows.length,
  };
}
```

**Data flow:** `formId + format` → load form (404 if missing) → load fields +
submissions (newest-first, from `listSubmissions`) → derive columns
(schema fields by `orderIndex`, then extra payload keys) → serialize → envelope.

**Error handling:** the only domain error is `form_not_found` (thrown as
`new Error("form_not_found")`), which the L02 route maps via the existing
`mapFormError` → `ApiError("form_not_found", 404)`. The builder validates nothing
else — `format` is already constrained by the route schema. `toFieldRecord`
returns `{ name, label, orderIndex, ... }` (`NormalizedFormField`); confirm those
exact property names when wiring.

**Regression-test shape (Vitest, pure):** call `serializeSubmissionsCsv` /
`serializeSubmissionsJson` directly with fixture columns/rows (no DB), asserting
header order, escaping, formula guard, JSON subset (no `ip`/`userAgent`), empty
list, and extra-key append. For `buildFormSubmissionsExport`, inject fakes by
mocking `getForm`/`listFormFields`/`listSubmissions` (module mock) — keeps it in
the Vitest pure lane.

---

## Testing Requirements

Lane: **Vitest (pure domain)** — no DB, no route, no plugin lifecycle.

- New file `tests/vitest/forms/submissionExport.test.ts`:
  - CSV header = `Submission ID, Received At, Status` + field labels in
    `orderIndex` order.
  - Cell escaping: values with `,`/`"`/CR/LF are quoted; embedded `"` doubled.
  - Formula-injection guard: a cell starting with `=`/`+`/`-`/`@` is prefixed
    `'`.
  - Object/array payload values are `JSON.stringify`-ed; `null`/`undefined` → `""`.
  - Extra payload keys not in the schema are appended as columns (header = raw
    key) and not dropped.
  - JSON format: array of `{ id, createdAt, status, data }`; **no `ip`/`userAgent`**;
    `totalRows` matches.
  - Empty submissions → CSV is header-only, JSON is `[]`, `totalRows === 0`.
  - `buildFormSubmissionsExport` throws `form_not_found` when `getForm` returns
    null.
- Gates: `bun --cwd core lint`, `bun --cwd core lint:types`.
