import { expect, test } from "vitest";

import {
  createTaxonomyTerm,
  deleteTaxonomyTerm,
  getTaxonomyOverview,
  listTaxonomies,
  listTaxonomyTerms,
  updateTaxonomyConfig,
  updateTaxonomyTerm,
} from "../../../core/admin/services/taxonomyClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("listTaxonomies encodes the content type id", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await listTaxonomies("news/posts");
    expect(calls[0]?.input).toBe(
      "/admin/api/content-types/news%2Fposts/taxonomies"
    );
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateTaxonomyConfig patches JSON payload with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ items: [] });
  };

  try {
    resetCsrfToken();
    await updateTaxonomyConfig("news/posts", { categories: true, tags: false });

    expect(calls[1]?.input).toBe(
      "/admin/api/content-types/news%2Fposts/taxonomies"
    );
    expect(calls[1]?.init?.method).toBe("PATCH");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      categories: true,
      tags: false,
    });
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("getTaxonomyOverview hits the terms overview endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      taxonomies: { category: null, tag: null },
      terms: { categories: [], tags: [] },
    });
  };

  try {
    const result = await getTaxonomyOverview("news/posts");
    expect(calls[0]?.input).toBe("/admin/api/content-types/news%2Fposts/terms");
    expect(result.terms.categories).toEqual([]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listTaxonomyTerms encodes the taxonomy id", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listTaxonomyTerms("taxonomy/1");
    expect(calls[0]?.input).toBe("/admin/api/taxonomies/taxonomy%2F1/terms");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createTaxonomyTerm posts payload with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "term-1", taxonomyId: "taxonomy/1", name: "News", slug: "news", createdAt: "2026-03-06", updatedAt: "2026-03-06" });
  };

  try {
    resetCsrfToken();
    const result = await createTaxonomyTerm("taxonomy/1", {
      name: "News",
      slug: "news",
    });

    expect(calls[1]?.input).toBe("/admin/api/taxonomies/taxonomy%2F1/terms");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      name: "News",
      slug: "news",
    });
    expect(result.id).toBe("term-1");
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("updateTaxonomyTerm patches the encoded term id with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "term/1", taxonomyId: "taxonomy-1", name: "Updated", slug: "updated", createdAt: "2026-03-06", updatedAt: "2026-03-06" });
  };

  try {
    resetCsrfToken();
    const result = await updateTaxonomyTerm("term/1", {
      name: "Updated",
      slug: "updated",
    });

    expect(calls[1]?.input).toBe("/admin/api/terms/term%2F1");
    expect(calls[1]?.init?.method).toBe("PATCH");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      name: "Updated",
      slug: "updated",
    });
    expect(result.slug).toBe("updated");
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("deleteTaxonomyTerm deletes the encoded term id with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true });
  };

  try {
    resetCsrfToken();
    const result = await deleteTaxonomyTerm("term/1");

    expect(calls[1]?.input).toBe("/admin/api/terms/term%2F1");
    expect(calls[1]?.init?.method).toBe("DELETE");
    expect(result.ok).toBe(true);
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});
