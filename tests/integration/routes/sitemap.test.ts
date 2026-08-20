// TASK-493-02-L01: public /sitemap.xml and /robots.txt routes over the real
// public-site handler (Bun lane). Seeds scoped published pages/entries and
// seo_documents rows, then asserts content-type, URL inclusion, noindex
// exclusion, and the robots.txt Sitemap: line. Cleanup deletes only the rows
// this file creates.
import { afterEach, beforeEach, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries, contentTypes, seoDocuments } from "../../../core/db/schema";
import {
  createPublishedPageWithDraft,
  dbRuntimeTimeout,
  requestPublicPath,
  setTestSetting,
  testIfDbWithOptions,
  trackContentEntry,
  trackContentType,
} from "../runtime/pages-runtime-test-support";

const trackedSeoDocumentIds = new Set<string>();

const seedNoindexDocument = async (
  targetType: "page" | "entry",
  targetId: string,
  slug: string
) => {
  const [row] = await db
    .insert(seoDocuments)
    .values({
      targetType,
      targetId,
      slug,
      robots: "noindex, nofollow",
    })
    .returning({ id: seoDocuments.id });
  if (!row?.id) throw new Error("missing_seeded_seo_document");
  trackedSeoDocumentIds.add(row.id);
  return row.id;
};

const seedEntry = async (
  typeSlug: string,
  overrides: { status?: string; publishedAt?: Date | null; visibility?: string } = {}
) => {
  const token = randomUUID().slice(0, 8);
  const [type] = await db
    .insert(contentTypes)
    .values({
      name: `Sitemap Type ${token}`,
      slug: typeSlug,
      schema: { type: "object", additionalProperties: false, properties: {} },
      status: "published",
      config: {},
    })
    .returning({ id: contentTypes.id });
  if (!type?.id) throw new Error("missing_seeded_content_type");
  trackContentType(type.id);

  const [entry] = await db
    .insert(contentEntries)
    .values({
      typeId: type.id,
      slug: `sitemap-entry-${token}`,
      title: `Sitemap Entry ${token}`,
      status: overrides.status ?? "published",
      visibility: overrides.visibility ?? "public",
      data: { title: `Sitemap Entry ${token}` },
      publishedAt: (overrides.status ?? "published") === "published" ? new Date() : null,
    })
    .returning({ id: contentEntries.id, slug: contentEntries.slug });
  if (!entry?.id) throw new Error("missing_seeded_entry");
  trackContentEntry(entry.id);
  return entry;
};

beforeEach(async () => {
  await setTestSetting("site.cacheTtlSeconds", 0);
  await setTestSetting("site.contentRoutes", []);
});

afterEach(async () => {
  if (!process.env.DATABASE_URL || trackedSeoDocumentIds.size === 0) return;
  await db.delete(seoDocuments).where(inArray(seoDocuments.id, [...trackedSeoDocumentIds]));
  trackedSeoDocumentIds.clear();
});

testIfDbWithOptions(
  "GET /sitemap.xml returns XML and lists a seeded published page",
  async () => {
    const { slug } = await createPublishedPageWithDraft();
    const response = await requestPublicPath("/sitemap.xml");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");
    const body = await response.text();
    expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(body).toContain(`<url><loc>http://public.coderso.test${slug}</loc>`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "GET /sitemap.xml includes published entries on enabled content routes",
  async () => {
    // The content type row must exist before the route setting is written:
    // lockContentRouteSettingRootsTx validates each route.type against the
    // contentTypes table.
    const entry = await seedEntry("sitemap-articles");
    await setTestSetting("site.contentRoutes", [
      {
        type: "sitemap-articles",
        listPath: "/articles",
        detailPath: "/articles/:slug",
        enabled: true,
      },
    ]);
    const response = await requestPublicPath("/sitemap.xml");

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain(`<loc>http://public.coderso.test/articles/${entry.slug}</loc>`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "GET /sitemap.xml skips entries whose type has no enabled content route",
  async () => {
    const entry = await seedEntry("sitemap-unrouted");
    const response = await requestPublicPath("/sitemap.xml");

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).not.toContain(entry.slug);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "GET /sitemap.xml never lists draft entries even with an enabled route",
  async () => {
    const entry = await seedEntry("sitemap-draft-articles", { status: "draft" });
    await setTestSetting("site.contentRoutes", [
      {
        type: "sitemap-draft-articles",
        listPath: "/draft-articles",
        detailPath: "/draft-articles/:slug",
        enabled: true,
      },
    ]);
    const response = await requestPublicPath("/sitemap.xml");

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).not.toContain(entry.slug);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "GET /sitemap.xml excludes a published page with a noindex seo_documents row",
  async () => {
    const { page, slug } = await createPublishedPageWithDraft();
    await seedNoindexDocument("page", page.id, slug);
    const response = await requestPublicPath("/sitemap.xml");

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).not.toContain(`http://public.coderso.test${slug}`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "GET /robots.txt advertises the sitemap URL",
  async () => {
    const response = await requestPublicPath("/robots.txt");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    const body = await response.text();
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Allow: /");
    expect(body).toContain("Sitemap: http://public.coderso.test/sitemap.xml");
  },
  { timeout: dbRuntimeTimeout }
);
