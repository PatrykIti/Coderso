// This suite drives the public beacon into recordTrafficEvent, whose reserved
// retention hook (TASK-483-06-L01) fires an UNSCOPED delete-by-cutoff. Disable
// the inline prune so this suite's writes never purge aged rows it did not
// create on the shared render.com Postgres.
process.env.ANALYTICS_PRUNE_INLINE_DISABLED = "1";

import { afterAll, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, like, sql } from "drizzle-orm";

import { db } from "../../core/db/client";
import { analyticsPageviews, analyticsSessions } from "../../core/db/schema";
import {
  ANALYTICS_BEACON_PATH,
  handlePublicAnalyticsApi,
} from "../../core/server/publicAnalyticsApi";
import { resetRateLimitBuckets } from "../../core/server/middleware/rateLimit";
import { createBeaconNonce } from "../../core/services/analytics/beaconNonce";
import {
  SECURITY_SETTINGS_DEFAULTS,
  type SecuritySettings,
} from "../../core/services/settings/securitySettings";

process.env.ANALYTICS_BEACON_NONCE_SECRET ??= "task483_beacon_nonce_test_secret";
process.env.ANALYTICS_IP_HASH_SECRET ??= "task483_ip_hash_test_secret";

const RUN_KEY = `/__task483-beacon-sec/${randomUUID()}`;
const runPath = (leaf: string) => `${RUN_KEY}/${leaf}`;
const RAW_IP = "198.51.100.77";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537";

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

const cloneSecurity = (): SecuritySettings =>
  structuredClone(SECURITY_SETTINGS_DEFAULTS) as SecuritySettings;

const rowsForPath = (path: string) =>
  db.select().from(analyticsPageviews).where(eq(analyticsPageviews.path, path));

const sessionsForEntry = (path: string) =>
  db.select().from(analyticsSessions).where(eq(analyticsSessions.entryPath, path));

const beaconRequest = (body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://coderso-a.localhost${ANALYTICS_BEACON_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": BROWSER_UA,
      host: "coderso-a.localhost",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(() => {
  resetRateLimitBuckets();
});

afterAll(async () => {
  if (!hasDb) return;
  await db.delete(analyticsPageviews).where(like(analyticsPageviews.path, `${RUN_KEY}/%`));
  await db.delete(analyticsSessions).where(like(analyticsSessions.entryPath, `${RUN_KEY}/%`));
});

testIfDb(
  "DNT:1 -> 204 and no row written",
  async () => {
    const path = runPath("dnt");
    const res = await handlePublicAnalyticsApi(
      beaconRequest(
        { event: { type: "pageview", path }, nonce: createBeaconNonce() },
        { dnt: "1" }
      ),
      { ip: RAW_IP, userAgent: BROWSER_UA, security: cloneSecurity() }
    );
    expect(res.status).toBe(204);
    expect((await rowsForPath(path)).length).toBe(0);
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "bot UA -> 204 and no row written",
  async () => {
    const path = runPath("bot");
    const res = await handlePublicAnalyticsApi(
      beaconRequest({ event: { type: "pageview", path }, nonce: createBeaconNonce() }),
      {
        ip: RAW_IP,
        userAgent: "Googlebot/2.1 (+http://www.google.com/bot.html)",
        security: cloneSecurity(),
      }
    );
    expect(res.status).toBe(204);
    expect((await rowsForPath(path)).length).toBe(0);
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "beacon accepted with bot protection enabled (captcha exempt)",
  async () => {
    const path = runPath("captcha-exempt");
    const security = cloneSecurity();
    security.botProtection.enabled = true; // guards the no-enforceBotProtection decision
    const res = await handlePublicAnalyticsApi(
      beaconRequest({ event: { type: "pageview", path }, nonce: createBeaconNonce() }),
      { ip: RAW_IP, userAgent: BROWSER_UA, security }
    );
    expect(res.status).toBe(204);
    expect((await rowsForPath(path)).length).toBe(1);
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "over rate limit -> 429 analytics_rate_limited (no DB write)",
  async () => {
    const security = cloneSecurity();
    security.rateLimit.buckets.public_write = { windowSeconds: 60, maxRequests: 2 };
    const ctx = { ip: "198.51.100.200", userAgent: BROWSER_UA, security };
    // Requests 1-2 pass the rate limit but 400 on the invalid body (no DB write);
    // the rate-limit bucket still increments, so request 3 is rejected first.
    for (let i = 0; i < 2; i += 1) {
      const res = await handlePublicAnalyticsApi(beaconRequest("{bad json"), ctx);
      expect(res.status).toBe(400);
    }
    const limited = await handlePublicAnalyticsApi(beaconRequest("{bad json"), ctx);
    expect(limited.status).toBe(429);
    const payload = (await limited.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("analytics_rate_limited");
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "oversized body -> 413 analytics_payload_too_large",
  async () => {
    const bloated = {
      event: { type: "pageview", path: "/".padEnd(5000, "y") },
      nonce: createBeaconNonce(),
    };
    const res = await handlePublicAnalyticsApi(beaconRequest(bloated), {
      ip: RAW_IP,
      userAgent: BROWSER_UA,
      security: cloneSecurity(),
    });
    expect(res.status).toBe(413);
    const payload = (await res.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("analytics_payload_too_large");
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "no raw IP or UA appears in the persisted rows (only a salted hash)",
  async () => {
    const path = runPath("no-pii");
    // Distinct IP so this beacon starts its OWN session (a shared IP+UA within
    // the 30-min window would reuse an earlier test's session/entryPath).
    const uniqueIp = "198.51.100.88";
    const res = await handlePublicAnalyticsApi(
      beaconRequest({ event: { type: "pageview", path }, nonce: createBeaconNonce() }),
      { ip: uniqueIp, userAgent: BROWSER_UA, security: cloneSecurity() }
    );
    expect(res.status).toBe(204);

    const sessions = await sessionsForEntry(path);
    expect(sessions.length).toBe(1);
    const session = sessions[0]!;
    // visitorHash is a 64-char sha256 hex digest, never the raw IP/UA.
    expect(session.visitorHash).toMatch(/^[0-9a-f]{64}$/);
    const serializedSession = JSON.stringify(session);
    expect(serializedSession).not.toContain(uniqueIp);
    expect(serializedSession).not.toContain(BROWSER_UA);

    const pageviews = await rowsForPath(path);
    const serializedPageview = JSON.stringify(pageviews);
    expect(serializedPageview).not.toContain(uniqueIp);
    expect(serializedPageview).not.toContain(BROWSER_UA);
  },
  DB_TEST_TIMEOUT_MS
);
