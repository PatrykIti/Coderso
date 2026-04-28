import { apiRequest } from "./apiClient";

export type IntegrationField = {
  key: string;
  label: string;
  type: "text" | "url" | "secret";
  required: boolean;
  secret: boolean;
  value: string | null;
  configured: boolean;
};

export type IntegrationRecord = {
  id: string;
  name: string;
  description: string;
  category: string;
  scopes: string[];
  status: "connected" | "disconnected";
  health: {
    status: string;
    lastCheckedAt: string | null;
    lastError: string | null;
  };
  updatedAt: string | null;
  fields: IntegrationField[];
};

export async function listIntegrations() {
  const response = await apiRequest<{ items: IntegrationRecord[] }>(
    "/settings/integrations",
    { method: "GET" }
  );
  return response.items ?? [];
}

export async function getIntegration(id: string) {
  return apiRequest<{ item: IntegrationRecord }>(
    `/settings/integrations/${id}`,
    { method: "GET" }
  );
}

export async function updateIntegration(
  id: string,
  payload: { config?: Record<string, string | null> }
) {
  return apiRequest<{ item: IntegrationRecord }>(
    `/settings/integrations/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function requestIntegration(payload: {
  name: string;
  website?: string | null;
  notes?: string | null;
}) {
  return apiRequest<{ item: { id: string; name: string } }>(
    "/settings/integrations/requests",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}
