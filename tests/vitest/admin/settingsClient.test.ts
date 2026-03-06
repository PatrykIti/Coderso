import { expect, test } from "vitest";

import {
  getSecuritySettings,
  getSetting,
  getSettings,
  getStorageSettings,
  updateSecuritySettings,
  updateSettings,
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

test("getSettings hits GET /settings", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ "site.name": "Nextless", "site.locale": "en" });
  };

  try {
    await getSettings();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/settings");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSecuritySettings hits GET /settings/security", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ csrf: { enabled: true, headerName: "x-csrf-token", tokenTtlMinutes: 30 } });
  };

  try {
    await getSecuritySettings();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/settings/security");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSetting hits GET /settings/:key", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ key: "site.name", value: "Nextless" });
  };

  try {
    await getSetting("site.name");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/settings/site.name");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateSettings uses CSRF and PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ "site.name": "Nextless", "site.locale": "en" });
  };

  try {
    resetCsrfToken();
    await updateSettings({ "site.name": "Nextless" });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/settings");
    expect(calls[1]?.init?.method).toBe("PATCH");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateSecuritySettings uses CSRF and PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ csrf: { enabled: false, headerName: "x-csrf-token", tokenTtlMinutes: 30 } });
  };

  try {
    resetCsrfToken();
    await updateSecuritySettings({ csrf: { enabled: false } });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/settings/security");
    expect(calls[1]?.init?.method).toBe("PATCH");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
