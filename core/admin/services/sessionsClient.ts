import { apiRequest } from "./apiClient";

export type SessionRecord = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};

export async function listSessions(userId?: string) {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const response = await apiRequest<{ items: SessionRecord[] }>(
    `/sessions${query}`,
    { method: "GET" }
  );
  return response.items ?? [];
}

export async function revokeSession(sessionId: string) {
  return apiRequest<{ ok: boolean }>(
    `/sessions/${sessionId}/revoke`,
    { method: "POST" },
    { withCsrf: true }
  );
}

export async function revokeAllSessions(userId?: string) {
  return apiRequest<{ ok: boolean; revokedCount?: number }>(
    `/sessions/revoke-all`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userId ? { userId } : {}),
    },
    { withCsrf: true }
  );
}
