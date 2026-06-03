import {
  resolveAuditCategory,
  resolveAuditSeverity,
  type AuditLogCategory,
  type AuditLogSeverity,
} from "./auditClassification";
import {
  AUDIT_EXPORT_MAX_ROWS,
  auditExportColumnLabels,
  normalizeAuditExportRequest,
  type AuditExportColumn,
  type AuditExportFiltersInput,
  type AuditExportFormat,
  type AuditExportRequestInput,
  type NormalizedAuditExportRequest,
} from "./auditExportContract";
import { redactAuditPayload } from "./auditRedaction";
import {
  listAudit,
  logAudit,
  normalizeAuditLogQuery,
  type AuditRecord,
  type AuditListResult,
} from "./auditService";

export type AuditExportFileResponse = {
  type: "file";
  filename: string;
  mimeType: string;
  content: string;
};

export type AuditExportExecutionContext = {
  actorId?: string | null;
  requestId?: string;
  ip?: string;
  userAgent?: string;
};

export type AuditExportDeps = {
  listAudit?: (input: AuditExportFiltersInput) => Promise<AuditListResult>;
  logAudit?: typeof logAudit;
  now?: () => Date;
};

type AuditExportRow = Record<AuditExportColumn, unknown>;

const jsonMimeType = "application/json";
const csvMimeType = "text/csv";

const toIsoTimestamp = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const resolveStatus = (severity: AuditLogSeverity) => {
  if (severity === "error") return "error";
  if (severity === "warning") return "warning";
  return "success";
};

const metadataString = (metadata: Record<string, unknown>, key: string) => {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
};

const toResource = (record: AuditRecord) => `${record.targetType}/${record.targetId}`;

export function buildAuditExportRow(record: AuditRecord): AuditExportRow {
  const metadata = record.metadata ?? {};
  const category = resolveAuditCategory(record) as AuditLogCategory;
  const severity = resolveAuditSeverity(record, metadata) as AuditLogSeverity;
  return {
    id: record.id,
    event: record.action,
    category,
    actor: record.actorId ?? "System",
    resource: toResource(record),
    ip: metadataString(metadata, "ip"),
    timestamp: toIsoTimestamp(record.createdAt),
    status: resolveStatus(severity),
    severity,
    requestId: metadataString(metadata, "requestId"),
    description: metadataString(metadata, "description"),
    payload: redactAuditPayload(metadata),
  };
}

const serializeExportValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export function escapeAuditCsvValue(value: unknown) {
  const rawValue = serializeExportValue(value);
  const serialized = /^[=+\-@]/.test(rawValue) ? `'${rawValue}` : rawValue;
  if (!/[",\n\r]/.test(serialized)) return serialized;
  return `"${serialized.replace(/"/g, '""')}"`;
}

export function serializeAuditExportCsv(rows: AuditExportRow[], columns: AuditExportColumn[]) {
  const header = columns.map((column) => escapeAuditCsvValue(auditExportColumnLabels[column]));
  const body = rows.map((row) => columns.map((column) => escapeAuditCsvValue(row[column])));
  return [header, ...body].map((line) => line.join(",")).join("\n");
}

export function serializeAuditExportJson(input: {
  exportedAt: string;
  request: NormalizedAuditExportRequest;
  rows: AuditExportRow[];
}) {
  return JSON.stringify(
    {
      exportedAt: input.exportedAt,
      columns: input.request.columns,
      filters: summarizeAuditExportFilters(input.request.filters),
      rowCount: input.rows.length,
      maxRows: AUDIT_EXPORT_MAX_ROWS,
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

export function summarizeAuditExportFilters(filters: NormalizedAuditExportRequest["filters"]) {
  return {
    limit: filters.limit,
    ...(filters.query ? { query: "[search]" } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.severity ? { severity: filters.severity } : {}),
    ...(filters.from
      ? { from: filters.from instanceof Date ? filters.from.toISOString() : filters.from }
      : {}),
    ...(filters.to
      ? { to: filters.to instanceof Date ? filters.to.toISOString() : filters.to }
      : {}),
    ...(filters.cursor ? { cursor: "[cursor]" } : {}),
  };
}

export function resolveAuditExportFilename(input: {
  format: AuditExportFormat;
  filters: NormalizedAuditExportRequest["filters"];
  exportedAt: string;
}) {
  const date = input.exportedAt.slice(0, 10);
  const scopeParts = [
    input.filters.category,
    input.filters.severity,
    input.filters.query ? "search" : null,
    input.filters.cursor ? "cursor" : null,
  ].filter((part): part is string => Boolean(part));
  const scope = sanitizeFilenamePart(scopeParts.join("-")) || "all";
  return `audit-logs-${date}-${scope}.${input.format}`;
}

const mimeTypeForFormat = (format: AuditExportFormat) =>
  format === "csv" ? csvMimeType : jsonMimeType;

export async function exportAuditLogs(
  input: AuditExportRequestInput,
  context: AuditExportExecutionContext = {},
  deps: AuditExportDeps = {}
): Promise<AuditExportFileResponse> {
  const request = normalizeAuditExportRequest(input);
  const normalizedQuery = normalizeAuditLogQuery(request.filters);
  const listAuditRecords = deps.listAudit ?? listAudit;
  const writeAudit = deps.logAudit ?? logAudit;
  const exportedAt = (deps.now ?? (() => new Date()))().toISOString();
  const result = await listAuditRecords(normalizedQuery);
  const rows = result.items.map(buildAuditExportRow);
  const content =
    request.format === "csv"
      ? serializeAuditExportCsv(rows, request.columns)
      : serializeAuditExportJson({ exportedAt, request, rows });
  const filename = resolveAuditExportFilename({
    format: request.format,
    filters: request.filters,
    exportedAt,
  });

  await writeAudit({
    actorId: context.actorId ?? null,
    action: "audit.export",
    targetType: "audit",
    targetId: "logs",
    metadata: {
      format: request.format,
      columns: request.columns,
      filters: summarizeAuditExportFilters(request.filters),
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
