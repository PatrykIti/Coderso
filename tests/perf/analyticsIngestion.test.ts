// Ingestion perf gate for the public beacon collector (TASK-483-06-L02).
//
// Design: the K-beacon burst uses bot-UA requests, which the handler drops with
// 204 AFTER exercising the full pure-handler path (rate limit + size-capped JSON
// read + HMAC nonce verify + beacon normalize + classifyBot) but BEFORE any DB
// write (publicAnalyticsApi.ts:118 silent bot drop). That measures handler CPU
// cost without the shared remote render.com Postgres round-trip, which otherwise
// dominates and makes the gate flaky. ONE real accepted (browser-UA) beacon then
// exercises the true recordTrafficEvent persistence path so the gate stays
// honest, cleaned up in afterAll by exact run-scoped path prefix (never
// truncate / delete-by-date on the shared table). No module mocking: the repo's
// bun:test type shim intentionally omits `mock`, and no suite uses mock.module.
//
// The accepted beacon drives recordTrafficEvent, whose reserved retention hook
// (TASK-483-06-L01) fires an UNSCOPED delete-by-cutoff. Disable the inline prune
// so the smoke write never purges aged rows it did not create on the shared DB.
process.env.ANALYTICS_PRUNE_INLINE_DISABLED = "1";

import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { like, sql } from "drizzle-orm";

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

// Run-scoped identity so the smoke row is attributable to THIS run only.
const RUN_KEY = `/__task483-perf/${randomUUID()}`;
const runPath = (leaf: string) => `${RUN_KEY}/${leaf}`;
const RAW_IP = "203.0.113.42";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0) Chrome/121 Safari/537";
const BOT_UA = "Googlebot/2.1 (+http://www.google.com/bot.html)";

const BEACON_COUNT = readBudget("ANALYTICS_PERF_BEACON_COUNT", 200);
const P95_BUDGET_MS = readBudget("ANALYTICS_PERF_INGEST_P95_MS", 25);
const DB_TEST_TIMEOUT_MS = 30_000;

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

function readBudget(envKey: string, fallback: number) {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const percentile = (values: number[], target: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.ceil((target / 100) * sorted.length) - 1)
  );
  return sorted[index] ?? 0;
};

const cloneSecurity = (): SecuritySettings => {
  const security = structuredClone(SECURITY_SETTINGS_DEFAULTS) as SecuritySettings;
  // Generous public_write bucket so the burst is not rate-limited (this gate
  // measures ingestion latency, not the anti-abuse ceiling).
  security.rateLimit.buckets.public_write = {
    windowSeconds: 60,
    maxRequests: BEACON_COUNT * 4,
  };
  return security;
};

const beaconRequest = (path: string, userAgent: string) =>
  new Request(`http://coderso-a.localhost${ANALYTICS_BEACON_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": userAgent,
      host: "coderso-a.localhost",
    },
    body: JSON.stringify({ event: { type: "pageview", path }, nonce: createBeaconNonce() }),
  });

afterAll(async () => {
  if (!hasDb) return;
  await db.delete(analyticsPageviews).where(like(analyticsPageviews.path, `${RUN_KEY}/%`));
  await db.delete(analyticsSessions).where(like(analyticsSessions.entryPath, `${RUN_KEY}/%`));
});

test("ingestion perf gate: pure handler p95 stays within budget and leaks no PII", async () => {
  resetRateLimitBuckets();
  const security = cloneSecurity();

  // Capture logs to assert no raw IP/UA ever appears in collector output.
  const captured: string[] = [];
  const record = (...args: unknown[]) => {
    captured.push(
      args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")
    );
  };
  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  console.log = record;
  console.info = record;
  console.warn = record;
  console.error = record;
  console.debug = record;

  const latencies: number[] = [];
  try {
    for (let index = 0; index < BEACON_COUNT; index += 1) {
      // Bot UA -> full pure-handler path then 204 drop, no DB write.
      const startedAt = performance.now();
      const res = await handlePublicAnalyticsApi(beaconRequest(runPath(`view-${index}`), BOT_UA), {
        ip: RAW_IP,
        userAgent: BOT_UA,
        security,
      });
      latencies.push(performance.now() - startedAt);
      expect(res.status).toBe(204);
    }
  } finally {
    console.log = original.log;
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
    console.debug = original.debug;
  }

  const p95 = percentile(latencies, 95);
  expect(p95).toBeLessThan(P95_BUDGET_MS);

  // Privacy invariant: no raw IP or UA in any captured collector log line.
  const joinedLogs = captured.join("\n");
  expect(joinedLogs).not.toContain(RAW_IP);
  expect(joinedLogs).not.toContain(BOT_UA);
});

testIfDb(
  "ingestion smoke: one real beacon persists through recordTrafficEvent",
  async () => {
    resetRateLimitBuckets();
    const path = runPath("smoke");
    const res = await handlePublicAnalyticsApi(beaconRequest(path, BROWSER_UA), {
      ip: RAW_IP,
      userAgent: BROWSER_UA,
      security: cloneSecurity(),
    });
    expect(res.status).toBe(204);

    // Scoped check — count ONLY this run's rows (shared table holds concurrent
    // rows from other streams; no global-emptiness assumption).
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(analyticsPageviews)
      .where(like(analyticsPageviews.path, `${RUN_KEY}/%`));
    expect(Number(count)).toBe(1);
  },
  DB_TEST_TIMEOUT_MS
);
