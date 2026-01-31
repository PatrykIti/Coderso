import { expect, test } from "bun:test";

import { listAccessLogs } from "../../../core/admin/services/accessLogsClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("listAccessLogs hits GET /access-logs with query params", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await listAccessLogs({ limit: 120, status: "failed", query: "login" });
    expect(calls[0]?.input).toBe("/admin/api/access-logs?limit=120&status=failed&q=login");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
