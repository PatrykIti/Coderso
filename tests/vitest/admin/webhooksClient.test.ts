import { expect, test } from "vitest";

import {
  createWebhook,
  deleteWebhook,
  listWebhookDeliveries,
  listWebhooks,
  testWebhook,
  updateWebhook,
} from "../../../core/admin/services/webhooksClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("listWebhooks returns an empty list when items are missing", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => jsonResponse({});

  try {
    await expect(listWebhooks()).resolves.toEqual([]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createWebhook posts JSON payload with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      item: {
        id: "hook-1",
        name: "Orders",
        url: "https://example.com/hook",
        events: ["orders.created"],
        enabled: true,
        createdAt: "2026-03-06",
        updatedAt: "2026-03-06",
        lastDelivery: null,
        hasSecret: true,
      },
    });
  };

  try {
    resetCsrfToken();
    const result = await createWebhook({
      name: "Orders",
      url: "https://example.com/hook",
      events: ["orders.created"],
      enabled: true,
      secret: "top-secret",
    });

    expect(calls[1]?.input).toBe("/admin/api/settings/webhooks");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      name: "Orders",
      url: "https://example.com/hook",
      events: ["orders.created"],
      enabled: true,
      secret: "top-secret",
    });
    expect(result.item.id).toBe("hook-1");
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("updateWebhook patches the webhook payload with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      item: {
        id: "hook-1",
        name: "Orders",
        url: "https://example.com/hook",
        events: ["orders.created"],
        enabled: false,
        createdAt: "2026-03-06",
        updatedAt: "2026-03-06",
        lastDelivery: null,
        hasSecret: false,
      },
    });
  };

  try {
    resetCsrfToken();
    const result = await updateWebhook("hook-1", {
      enabled: false,
      secret: null,
    });

    expect(calls[1]?.input).toBe("/admin/api/settings/webhooks/hook-1");
    expect(calls[1]?.init?.method).toBe("PATCH");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      enabled: false,
      secret: null,
    });
    expect(result.item.enabled).toBe(false);
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("deleteWebhook deletes the webhook with CSRF", async () => {
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
    const result = await deleteWebhook("hook-1");

    expect(calls[1]?.input).toBe("/admin/api/settings/webhooks/hook-1");
    expect(calls[1]?.init?.method).toBe("DELETE");
    expect(result.ok).toBe(true);
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("listWebhookDeliveries hits the deliveries endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      items: [
        {
          id: "delivery-1",
          webhookId: "hook-1",
          event: "orders.created",
          status: "ok",
          responseCode: 200,
          attempts: 1,
          lastError: null,
          createdAt: "2026-03-06",
          deliveredAt: "2026-03-06",
        },
      ],
    });
  };

  try {
    const result = await listWebhookDeliveries("hook-1");

    expect(calls[0]?.input).toBe("/admin/api/settings/webhooks/hook-1/deliveries");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(result[0]?.id).toBe("delivery-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("testWebhook posts a default empty payload with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      ok: true,
      result: { status: "ok", attempts: 1, responseCode: 200 },
    });
  };

  try {
    resetCsrfToken();
    const result = await testWebhook("hook-1");

    expect(calls[1]?.input).toBe("/admin/api/settings/webhooks/hook-1/test");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({});
    expect(result.ok).toBe(true);
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});
