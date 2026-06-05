import { expect, test } from "vitest";

import {
  getEmailSettings,
  listEmailLogs,
  sendTestEmail,
  updateEmailSettings,
} from "../../../core/admin/services/emailClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("getEmailSettings hits GET /settings/email", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      provider: "smtp",
      smtp: {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        user: "mailer",
        password: { configured: true },
      },
      resend: {
        integrationId: "resend",
        apiKey: { configured: false },
        status: "disconnected",
      },
      from: { name: "Support", email: "support@example.com" },
      status: { provider: "smtp", configured: true },
    });
  };

  try {
    const result = await getEmailSettings();

    expect(calls[0]?.input).toBe("/admin/api/settings/email");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(result.smtp.host).toBe("smtp.example.com");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateEmailSettings puts JSON payload with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      provider: "smtp",
      smtp: {
        host: "smtp.example.com",
        port: 465,
        secure: true,
        user: "mailer",
        password: { configured: true },
      },
      resend: {
        integrationId: "resend",
        apiKey: { configured: false },
        status: "disconnected",
      },
      from: { name: "Support", email: "support@example.com" },
      status: { provider: "smtp", configured: true },
    });
  };

  try {
    resetCsrfToken();
    const result = await updateEmailSettings({
      smtp: {
        host: "smtp.example.com",
        port: 465,
        secure: true,
        password: "secret",
      },
      from: { name: "Support", email: "support@example.com" },
    });

    expect(calls[1]?.input).toBe("/admin/api/settings/email");
    expect(calls[1]?.init?.method).toBe("PUT");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      smtp: {
        host: "smtp.example.com",
        port: 465,
        secure: true,
        password: "secret",
      },
      from: { name: "Support", email: "support@example.com" },
    });
    expect(result.smtp.port).toBe(465);
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("updateEmailSettings accepts resend provider payload without SMTP fields", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      provider: "resend",
      smtp: {
        host: "smtp.example.com",
        port: 465,
        secure: true,
        user: "mailer",
        password: { configured: true },
      },
      resend: {
        integrationId: "resend",
        apiKey: { configured: true },
        status: "connected",
      },
      from: { name: "Support", email: "support@example.com" },
      status: { provider: "resend", configured: true },
    });
  };

  try {
    resetCsrfToken();
    const result = await updateEmailSettings({
      provider: "resend",
      from: { name: "Support", email: "support@example.com" },
    });

    expect(calls[1]?.input).toBe("/admin/api/settings/email");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      provider: "resend",
      from: { name: "Support", email: "support@example.com" },
    });
    expect(result.provider).toBe("resend");
    expect(result.resend.apiKey.configured).toBe(true);
    expect(JSON.stringify(result)).not.toContain("re_");
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("sendTestEmail posts the target recipient with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true });
  };

  try {
    resetCsrfToken();
    const result = await sendTestEmail({ to: "qa@example.com" });

    expect(calls[1]?.input).toBe("/admin/api/settings/email/test");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      to: "qa@example.com",
    });
    expect(result.ok).toBe(true);
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("listEmailLogs returns an empty list when items are missing", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => jsonResponse({});

  try {
    await expect(listEmailLogs()).resolves.toEqual([]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
