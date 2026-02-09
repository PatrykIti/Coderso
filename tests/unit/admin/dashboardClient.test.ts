import { expect, test } from "bun:test";

import { getDashboardData } from "../../../core/admin/services/dashboardClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("getDashboardData hits /dashboard with GET", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      generatedAt: "2026-02-09T10:00:00.000Z",
      totals: { pages: 1, entries: 1, media: 1, users: 1 },
      storage: { usedBytes: 0, limitBytes: null, usedPercent: null },
      security: { status: "ok", issues: 0, checks: [] },
      recentEdits: [],
    });
  };

  try {
    await getDashboardData();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/dashboard");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
