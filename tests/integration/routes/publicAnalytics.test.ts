// This suite drives the public beacon into recordTrafficEvent, whose reserved
// retention hook (TASK-483-06-L01) fires an UNSCOPED delete-by-cutoff. Disable
// the inline prune so this suite's writes never purge aged rows it did not
// create on the shared render.com Postgres.
process.env.ANALYTICS_PRUNE_INLINE_DISABLED = "1";

import { afterAll, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, like, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { analyticsPageviews, analyticsSessions } from "../../../core/db/schema";
import {
  ANALYTICS_BEACON_PATH,
  handlePublicAnalyticsApi,
} from "../../../core/server/publicAnalyticsApi";
import { mapAnalyticsError } from "../../../core/server/routes/analyticsRoutes";
import { ApiError } from "../../../core/server/errorHandler";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { createBeaconNonce } from "../../../core/services/analytics/beaconNonce";
import {
  SECURITY_SETTINGS_DEFAULTS,
  type SecuritySettings,
} from "../../../core/services/settings/securitySettings";

// Provision the beacon secrets for this process (mirrors the shared runtime .env).
process.env.ANALYTICS_BEACON_NONCE_SECRET ??= "task483_beacon_nonce_test_secret";
process.env.ANALYTICS_IP_HASH_SECRET ??= "task483_ip_hash_test_secret";

// Shared remote test DB: scope EVERY row to a unique per-run path prefix and
// clean up only rows this run created — never truncate/delete whole tables.
const RUN_KEY = `/__task483-beacon-int/${randomUUID()}`;
const runPath = (leaf: string) => `${RUN_KEY}/${leaf}`;

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const DB_TEST_TIMEOUT_MS = 30_000;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const rowsForPath = (path: string) =>
  db.select().from(analyticsPageviews).where(eq(analyticsPageviews.path, path));

const security = (): SecuritySettings => SECURITY_SETTINGS_DEFAULTS;

const beaconRequest = (body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://coderso-a.localhost${ANALYTICS_BEACON_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537",
      host: "coderso-a.localhost",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const ctxFor = (leaf: string) => ({
  ip: `203.0.113.${(leaf.length % 250) + 1}`,
  userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537",
  security: security(),
});

beforeEach(() => {
  resetRateLimitBuckets();
});

afterAll(async () => {
  if (!hasDb) return;
  // Delete only rows under RUN_KEY. Pageviews cascade with their sessions, but
  // remove pageviews by path first for safety, then sessions by entry path.
  await db.delete(analyticsPageviews).where(like(analyticsPageviews.path, `${RUN_KEY}/%`));
  await db.delete(analyticsSessions).where(like(analyticsSessions.entryPath, `${RUN_KEY}/%`));
});

testIfDb(
  "valid beacon with nonce persists exactly one pageview",
  async () => {
    const path = runPath("happy");
    const res = await handlePublicAnalyticsApi(
      beaconRequest({ event: { type: "pageview", path }, nonce: createBeaconNonce() }),
      ctxFor("happy")
    );
    expect(res.status).toBe(204);
    const rows = await rowsForPath(path);
    expect(rows.length).toBe(1);
    expect(rows[0]?.sourceKind).toBe("direct");
    expect(rows[0]?.deviceClass).toBe("desktop");
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "empty/absent nonce -> 400 analytics_nonce_required (via direct ApiError branch)",
  async () => {
    const path = runPath("no-nonce");
    const res = await handlePublicAnalyticsApi(
      beaconRequest({ event: { type: "pageview", path }, nonce: "" }),
      ctxFor("no-nonce")
    );
    expect(res.status).toBe(400);
    const payload = (await res.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("analytics_nonce_required");
    expect((await rowsForPath(path)).length).toBe(0);
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "unknown envelope field -> 400 analytics_beacon_invalid (via mapAnalyticsError)",
  async () => {
    const res = await handlePublicAnalyticsApi(
      beaconRequest({
        event: { type: "pageview", path: "/x" },
        nonce: createBeaconNonce(),
        oops: 1,
      }),
      ctxFor("unknown-field")
    );
    expect(res.status).toBe(400);
    const payload = (await res.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("analytics_beacon_invalid");
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "GET -> 405 method_not_allowed",
  async () => {
    const res = await handlePublicAnalyticsApi(
      new Request(`http://coderso-a.localhost${ANALYTICS_BEACON_PATH}`, { method: "GET" }),
      ctxFor("get")
    );
    expect(res.status).toBe(405);
    const payload = (await res.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("method_not_allowed");
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "invalid JSON body -> 400 invalid_json",
  async () => {
    const res = await handlePublicAnalyticsApi(beaconRequest("{not json"), ctxFor("bad-json"));
    expect(res.status).toBe(400);
    const payload = (await res.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("invalid_json");
  },
  DB_TEST_TIMEOUT_MS
);

// mapAnalyticsError REACHABLE cases only — nonce codes never reach the mapper.
test("mapAnalyticsError maps its reachable plain-Error codes", () => {
  const beacon = mapAnalyticsError(new Error("analytics_beacon_invalid"));
  expect(beacon).toBeInstanceOf(ApiError);
  expect(beacon.code).toBe("analytics_beacon_invalid");
  expect(beacon.status).toBe(400);

  const persist = mapAnalyticsError(new Error("analytics_persist_failed"));
  expect(persist.code).toBe("analytics_persist_failed");
  expect(persist.status).toBe(500);

  const fallback = mapAnalyticsError(new Error("something_else"));
  expect(fallback.code).toBe("internal_error");
  expect(fallback.status).toBe(500);
});
