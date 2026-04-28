import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { pages, seoDocuments } from "../../../core/db/schema";
import {
  deleteSeoDocument,
  getSeoDocumentByTarget,
  listExistingSeoDocuments,
  listSeoDocuments,
  runSeoAudit,
  upsertSeoDocument,
} from "../../../core/services/seo/seoService";

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

let pageId: string | undefined;

beforeAll(async () => {
  if (!hasDb) return;
  const slug = `seo-${randomUUID()}`;
  const [page] = await db
    .insert(pages)
    .values({
      title: "SEO Test Page",
      slug,
      currentData: { schemaVersion: 1, blocks: [] },
    })
    .returning();
  pageId = page?.id;
});

afterAll(async () => {
  if (!pageId) return;
  await db.delete(seoDocuments).where(eq(seoDocuments.targetId, pageId));
  await db.delete(pages).where(eq(pages.id, pageId));
});

testIfDb("upsert and audit score SEO document", async () => {
  if (!pageId) throw new Error("missing_test_page");

  const title = "This is a properly sized meta title";
  const description =
    "This meta description is long enough to satisfy the recommended length range for SEO previews.";

  await upsertSeoDocument({
    targetType: "page",
    targetId: pageId,
    slug: "/seo-test",
    title,
    description,
    canonicalUrl: "https://example.com/seo-test",
    robots: "index,follow",
  });

  await runSeoAudit("page", pageId);

  const doc = await getSeoDocumentByTarget("page", pageId);
  expect(doc).not.toBeNull();
  expect(doc?.score).toBe(100);
  expect(doc?.status).toBe("ok");
  expect(doc?.issues.length).toBe(0);
});

testIfDb("listSeoDocuments includes target title", async () => {
  if (!pageId) throw new Error("missing_test_page");
  const list = await listSeoDocuments();
  const item = list.find((row) => row.targetId === pageId);
  expect(item?.targetTitle).toBe("SEO Test Page");
});

testIfDb("listExistingSeoDocuments and deleteSeoDocument do not create missing docs", async () => {
  if (!pageId) throw new Error("missing_test_page");
  const doc = await upsertSeoDocument({
    targetType: "page",
    targetId: pageId,
    slug: "/seo-test",
    title: "Existing SEO Test Page",
  });
  if (!doc) throw new Error("missing_seo_doc");

  const list = await listExistingSeoDocuments();
  expect(list.some((row) => row.id === doc.id)).toBe(true);

  const deleted = await deleteSeoDocument(doc.id);
  expect(deleted?.id).toBe(doc.id);
  await expect(getSeoDocumentByTarget("page", pageId)).resolves.toBeNull();
});

testIfDb("listExistingSeoDocuments prioritizes existing target titles over orphan docs", async () => {
  if (!pageId) throw new Error("missing_test_page");
  const matchedDoc = await upsertSeoDocument({
    targetType: "page",
    targetId: pageId,
    slug: "/seo-test",
    title: null,
  });
  if (!matchedDoc) throw new Error("missing_matched_seo_doc");
  const orphanTargetId = randomUUID();
  const [orphanDoc] = await db
    .insert(seoDocuments)
    .values({
      targetType: "page",
      targetId: orphanTargetId,
      slug: `/entry-${orphanTargetId}`,
      title: null,
      status: "warning",
      issues: [],
    })
    .returning();
  if (!orphanDoc) throw new Error("missing_orphan_seo_doc");

  const list = await listExistingSeoDocuments();
  const matchedIndex = list.findIndex((row) => row.id === matchedDoc.id);
  const orphanIndex = list.findIndex((row) => row.id === orphanDoc.id);
  expect(list[matchedIndex]?.targetTitle).toBe("SEO Test Page");
  expect(matchedIndex).toBeGreaterThanOrEqual(0);
  expect(orphanIndex).toBeGreaterThanOrEqual(0);
  expect(matchedIndex).toBeLessThan(orphanIndex);

  await db.delete(seoDocuments).where(eq(seoDocuments.id, orphanDoc.id));
  await db.delete(seoDocuments).where(eq(seoDocuments.id, matchedDoc.id));
});
