import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries, contentTypes, media, pages, users } from "../../../core/db/schema";
import {
  buildSecuritySummary,
  calculateUsedPercent,
  getDashboardData,
} from "../../../core/services/dashboard/dashboardService";
import type { SecuritySettings } from "../../../core/services/settings/securitySettings";

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

const ids: {
  userId?: string;
  pageId?: string;
  pageSlug?: string;
  typeId?: string;
  typeSlug?: string;
  entryId?: string;
  entrySlug?: string;
  mediaId?: string;
  mediaUrl?: string;
} = {};

const baselineSecuritySettings: SecuritySettings = {
  requestId: {
    enabled: true,
    headerName: "x-request-id",
  },
  csrf: {
    enabled: true,
    headerName: "x-csrf-token",
    tokenTtlMinutes: 30,
  },
  cors: {
    allowedOrigins: [],
    allowCredentials: true,
    allowedMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "x-csrf-token"],
    maxAgeSeconds: 600,
  },
  rateLimit: {
    enabled: true,
    admin: { windowSeconds: 60, maxRequests: 120 },
    auth: { windowSeconds: 60, maxRequests: 20 },
  },
  headers: {
    enabled: true,
    frameOptions: "DENY",
    contentTypeOptions: true,
    referrerPolicy: "no-referrer",
    permissionsPolicy: null,
    csp: null,
    hsts: null,
  },
  validation: {
    rejectUnknownFields: true,
  },
  plugins: {
    safeMode: false,
  },
  session: {
    ttlDays: 7,
    maxPerUser: 3,
    singleSession: false,
  },
  loginAlerts: {
    enabled: true,
    notifyOnNewDevice: true,
    notifyOnNewLocation: true,
  },
};

beforeAll(async () => {
  if (!hasDb) return;

  const suffix = randomUUID();
  const [user] = await db
    .insert(users)
    .values({
      email: `dashboard-${suffix}@example.com`,
      passwordHash: "test",
      status: "active",
      name: "Dashboard Tester",
    })
    .returning();
  ids.userId = user?.id;

  ids.pageSlug = `dashboard-page-${suffix}`;
  const [page] = await db
    .insert(pages)
    .values({
      title: `Dashboard Page ${suffix}`,
      slug: ids.pageSlug,
      status: "published",
      authorId: ids.userId,
      currentData: { schemaVersion: 1, blocks: [] },
      updatedAt: new Date("2099-01-03T00:00:00.000Z"),
    })
    .returning();
  ids.pageId = page?.id;

  ids.typeSlug = `dashboard-type-${suffix}`;
  const [type] = await db
    .insert(contentTypes)
    .values({
      name: `Dashboard Type ${suffix}`,
      slug: ids.typeSlug,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: {
          title: { type: "string" },
        },
      },
    })
    .returning();
  ids.typeId = type?.id;

  ids.entrySlug = `dashboard-entry-${suffix}`;
  const [entry] = await db
    .insert(contentEntries)
    .values({
      typeId: ids.typeId ?? sql`(select id from content_types limit 1)`,
      authorId: ids.userId,
      slug: ids.entrySlug,
      title: `Dashboard Entry ${suffix}`,
      status: "draft",
      data: { title: "Dashboard Entry" },
      updatedAt: new Date("2099-01-02T00:00:00.000Z"),
    })
    .returning();
  ids.entryId = entry?.id;

  ids.mediaUrl = `https://example.com/dashboard-${suffix}.png`;
  const [mediaRow] = await db
    .insert(media)
    .values({
      key: `dashboard-media-${suffix}.png`,
      url: ids.mediaUrl,
      title: `Dashboard Media ${suffix}`,
      type: "image",
      mimeType: "image/png",
      size: 2048,
      createdBy: ids.userId,
      createdAt: new Date("2099-01-01T00:00:00.000Z"),
    })
    .returning();
  ids.mediaId = mediaRow?.id;
});

afterAll(async () => {
  if (!hasDb) return;
  if (ids.mediaId) {
    await db.delete(media).where(eq(media.id, ids.mediaId));
  }
  if (ids.entryId) {
    await db.delete(contentEntries).where(eq(contentEntries.id, ids.entryId));
  }
  if (ids.typeId) {
    await db.delete(contentTypes).where(eq(contentTypes.id, ids.typeId));
  }
  if (ids.pageId) {
    await db.delete(pages).where(eq(pages.id, ids.pageId));
  }
  if (ids.userId) {
    await db.delete(users).where(eq(users.id, ids.userId));
  }
});

test("calculateUsedPercent returns null without valid limit", () => {
  expect(calculateUsedPercent(512, null)).toBeNull();
  expect(calculateUsedPercent(512, 0)).toBeNull();
});

test("calculateUsedPercent clamps to 0..100", () => {
  expect(calculateUsedPercent(500, 1000)).toBe(50);
  expect(calculateUsedPercent(-10, 1000)).toBe(0);
  expect(calculateUsedPercent(9999, 1000)).toBe(100);
});

test("buildSecuritySummary marks critical when multiple checks fail", () => {
  const summary = buildSecuritySummary({
    ...baselineSecuritySettings,
    csrf: { ...baselineSecuritySettings.csrf, enabled: false },
    rateLimit: {
      ...baselineSecuritySettings.rateLimit,
      enabled: false,
    },
    headers: { ...baselineSecuritySettings.headers, enabled: false },
    session: {
      ...baselineSecuritySettings.session,
      ttlDays: 90,
      maxPerUser: 10,
    },
  });

  expect(summary.issues).toBe(4);
  expect(summary.status).toBe("critical");
});

testIfDb("getDashboardData returns merged recent edits and storage/security summary", async () => {
  const payload = await getDashboardData();

  expect(payload.generatedAt).toEqual(expect.any(String));

  expect(payload.totals.pages).toBeGreaterThanOrEqual(1);
  expect(payload.totals.entries).toBeGreaterThanOrEqual(1);
  expect(payload.totals.media).toBeGreaterThanOrEqual(1);
  expect(payload.totals.users).toBeGreaterThanOrEqual(1);

  expect(payload.storage.limitBytes).toBeNull();
  expect(payload.storage.usedPercent).toBeNull();
  expect(payload.storage.usedBytes).toBeGreaterThanOrEqual(2048);

  const pageEdit = payload.recentEdits.find((item) => item.id === ids.pageId);
  const entryEdit = payload.recentEdits.find((item) => item.id === ids.entryId);
  const mediaEdit = payload.recentEdits.find((item) => item.id === ids.mediaId);

  expect(pageEdit).toBeTruthy();
  expect(entryEdit).toBeTruthy();
  expect(mediaEdit).toBeTruthy();

  expect(pageEdit?.path).toBe(`/${ids.pageSlug}`);
  expect(entryEdit?.path).toBe(`/${ids.typeSlug}/${ids.entrySlug}`);
  expect(mediaEdit?.path).toBe(ids.mediaUrl);
  expect(mediaEdit?.status).toBe("active");

  const seededIds = [ids.pageId, ids.entryId, ids.mediaId].filter(
    (value): value is string => Boolean(value)
  );
  const seededOrder = payload.recentEdits
    .filter((item) => seededIds.includes(item.id))
    .map((item) => item.id);
  expect(seededOrder).toEqual(seededIds);

  expect(payload.security.checks).toHaveLength(4);
  const issuesCount = payload.security.checks.filter(
    (check) => check.status !== "ok"
  ).length;
  expect(payload.security.issues).toBe(issuesCount);
});
