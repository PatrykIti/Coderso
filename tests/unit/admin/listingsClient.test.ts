import { expect, test } from "bun:test";

import { previewPublicSearch } from "../../../core/admin/services/listingsClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("previewPublicSearch hits internal preview route with query params", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ query: "about", sources: ["pages", "entries"], items: [] });
  };

  try {
    await previewPublicSearch({
      q: "about",
      limit: 20,
      sources: ["pages", "entries"],
    });

    expect(calls[0]?.input).toBe(
      "/admin/api/search/public-preview?q=about&limit=20&sources=pages%2Centries"
    );
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
