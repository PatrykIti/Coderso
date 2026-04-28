import { apiRequest } from "./apiClient";

export type EmailSettingsResponse = {
  provider: "smtp";
  smtp: {
    host: string | null;
    port: number | null;
    secure: boolean;
    user: string | null;
    password: { configured: boolean };
  };
  from: {
    name: string | null;
    email: string | null;
  };
  status: {
    configured: boolean;
  };
};

export type EmailSettingsUpdate = {
  provider?: "smtp";
  smtp?: {
    host?: string | null;
    port?: number | null;
    secure?: boolean;
    user?: string | null;
    password?: string | null;
  };
  from?: {
    name?: string | null;
    email?: string | null;
  };
};

export type EmailDeliveryLog = {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  provider: string;
  messageId: string | null;
  error: string | null;
  createdAt: string;
};

export async function getEmailSettings() {
  return apiRequest<EmailSettingsResponse>("/settings/email", { method: "GET" });
}

export async function updateEmailSettings(payload: EmailSettingsUpdate) {
  return apiRequest<EmailSettingsResponse>(
    "/settings/email",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function sendTestEmail(payload: { to: string }) {
  return apiRequest<{ ok: boolean }>(
    "/settings/email/test",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function listEmailLogs() {
  const response = await apiRequest<{ items: EmailDeliveryLog[] }>(
    "/settings/email/logs",
    { method: "GET" }
  );
  return response.items ?? [];
}
