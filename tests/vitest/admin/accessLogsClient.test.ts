import { afterEach, expect, test } from "vitest";

import {
  exportAccessLogs,
  listAccessLogs,
  revokeAccessFromLog,
} from "../../../core/admin/services/accessLogsClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  resetCsrfToken();
});

test("listAccessLogs hits GET /access-logs with query params", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      items: [],
      nextCursor: "cursor-2",
      totalCount: 120,
      totalApprox: 125,
    });
  };

  try {
    const response = await listAccessLogs({
      limit: 120,
      status: "failed",
      query: "login",
      userId: "user-1",
      method: "POST",
      ip: "127.0.0.1",
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-02T23:59:59.999Z",
      cursor: "cursor-1",
    });
    expect(calls[0]?.init?.method).toBe("GET");
    expect(String(calls[0]?.input)).toBe(
      "/admin/api/access-logs?limit=120&status=failed&q=login&userId=user-1&method=POST&ip=127.0.0.1&from=2026-06-01T00%3A00%3A00.000Z&to=2026-06-02T23%3A59%3A59.999Z&cursor=cursor-1"
    );
    expect(response).toEqual({
      items: [],
      nextCursor: "cursor-2",
      totalCount: 120,
      totalApprox: 125,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("exportAccessLogs posts active filters and selected columns through admin export helper", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  resetCsrfToken();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      type: "file",
      filename: "access-logs-2026-06-01-failed-POST-search-user-ip.csv",
      mimeType: "text/csv",
      content: "User,Status",
    });
  };

  try {
    await expect(
      exportAccessLogs({
        format: "csv",
        columns: ["user", "timestamp", "status", "path"],
        filters: {
          limit: 50,
          status: "failed",
          query: "login",
          userId: "user-1",
          method: "POST",
          ip: "127.0.0.1",
          from: "2026-06-01T00:00:00.000Z",
          to: "2026-06-02T23:59:59.999Z",
        },
      })
    ).resolves.toEqual({
      status: "downloaded",
      filename: "access-logs-2026-06-01-failed-POST-search-user-ip.csv",
      mimeType: "text/csv",
    });

    expect(calls.map((call) => String(call.input))).toEqual([
      "/admin/api/auth/csrf",
      "/admin/api/access-logs/export",
    ]);
    expect(new Headers(calls[1]?.init?.headers).get("X-CSRF-Token")).toBe("csrf-token");
    expect(calls[1]?.init?.body).toBe(
      JSON.stringify({
        format: "csv",
        columns: ["user", "timestamp", "status", "path"],
        filters: {
          limit: 50,
          status: "failed",
          query: "login",
          userId: "user-1",
          method: "POST",
          ip: "127.0.0.1",
          from: "2026-06-01T00:00:00.000Z",
          to: "2026-06-02T23:59:59.999Z",
        },
      })
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("revokeAccessFromLog posts reason with CSRF and no client session hints", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  resetCsrfToken();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      ok: true,
      accessLogId: "access-1",
      revokedSessionRef: "session-1",
      targetUserRef: "user-1",
      sessionState: "revoked",
      alreadyRevoked: false,
    });
  };

  try {
    const response = await revokeAccessFromLog("access-1");

    expect(String(calls[0]?.input)).toBe("/admin/api/auth/csrf");
    expect(String(calls[1]?.input)).toBe("/admin/api/access-logs/access-1/revoke");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(new Headers(calls[1]?.init?.headers).get("X-CSRF-Token")).toBe("csrf-token");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      reason: "admin_manual_revoke",
    });
    expect(response).toMatchObject({
      ok: true,
      accessLogId: "access-1",
      revokedSessionRef: "session-1",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
