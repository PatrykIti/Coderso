// TASK-493-06-L01: security lane for the SEO pipeline routes (Bun).
//
// Sweeps the five new routes for the security contracts the feature declares:
//
// - Secret-never-to-client: a token-leaking GSC stub (injected through
//   `mock.module` on the lazily imported `gscClient`) must never surface the
//   token in a response body, an access-log row, a persisted SEO row, or any
//   console line captured during the flow.
// - RBAC: content:read gates the three GETs, settings:write gates the two
//   POSTs, and a missing permission maps to 403 over the real request stack.
// - CSRF: both internal writes reject a missing/invalid token with 403.
// - Rate-limit buckets: admin routes resolve to admin_read/admin_write, and
//   the public /sitemap.xml path runs under the public_read bucket (exhausting
//   it makes the direct handler reject with rate_limited).
// - Validation: reject-unknown on every new schema.
// - SSRF guard: POST /seo/sitemap/submit with an absolute attacker URL maps to
//   400 sitemap_path_invalid and never triggers an outbound GSC call.
import { afterAll, beforeAll, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../core/db/client";
import {
  accessLogs,
  roles,
  seoSitemapSubmissions,
  sessions,
  settings,
  userRoles,
  users,
} from "../../core/db/schema";
import { startHttpServer, resolveRateLimitBucket } from "../../core/server/httpServer";
import { resetRateLimitBuckets } from "../../core/server/middleware/rateLimit";
import { handlePublicRequest } from "../../core/server/publicSite";
import { resolveAdminPath } from "../../core/server/utils/adminPath";
import {
  SESSION_COOKIE_NAME,
  createCsrfToken,
  createSession,
  setCsrfToken,
} from "../../core/services/auth/sessionService";
import type { GscClient } from "../../core/services/seo/gscClient";
import { normalizeOwnOriginSitemapPath } from "../../core/services/seo/sitemapSubmissionService";
import {
  resetSecuritySettingsCache,
  setSecuritySettings,
} from "../../core/services/settings/securitySettings";
import { validate } from "../../core/server/validation/schemaValidator";
import {
  seoSearchPerformanceQuerySchema,
  seoSitemapSubmitSchema,
  seoSyncSchema,
} from "../../core/server/validation/seoSchemas";

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
    await db.execute(sql`select 1 from seo_sitemap_submissions limit 1`);
    return true;
  } catch {
    return false;
  }
}

type StubMode = "ok" | "token_leak";

const stub = {
  mode: "ok" as StubMode,
  calls: [] as Array<{ method: string; path: string }>,
};

const TOKEN_MARKER = "SECRET_GSC_TOKEN_MARKER";

mock.module("../../core/services/seo/gscClient", () => ({
  getGscClient: async (): Promise<GscClient> => {
    return {
      siteUrl: "https://security-stub.example/",
      request: async (method, path) => {
        stub.calls.push({ method, path });
        if (stub.mode === "token_leak") {
          throw new Error(`gsc_request_failed:401 access_token=${TOKEN_MARKER}`);
        }
        if (method === "GET") return { sitemap: [] };
        if (method === "PUT") return null;
        return { rows: [] };
      },
      inspectUrl: async (url) => {
        stub.calls.push({ method: "INSPECT", path: url });
        if (stub.mode === "token_leak") {
          throw new Error(`gsc_request_failed:429 access_token=${TOKEN_MARKER}`);
        }
        return {
          url,
          indexingState: "UNKNOWN",
          coverageState: null,
          verdict: null,
          pageFetchState: null,
          robotsTxtState: null,
          googleCanonical: null,
          userCanonical: null,
          lastCrawledAt: null,
        };
      },
    };
  },
}));

const MARKER = `seo-security-${randomUUID().slice(0, 8)}`;
const SECURITY_SETTINGS_KEY = "security.settings";

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

const createActor = async (permissions: readonly string[]): Promise<HttpActor> => {
  const [user] = await db
    .insert(users)
    .values({
      email: `${MARKER}-${randomUUID()}@example.test`,
      passwordHash: "test-hash",
      status: "active",
    })
    .returning({ id: users.id });
  if (!user) throw new Error("security_user_create_failed");

  const [role] = await db
    .insert(roles)
    .values({ name: `${MARKER}-role-${randomUUID()}`, permissions: [...permissions] })
    .returning({ id: roles.id });
  if (!role) throw new Error("security_role_create_failed");
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

const request = async (
  method: string,
  path: string,
  options: { actor?: HttpActor; csrfToken?: string; body?: unknown } = {}
): Promise<Response> => {
  const headers: Record<string, string> = {
    "User-Agent": MARKER,
    "Content-Type": "application/json",
  };
  if (options.actor) headers["Cookie"] = `${SESSION_COOKIE_NAME}=${options.actor.token}`;
  if (options.csrfToken) headers["X-CSRF-Token"] = options.csrfToken;
  const init: RequestInit = { method, headers };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  return fetch(`${baseUrl}${path}`, init);
};

const responseBody = async (response: Response): Promise<string> => {
  const text = await response.text();
  return text;
};

const responseErrorCode = async (response: Response): Promise<string | null> => {
  const value = (await response.json()) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const error = (value as Record<string, unknown>).error;
  if (!error || typeof error !== "object" || Array.isArray(error)) return null;
  const code = (error as Record<string, unknown>).code;
  return typeof code === "string" ? code : null;
};

const restoreSecuritySettings = async () => {
  if (!hasDb) return;
  await db.delete(settings).where(eq(settings.key, SECURITY_SETTINGS_KEY));
  resetSecuritySettingsCache();
  resetRateLimitBuckets();
};

const captureConsole = () => {
  const lines: string[] = [];
  const original = { log: console.log, warn: console.warn, error: console.error };
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  console.warn = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  console.error = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  return {
    lines,
    restore: () => {
      console.log = original.log;
      console.warn = original.warn;
      console.error = original.error;
    },
  };
};

beforeAll(async () => {
  if (!hasDbAndTables) return;
  const adminPath = await resolveAdminPath();
  server = startHttpServer({ port: 0 });
  baseUrl = `http://127.0.0.1:${server.port}${adminPath}/api`;
});

afterAll(async () => {
  restoreSecuritySettings();
  if (hasDb) {
    await db.delete(accessLogs).where(eq(accessLogs.userAgent, MARKER));
    await db
      .delete(seoSitemapSubmissions)
      .where(inArray(seoSitemapSubmissions.sitemapUrl, ["/sitemap.xml", "/security-feed.xml"]));
    await db.delete(sessions).where(inArray(sessions.id, [...cleanedSessionIds]));
    await db.delete(userRoles).where(inArray(userRoles.userId, [...cleanedUserIds]));
    await db.delete(roles).where(inArray(roles.id, [...cleanedRoleIds]));
    await db.delete(users).where(inArray(users.id, [...cleanedUserIds]));
  }
  await server?.stop(true);
});

// ---- rate-limit bucket declarations (observable wiring) -------------------

test("admin SEO routes resolve to admin_read/admin_write buckets", () => {
  expect(resolveRateLimitBucket("GET", "/seo/overview")).toBe("admin_read");
  expect(resolveRateLimitBucket("GET", "/seo/search-performance")).toBe("admin_read");
  expect(resolveRateLimitBucket("GET", "/seo/sitemap")).toBe("admin_read");
  expect(resolveRateLimitBucket("POST", "/seo/search-performance/sync")).toBe("admin_write");
  expect(resolveRateLimitBucket("POST", "/seo/sitemap/submit")).toBe("admin_write");
});

// ---- reject-unknown schema sweep (pure) -----------------------------------

test("every new SEO schema rejects unknown properties", () => {
  expect(() =>
    validate(seoSearchPerformanceQuerySchema, { targetId: "page:1", bogus: "x" })
  ).toThrow();
  expect(() => validate(seoSyncSchema, { startDate: "2026-01-01", extra: true })).toThrow();
  expect(() =>
    validate(seoSitemapSubmitSchema, { sitemapPath: "/sitemap.xml", other: 1 })
  ).toThrow();

  try {
    validate(seoSyncSchema, { unexpected: true });
    throw new Error("expected_validation_error");
  } catch (error) {
    expect(error).toMatchObject({ code: "validation_error", status: 400 });
  }
});

// ---- SSRF / own-origin sitemap path guard (pure) --------------------------

test("sitemap path guard rejects attacker-supplied absolute URLs", () => {
  const attacks = [
    "https://evil.example/sitemap.xml",
    "http://evil.example/",
    "//evil.example/sitemap.xml",
    "file:///etc/passwd",
    "https:\\evil.example\\sitemap.xml",
  ];
  for (const attack of attacks) {
    expect(() => normalizeOwnOriginSitemapPath(attack), attack).toThrow("sitemap_path_invalid");
  }
  expect(normalizeOwnOriginSitemapPath("/sitemap.xml")).toBe("/sitemap.xml");
  expect(normalizeOwnOriginSitemapPath()).toBe("/sitemap.xml");
});

// ---- RBAC enforcement over the real stack ---------------------------------

testIfTablesWithOptions(
  "RBAC: content:read gates reads, settings:write gates writes, missing permission is 403",
  async () => {
    stub.mode = "ok";
    stub.calls = [];
    const reader = await createActor(["content:read"]);
    const writer = await createActor(["settings:write"]);
    const none = await createActor([]);

    // Reader: all three GETs succeed, both POSTs are forbidden.
    for (const path of ["/seo/overview", "/seo/search-performance", "/seo/sitemap"]) {
      const response = await request("GET", path, { actor: reader });
      expect(response.status, path).toBe(200);
    }
    const readerSync = await request("POST", "/seo/search-performance/sync", {
      actor: reader,
      csrfToken: reader.csrfToken,
      body: {},
    });
    expect(readerSync.status).toBe(403);
    expect(await responseErrorCode(readerSync)).toBe("forbidden");
    const readerSubmit = await request("POST", "/seo/sitemap/submit", {
      actor: reader,
      csrfToken: reader.csrfToken,
      body: {},
    });
    expect(readerSubmit.status).toBe(403);
    expect(await responseErrorCode(readerSubmit)).toBe("forbidden");

    // Writer: both POSTs succeed, all three GETs are forbidden.
    const writerSync = await request("POST", "/seo/search-performance/sync", {
      actor: writer,
      csrfToken: writer.csrfToken,
      body: {},
    });
    expect(writerSync.status).toBe(200);
    const writerSubmit = await request("POST", "/seo/sitemap/submit", {
      actor: writer,
      csrfToken: writer.csrfToken,
      body: { sitemapPath: "/security-feed.xml" },
    });
    expect(writerSubmit.status).toBe(200);
    for (const path of ["/seo/overview", "/seo/search-performance", "/seo/sitemap"]) {
      const response = await request("GET", path, { actor: writer });
      expect(response.status, path).toBe(403);
      expect(await responseErrorCode(response)).toBe("forbidden");
    }

    // No permissions: everything is forbidden (auth itself still succeeds).
    const noneGet = await request("GET", "/seo/overview", { actor: none });
    expect(noneGet.status).toBe(403);
    const nonePost = await request("POST", "/seo/search-performance/sync", {
      actor: none,
      csrfToken: none.csrfToken,
      body: {},
    });
    expect(nonePost.status).toBe(403);
  },
  { timeout: 60_000 }
);

// ---- CSRF enforcement over the real stack ---------------------------------

testIfTables("CSRF: both SEO writes reject missing or invalid tokens with 403", async () => {
  stub.mode = "ok";
  stub.calls = [];
  const actor = await createActor(["content:read", "settings:write"]);

  for (const path of ["/seo/search-performance/sync", "/seo/sitemap/submit"]) {
    const missing = await request("POST", path, { actor, body: {} });
    expect(missing.status, path).toBe(403);
    expect(await responseErrorCode(missing)).toBe("csrf_invalid");

    const invalid = await request("POST", path, {
      actor,
      csrfToken: `${Date.now()}.bogus-signature`,
      body: {},
    });
    expect(invalid.status, path).toBe(403);
    expect(await responseErrorCode(invalid)).toBe("csrf_invalid");
  }
  expect(stub.calls.length).toBe(0);
});

// ---- SSRF guard over the real stack ---------------------------------------

testIfTables("SSRF: absolute sitemap URL maps to 400 and never calls GSC", async () => {
  stub.mode = "ok";
  stub.calls = [];
  const actor = await createActor(["content:read", "settings:write"]);

  const response = await request("POST", "/seo/sitemap/submit", {
    actor,
    csrfToken: actor.csrfToken,
    body: { sitemapPath: "https://evil.example/sitemap.xml" },
  });
  expect(response.status).toBe(400);
  expect(await responseErrorCode(response)).toBe("sitemap_path_invalid");
  expect(stub.calls.length).toBe(0);
});

// ---- secret-never-to-client sweep -----------------------------------------

testIfTablesWithOptions(
  "GSC token material never reaches a response body, log, or persisted row",
  async () => {
    stub.mode = "token_leak";
    stub.calls = [];
    const consoleCapture = captureConsole();
    const actor = await createActor(["content:read", "settings:write"]);

    try {
      // Sync: the stubbed client fails with an embedded token look-alike; the
      // route maps it to a generic 502 without echoing the raw message.
      const sync = await request("POST", "/seo/search-performance/sync", {
        actor,
        csrfToken: actor.csrfToken,
        body: {},
      });
      expect(sync.status).toBe(502);
      const syncText = await responseBody(sync);
      expect(syncText).not.toContain(TOKEN_MARKER);
      expect(syncText).not.toContain("access_token");

      // Submit: an error row is persisted with a redacted message.
      const submit = await request("POST", "/seo/sitemap/submit", {
        actor,
        csrfToken: actor.csrfToken,
        body: {},
      });
      expect(submit.status).toBe(502);
      const submitText = await responseBody(submit);
      expect(submitText).not.toContain(TOKEN_MARKER);
      expect(submitText).not.toContain("access_token");

      // The read surfaces still answer and carry no token material.
      const overview = await request("GET", "/seo/overview", { actor });
      expect(overview.status).toBe(200);
      const overviewText = await responseBody(overview);
      expect(overviewText).not.toContain(TOKEN_MARKER);

      const status = await request("GET", "/seo/sitemap", { actor });
      expect(status.status).toBe(200);
      const statusText = await responseBody(status);
      expect(statusText).not.toContain(TOKEN_MARKER);

      // Persisted rows: the submission row is the only secret-adjacent row and
      // must carry only the redacted machine-readable code.
      const submissionRows = await db
        .select()
        .from(seoSitemapSubmissions)
        .where(eq(seoSitemapSubmissions.sitemapUrl, "/sitemap.xml"));
      const ours = submissionRows.filter((row) => row.sitemapUrl === "/sitemap.xml");
      expect(ours.length).toBeGreaterThan(0);
      for (const row of ours) {
        expect(row.lastErrorMessage).toBe("gsc_request_failed:401");
        const serialized = JSON.stringify(row);
        expect(serialized).not.toContain(TOKEN_MARKER);
        expect(serialized).not.toContain("access_token");
        expect(serialized).not.toContain("security-stub.example");
      }

      // Access-log metadata recorded during the flow carries no token.
      const logRows = await db
        .select({ path: accessLogs.path, method: accessLogs.method, status: accessLogs.status })
        .from(accessLogs)
        .where(eq(accessLogs.userAgent, MARKER));
      for (const row of logRows) {
        const serialized = JSON.stringify(row);
        expect(serialized).not.toContain(TOKEN_MARKER);
        expect(serialized).not.toContain("access_token");
      }

      // Nothing the flow printed to the console carried the token either.
      for (const line of consoleCapture.lines) {
        expect(line).not.toContain(TOKEN_MARKER);
        expect(line).not.toContain("access_token");
      }
    } finally {
      consoleCapture.restore();
      await db
        .delete(seoSitemapSubmissions)
        .where(eq(seoSitemapSubmissions.sitemapUrl, "/sitemap.xml"));
    }
  },
  { timeout: 60_000 }
);

// ---- rate-limit behavior on the public sitemap path -----------------------

testIfTablesWithOptions(
  "public /sitemap.xml runs under the public_read bucket",
  async () => {
    resetRateLimitBuckets();
    await setSecuritySettings({
      rateLimit: {
        enabled: true,
        buckets: { public_read: { windowSeconds: 60, maxRequests: 2 } },
      },
    });
    resetSecuritySettingsCache();
    resetRateLimitBuckets();

    const makeRequest = () =>
      handlePublicRequest(
        new Request("http://public.coderso.test/sitemap.xml", {
          headers: {
            "user-agent": "seo-security-rate-probe",
            "x-forwarded-for": "127.0.0.99",
          },
        })
      );

    try {
      const first = await makeRequest();
      expect(first.status).toBe(200);
      const second = await makeRequest();
      expect(second.status).toBe(200);
      // The third request exhausts the public_read window and must reject with
      // the rate_limited code (the product propagates it from checkRateLimit).
      await expect(makeRequest()).rejects.toMatchObject({
        code: "rate_limited",
        status: 429,
      });
    } finally {
      await restoreSecuritySettings();
    }
  },
  { timeout: 60_000 }
);
