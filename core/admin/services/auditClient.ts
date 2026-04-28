import { apiRequest } from "./apiClient";

export type AuditRecord = {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export async function listAuditLogs(limit = 100) {
  const response = await apiRequest<{ items: AuditRecord[] }>(
    `/audit?limit=${encodeURIComponent(limit)}`,
    { method: "GET" }
  );
  return response.items ?? [];
}
