import { apiRequest } from "./apiClient";
import { downloadAdminExport, type AdminExportResult } from "./adminExportClient";
import type {
  AuditExportColumn,
  AuditExportFormat,
} from "../../services/audit/auditExportContract";

export type AuditRecord = {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AuditLogQuery = {
  limit?: number;
  query?: string;
  category?: "authentication" | "content" | "system";
  severity?: "info" | "warning" | "error";
  from?: string;
  to?: string;
  cursor?: string;
};

export type AuditLogListResponse = {
  items: AuditRecord[];
  nextCursor?: string | null;
  totalCount?: number | null;
  totalApprox?: number | null;
};

export type AuditExportRequest = {
  format: AuditExportFormat;
  columns: AuditExportColumn[];
  filters: AuditLogQuery;
};

const buildQuery = (query: AuditLogQuery) => {
  const params = new URLSearchParams();
  if (query.limit) params.set("limit", String(query.limit));
  if (query.query) params.set("q", query.query);
  if (query.category) params.set("category", query.category);
  if (query.severity) params.set("severity", query.severity);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.cursor) params.set("cursor", query.cursor);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

export async function listAuditLogs(query: AuditLogQuery | number = {}) {
  const normalizedQuery = typeof query === "number" ? { limit: query } : query;
  const response = await apiRequest<AuditLogListResponse>(`/audit${buildQuery(normalizedQuery)}`, {
    method: "GET",
  });
  return {
    items: response.items ?? [],
    nextCursor: response.nextCursor ?? null,
    totalCount: response.totalCount ?? null,
    totalApprox: response.totalApprox ?? null,
  };
}

export async function exportAuditLogs(request: AuditExportRequest): Promise<AdminExportResult> {
  return downloadAdminExport("/audit/export", request, {
    filenamePrefix: "audit-logs",
    withCsrf: true,
  });
}
