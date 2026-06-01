import { expect, test } from "vitest";

import { listAuditLogs } from "../../../core/admin/services/auditClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
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
