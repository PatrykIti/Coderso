import { expect, test } from "vitest";

import {
  createRedirect,
  deleteRedirect,
  listRedirects,
  updateRedirect,
} from "../../../core/admin/services/redirectsClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("listRedirects hits GET /redirects", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listRedirects();
    expect(calls[0]?.input).toBe("/admin/api/redirects");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createRedirect uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "redirect-1" });
  };

  try {
    resetCsrfToken();
    await createRedirect({
      fromPath: "/old",
      toPath: "/new",
      statusCode: 301,
      enabled: true,
    });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/redirects");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateRedirect uses CSRF and PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "redirect-1" });
  };

  try {
    resetCsrfToken();
    await updateRedirect("redirect-1", { enabled: false });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/redirects/redirect-1");
    expect(calls[1]?.init?.method).toBe("PATCH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteRedirect uses CSRF and DELETE", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true });
  };

  try {
    resetCsrfToken();
    await deleteRedirect("redirect-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/redirects/redirect-1");
    expect(calls[1]?.init?.method).toBe("DELETE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
