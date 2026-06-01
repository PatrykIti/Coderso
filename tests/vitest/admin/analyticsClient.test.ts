import { expect, test } from "vitest";

import {
  exportTopContent,
  getOverview,
  getTopContent,
} from "../../../core/admin/services/analyticsClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("getOverview hits /analytics/overview with rangeDays", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ rangeDays: 30, totals: {}, current: {}, previous: {}, trend: [] });
  };

  try {
    await getOverview(30);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/analytics/overview?rangeDays=30");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getTopContent hits /analytics/top-content with limit, range, and type", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await getTopContent({ limit: 5, rangeDays: 7, type: "page" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/analytics/top-content?limit=5&rangeDays=7&type=page");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("exportTopContent hits the CSV export endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      fileName: "coderso-analytics-top-content-7d-2026-06-01.csv",
      contentType: "text/csv",
      content: "type,title,slug,updatedAt,score",
      rangeDays: 7,
      totalRows: 0,
    });
  };

  try {
    const result = await exportTopContent({ limit: 50, rangeDays: 7, type: "entry" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe(
      "/admin/api/analytics/top-content/export?limit=50&rangeDays=7&format=csv&type=entry"
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(result.contentType).toBe("text/csv");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
