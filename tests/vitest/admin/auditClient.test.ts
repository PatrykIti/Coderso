import { afterEach, expect, test } from "vitest";

import { exportAuditLogs, listAuditLogs } from "../../../core/admin/services/auditClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  resetCsrfToken();
});

test("listAuditLogs hits GET /audit with strict query params", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    const response = await listAuditLogs({
      limit: 120,
      query: "login",
      category: "authentication",
      severity: "warning",
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-02T23:59:59.999Z",
      cursor: "cursor-1",
    });
    expect(response).toEqual({
      items: [],
      nextCursor: null,
      totalApprox: null,
      totalCount: null,
    });
    expect(calls[0]?.input).toBe(
      "/admin/api/audit?limit=120&q=login&category=authentication&severity=warning&from=2026-06-01T00%3A00%3A00.000Z&to=2026-06-02T23%3A59%3A59.999Z&cursor=cursor-1"
    );
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("exportAuditLogs posts active filters and selected columns through admin export helper", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      type: "file",
      filename: "audit-logs-2026-06-01-authentication.csv",
      mimeType: "text/csv",
      content: "Event,Timestamp",
    });
  };

  try {
    await expect(
      exportAuditLogs({
        format: "csv",
        columns: ["event", "timestamp"],
        filters: {
          limit: 50,
          query: "login",
          category: "authentication",
          from: "2026-06-01T00:00:00.000Z",
          to: "2026-06-02T23:59:59.999Z",
        },
      })
    ).resolves.toEqual({
      status: "downloaded",
      filename: "audit-logs-2026-06-01-authentication.csv",
      mimeType: "text/csv",
    });

    expect(calls.map((call) => String(call.input))).toEqual([
      "/admin/api/auth/csrf",
      "/admin/api/audit/export",
    ]);
    expect(new Headers(calls[1]?.init?.headers).get("X-CSRF-Token")).toBe("csrf-token");
    expect(calls[1]?.init?.body).toBe(
      JSON.stringify({
        format: "csv",
        columns: ["event", "timestamp"],
        filters: {
          limit: 50,
          query: "login",
          category: "authentication",
          from: "2026-06-01T00:00:00.000Z",
          to: "2026-06-02T23:59:59.999Z",
        },
      })
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
