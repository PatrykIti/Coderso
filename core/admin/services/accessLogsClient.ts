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
  matchContext?: {
    field: "path" | "ip" | "user" | "email";
    label: string;
  } | null;
  session: AccessLogSessionContext;
};

export type AccessLogSessionState =
  | "none"
  | "missing"
  | "active"
  | "current"
  | "revoked"
  | "expired";

export type AccessLogSessionReason =
  | "historical"
  | "failed_attempt"
  | "system"
  | "missing_relation";

export type AccessLogSessionAction = {
  enabled: boolean;
  reason?: string;
};

export type AccessLogSessionContext = {
  state: AccessLogSessionState;
  label: string;
  reason?: AccessLogSessionReason;
  sessionId?: string;
  userId?: string;
  current?: boolean;
  expiresAt?: string | null;
  revokedAt?: string | null;
  view: AccessLogSessionAction;
  revoke: AccessLogSessionAction;
};

export type AccessLogQuery = {
  limit?: number;
  status?: "success" | "failed";
  query?: string;
  userId?: string;
  method?: string;
  ip?: string;
  from?: string;
  to?: string;
  cursor?: string;
};

export type AccessLogListResponse = {
  items: AccessLogRecord[];
  nextCursor?: string | null;
  totalCount?: number | null;
  totalApprox?: number | null;
};

const buildQuery = (query: AccessLogQuery) => {
  const params = new URLSearchParams();
  if (query.limit) params.set("limit", String(query.limit));
  if (query.status) params.set("status", query.status);
  if (query.query) params.set("q", query.query);
  if (query.userId) params.set("userId", query.userId);
  if (query.method) params.set("method", query.method);
  if (query.ip) params.set("ip", query.ip);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.cursor) params.set("cursor", query.cursor);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

export async function listAccessLogs(query: AccessLogQuery = {}) {
  const response = await apiRequest<AccessLogListResponse>(`/access-logs${buildQuery(query)}`, {
    method: "GET",
  });
  return {
    items: response.items ?? [],
    nextCursor: response.nextCursor ?? null,
    totalCount: response.totalCount ?? null,
    totalApprox: response.totalApprox ?? null,
  };
}

export async function revokeAccessFromLog(accessLogId: string) {
  return apiRequest<{
    ok: boolean;
    accessLogId: string;
    revokedSessionRef?: string;
    targetUserRef?: string | null;
    sessionState?: "revoked";
    alreadyRevoked?: boolean;
  }>(
    `/access-logs/${encodeURIComponent(accessLogId)}/revoke`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "admin_manual_revoke" }),
    },
    { withCsrf: true }
  );
}
