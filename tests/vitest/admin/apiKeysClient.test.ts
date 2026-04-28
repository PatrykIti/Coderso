import { expect, test } from "vitest";

import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
} from "../../../core/admin/services/apiKeysClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("listApiKeys hits GET /settings/api-keys and returns items", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [{ id: "key-1", name: "Primary", scopes: [], prefix: "sk", createdAt: "2026-03-06", lastUsedAt: null, revokedAt: null }] });
  };

  try {
    const result = await listApiKeys();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/settings/api-keys");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(result[0]?.id).toBe("key-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createApiKey fetches CSRF token and posts JSON payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      item: {
        id: "key-1",
        name: "Primary",
        scopes: ["settings.read"],
        prefix: "sk",
        createdAt: "2026-03-06",
        lastUsedAt: null,
        revokedAt: null,
      },
      secret: "secret",
    });
  };

  try {
    resetCsrfToken();
    const result = await createApiKey({
      name: "Primary",
      scopes: ["settings.read"],
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/settings/api-keys");
    expect(calls[1]?.init?.method).toBe("POST");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      name: "Primary",
      scopes: ["settings.read"],
    });
    expect(result.secret).toBe("secret");
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("rotateApiKey posts to the rotate endpoint with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      item: {
        id: "key-1",
        name: "Primary",
        scopes: [],
        prefix: "sk",
        createdAt: "2026-03-06",
        lastUsedAt: null,
        revokedAt: null,
      },
      secret: "rotated-secret",
    });
  };

  try {
    resetCsrfToken();
    const result = await rotateApiKey("key-1");

    expect(calls[1]?.input).toBe("/admin/api/settings/api-keys/key-1/rotate");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(new Headers(calls[1]?.init?.headers).get("X-CSRF-Token")).toBe(
      "csrf-token"
    );
    expect(result.secret).toBe("rotated-secret");
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("revokeApiKey posts to the revoke endpoint with CSRF", async () => {
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
    const result = await revokeApiKey("key-1");

    expect(calls[1]?.input).toBe("/admin/api/settings/api-keys/key-1/revoke");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(new Headers(calls[1]?.init?.headers).get("X-CSRF-Token")).toBe(
      "csrf-token"
    );
    expect(result.ok).toBe(true);
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});
