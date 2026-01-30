import { expect, test } from "bun:test";

import { searchAll } from "../../../core/admin/services/searchClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("searchAll hits GET /search with query params", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await searchAll("homepage", { limit: 12 });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/search?q=homepage&limit=12");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
