import { getForm, listFormFields, toFieldRecord } from "./formsService";
import { listSubmissions } from "./submissionService";

/**
 * Pure, deterministic builder for the forms submissions export (TASK-490).
 *
 * Turns a form's fields + submissions into the analytics-style JSON envelope
 * `{ fileName, contentType, content, totalRows }` for `format: "csv" | "json"`.
 * CSV has one column per form field (header = field label, in `orderIndex`
 * order); JSON is the submission read-model array. No HTTP, no DB writes, no
 * global state — the module composes the shipped forms-service reads and only
 * ever runs behind the internal admin export route (`forms:read`).
 *
 * PII posture: `ip` / `userAgent` (the only PII-ish columns on the
 * `form_submissions` row) are omitted from BOTH formats, so the export never
 * widens the data surface the submissions page already shows. CSV cells are
 * guarded against formula injection (leading `= + - @ \t \r` are prefixed with
 * `'`) exactly as `analyticsService.escapeCsvCell` does.
 */

export type FormSubmissionsExportFormat = "csv" | "json";

export type FormSubmissionsExport = {
  fileName: string;
  contentType: "text/csv" | "application/json";
  content: string;
  totalRows: number;
};

// --- CSV primitives (mirror analyticsService; owned locally per repo precedent) ---
const shouldGuardCsvCell = (value: string) => /^[=+\-@\t\r]/.test(value.trimStart());

export const escapeCsvCell = (value: string) => {
  const guarded = shouldGuardCsvCell(value) ? `'${value}` : value;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
};

export const serializeCsvRow = (values: readonly string[]) => values.map(escapeCsvCell).join(",");

// Mirrors FormSubmissionsPage.formatPayloadValue for string/number/boolean/object
// EXCEPT the empty case: that page renders null/undefined as the placeholder "-",
// while the CSV builder emits "" (a genuinely empty cell is the CSV-correct
// representation of a missing answer; "-" would be a fake value in the data file).
export const formatCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const slugifyForFile = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "form";

const formatDay = (date: Date) => date.toISOString().slice(0, 10); // YYYY-MM-DD

export type FieldColumn = { key: string; label: string };

export type SubmissionExportRow = {
  id: string;
  createdAt: Date | string;
  status: string;
  payload: Record<string, unknown>;
};

type SubmissionRow = Awaited<ReturnType<typeof listSubmissions>>[number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

// The DB column is `jsonb` (inferred `unknown`); normalize to a plain object at
// the builder boundary so no captured row can break column derivation.
export const toExportRow = (row: SubmissionRow): SubmissionExportRow => ({
  id: row.id,
  createdAt: row.createdAt,
  status: row.status,
  payload: isRecord(row.payload) ? row.payload : {},
});

// Column order: every schema field (by orderIndex) first, then any extra payload
// keys that exist in submissions but not in the schema (legacy/renamed), so no
// captured answer is silently dropped. ip/userAgent are intentionally excluded.
//
// `mergePayloadColumnKeys` is the single-owned union primitive: the in-memory
// builder (TASK-490) feeds it the full row list, while the bounded export job
// (TASK-571) feeds it one bounded batch at a time from its column-collection
// pass — both MUST end with identical column sets and order for the same data.
export const mergePayloadColumnKeys = (
  columns: FieldColumn[],
  seen: Set<string>,
  rows: ReadonlyArray<{ payload: Record<string, unknown> }>
): FieldColumn[] => {
  for (const row of rows) {
    for (const key of Object.keys(row.payload ?? {})) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push({ key, label: key });
      }
    }
  }
  return columns;
};

export const buildColumns = (
  fields: { name: string; label: string; orderIndex: number }[],
  rows: { payload: Record<string, unknown> }[]
): FieldColumn[] => {
  const ordered = [...fields].sort((a, b) => a.orderIndex - b.orderIndex);
  const seen = new Set(ordered.map((field) => field.name));
  const columns: FieldColumn[] = ordered.map((field) => ({
    key: field.name,
    label: field.label,
  }));
  return mergePayloadColumnKeys(columns, seen, rows);
};

export const BASE_HEADERS = ["Submission ID", "Received At", "Status"] as const;

// Shared artifact base name (`coderso-form-<slug>-submissions-<date>`). Owned
// here so the in-memory builder (TASK-490) and the bounded export job (TASK-571)
// emit byte-identical file names.
export const buildSubmissionExportBaseName = (slugOrNameOrId: string, now: Date): string =>
  `coderso-form-${slugifyForFile(slugOrNameOrId)}-submissions-${formatDay(now)}`;

// Shared JSON read-model entry: `{ id, createdAt, status, data }`, deliberately
// omitting ip/userAgent. Used by the in-memory builder and the streaming job.
export const submissionExportJsonEntry = (row: SubmissionExportRow) => ({
  id: row.id,
  createdAt: new Date(row.createdAt).toISOString(),
  status: row.status,
  data: row.payload,
});

export function serializeSubmissionsCsv(
  columns: FieldColumn[],
  rows: SubmissionExportRow[]
): string {
  const header = serializeCsvRow([...BASE_HEADERS, ...columns.map((column) => column.label)]);
  const body = rows.map((row) =>
    serializeCsvRow([
      row.id,
      new Date(row.createdAt).toISOString(),
      row.status,
      ...columns.map((column) => formatCell(row.payload?.[column.key])),
    ])
  );
  return [header, ...body].join("\n");
}

export function serializeSubmissionsJson(rows: SubmissionExportRow[]): string {
  // Subset of the read-model: ip/userAgent deliberately omitted.
  return JSON.stringify(rows.map(submissionExportJsonEntry), null, 2);
}

export async function buildFormSubmissionsExport(
  formId: string,
  format: FormSubmissionsExportFormat,
  now: Date = new Date()
): Promise<FormSubmissionsExport> {
  const form = await getForm(formId);
  if (!form) throw new Error("form_not_found"); // mapped to 404 by mapFormError at the route

  const [fields, rawRows] = await Promise.all([listFormFields(formId), listSubmissions(formId)]);
  const rows = rawRows.map(toExportRow);
  const columns = buildColumns(fields.map(toFieldRecord), rows);
  const base = buildSubmissionExportBaseName(form.slug ?? form.name ?? formId, now);

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
