import { expect, test } from "vitest";

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
