import { expect, test } from "vitest";

import {
  getIntegration,
  listIntegrations,
  requestIntegration,
  updateIntegration,
} from "../../../core/admin/services/integrationsClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("listIntegrations hits GET /settings/integrations", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [{ id: "crm", name: "CRM", description: "desc", category: "sales", scopes: [], status: "connected", health: { status: "ok", lastCheckedAt: null, lastError: null }, updatedAt: null, fields: [] }] });
  };

  try {
    const result = await listIntegrations();

    expect(calls[0]?.input).toBe("/admin/api/settings/integrations");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(result[0]?.id).toBe("crm");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getIntegration hits the detail endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      item: {
        id: "crm",
        name: "CRM",
        description: "desc",
        category: "sales",
        scopes: [],
        status: "connected",
        health: { status: "ok", lastCheckedAt: null, lastError: null },
        updatedAt: null,
        fields: [],
      },
    });
  };

  try {
    const result = await getIntegration("crm");

    expect(calls[0]?.input).toBe("/admin/api/settings/integrations/crm");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(result.item.id).toBe("crm");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateIntegration patches JSON payload with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      item: {
        id: "crm",
        name: "CRM",
        description: "desc",
        category: "sales",
        scopes: [],
        status: "connected",
        health: { status: "ok", lastCheckedAt: null, lastError: null },
        updatedAt: null,
        fields: [],
      },
    });
  };

  try {
    resetCsrfToken();
    const result = await updateIntegration("crm", {
      config: { endpoint: "https://example.com", apiKey: null },
    });

    expect(calls[1]?.input).toBe("/admin/api/settings/integrations/crm");
    expect(calls[1]?.init?.method).toBe("PATCH");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      config: { endpoint: "https://example.com", apiKey: null },
    });
    expect(new Headers(calls[1]?.init?.headers).get("X-CSRF-Token")).toBe(
      "csrf-token"
    );
    expect(result.item.name).toBe("CRM");
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("requestIntegration posts the request payload with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      item: { id: "request-1", name: "Acme CRM" },
    });
  };

  try {
    resetCsrfToken();
    const result = await requestIntegration({
      name: "Acme CRM",
      website: "https://acme.example.com",
      notes: "Need webhook support",
    });

    expect(calls[1]?.input).toBe("/admin/api/settings/integrations/requests");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      name: "Acme CRM",
      website: "https://acme.example.com",
      notes: "Need webhook support",
    });
    expect(result.item.id).toBe("request-1");
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});
