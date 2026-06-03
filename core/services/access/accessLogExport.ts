import {
  AccessLogExportError,
  ACCESS_LOG_EXPORT_MAX_ROWS,
  accessLogExportColumnLabels,
  normalizeAccessLogExportRequest,
  type AccessLogExportColumn,
  type AccessLogExportFormat,
  type AccessLogExportRequestInput,
  type NormalizedAccessLogExportRequest,
} from "./accessLogExportContract";
import { listAccessLogs, normalizeAccessLogQuery, type AccessLogRecord } from "./accessLogService";
import { logAudit } from "../audit/auditService";

export type AccessLogExportFileResponse = {
  type: "file";
  filename: string;
  mimeType: string;
  content: string;
};

export type AccessLogExportExecutionContext = {
  actorId?: string | null;
  requestId?: string;
  ip?: string;
  userAgent?: string;
};

export type AccessLogExportDeps = {
  listAccessLogs?: typeof listAccessLogs;
  logAudit?: typeof logAudit;
  now?: () => Date;
};

type AccessLogExportRow = Record<AccessLogExportColumn, unknown>;

const jsonMimeType = "application/json";
const csvMimeType = "text/csv";
const sensitiveTextPattern =
  /\b(cookie|authorization|csrf(?:[-_]?token)?|reset[-_]?token|session(?:[-_]?id)?|session[-_]?token|token|api[-_]?key|secret|password)=([^&\s;,]+)/gi;

const toIsoTimestamp = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

export function redactAccessLogExportText(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/(Cookie|Authorization):\s*[^;\n\r]+/gi, "$1: [REDACTED]")
    .replace(sensitiveTextPattern, "$1=[REDACTED]");
}

const safeText = (value: string | null | undefined) =>
  value ? redactAccessLogExportText(value) : "";

const resolveDeviceLabel = (userAgent: string | null) => {
  if (!userAgent) return "Unknown device";
  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone")) return "iPhone / iOS";
  if (ua.includes("android")) return "Android / Mobile";
  if (ua.includes("ipad")) return "iPad / iPadOS";
  if (ua.includes("postman") || ua.includes("curl")) return "API client";
  if (ua.includes("windows")) return "Windows / Desktop";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macOS / Desktop";
  if (ua.includes("linux")) return "Linux / Desktop";
  return "Desktop / Unknown";
};

const resolveUserLabel = (record: AccessLogRecord) =>
  safeText(record.userName ?? record.userEmail ?? "System");

export function buildAccessLogExportRow(record: AccessLogRecord): AccessLogExportRow {
  return {
    id: record.id,
    user: resolveUserLabel(record),
    userId: record.userId ?? "",
    method: record.method,
    path: safeText(record.path),
    status: record.status,
    ip: safeText(record.ip),
    device: resolveDeviceLabel(record.userAgent ?? null),
    userAgent: safeText(record.userAgent),
    timestamp: toIsoTimestamp(record.createdAt),
    durationMs: record.durationMs ?? "",
    sessionState: record.session.label,
    match: record.matchContext?.label ?? "",
  };
}

const serializeExportValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export function escapeAccessLogCsvValue(value: unknown) {
  const rawValue = serializeExportValue(value);
  const serialized = /^[=+\-@]/.test(rawValue) ? `'${rawValue}` : rawValue;
  if (!/[",\n\r]/.test(serialized)) return serialized;
  return `"${serialized.replace(/"/g, '""')}"`;
}

export function serializeAccessLogExportCsv(
  rows: AccessLogExportRow[],
  columns: AccessLogExportColumn[]
) {
  const header = columns.map((column) =>
    escapeAccessLogCsvValue(accessLogExportColumnLabels[column])
  );
  const body = rows.map((row) => columns.map((column) => escapeAccessLogCsvValue(row[column])));
  return [header, ...body].map((line) => line.join(",")).join("\n");
}

export function serializeAccessLogExportJson(input: {
  exportedAt: string;
  request: NormalizedAccessLogExportRequest;
  rows: AccessLogExportRow[];
}) {
  return JSON.stringify(
    {
      exportedAt: input.exportedAt,
      columns: input.request.columns,
      filters: summarizeAccessLogExportFilters(input.request.filters),
      rowCount: input.rows.length,
      maxRows: ACCESS_LOG_EXPORT_MAX_ROWS,
      rows: input.rows.map((row) =>
        Object.fromEntries(input.request.columns.map((column) => [column, row[column]]))
      ),
    },
    null,
    2
  );
}

const sanitizeFilenamePart = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export function summarizeAccessLogExportFilters(
  filters: NormalizedAccessLogExportRequest["filters"]
) {
  return {
    limit: filters.limit,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.query ? { query: "[search]" } : {}),
    ...(filters.userId ? { userId: "[user]" } : {}),
    ...(filters.method ? { method: filters.method } : {}),
    ...(filters.ip ? { ip: "[ip]" } : {}),
    ...(filters.from
      ? { from: filters.from instanceof Date ? filters.from.toISOString() : filters.from }
      : {}),
    ...(filters.to
      ? { to: filters.to instanceof Date ? filters.to.toISOString() : filters.to }
      : {}),
    ...(filters.cursor ? { cursor: "[cursor]" } : {}),
  };
}

export function resolveAccessLogExportFilename(input: {
  format: AccessLogExportFormat;
  filters: NormalizedAccessLogExportRequest["filters"];
  exportedAt: string;
}) {
  const date = input.exportedAt.slice(0, 10);
  const scopeParts = [
    input.filters.status,
    input.filters.method,
    input.filters.query ? "search" : null,
    input.filters.userId ? "user" : null,
    input.filters.ip ? "ip" : null,
    input.filters.cursor ? "cursor" : null,
  ].filter((part): part is string => Boolean(part));
  const scope = sanitizeFilenamePart(scopeParts.join("-")) || "all";
  return `access-logs-${date}-${scope}.${input.format}`;
}

const mimeTypeForFormat = (format: AccessLogExportFormat) =>
  format === "csv" ? csvMimeType : jsonMimeType;

export async function exportAccessLogs(
  input: AccessLogExportRequestInput,
  context: AccessLogExportExecutionContext = {},
  deps: AccessLogExportDeps = {}
): Promise<AccessLogExportFileResponse> {
  const request = normalizeAccessLogExportRequest(input);
  const normalizedQuery = normalizeAccessLogQuery(request.filters);
  const normalizedRequest: NormalizedAccessLogExportRequest = {
    ...request,
    filters: normalizedQuery,
  };
  const listRecords = deps.listAccessLogs ?? listAccessLogs;
  const writeAudit = deps.logAudit ?? logAudit;
  const exportedAt = (deps.now ?? (() => new Date()))().toISOString();
  const result = await listRecords(normalizedQuery, {
    canViewSession: false,
    canRevokeSession: false,
    currentSessionId: null,
  });

  if (result.items.length > ACCESS_LOG_EXPORT_MAX_ROWS) {
    throw new AccessLogExportError(
      "access_log_export_too_large",
      `Access log export is limited to ${ACCESS_LOG_EXPORT_MAX_ROWS} rows per request.`,
      { field: "filters.limit" }
    );
  }

  const rows = result.items.map(buildAccessLogExportRow);
  const content =
    request.format === "csv"
      ? serializeAccessLogExportCsv(rows, request.columns)
      : serializeAccessLogExportJson({ exportedAt, request: normalizedRequest, rows });
  const filename = resolveAccessLogExportFilename({
    format: request.format,
    filters: normalizedRequest.filters,
    exportedAt,
  });

  await writeAudit({
    actorId: context.actorId ?? null,
    action: "access_logs.export",
    targetType: "access_log",
    targetId: "export",
    metadata: {
      format: request.format,
      columns: request.columns,
      filters: summarizeAccessLogExportFilters(normalizedRequest.filters),
      rowCount: rows.length,
      requestId: context.requestId,
    },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  return {
    type: "file",
    filename,
    mimeType: mimeTypeForFormat(request.format),
    content,
  };
}
