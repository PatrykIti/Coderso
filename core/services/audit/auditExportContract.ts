import type { AuditLogQueryInput } from "./auditService";

export const auditExportFormatValues = ["csv", "json"] as const;
export type AuditExportFormat = (typeof auditExportFormatValues)[number];

export const auditExportColumnValues = [
  "id",
  "event",
  "category",
  "actor",
  "resource",
  "ip",
  "timestamp",
  "status",
  "severity",
  "requestId",
  "description",
  "payload",
] as const;

export type AuditExportColumn = (typeof auditExportColumnValues)[number];

export const auditExportColumnLabels: Record<AuditExportColumn, string> = {
  id: "ID",
  event: "Event",
  category: "Category",
  actor: "Actor",
  resource: "Resource",
  ip: "IP address",
  timestamp: "Timestamp",
  status: "Status",
  severity: "Severity",
  requestId: "Request ID",
  description: "Description",
  payload: "Payload",
};

export const AUDIT_EXPORT_DEFAULT_ROWS = 200;
export const AUDIT_EXPORT_MAX_ROWS = 200;

export type AuditExportFiltersInput = Pick<
  AuditLogQueryInput,
  "limit" | "query" | "category" | "severity" | "from" | "to" | "cursor"
>;

export type AuditExportRequestInput = {
  format: AuditExportFormat;
  columns: AuditExportColumn[];
  filters: AuditExportFiltersInput;
};

export type NormalizedAuditExportRequest = AuditExportRequestInput & {
  filters: AuditExportFiltersInput & { limit: number };
};

export type AuditExportErrorCode =
  | "audit_export_invalid"
  | "audit_export_invalid_columns"
  | "audit_export_too_large"
  | "audit_export_forbidden";

export class AuditExportError extends Error {
  code: AuditExportErrorCode;
  field?: string;
  status: number;

  constructor(
    code: AuditExportErrorCode,
    message: string,
    options: { field?: string; status?: number } = {}
  ) {
    super(message);
    this.name = "AuditExportError";
    this.code = code;
    this.field = options.field;
    this.status =
      options.status ??
      (code === "audit_export_forbidden" ? 403 : code === "audit_export_too_large" ? 413 : 400);
  }
}

const auditExportColumns = new Set<string>(auditExportColumnValues);
const auditExportFormats = new Set<string>(auditExportFormatValues);

export const isAuditExportColumn = (value: string): value is AuditExportColumn =>
  auditExportColumns.has(value);

export const isAuditExportFormat = (value: string): value is AuditExportFormat =>
  auditExportFormats.has(value);

const positiveIntegerSchema = {
  anyOf: [
    { type: "string", pattern: "^[1-9][0-9]*$" },
    { type: "integer", minimum: 1 },
  ],
};

export const auditExportRequestSchema = {
  type: "object",
  additionalProperties: false,
  required: ["format", "columns", "filters"],
  properties: {
    format: { type: "string", enum: [...auditExportFormatValues] },
    columns: {
      type: "array",
      minItems: 1,
      maxItems: auditExportColumnValues.length,
      uniqueItems: true,
      items: { type: "string", enum: [...auditExportColumnValues] },
    },
    filters: {
      type: "object",
      additionalProperties: false,
      properties: {
        limit: positiveIntegerSchema,
        query: { type: "string", minLength: 1, maxLength: 200 },
        category: { type: "string", enum: ["authentication", "content", "system"] },
        severity: { type: "string", enum: ["info", "warning", "error"] },
        from: { type: "string", format: "date-time" },
        to: { type: "string", format: "date-time" },
        cursor: { type: "string", minLength: 1, maxLength: 500 },
      },
    },
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function normalizeAuditExportColumns(columns: unknown): AuditExportColumn[] {
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new AuditExportError(
      "audit_export_invalid_columns",
      "Select at least one audit export column.",
      { field: "columns" }
    );
  }

  const seen = new Set<AuditExportColumn>();
  for (const column of columns) {
    if (typeof column !== "string" || !isAuditExportColumn(column)) {
      throw new AuditExportError(
        "audit_export_invalid_columns",
        "Audit export columns include unsupported fields.",
        { field: "columns" }
      );
    }
    seen.add(column);
  }

  return [...seen];
}

const normalizeRequestedRowLimit = (value: unknown) => {
  if (value === undefined || value === null || value === "") return AUDIT_EXPORT_DEFAULT_ROWS;
  const numericValue = typeof value === "number" ? value : Number(String(value));
  if (!Number.isSafeInteger(numericValue) || numericValue < 1) {
    throw new AuditExportError("audit_export_invalid", "Audit export row limit is invalid.", {
      field: "filters.limit",
    });
  }
  if (numericValue > AUDIT_EXPORT_MAX_ROWS) {
    throw new AuditExportError(
      "audit_export_too_large",
      `Audit export is limited to ${AUDIT_EXPORT_MAX_ROWS} rows per request.`,
      { field: "filters.limit" }
    );
  }
  return numericValue;
};

export function normalizeAuditExportRequest(input: unknown): NormalizedAuditExportRequest {
  if (!isRecord(input)) {
    throw new AuditExportError("audit_export_invalid", "Audit export request is invalid.");
  }
  const format = input.format;
  if (typeof format !== "string" || !isAuditExportFormat(format)) {
    throw new AuditExportError("audit_export_invalid", "Audit export format is invalid.", {
      field: "format",
    });
  }

  const filtersInput = isRecord(input.filters) ? input.filters : {};
  const limit = normalizeRequestedRowLimit(filtersInput.limit);
  const filters: NormalizedAuditExportRequest["filters"] = {
    limit,
    ...(typeof filtersInput.query === "string" ? { query: filtersInput.query } : {}),
    ...(typeof filtersInput.category === "string" ? { category: filtersInput.category } : {}),
    ...(typeof filtersInput.severity === "string" ? { severity: filtersInput.severity } : {}),
    ...(typeof filtersInput.from === "string" || filtersInput.from instanceof Date
      ? { from: filtersInput.from }
      : {}),
    ...(typeof filtersInput.to === "string" || filtersInput.to instanceof Date
      ? { to: filtersInput.to }
      : {}),
    ...(typeof filtersInput.cursor === "string" ? { cursor: filtersInput.cursor } : {}),
  };

  return {
    format,
    columns: normalizeAuditExportColumns(input.columns),
    filters,
  };
}
