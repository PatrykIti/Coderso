import { expect, test } from "bun:test";

import {
  getStorageSettings,
  updateStorageSettings,
} from "../../../core/admin/services/settingsClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("getStorageSettings hits GET /settings/storage", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ driver: "local", local: { dir: null }, s3: { accessKey: { configured: false }, secretKey: { configured: false } }, azure: { key: { configured: false }, connectionString: { configured: false } } });
  };

  try {
    await getStorageSettings();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/settings/storage");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateStorageSettings uses CSRF and PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ driver: "local", local: { dir: null }, s3: { accessKey: { configured: false }, secretKey: { configured: false } }, azure: { key: { configured: false }, connectionString: { configured: false } } });
  };

  try {
    resetCsrfToken();
    await updateStorageSettings({ driver: "local" });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/settings/storage");
    expect(calls[1]?.init?.method).toBe("PATCH");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
