import { expect, test } from "bun:test";

import { listWidgetCatalog } from "../../../core/admin/services/widgetsClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("listWidgetCatalog hits /widgets", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await listWidgetCatalog();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/widgets");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
