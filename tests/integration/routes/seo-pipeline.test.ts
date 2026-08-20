// TASK-493-06-L01: end-to-end SEO pipeline over the real HTTP server (Bun lane).
//
// Seeds a published page (+ a published entry on an enabled content route) and
// seo_documents rows, stubs the GSC layer through `mock.module` on the lazily
// imported `gscClient` module, then exercises the whole pipeline over the real
// request stack: POST /seo/search-performance/sync -> seo_search_metrics /
// seo_search_queries / seo_indexed_pages rows, GET /seo/overview and
// GET /seo/search-performance aggregates, POST /seo/sitemap/submit ->
// GET /seo/sitemap status, and the public /sitemap.xml feed. Unhappy paths
// cover the unconfigured-GSC 409, reject-unknown 400s, missing-permission 403
// and missing/invalid CSRF 403. Every row this file creates is cleaned up by
// scoped deletes (the 4 SEO tables + seeded users/roles/sessions/access logs;
// pages/entries/types are tracked through pages-runtime-test-support).
import { afterAll, beforeAll, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  accessLogs,
  contentEntries,
  contentTypes,
  pageRevisions,
  pages,
  previewTokens,
  roles,
  seoDocuments,
  seoIndexedPages,
  seoSearchMetrics,
  seoSearchQueries,
  seoSitemapSubmissions,
  sessions,
  userRoles,
  users,
} from "../../../core/db/schema";
import {
  deleteSetting,
  getSettingRecord,
  setSetting,
} from "../../../core/services/settings/settingsService";
import { startHttpServer } from "../../../core/server/httpServer";
import { resolveAdminPath } from "../../../core/server/utils/adminPath";
import {
  SESSION_COOKIE_NAME,
  createCsrfToken,
  createSession,
  setCsrfToken,
} from "../../../core/services/auth/sessionService";
import type { GscClient, GscInspectionResult } from "../../../core/services/seo/gscClient";
import {
  createPublishedPageWithDraft,
  dbRuntimeTimeout,
  requestPublicPath,
  setTestSetting,
  testIfDb,
  trackContentEntry,
  trackContentType,
  trackPage,
} from "../runtime/pages-runtime-test-support";

// The SEO services import `gscClient` lazily inside their `buildDefaultDeps`
// (never statically), so a module-scope mock registered before any request
// intercepts every production call. The stub is switchable per test through
// `stub.mode`, so the same file can drive the happy path, the degraded
// unconfigured path, and a token-leaking failure.
type StubMode = "ok" | "not_configured" | "token_leak";

const stub = {
  mode: "ok" as StubMode,
  calls: [] as Array<{ method: string; path: string }>,
  metricsRows: [] as unknown[],
  queryRows: [] as unknown[],
  // Relative sitemap loc that the stub reports as INDEXED; every other URL is
  // reported NOT_INDEXED so the seeded page is the only indexed document.
  indexedUrl: null as string | null,
};

mock.module("../../../core/services/seo/gscClient", () => ({
  getGscClient: async (): Promise<GscClient> => {
    if (stub.mode === "not_configured") throw new Error("gsc_not_configured");
    return {
      siteUrl: "https://pipeline-stub.example/",
      request: async (method, path, body) => {
        stub.calls.push({ method, path });
        if (stub.mode === "token_leak") {
          throw new Error("gsc_request_failed:401 access_token=SECRET_GSC_TOKEN_MARKER");
        }
        if (method === "GET") return { sitemap: [] };
        if (method === "PUT") return null;
        const dims =
          body !== null &&
          typeof body === "object" &&
          Array.isArray((body as { dimensions?: unknown }).dimensions)
            ? ((body as { dimensions: unknown[] }).dimensions as string[])
            : [];
        if (dims.includes("query")) return { rows: stub.queryRows };
        return { rows: stub.metricsRows };
      },
      inspectUrl: async (url) => {
        stub.calls.push({ method: "INSPECT", path: url });
        if (stub.mode === "token_leak") {
          throw new Error("gsc_request_failed:429 access_token=SECRET_GSC_TOKEN_MARKER");
        }
        const indexingState = url === stub.indexedUrl ? "INDEXED" : "NOT_INDEXED";
        return { url, indexingState } as GscInspectionResult;
      },
    };
  },
}));

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const hasDbAndTables = hasDb && (await hasSeoTables());
const testIfTables = hasDbAndTables ? test : test.skip;
// Bun's `test` typing does not expose the `{ timeout }` options argument; the
// repo pattern casts a named variant (see pages-runtime-test-support).
const testIfTablesWithOptions = testIfTables as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;

async function canConnect(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

async function hasSeoTables(): Promise<boolean> {
  try {
    await db.execute(sql`select 1 from seo_search_metrics limit 1`);
    return true;
  } catch {
    return false;
  }
}

const MARKER = `seo-pipeline-${randomUUID().slice(0, 8)}`;
const STUB_ORIGIN = "https://pipeline-stub.example";
const TOKEN_MARKER = "SECRET_GSC_TOKEN_MARKER";

let server: ReturnType<typeof startHttpServer> | null = null;
let baseUrl = "";

type HttpActor = {
  userId: string;
  roleId: string;
  sessionId: string;
  token: string;
  csrfToken: string;
};

const cleanedUserIds = new Set<string>();
const cleanedRoleIds = new Set<string>();
const cleanedSessionIds = new Set<string>();
const cleanedSeoUrls = new Set<string>();
const cleanedIndexedUrls = new Set<string>();
const cleanedSubmissionUrls = new Set<string>();
const cleanedSeoDocumentIds = new Set<string>();
// The support module's `afterEach` cleanup does not reliably attach to every
// test file when several files share the module in one process, so this file
// owns the fixture rows it creates through the tracked helpers as well.
const cleanedPageIds = new Set<string>();
const cleanedEntryIds = new Set<string>();
const cleanedTypeIds = new Set<string>();
let contentRoutesSnapshot: { exists: boolean; value: unknown } | null = null;

const createActor = async (permissions: readonly string[]): Promise<HttpActor> => {
  const [user] = await db
    .insert(users)
    .values({
      email: `${MARKER}-${randomUUID()}@example.test`,
      passwordHash: "test-hash",
      status: "active",
    })
    .returning({ id: users.id });
  if (!user) throw new Error("pipeline_user_create_failed");

  const [role] = await db
    .insert(roles)
    .values({ name: `${MARKER}-role-${randomUUID()}`, permissions: [...permissions] })
    .returning({ id: roles.id });
  if (!role) throw new Error("pipeline_role_create_failed");
  await db.insert(userRoles).values({ userId: user.id, roleId: role.id });

  const created = await createSession({ userId: user.id, userAgent: MARKER });
  const csrf = createCsrfToken();
  await setCsrfToken(created.session.id, csrf.tokenHash);

  cleanedUserIds.add(user.id);
  cleanedRoleIds.add(role.id);
  cleanedSessionIds.add(created.session.id);
  return {
    userId: user.id,
    roleId: role.id,
    sessionId: created.session.id,
    token: created.token,
    csrfToken: csrf.token,
  };
};

const seedSeoDocument = async (targetType: "page" | "entry", targetId: string, slug: string) => {
  const [row] = await db
    .insert(seoDocuments)
    .values({ targetType, targetId, slug, score: 92 })
    .returning({ id: seoDocuments.id });
  if (!row?.id) throw new Error("pipeline_seo_document_failed");
  cleanedSeoDocumentIds.add(row.id);
};

const seedEntry = async (typeSlug: string) => {
  const token = randomUUID().slice(0, 8);
  const [type] = await db
    .insert(contentTypes)
    .values({
      name: `Pipeline Type ${token}`,
      slug: typeSlug,
      schema: { type: "object", additionalProperties: false, properties: {} },
      status: "published",
      config: {},
    })
    .returning({ id: contentTypes.id });
  if (!type?.id) throw new Error("pipeline_type_create_failed");
  trackContentType(type.id);

  const [entry] = await db
    .insert(contentEntries)
    .values({
      typeId: type.id,
      slug: `pipeline-entry-${token}`,
      title: `Pipeline Entry ${token}`,
      status: "published",
      visibility: "public",
      data: { title: `Pipeline Entry ${token}` },
      publishedAt: new Date(),
    })
    .returning({ id: contentEntries.id, slug: contentEntries.slug });
  if (!entry?.id) throw new Error("pipeline_entry_create_failed");
  trackContentEntry(entry.id);
  return { typeId: type.id, entry };
};

const request = async (
  method: string,
  path: string,
  options: {
    actor?: HttpActor;
    csrfToken?: string;
    body?: unknown;
    extraHeaders?: Record<string, string>;
  } = {}
): Promise<Response> => {
  const headers: Record<string, string> = {
    "User-Agent": MARKER,
    "Content-Type": "application/json",
  };
  if (options.actor) headers["Cookie"] = `${SESSION_COOKIE_NAME}=${options.actor.token}`;
  if (options.csrfToken) headers["X-CSRF-Token"] = options.csrfToken;
  if (options.extraHeaders) {
    for (const [key, value] of Object.entries(options.extraHeaders)) headers[key] = value;
  }
  const init: RequestInit = { method, headers };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  return fetch(`${baseUrl}${path}`, init);
};

const responseErrorCode = async (response: Response): Promise<string | null> => {
  const value = (await response.json()) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const error = (value as Record<string, unknown>).error;
  if (!error || typeof error !== "object" || Array.isArray(error)) return null;
  const code = (error as Record<string, unknown>).code;
  return typeof code === "string" ? code : null;
};

const dayStrings = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return {
    today: today.toISOString().slice(0, 10),
    yesterday: yesterday.toISOString().slice(0, 10),
  };
};

// The three submission tests each own the `/sitemap.xml` feedpath row; a
// previous test's row must never leak into a later assertion, so every test
// that touches submissions starts from an empty `/sitemap.xml` slate.
const cleanSubmissionRows = async () => {
  if (!hasDbAndTables) return;
  await db
    .delete(seoSitemapSubmissions)
    .where(eq(seoSitemapSubmissions.sitemapUrl, "/sitemap.xml"));
};

beforeAll(async () => {
  if (!hasDbAndTables) return;
  const row = await getSettingRecord("site.contentRoutes");
  contentRoutesSnapshot = { exists: Boolean(row), value: row?.value };
  const adminPath = await resolveAdminPath();
  server = startHttpServer({ port: 0 });
  baseUrl = `http://127.0.0.1:${server.port}${adminPath}/api`;
});

afterAll(async () => {
  if (hasDb) {
    const seoUrls = [...cleanedSeoUrls];
    if (seoUrls.length > 0) {
      await db.delete(seoSearchMetrics).where(inArray(seoSearchMetrics.url, seoUrls));
      await db.delete(seoSearchQueries).where(inArray(seoSearchQueries.url, seoUrls));
    }
    const indexedUrls = [...cleanedIndexedUrls];
    if (indexedUrls.length > 0) {
      await db.delete(seoIndexedPages).where(inArray(seoIndexedPages.url, indexedUrls));
    }
    const submissionUrls = [...cleanedSubmissionUrls];
    if (submissionUrls.length > 0) {
      await db
        .delete(seoSitemapSubmissions)
        .where(inArray(seoSitemapSubmissions.sitemapUrl, submissionUrls));
    }
    if (cleanedSeoDocumentIds.size > 0) {
      await db.delete(seoDocuments).where(inArray(seoDocuments.id, [...cleanedSeoDocumentIds]));
    }
    const pageIds = [...cleanedPageIds];
    if (pageIds.length > 0) {
      await db.delete(seoDocuments).where(inArray(seoDocuments.targetId, pageIds));
      await db.delete(previewTokens).where(inArray(previewTokens.targetId, pageIds));
      await db.delete(pageRevisions).where(inArray(pageRevisions.pageId, pageIds));
      await db.delete(pages).where(inArray(pages.id, pageIds));
    }
    const entryIds = [...cleanedEntryIds];
    if (entryIds.length > 0) {
      await db.delete(seoDocuments).where(inArray(seoDocuments.targetId, entryIds));
      await db.delete(previewTokens).where(inArray(previewTokens.targetId, entryIds));
      await db.delete(contentEntries).where(inArray(contentEntries.id, entryIds));
    }
    if (cleanedTypeIds.size > 0) {
      await db.delete(contentTypes).where(inArray(contentTypes.id, [...cleanedTypeIds]));
    }
    await db.delete(accessLogs).where(eq(accessLogs.userAgent, MARKER));
    await db.delete(sessions).where(inArray(sessions.id, [...cleanedSessionIds]));
    await db.delete(userRoles).where(inArray(userRoles.userId, [...cleanedUserIds]));
    await db.delete(roles).where(inArray(roles.id, [...cleanedRoleIds]));
    await db.delete(users).where(inArray(users.id, [...cleanedUserIds]));
    if (contentRoutesSnapshot !== null) {
      if (contentRoutesSnapshot.exists) {
        await setSetting("site.contentRoutes", contentRoutesSnapshot.value);
      } else {
        await deleteSetting("site.contentRoutes");
      }
    }
  }
  await server?.stop(true);
});

testIfTablesWithOptions(
  "schema -> sync -> aggregate -> sitemap end-to-end over real HTTP",
  async () => {
    await cleanSubmissionRows();
    stub.mode = "ok";
    stub.calls = [];
    const { actor: supportActor, page, slug } = await createPublishedPageWithDraft();
    trackPage(page.id);
    cleanedPageIds.add(page.id);
    cleanedUserIds.add(supportActor.id);
    await seedSeoDocument("page", page.id, slug);
    const { typeId, entry } = await seedEntry("pipeline-articles");
    cleanedTypeIds.add(typeId);
    cleanedEntryIds.add(entry.id);
    await seedSeoDocument("entry", entry.id, entry.slug);
    // The content type row must exist before the route setting is written
    // (lockContentRouteSettingRootsTx validates each route.type).
    await setTestSetting("site.contentRoutes", [
      {
        type: "pipeline-articles",
        listPath: "/pipeline-articles",
        detailPath: "/pipeline-articles/:slug",
        enabled: true,
      },
    ]);

    const actor = await createActor(["content:read", "settings:write"]);
    const { today, yesterday } = dayStrings();
    const pageUrl = `${STUB_ORIGIN}${slug}`;
    const entryLoc = `/pipeline-articles/${entry.slug}`;
    const entryUrl = `${STUB_ORIGIN}${entryLoc}`;
    cleanedSeoUrls.add(pageUrl);
    cleanedSeoUrls.add(entryUrl);
    cleanedIndexedUrls.add(slug);
    cleanedIndexedUrls.add(entryLoc);
    // Only the seeded page is reported as INDEXED; the entry stays NOT_INDEXED
    // so the overview indexedPages assertion is exactly 1.
    stub.indexedUrl = slug;

    stub.metricsRows = [
      {
        keys: [yesterday, pageUrl],
        clicks: 12,
        impressions: 400,
        ctr: 0.03,
        position: 7.5,
      },
      { keys: [today, pageUrl], clicks: 8, impressions: 250, ctr: 0.032, position: 6.1 },
    ];
    stub.queryRows = [
      {
        keys: [yesterday, pageUrl, "launch pricing"],
        clicks: 4,
        impressions: 90,
        ctr: 0.044,
        position: 5.2,
      },
    ];

    // 1. Sync: metrics + queries + indexed pages land in the 01 tables.
    const sync = await request("POST", "/seo/search-performance/sync", {
      actor,
      csrfToken: actor.csrfToken,
      body: { startDate: yesterday, endDate: today },
    });
    expect(sync.status).toBe(200);
    const syncBody = (await sync.json()) as { metrics?: number; queries?: number };
    expect(syncBody.metrics).toBeGreaterThan(0);
    expect(syncBody.queries).toBeGreaterThan(0);

    const metricCount = await db
      .select({ id: seoSearchMetrics.id })
      .from(seoSearchMetrics)
      .where(inArray(seoSearchMetrics.url, [pageUrl, entryUrl]));
    expect(metricCount.length).toBeGreaterThan(0);
    const queryCount = await db
      .select({ id: seoSearchQueries.id })
      .from(seoSearchQueries)
      .where(inArray(seoSearchQueries.url, [pageUrl, entryUrl]));
    expect(queryCount.length).toBeGreaterThan(0);
    const indexedCount = await db
      .select({ id: seoIndexedPages.id })
      .from(seoIndexedPages)
      .where(inArray(seoIndexedPages.url, [slug, entryLoc]));
    expect(indexedCount.length).toBeGreaterThan(0);

    // 2. Overview aggregates the persisted rows.
    const overview = await request("GET", "/seo/overview", { actor });
    expect(overview.status).toBe(200);
    const overviewBody = (await overview.json()) as {
      indexedPages?: number;
      totalImpressions?: number;
      totalClicks?: number;
    };
    expect(overviewBody.indexedPages).toBe(1);
    expect(overviewBody.totalImpressions).toBeGreaterThan(0);
    expect(overviewBody.totalClicks).toBeGreaterThan(0);

    // 3. Search-performance report includes the synced totals.
    const report = await request("GET", "/seo/search-performance", { actor });
    expect(report.status).toBe(200);
    const reportBody = (await report.json()) as {
      totals?: { totalImpressions?: number };
      series?: unknown[];
      topQueries?: unknown[];
    };
    expect(reportBody.totals?.totalImpressions).toBeGreaterThan(0);
    expect(reportBody.series?.length).toBeGreaterThan(0);
    expect(reportBody.topQueries?.length).toBeGreaterThan(0);

    // 4. Sitemap submission records a "submitted" row, readable through the
    // status route.
    const submit = await request("POST", "/seo/sitemap/submit", {
      actor,
      csrfToken: actor.csrfToken,
      body: {},
    });
    expect(submit.status).toBe(200);
    const submitBody = (await submit.json()) as { sitemapUrl?: string; status?: string };
    expect(submitBody.sitemapUrl).toBe("/sitemap.xml");
    expect(submitBody.status).toBe("submitted");
    if (submitBody.sitemapUrl) cleanedSubmissionUrls.add(submitBody.sitemapUrl);

    const status = await request("GET", "/seo/sitemap", { actor });
    expect(status.status).toBe(200);
    const statusBody = (await status.json()) as Array<{ sitemapUrl?: string; status?: string }>;
    const latest = statusBody.find((row) => row.sitemapUrl === "/sitemap.xml");
    expect(latest?.status).toBe("submitted");

    // 5. The public feed lists both seeded targets.
    const xmlResponse = await requestPublicPath("/sitemap.xml");
    expect(xmlResponse.status).toBe(200);
    expect(xmlResponse.headers.get("content-type")).toContain("application/xml");
    const xml = await xmlResponse.text();
    expect(xml).toContain(`http://public.coderso.test${slug}`);
    expect(xml).toContain(`/pipeline-articles/${entry.slug}`);
  },
  { timeout: dbRuntimeTimeout * 2 }
);

testIfTablesWithOptions(
  "unconfigured GSC maps to 409 on both write routes and records no submission row",
  async () => {
    await cleanSubmissionRows();
    stub.mode = "not_configured";
    stub.calls = [];
    const actor = await createActor(["content:read", "settings:write"]);
    const { today, yesterday } = dayStrings();

    const sync = await request("POST", "/seo/search-performance/sync", {
      actor,
      csrfToken: actor.csrfToken,
      body: { startDate: yesterday, endDate: today },
    });
    expect(sync.status).toBe(409);
    expect(await responseErrorCode(sync)).toBe("gsc_not_configured");

    const submit = await request("POST", "/seo/sitemap/submit", {
      actor,
      csrfToken: actor.csrfToken,
      body: {},
    });
    expect(submit.status).toBe(409);
    expect(await responseErrorCode(submit)).toBe("gsc_not_configured");

    // gsc_not_configured is raised by getGscClient before any persistence, so
    // no error row is written and the status surface degrades to local rows.
    const rows = await db.select().from(seoSitemapSubmissions);
    const ours = rows.filter((row) => row.sitemapUrl.startsWith("/sitemap"));
    expect(ours.length).toBe(0);

    const status = await request("GET", "/seo/sitemap", { actor });
    expect(status.status).toBe(200);
    const statusBody = (await status.json()) as unknown[];
    expect(Array.isArray(statusBody)).toBe(true);
  },
  { timeout: dbRuntimeTimeout * 2 }
);

testIfTablesWithOptions(
  "degraded sitemap submission maps to 502 and records a redacted error row",
  async () => {
    await cleanSubmissionRows();
    stub.mode = "token_leak";
    stub.calls = [];
    const actor = await createActor(["content:read", "settings:write"]);

    const submit = await request("POST", "/seo/sitemap/submit", {
      actor,
      csrfToken: actor.csrfToken,
      body: {},
    });
    expect(submit.status).toBe(502);
    const submitText = await submit.text();
    expect(JSON.parse(submitText)).toMatchObject({
      error: { code: "sitemap_submit_failed" },
    });
    expect(submitText).not.toContain(TOKEN_MARKER);

    const rows = await db
      .select()
      .from(seoSitemapSubmissions)
      .where(inArray(seoSitemapSubmissions.sitemapUrl, ["/sitemap.xml"]));
    const ours = rows.filter((row) => row.sitemapUrl === "/sitemap.xml");
    expect(ours.length).toBe(1);
    expect(ours[0]?.status).toBe("error");
    expect(ours[0]?.lastErrorMessage).toBe("gsc_request_failed:401");
    expect(ours[0]?.lastErrorMessage ?? "").not.toContain(TOKEN_MARKER);
    cleanedSubmissionUrls.add("/sitemap.xml");

    // GET /seo/sitemap refreshes best-effort (the stub throws again) and
    // degrades to the local error row.
    const status = await request("GET", "/seo/sitemap", { actor });
    expect(status.status).toBe(200);
    const statusBody = (await status.json()) as Array<{ sitemapUrl?: string; status?: string }>;
    const latest = statusBody.find((row) => row.sitemapUrl === "/sitemap.xml");
    expect(latest?.status).toBe("error");
  },
  { timeout: dbRuntimeTimeout * 2 }
);

testIfTables("reject-unknown bodies and query keys map to validation_error 400", async () => {
  stub.mode = "ok";
  const actor = await createActor(["content:read", "settings:write"]);

  const sync = await request("POST", "/seo/search-performance/sync", {
    actor,
    csrfToken: actor.csrfToken,
    body: { startDate: "2026-01-01", unexpected: true },
  });
  expect(sync.status).toBe(400);
  expect(await responseErrorCode(sync)).toBe("validation_error");

  const submit = await request("POST", "/seo/sitemap/submit", {
    actor,
    csrfToken: actor.csrfToken,
    body: { sitemapPath: "/sitemap.xml", extra: 1 },
  });
  expect(submit.status).toBe(400);
  expect(await responseErrorCode(submit)).toBe("validation_error");

  const report = await request("GET", "/seo/search-performance?bogus=1", { actor });
  expect(report.status).toBe(400);
  expect(await responseErrorCode(report)).toBe("validation_error");
});

testIfTables("missing settings:write permission maps to 403 on write routes", async () => {
  stub.mode = "ok";
  stub.calls = [];
  const reader = await createActor(["content:read"]);

  const sync = await request("POST", "/seo/search-performance/sync", {
    actor: reader,
    csrfToken: reader.csrfToken,
    body: {},
  });
  expect(sync.status).toBe(403);
  expect(await responseErrorCode(sync)).toBe("forbidden");

  const submit = await request("POST", "/seo/sitemap/submit", {
    actor: reader,
    csrfToken: reader.csrfToken,
    body: {},
  });
  expect(submit.status).toBe(403);
  expect(await responseErrorCode(submit)).toBe("forbidden");
  expect(stub.calls.length).toBe(0);
});

testIfTables("missing or invalid CSRF maps to 403 on write routes", async () => {
  stub.mode = "ok";
  stub.calls = [];
  const actor = await createActor(["content:read", "settings:write"]);

  const missing = await request("POST", "/seo/search-performance/sync", {
    actor,
    body: {},
  });
  expect(missing.status).toBe(403);
  expect(await responseErrorCode(missing)).toBe("csrf_invalid");

  const invalid = await request("POST", "/seo/sitemap/submit", {
    actor,
    // A fresh issuedAt with a wrong signature fails the stored-hash check
    // (csrf_invalid); an ancient issuedAt would instead trip csrf_expired.
    csrfToken: `${Date.now()}.bogus-signature`,
    body: {},
  });
  expect(invalid.status).toBe(403);
  expect(await responseErrorCode(invalid)).toBe("csrf_invalid");
  expect(stub.calls.length).toBe(0);
});

testIfDb("anonymous read routes require auth", async () => {
  stub.mode = "ok";
  const overview = await request("GET", "/seo/overview", {});
  expect(overview.status).toBe(401);
  expect(await responseErrorCode(overview)).toBe("auth_required");

  const status = await request("GET", "/seo/sitemap", {});
  expect(status.status).toBe(401);
  expect(await responseErrorCode(status)).toBe("auth_required");
});
