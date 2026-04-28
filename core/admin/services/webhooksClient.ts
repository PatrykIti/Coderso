import { apiRequest } from "./apiClient";

export type WebhookRecord = {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastDelivery: {
    status: string;
    deliveredAt: string | null;
  } | null;
  hasSecret: boolean;
};

export type WebhookDeliveryRecord = {
  id: string;
  webhookId: string;
  event: string;
  status: string;
  responseCode: number | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  deliveredAt: string | null;
};

export async function listWebhooks() {
  const response = await apiRequest<{ items: WebhookRecord[] }>(
    "/settings/webhooks",
    { method: "GET" }
  );
  return response.items ?? [];
}

export async function createWebhook(payload: {
  name: string;
  url: string;
  events: string[];
  enabled?: boolean;
  secret?: string | null;
}) {
  return apiRequest<{ item: WebhookRecord }>(
    "/settings/webhooks",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function updateWebhook(
  id: string,
  payload: {
    name?: string;
    url?: string;
    events?: string[];
    enabled?: boolean;
    secret?: string | null;
  }
) {
  return apiRequest<{ item: WebhookRecord }>(
    `/settings/webhooks/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function deleteWebhook(id: string) {
  return apiRequest<{ ok: boolean }>(
    `/settings/webhooks/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
}

export async function listWebhookDeliveries(id: string) {
  const response = await apiRequest<{ items: WebhookDeliveryRecord[] }>(
    `/settings/webhooks/${id}/deliveries`,
    { method: "GET" }
  );
  return response.items ?? [];
}

export async function testWebhook(id: string, payload?: { event?: string }) {
  return apiRequest<{
    ok: boolean;
    result: { status: string; attempts: number; responseCode: number | null };
  }>(
    `/settings/webhooks/${id}/test`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    },
    { withCsrf: true }
  );
}
