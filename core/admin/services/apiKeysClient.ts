import { apiRequest } from "./apiClient";

export type ApiKeyRecord = {
  id: string;
  name: string;
  scopes: string[];
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type ApiKeyResult = {
  item: ApiKeyRecord;
  secret: string;
};

export async function listApiKeys() {
  const response = await apiRequest<{ items: ApiKeyRecord[] }>(
    "/settings/api-keys",
    { method: "GET" }
  );
  return response.items ?? [];
}

export async function createApiKey(payload: { name: string; scopes: string[] }) {
  return apiRequest<ApiKeyResult>(
    "/settings/api-keys",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function rotateApiKey(id: string) {
  return apiRequest<ApiKeyResult>(
    `/settings/api-keys/${id}/rotate`,
    { method: "POST" },
    { withCsrf: true }
  );
}

export async function revokeApiKey(id: string) {
  return apiRequest<{ ok: boolean }>(
    `/settings/api-keys/${id}/revoke`,
    { method: "POST" },
    { withCsrf: true }
  );
}

