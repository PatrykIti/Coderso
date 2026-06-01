import type { AccessLogQueryInput } from "./accessLogService";

export const accessLogExportFormatValues = ["csv", "json"] as const;
export type AccessLogExportFormat = (typeof accessLogExportFormatValues)[number];

export const accessLogExportColumnValues = [
  "id",
  "user",
  "userId",
  "method",
  "path",
  "status",
  "ip",
  "device",
  "userAgent",
  "timestamp",
  "durationMs",
  "sessionState",
  "match",
] as const;

export type AccessLogExportColumn = (typeof accessLogExportColumnValues)[number];

export const accessLogExportColumnLabels: Record<AccessLogExportColumn, string> = {
  id: "ID",
  user: "User",
  userId: "User ID",
  method: "Method",
  path: "Path",
  status: "Status",
  ip: "IP address",
  device: "Device",
  userAgent: "User agent",
  timestamp: "Timestamp",
  durationMs: "Duration (ms)",
  sessionState: "Session state",
  match: "Matched field",
};

export const ACCESS_LOG_EXPORT_DEFAULT_ROWS = 200;
export const ACCESS_LOG_EXPORT_MAX_ROWS = 200;

export type AccessLogExportFiltersInput = Pick<
  AccessLogQueryInput,
  "limit" | "status" | "query" | "userId" | "method" | "ip" | "from" | "to" | "cursor"
>;

export type AccessLogExportRequestInput = {
  format: AccessLogExportFormat;
  columns: AccessLogExportColumn[];
  filters: AccessLogExportFiltersInput;
};

export type NormalizedAccessLogExportRequest = AccessLogExportRequestInput & {
  filters: AccessLogExportFiltersInput & { limit: number };
};

export type AccessLogExportErrorCode =
  | "access_log_export_invalid"
  | "access_log_export_invalid_columns"
  | "access_log_export_too_large"
  | "access_log_export_forbidden";

export class AccessLogExportError extends Error {
  code: AccessLogExportErrorCode;
  field?: string;
  status: number;

  constructor(
    code: AccessLogExportErrorCode,
    message: string,
    options: { field?: string; status?: number } = {}
  ) {
    super(message);
    this.name = "AccessLogExportError";
    this.code = code;
    this.field = options.field;
    this.status =
      options.status ??
      (code === "access_log_export_forbidden"
        ? 403
        : code === "access_log_export_too_large"
          ? 413
          : 400);
  }
}

const accessLogExportColumns = new Set<string>(accessLogExportColumnValues);
const accessLogExportFormats = new Set<string>(accessLogExportFormatValues);

export const isAccessLogExportColumn = (value: string): value is AccessLogExportColumn =>
  accessLogExportColumns.has(value);

export const isAccessLogExportFormat = (value: string): value is AccessLogExportFormat =>
  accessLogExportFormats.has(value);

const positiveIntegerSchema = {
  anyOf: [
    { type: "string", pattern: "^[1-9][0-9]*$" },
    { type: "integer", minimum: 1 },
  ],
};

export const accessLogExportRequestSchema = {
  type: "object",
  additionalProperties: false,
  required: ["format", "columns", "filters"],
  properties: {
    format: { type: "string", enum: [...accessLogExportFormatValues] },
    columns: {
      type: "array",
      minItems: 1,
      maxItems: accessLogExportColumnValues.length,
      uniqueItems: true,
      items: { type: "string", enum: [...accessLogExportColumnValues] },
    },
    filters: {
      type: "object",
      additionalProperties: false,
      properties: {
        limit: positiveIntegerSchema,
        status: { type: "string", enum: ["success", "failed"] },
        query: { type: "string", minLength: 1, maxLength: 200 },
        userId: { type: "string", minLength: 1, maxLength: 128 },
        method: { type: "string", minLength: 1, maxLength: 16 },
        ip: { type: "string", minLength: 1, maxLength: 128 },
        from: { type: "string", format: "date-time" },
        to: { type: "string", format: "date-time" },
        cursor: { type: "string", minLength: 1, maxLength: 500 },
      },
    },
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function normalizeAccessLogExportColumns(columns: unknown): AccessLogExportColumn[] {
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new AccessLogExportError(
      "access_log_export_invalid_columns",
      "Select at least one access log export column.",
      { field: "columns" }
    );
  }

  const seen = new Set<AccessLogExportColumn>();
  for (const column of columns) {
    if (typeof column !== "string" || !isAccessLogExportColumn(column)) {
      throw new AccessLogExportError(
        "access_log_export_invalid_columns",
        "Access log export columns include unsupported fields.",
        { field: "columns" }
      );
    }
    seen.add(column);
  }

  return [...seen];
}

const normalizeRequestedRowLimit = (value: unknown) => {
  if (value === undefined || value === null || value === "") return ACCESS_LOG_EXPORT_DEFAULT_ROWS;
  const numericValue = typeof value === "number" ? value : Number(String(value));
  if (!Number.isSafeInteger(numericValue) || numericValue < 1) {
    throw new AccessLogExportError(
      "access_log_export_invalid",
      "Access log export row limit is invalid.",
      { field: "filters.limit" }
    );
  }
  if (numericValue > ACCESS_LOG_EXPORT_MAX_ROWS) {
    throw new AccessLogExportError(
      "access_log_export_too_large",
      `Access log export is limited to ${ACCESS_LOG_EXPORT_MAX_ROWS} rows per request.`,
      { field: "filters.limit" }
    );
  }
  return numericValue;
};

export function normalizeAccessLogExportRequest(input: unknown): NormalizedAccessLogExportRequest {
  if (!isRecord(input)) {
    throw new AccessLogExportError(
      "access_log_export_invalid",
      "Access log export request is invalid."
    );
  }
  const format = input.format;
  if (typeof format !== "string" || !isAccessLogExportFormat(format)) {
    throw new AccessLogExportError(
      "access_log_export_invalid",
      "Access log export format is invalid.",
      {
        field: "format",
      }
    );
  }

  const filtersInput = isRecord(input.filters) ? input.filters : {};
  const limit = normalizeRequestedRowLimit(filtersInput.limit);
  const filters: NormalizedAccessLogExportRequest["filters"] = {
    limit,
    ...(typeof filtersInput.status === "string" ? { status: filtersInput.status } : {}),
    ...(typeof filtersInput.query === "string" ? { query: filtersInput.query } : {}),
    ...(typeof filtersInput.userId === "string" ? { userId: filtersInput.userId } : {}),
    ...(typeof filtersInput.method === "string" ? { method: filtersInput.method } : {}),
    ...(typeof filtersInput.ip === "string" ? { ip: filtersInput.ip } : {}),
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
    columns: normalizeAccessLogExportColumns(input.columns),
    filters,
  };
}
