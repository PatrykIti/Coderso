import { apiRequest } from "./apiClient";

export type AccessLogRecord = {
  id: string;
  method: string;
  path: string;
  status: number;
  ip: string | null;
  userAgent: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  durationMs: number | null;
  createdAt: string;
};

export type AccessLogQuery = {
  limit?: number;
  status?: "success" | "failed";
  query?: string;
  userId?: string;
  from?: string;
  to?: string;
};

const buildQuery = (query: AccessLogQuery) => {
  const params = new URLSearchParams();
  if (query.limit) params.set("limit", String(query.limit));
  if (query.status) params.set("status", query.status);
  if (query.query) params.set("q", query.query);
  if (query.userId) params.set("userId", query.userId);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

export async function listAccessLogs(query: AccessLogQuery = {}) {
  const response = await apiRequest<{ items: AccessLogRecord[] }>(
    `/access-logs${buildQuery(query)}`,
    { method: "GET" }
  );
  return response.items ?? [];
}
