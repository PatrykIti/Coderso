// TASK-491-01-L02: public <head> GA4 tag injection over the real public-site
// render path (Bun.serve/runtime flow -> Bun lane). Seeds the google-analytics
// integration row, GETs a published public page, and asserts the validated
// gtag.js head snippet appears on LIVE renders, never on preview renders, and
// that no other integration secret value leaks into the body.
import { afterAll, beforeEach, expect } from "bun:test";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { integrations } from "../../../core/db/schema";
import { createPreviewToken } from "../../../core/services/pages/previewService";
import {
  createPublishedPageWithDraft,
  dbRuntimeTimeout,
  requestPublicPath,
  setTestSetting,
  testIfDb,
  testIfDbWithOptions,
} from "../runtime/pages-runtime-test-support";

const GA_ID = "G-TEST123";

type IntegrationRow = typeof integrations.$inferSelect;

let gaSnapshot: IntegrationRow | null = null;
let gaExisted = false;

const snapshotGaRow = async () => {
  const [row] = await db.select().from(integrations).where(eq(integrations.id, "google-analytics"));
  gaExisted = Boolean(row);
  gaSnapshot = row ?? null;
};

const restoreGaRow = async () => {
  if (gaExisted && gaSnapshot) {
    await db
      .update(integrations)
      .set({
        config: gaSnapshot.config,
        status: gaSnapshot.status,
        healthStatus: gaSnapshot.healthStatus,
        lastCheckedAt: gaSnapshot.lastCheckedAt,
        lastError: gaSnapshot.lastError,
        createdAt: gaSnapshot.createdAt,
        updatedAt: gaSnapshot.updatedAt,
      })
      .where(eq(integrations.id, "google-analytics"));
  } else {
    await db.delete(integrations).where(eq(integrations.id, "google-analytics"));
  }
};

const seedGa = async (measurementId: string) => {
  await snapshotGaRow();
  await db.delete(integrations).where(eq(integrations.id, "google-analytics"));
  await db.insert(integrations).values({
    id: "google-analytics",
    config: { measurementId },
    status: "connected",
    healthStatus: "unknown",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

beforeEach(async () => {
  await setTestSetting("site.cacheTtlSeconds", 0);
  await setTestSetting("site.contentRoutes", []);
  await setTestSetting("site.previewEnabled", true);
  gaExisted = false;
  gaSnapshot = null;
});

afterAll(async () => {
  if (process.env.DATABASE_URL) {
    await restoreGaRow();
  }
});

testIfDbWithOptions(
  "published public page includes the GA4 gtag head snippet when configured",
  async () => {
    await seedGa(GA_ID);
    const fixture = await createPublishedPageWithDraft();

    try {
      const response = await requestPublicPath(fixture.slug);
      expect(response.status).toBe(200);
      const html = await response.text();

      expect(html).toContain(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
      expect(html).toContain(`gtag('config','${GA_ID}')`);
      expect(html).toContain("window.dataLayer=window.dataLayer||[]");
      expect(html).toContain(fixture.publishedHeadline);
    } finally {
      await restoreGaRow();
    }
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "public page renders no gtag string when GA is not configured",
  async () => {
    await snapshotGaRow();
    await db.delete(integrations).where(eq(integrations.id, "google-analytics"));
    const fixture = await createPublishedPageWithDraft();

    try {
      const response = await requestPublicPath(fixture.slug);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).not.toContain("gtag");
    } finally {
      await restoreGaRow();
    }
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "preview render omits the GA tag even when configured",
  async () => {
    await seedGa(GA_ID);
    const fixture = await createPublishedPageWithDraft();

    try {
      const { token } = await createPreviewToken({
        targetType: "page",
        targetId: fixture.page.id,
        ttlMinutes: 5,
      });
      const previewResponse = await requestPublicPath(
        `/preview?type=page&token=${encodeURIComponent(token)}&device=desktop`
      );
      expect(previewResponse.status).toBe(200);
      const html = await previewResponse.text();
      expect(html).toContain("Preview mode");
      expect(html).toContain(fixture.draftHeadline);
      expect(html).not.toContain("gtag");
    } finally {
      await restoreGaRow();
    }
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "public page body never leaks other integration secret values",
  async () => {
    await seedGa(GA_ID);
    const fixture = await createPublishedPageWithDraft();

    try {
      const response = await requestPublicPath(fixture.slug);
      expect(response.status).toBe(200);
      const html = await response.text();

      expect(html).not.toContain("hooks.slack.com");
      expect(html).not.toContain("hooks.zapier.com");
      expect(html).not.toContain("ingest.sentry.io");
    } finally {
      await restoreGaRow();
    }
  },
  { timeout: dbRuntimeTimeout }
);
