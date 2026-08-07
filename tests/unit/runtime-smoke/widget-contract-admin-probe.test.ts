import { expect, test } from "bun:test";
import {
  createAdminFixtureGapMode,
  ensureCommerceWidgetFixtures,
  ensureEntryTeaserWidgetFixtures,
  finalizeAdminResult,
  isAdminFixtureUnopenableError,
} from "../../../scripts/playwright-widget-contract-smoke";
import {
  entryTeaserCase,
  makeInventory,
  makeMode,
  productCompareCase,
  productGalleryCase,
  productTableCase,
} from "./widget-contract-test-support";

test("seeds Entry Teaser content, listings, route, and page through authenticated admin APIs", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url === "http://admin.test/admin/api/content-types" && (init?.method ?? "GET") === "GET") {
      return Response.json([
        {
          id: "type-entry-teaser",
          name: "Old name",
          slug: "fixture-entry-teaser",
          schema: { type: "object", additionalProperties: false, properties: {} },
          status: "draft",
        },
      ]);
    }
    if (
      url === "http://admin.test/admin/api/content/fixture-entry-teaser/entries" &&
      (init?.method ?? "GET") === "GET"
    ) {
      return Response.json([
        {
          id: "entry-manual",
          title: "Old manual",
          slug: "fixture-entry-teaser-manual-brief",
          status: "draft",
          tags: [],
          data: {},
        },
      ]);
    }
    if (url === "http://admin.test/admin/api/settings" && (init?.method ?? "GET") === "GET") {
      return Response.json({
        "site.contentRoutes": [
          {
            type: "products",
            listPath: "/shop",
            detailPath: "/shop/:slug",
            enabled: true,
          },
        ],
      });
    }
    if (
      url === "http://admin.test/admin/api/listings/queries" &&
      (init?.method ?? "GET") === "GET"
    ) {
      return Response.json({
        items: [
          {
            id: "listing-query-entry-teaser",
            name: "Fixture Entry Teaser Listing Query",
            description: null,
            query: {
              source: "entries",
              sourceConfig: { contentTypeId: "type-entry-teaser", includeDrafts: true },
              filters: [],
              sort: [{ field: "id", dir: "asc" }],
              pagination: { limit: 1, offset: 0 },
              fields: ["id"],
            },
          },
        ],
      });
    }
    if (
      url === "http://admin.test/admin/api/listings/templates" &&
      (init?.method ?? "GET") === "GET"
    ) {
      return Response.json({ items: [] });
    }
    if (url === "http://admin.test/admin/api/pages" && (init?.method ?? "GET") === "GET") {
      return Response.json([
        {
          id: "page-entry-teaser",
          title: "Entry Teaser fixture",
          slug: "/audit-31-05-entry-teaser",
          status: "draft",
          updatedAt: "2026-05-31T00:00:00.000Z",
          author: null,
        },
      ]);
    }
    if (
      url === "http://admin.test/admin/api/pages/page-entry-teaser" &&
      (init?.method ?? "GET") === "GET"
    ) {
      return Response.json({
        id: "page-entry-teaser",
        title: "Entry Teaser fixture",
        slug: "/audit-31-05-entry-teaser",
        status: "draft",
        currentData: { seo: { title: "Keep SEO" }, blocks: [] },
        updatedAt: "2026-05-31T00:00:00.000Z",
      });
    }
    if (url === "http://admin.test/admin/api/auth/csrf") {
      return Response.json({ token: "csrf-token" });
    }
    if (
      url === "http://admin.test/admin/api/content-types/type-entry-teaser" &&
      init?.method === "PATCH"
    ) {
      const payload = JSON.parse(String(init.body)) as {
        name?: string;
        slug?: string;
        schema?: Record<string, unknown>;
        status?: string;
      };
      expect(payload).toMatchObject({
        name: "Fixture Entry Teasers",
        status: "published",
      });
      expect(payload.slug).toBeUndefined();
      expect(payload.schema?.additionalProperties).toBe(false);
      return Response.json({
        id: "type-entry-teaser",
        name: payload.name,
        slug: "fixture-entry-teaser",
        schema: payload.schema,
        status: payload.status,
      });
    }
    if (
      url === "http://admin.test/admin/api/content/fixture-entry-teaser/entries/entry-manual" &&
      init?.method === "PATCH"
    ) {
      const payload = JSON.parse(String(init.body)) as {
        title?: string;
        slug?: string;
        data?: Record<string, unknown>;
      };
      expect(payload.title).toBe("Fixture Entry Teaser Manual Brief");
      expect(payload.slug).toBeUndefined();
      expect(typeof payload.data?.featuredImage).toBe("string");
      return Response.json({ id: "entry-manual", ...payload });
    }
    if (
      url === "http://admin.test/admin/api/content/fixture-entry-teaser/entries" &&
      init?.method === "POST"
    ) {
      const payload = JSON.parse(String(init.body)) as {
        title?: string;
        slug?: string;
        data?: Record<string, unknown>;
      };
      expect(payload.slug).toMatch(/^fixture-entry-teaser-/);
      expect(typeof payload.data?.excerpt).toBe("string");
      return Response.json({
        id: `created-${payload.slug}`,
        title: payload.title,
        slug: payload.slug,
        status: "draft",
        tags: [],
        data: payload.data,
      });
    }
    if (
      url.includes("/api/content/fixture-entry-teaser/entries/") &&
      url.endsWith("/metadata") &&
      init?.method === "PATCH"
    ) {
      const payload = JSON.parse(String(init.body)) as { tags?: string[]; status?: string };
      expect(payload.status).toBe("published");
      expect(payload.tags?.length).toBeGreaterThanOrEqual(2);
      return Response.json({ ok: true });
    }
    if (
      url.includes("/api/content/fixture-entry-teaser/entries/") &&
      url.endsWith("/publish") &&
      init?.method === "POST"
    ) {
      return Response.json({ ok: true });
    }
    if (url === "http://admin.test/admin/api/settings" && init?.method === "PATCH") {
      const payload = JSON.parse(String(init.body)) as {
        "site.contentRoutes"?: Array<Record<string, unknown>>;
      };
      expect(payload["site.contentRoutes"]?.[0]).toEqual({
        type: "fixture-entry-teaser",
        listPath: "/fixture-entry-teaser",
        detailPath: "/fixture-entry-teaser/:slug",
        enabled: true,
      });
      return Response.json(payload);
    }
    if (
      url === "http://admin.test/admin/api/listings/queries/listing-query-entry-teaser" &&
      init?.method === "PATCH"
    ) {
      const payload = JSON.parse(String(init.body)) as { query?: Record<string, unknown> };
      expect(payload.query?.fields).toContain("data.featuredImage");
      expect(payload.query?.fields).toContain("data.excerpt");
      return Response.json({ id: "listing-query-entry-teaser", ...payload });
    }
    if (url === "http://admin.test/admin/api/listings/queries" && init?.method === "POST") {
      const payload = JSON.parse(String(init.body)) as {
        name?: string;
        query?: Record<string, unknown>;
      };
      expect(payload.name).toMatch(/^Fixture Entry Teaser/);
      return Response.json({
        id: payload.name?.includes("Fallback")
          ? "listing-query-entry-teaser-fallback"
          : "listing-query-created",
        ...payload,
      });
    }
    if (url === "http://admin.test/admin/api/listings/templates" && init?.method === "POST") {
      const payload = JSON.parse(String(init.body)) as {
        name?: string;
        slug?: string;
        config?: Record<string, unknown>;
      };
      expect(payload.slug).toBe("fixture-entry-teaser-cards");
      expect(Array.isArray(payload.config?.itemActions)).toBe(true);
      return Response.json({ id: "listing-template-entry-teaser", ...payload });
    }
    if (url === "http://admin.test/admin/api/pages/page-entry-teaser" && init?.method === "PATCH") {
      const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
      const blocks = payload.data?.blocks as Array<Record<string, unknown>> | undefined;
      const entryTeaserBlocks = blocks?.filter((block) => block.type === "entry-teaser");
      expect(payload.data?.seo).toEqual({ title: "Keep SEO" });
      expect(entryTeaserBlocks).toHaveLength(3);
      return Response.json({
        id: "page-entry-teaser",
        title: "Entry Teaser fixture",
        slug: "/audit-31-05-entry-teaser",
        status: "draft",
        currentData: payload.data,
        updatedAt: "2026-05-31T00:00:00.000Z",
      });
    }
    if (
      url === "http://admin.test/admin/api/pages/page-entry-teaser/publish" &&
      init?.method === "POST"
    ) {
      const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
      expect(Array.isArray(payload.data?.blocks)).toBe(true);
      return Response.json({ ok: true });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    await ensureEntryTeaserWidgetFixtures("http://admin.test/admin", "session-token", [
      entryTeaserCase,
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const labels = requests.map((request) => `${request.init?.method ?? "GET"} ${request.url}`);
  expect(labels).toContain("GET http://admin.test/admin/api/content-types");
  expect(labels).toContain("PATCH http://admin.test/admin/api/content-types/type-entry-teaser");
  expect(labels).toContain("GET http://admin.test/admin/api/content/fixture-entry-teaser/entries");
  expect(labels).toContain("PATCH http://admin.test/admin/api/settings");
  expect(labels).toContain(
    "PATCH http://admin.test/admin/api/listings/queries/listing-query-entry-teaser"
  );
  expect(labels).toContain("POST http://admin.test/admin/api/listings/queries");
  expect(labels).toContain("POST http://admin.test/admin/api/listings/templates");
  expect(labels).toContain("PATCH http://admin.test/admin/api/pages/page-entry-teaser");
  expect(labels).toContain("POST http://admin.test/admin/api/pages/page-entry-teaser/publish");
  expect(labels.filter((label) => label.endsWith("/metadata"))).toHaveLength(3);
  expect(
    labels.filter((label) => label.endsWith("/publish") && label.includes("/entries/"))
  ).toHaveLength(3);

  const writeHeaders = requests
    .filter((request) => (request.init?.method ?? "GET") !== "GET")
    .map((request) => request.init?.headers)
    .filter((headers): headers is Headers => headers instanceof Headers);
  expect(writeHeaders.every((headers) => headers.get("cookie") === "session=session-token")).toBe(
    true
  );
  expect(writeHeaders.every((headers) => headers.get("X-CSRF-Token") === "csrf-token")).toBe(true);
});

test("seeds Product Gallery commerce media and publishes page fixture through admin APIs", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (
      url === "http://admin.test/admin/api/commerce/collections" &&
      (init?.method ?? "GET") === "GET"
    ) {
      return Response.json({
        items: [
          { id: "collection-homes", slug: "fixture-homes", name: "Fixture Homes" },
          { id: "collection-lofts", slug: "fixture-lofts", name: "Fixture Lofts" },
        ],
      });
    }
    if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
      return Response.json({
        items: [
          {
            id: "media-product-gallery",
            originalName: "widget-fixture-product-gallery-home.svg",
            mimeType: "image/svg+xml",
            type: "image",
            title: "Widget fixture Product Gallery home image",
            alt: "Widget fixture Product Gallery home exterior",
            caption: "Deterministic Product Gallery image fixture.",
          },
        ],
      });
    }
    if (
      url === "http://admin.test/admin/api/commerce/products" &&
      (init?.method ?? "GET") === "GET"
    ) {
      return Response.json({
        items: [
          {
            id: "product-starter",
            slug: "fixture-starter-home",
            title: "Fixture Starter Home",
            status: "published",
            excerpt: "Compact starter plan for deterministic widget smoke coverage.",
            description: "Deterministic fixture product for Product Gallery, Compare, and Table.",
            pricing: { amount: 19900, currency: "USD", compareAtAmount: 24900 },
            stock: { state: "in_stock", quantity: 3 },
            collectionIds: ["collection-homes"],
            mediaIds: [],
          },
          {
            id: "product-urban",
            slug: "fixture-urban-loft",
            title: "Fixture Urban Loft",
            status: "published",
            excerpt: "City-forward loft listing for deterministic comparison coverage.",
            description: "Second deterministic fixture product with a different stock state.",
            pricing: { amount: 29900, currency: "USD", compareAtAmount: 34900 },
            stock: { state: "backorder", quantity: 8 },
            collectionIds: ["collection-lofts"],
            mediaIds: [],
          },
          {
            id: "product-garden",
            slug: "fixture-garden-suite",
            title: "Fixture Garden Suite",
            status: "published",
            excerpt: "Garden-facing suite used to keep product table fixtures populated.",
            description:
              "Third deterministic fixture product to satisfy multi-row public widget proof.",
            pricing: { amount: 15900, currency: "USD", compareAtAmount: 17900 },
            stock: { state: "in_stock", quantity: 1 },
            collectionIds: ["collection-homes", "collection-lofts"],
            mediaIds: [],
          },
        ],
      });
    }
    if (url === "http://admin.test/admin/api/auth/csrf") {
      return Response.json({ token: "csrf-token" });
    }
    if (
      url.startsWith("http://admin.test/admin/api/commerce/products/product-") &&
      init?.method === "PATCH"
    ) {
      const payload = JSON.parse(String(init.body)) as {
        mediaIds?: string[];
        stock?: Record<string, unknown>;
      };
      if (url.endsWith("/product-garden")) {
        expect(payload).toEqual({
          stock: { state: "out_of_stock", quantity: 0 },
          mediaIds: ["media-product-gallery"],
        });
      } else {
        expect(payload).toEqual({ mediaIds: ["media-product-gallery"] });
      }
      return Response.json({ id: url.split("/").pop(), ...payload });
    }
    if (url === "http://admin.test/admin/api/pages" && (init?.method ?? "GET") === "GET") {
      return Response.json([
        {
          id: "page-product-gallery",
          title: "Product Gallery fixture",
          slug: "/audit-31-05-product-gallery",
          status: "draft",
          updatedAt: "2026-05-31T00:00:00.000Z",
          author: null,
        },
      ]);
    }
    if (
      url === "http://admin.test/admin/api/pages/page-product-gallery" &&
      (init?.method ?? "GET") === "GET"
    ) {
      return Response.json({
        id: "page-product-gallery",
        title: "Product Gallery fixture",
        slug: "/audit-31-05-product-gallery",
        status: "draft",
        currentData: {
          seo: { title: "Keep SEO" },
          blocks: [{ id: "gallery-1", type: "product-gallery", variant: "compact", data: {} }],
        },
        updatedAt: "2026-05-31T00:00:00.000Z",
      });
    }
    if (
      url === "http://admin.test/admin/api/pages/page-product-gallery" &&
      init?.method === "PATCH"
    ) {
      const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
      const blocks = payload.data?.blocks as Array<Record<string, unknown>> | undefined;
      const gallery = blocks?.find((block) => block.type === "product-gallery");
      const data = gallery?.data as Record<string, unknown> | undefined;
      expect(payload.data?.seo).toEqual({ title: "Keep SEO" });
      expect(data?.link).toMatchObject({ basePath: "/fixture-products" });
      expect(data?.pagination).toMatchObject({
        mode: "view-all",
        viewAllHref: "/audit-31-05-product-gallery",
      });
      return Response.json({
        id: "page-product-gallery",
        title: "Product Gallery fixture",
        slug: "/audit-31-05-product-gallery",
        status: "draft",
        currentData: payload.data,
        updatedAt: "2026-05-31T00:00:00.000Z",
      });
    }
    if (
      url === "http://admin.test/admin/api/pages/page-product-gallery/publish" &&
      init?.method === "POST"
    ) {
      const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
      expect(Array.isArray(payload.data?.blocks)).toBe(true);
      return Response.json({ ok: true });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    await ensureCommerceWidgetFixtures("http://admin.test/admin", "session-token", [
      productGalleryCase,
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const labels = requests.map((request) => `${request.init?.method ?? "GET"} ${request.url}`);
  expect(labels).toContain("GET http://admin.test/admin/api/media");
  expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-starter");
  expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-urban");
  expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-garden");
  expect(labels).toContain("PATCH http://admin.test/admin/api/pages/page-product-gallery");
  expect(labels).toContain("POST http://admin.test/admin/api/pages/page-product-gallery/publish");

  const writeHeaders = requests
    .filter((request) => (request.init?.method ?? "GET") !== "GET")
    .map((request) => request.init?.headers)
    .filter((headers): headers is Headers => headers instanceof Headers);
  expect(writeHeaders.every((headers) => headers.get("cookie") === "session=session-token")).toBe(
    true
  );
  expect(writeHeaders.every((headers) => headers.get("X-CSRF-Token") === "csrf-token")).toBe(true);
});

test("seeds Product Compare commerce route media and publishes page fixture", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (
      url === "http://admin.test/admin/api/commerce/collections" &&
      (init?.method ?? "GET") === "GET"
    ) {
      return Response.json({
        items: [
          { id: "collection-homes", slug: "fixture-homes", name: "Fixture Homes" },
          { id: "collection-lofts", slug: "fixture-lofts", name: "Fixture Lofts" },
        ],
      });
    }
    if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
      return Response.json({
        items: [
          {
            id: "media-product-gallery",
            originalName: "widget-fixture-product-gallery-home.svg",
            mimeType: "image/svg+xml",
            type: "image",
            title: "Widget fixture Product Gallery home image",
            alt: "Widget fixture Product Gallery home exterior",
            caption: "Deterministic Product Gallery image fixture.",
          },
        ],
      });
    }
    if (url === "http://admin.test/admin/api/settings" && (init?.method ?? "GET") === "GET") {
      return Response.json({
        "site.contentRoutes": [
          {
            type: "products",
            listPath: "/shop",
            detailPath: "/shop/:slug",
            enabled: true,
          },
          {
            type: "posts",
            listPath: "/blog",
            detailPath: "/blog/:slug",
            enabled: true,
          },
        ],
      });
    }
    if (url === "http://admin.test/admin/api/settings" && init?.method === "PATCH") {
      const payload = JSON.parse(String(init.body)) as {
        "site.contentRoutes"?: Array<Record<string, unknown>>;
      };
      expect(payload["site.contentRoutes"]?.[0]).toEqual({
        type: "products",
        listPath: "/fixture-products",
        detailPath: "/fixture-products/:slug",
        enabled: true,
      });
      expect(payload["site.contentRoutes"]?.[1]).toEqual({
        type: "products",
        listPath: "/shop",
        detailPath: "/shop/:slug",
        enabled: true,
      });
      return Response.json(payload);
    }
    if (
      url === "http://admin.test/admin/api/commerce/products" &&
      (init?.method ?? "GET") === "GET"
    ) {
      return Response.json({
        items: [
          {
            id: "product-starter",
            slug: "fixture-starter-home",
            title: "Fixture Starter Home",
            status: "published",
            excerpt: "Compact starter plan for deterministic widget smoke coverage.",
            description: "Deterministic fixture product for Product Gallery, Compare, and Table.",
            pricing: { amount: 19900, currency: "USD", compareAtAmount: 24900 },
            stock: { state: "in_stock", quantity: 3 },
            collectionIds: ["collection-homes"],
            mediaIds: [],
          },
          {
            id: "product-urban",
            slug: "fixture-urban-loft",
            title: "Fixture Urban Loft",
            status: "published",
            excerpt: "City-forward loft listing for deterministic comparison coverage.",
            description: "Second deterministic fixture product with a different stock state.",
            pricing: { amount: 29900, currency: "USD", compareAtAmount: 34900 },
            stock: { state: "backorder", quantity: 8 },
            collectionIds: ["collection-lofts"],
            mediaIds: [],
          },
          {
            id: "product-garden",
            slug: "fixture-garden-suite",
            title: "Fixture Garden Suite",
            status: "published",
            excerpt: "Garden-facing suite used to keep product table fixtures populated.",
            description:
              "Third deterministic fixture product to satisfy multi-row public widget proof.",
            pricing: { amount: 15900, currency: "USD", compareAtAmount: 17900 },
            stock: { state: "in_stock", quantity: 1 },
            collectionIds: ["collection-homes", "collection-lofts"],
            mediaIds: [],
          },
        ],
      });
    }
    if (url === "http://admin.test/admin/api/auth/csrf") {
      return Response.json({ token: "csrf-token" });
    }
    if (
      url.startsWith("http://admin.test/admin/api/commerce/products/product-") &&
      init?.method === "PATCH"
    ) {
      const payload = JSON.parse(String(init.body)) as {
        mediaIds?: string[];
        stock?: Record<string, unknown>;
      };
      if (url.endsWith("/product-garden")) {
        expect(payload).toEqual({
          stock: { state: "out_of_stock", quantity: 0 },
          mediaIds: ["media-product-gallery"],
        });
      } else {
        expect(payload).toEqual({ mediaIds: ["media-product-gallery"] });
      }
      return Response.json({ id: url.split("/").pop(), ...payload });
    }
    if (url === "http://admin.test/admin/api/pages" && (init?.method ?? "GET") === "GET") {
      return Response.json([
        {
          id: "page-product-compare",
          title: "Product Compare fixture",
          slug: "/audit-31-05-product-compare",
          status: "draft",
          updatedAt: "2026-05-31T00:00:00.000Z",
          author: null,
        },
      ]);
    }
    if (
      url === "http://admin.test/admin/api/pages/page-product-compare" &&
      (init?.method ?? "GET") === "GET"
    ) {
      return Response.json({
        id: "page-product-compare",
        title: "Product Compare fixture",
        slug: "/audit-31-05-product-compare",
        status: "draft",
        currentData: {
          seo: { title: "Keep SEO" },
          blocks: [{ id: "compare-1", type: "product-compare", variant: "cards", data: {} }],
        },
        updatedAt: "2026-05-31T00:00:00.000Z",
      });
    }
    if (
      url === "http://admin.test/admin/api/pages/page-product-compare" &&
      init?.method === "PATCH"
    ) {
      const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
      const blocks = payload.data?.blocks as Array<Record<string, unknown>> | undefined;
      const compare = blocks?.find((block) => block.type === "product-compare");
      const data = compare?.data as Record<string, unknown> | undefined;
      expect(payload.data?.seo).toEqual({ title: "Keep SEO" });
      expect(compare).toMatchObject({ id: "compare-1", variant: "matrix" });
      expect(data?.header).toEqual({
        showImages: true,
        linkTitles: true,
        ctaMode: "view_product",
        ctaLabel: "Inspect fixture product",
      });
      return Response.json({
        id: "page-product-compare",
        title: "Product Compare fixture",
        slug: "/audit-31-05-product-compare",
        status: "draft",
        currentData: payload.data,
        updatedAt: "2026-05-31T00:00:00.000Z",
      });
    }
    if (
      url === "http://admin.test/admin/api/pages/page-product-compare/publish" &&
      init?.method === "POST"
    ) {
      const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
      expect(Array.isArray(payload.data?.blocks)).toBe(true);
      return Response.json({ ok: true });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    await ensureCommerceWidgetFixtures("http://admin.test/admin", "session-token", [
      productCompareCase,
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const labels = requests.map((request) => `${request.init?.method ?? "GET"} ${request.url}`);
  expect(labels).toContain("GET http://admin.test/admin/api/settings");
  expect(labels).toContain("PATCH http://admin.test/admin/api/settings");
  expect(labels).toContain("GET http://admin.test/admin/api/media");
  expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-starter");
  expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-urban");
  expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-garden");
  expect(labels).toContain("PATCH http://admin.test/admin/api/pages/page-product-compare");
  expect(labels).toContain("POST http://admin.test/admin/api/pages/page-product-compare/publish");

  const writeHeaders = requests
    .filter((request) => (request.init?.method ?? "GET") !== "GET")
    .map((request) => request.init?.headers)
    .filter((headers): headers is Headers => headers instanceof Headers);
  expect(writeHeaders.every((headers) => headers.get("cookie") === "session=session-token")).toBe(
    true
  );
  expect(writeHeaders.every((headers) => headers.get("X-CSRF-Token") === "csrf-token")).toBe(true);
});

test("seeds Product Table commerce route media and publishes page fixture", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (
      url === "http://admin.test/admin/api/commerce/collections" &&
      (init?.method ?? "GET") === "GET"
    ) {
      return Response.json({
        items: [
          { id: "collection-homes", slug: "fixture-homes", name: "Fixture Homes" },
          { id: "collection-lofts", slug: "fixture-lofts", name: "Fixture Lofts" },
        ],
      });
    }
    if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
      return Response.json({
        items: [
          {
            id: "media-product-gallery",
            originalName: "widget-fixture-product-gallery-home.svg",
            mimeType: "image/svg+xml",
            type: "image",
            title: "Widget fixture Product Gallery home image",
            alt: "Widget fixture Product Gallery home exterior",
            caption: "Deterministic Product Gallery image fixture.",
          },
        ],
      });
    }
    if (url === "http://admin.test/admin/api/settings" && (init?.method ?? "GET") === "GET") {
      return Response.json({
        "site.contentRoutes": [
          {
            type: "products",
            listPath: "/shop",
            detailPath: "/shop/:slug",
            enabled: true,
          },
        ],
      });
    }
    if (url === "http://admin.test/admin/api/settings" && init?.method === "PATCH") {
      const payload = JSON.parse(String(init.body)) as {
        "site.contentRoutes"?: Array<Record<string, unknown>>;
      };
      expect(payload["site.contentRoutes"]?.[0]).toEqual({
        type: "products",
        listPath: "/fixture-products",
        detailPath: "/fixture-products/:slug",
        enabled: true,
      });
      return Response.json(payload);
    }
    if (
      url === "http://admin.test/admin/api/commerce/products" &&
      (init?.method ?? "GET") === "GET"
    ) {
      return Response.json({
        items: [
          {
            id: "product-starter",
            slug: "fixture-starter-home",
            title: "Fixture Starter Home",
            status: "published",
            excerpt: "Compact starter plan for deterministic widget smoke coverage.",
            description: "Deterministic fixture product for Product Gallery, Compare, and Table.",
            pricing: { amount: 19900, currency: "USD", compareAtAmount: 24900 },
            stock: { state: "in_stock", quantity: 3 },
            collectionIds: ["collection-homes"],
            mediaIds: [],
          },
          {
            id: "product-urban",
            slug: "fixture-urban-loft",
            title: "Fixture Urban Loft",
            status: "published",
            excerpt: "City-forward loft listing for deterministic comparison coverage.",
            description: "Second deterministic fixture product with a different stock state.",
            pricing: { amount: 29900, currency: "USD", compareAtAmount: 34900 },
            stock: { state: "backorder", quantity: 8 },
            collectionIds: ["collection-lofts"],
            mediaIds: [],
          },
          {
            id: "product-garden",
            slug: "fixture-garden-suite",
            title: "Fixture Garden Suite",
            status: "published",
            excerpt: "Garden-facing suite used to keep product table fixtures populated.",
            description:
              "Third deterministic fixture product to satisfy multi-row public widget proof.",
            pricing: { amount: 15900, currency: "USD", compareAtAmount: 17900 },
            stock: { state: "in_stock", quantity: 1 },
            collectionIds: ["collection-homes", "collection-lofts"],
            mediaIds: [],
          },
        ],
      });
    }
    if (url === "http://admin.test/admin/api/auth/csrf") {
      return Response.json({ token: "csrf-token" });
    }
    if (
      url.startsWith("http://admin.test/admin/api/commerce/products/product-") &&
      init?.method === "PATCH"
    ) {
      const payload = JSON.parse(String(init.body)) as {
        mediaIds?: string[];
        stock?: Record<string, unknown>;
      };
      if (url.endsWith("/product-garden")) {
        expect(payload).toEqual({
          stock: { state: "out_of_stock", quantity: 0 },
          mediaIds: ["media-product-gallery"],
        });
      } else {
        expect(payload).toEqual({ mediaIds: ["media-product-gallery"] });
      }
      return Response.json({ id: url.split("/").pop(), ...payload });
    }
    if (url === "http://admin.test/admin/api/pages" && (init?.method ?? "GET") === "GET") {
      return Response.json([
        {
          id: "page-product-table",
          title: "Product Table fixture",
          slug: "/audit-31-05-product-table",
          status: "draft",
          updatedAt: "2026-05-31T00:00:00.000Z",
          author: null,
        },
      ]);
    }
    if (
      url === "http://admin.test/admin/api/pages/page-product-table" &&
      (init?.method ?? "GET") === "GET"
    ) {
      return Response.json({
        id: "page-product-table",
        title: "Product Table fixture",
        slug: "/audit-31-05-product-table",
        status: "draft",
        currentData: {
          seo: { title: "Keep SEO" },
          blocks: [{ id: "table-1", type: "product-table", variant: "compact", data: {} }],
        },
        updatedAt: "2026-05-31T00:00:00.000Z",
      });
    }
    if (
      url === "http://admin.test/admin/api/pages/page-product-table" &&
      init?.method === "PATCH"
    ) {
      const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
      const blocks = payload.data?.blocks as Array<Record<string, unknown>> | undefined;
      const table = blocks?.find((block) => block.type === "product-table");
      const data = table?.data as Record<string, unknown> | undefined;
      expect(payload.data?.seo).toEqual({ title: "Keep SEO" });
      expect(table).toMatchObject({ id: "table-1", variant: "default" });
      expect(data?.fields).toMatchObject({ showImage: true, showTitle: true });
      expect(data?.links).toEqual({
        linkedColumn: "title",
        showAction: true,
        actionLabel: "Inspect fixture product",
        openInNewTab: false,
      });
      return Response.json({
        id: "page-product-table",
        title: "Product Table fixture",
        slug: "/audit-31-05-product-table",
        status: "draft",
        currentData: payload.data,
        updatedAt: "2026-05-31T00:00:00.000Z",
      });
    }
    if (
      url === "http://admin.test/admin/api/pages/page-product-table/publish" &&
      init?.method === "POST"
    ) {
      const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
      expect(Array.isArray(payload.data?.blocks)).toBe(true);
      return Response.json({ ok: true });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    await ensureCommerceWidgetFixtures("http://admin.test/admin", "session-token", [
      productTableCase,
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const labels = requests.map((request) => `${request.init?.method ?? "GET"} ${request.url}`);
  expect(labels).toContain("GET http://admin.test/admin/api/settings");
  expect(labels).toContain("PATCH http://admin.test/admin/api/settings");
  expect(labels).toContain("GET http://admin.test/admin/api/media");
  expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-starter");
  expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-urban");
  expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-garden");
  expect(labels).toContain("PATCH http://admin.test/admin/api/pages/page-product-table");
  expect(labels).toContain("POST http://admin.test/admin/api/pages/page-product-table/publish");

  const writeHeaders = requests
    .filter((request) => (request.init?.method ?? "GET") !== "GET")
    .map((request) => request.init?.headers)
    .filter((headers): headers is Headers => headers instanceof Headers);
  expect(writeHeaders.every((headers) => headers.get("cookie") === "session=session-token")).toBe(
    true
  );
  expect(writeHeaders.every((headers) => headers.get("X-CSRF-Token") === "csrf-token")).toBe(true);
});

test("classifies unopenable admin fixtures separately from editor contract failures", () => {
  const [item] = makeInventory().widgets;
  const fixtureGap = createAdminFixtureGapMode("advanced", "block_select_missing");
  const finalized = finalizeAdminResult(item, {
    widgetType: item.widgetType,
    modes: [makeMode({ mode: "wizard" }), makeMode({ mode: "visual" }), fixtureGap],
  });

  expect(isAdminFixtureUnopenableError("block_select_missing")).toBe(true);
  expect(isAdminFixtureUnopenableError("mode_root_or_visible_section_missing")).toBe(false);
  expect(fixtureGap).toMatchObject({
    status: "fixture-gap",
    error: "admin_fixture_unopenable:block_select_missing",
  });
  expect(finalized.status).toBe("fixture-gap");
});
