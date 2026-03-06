import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { pageRevisions, pages, users } from "../../../core/db/schema";
import { createPage } from "../../../core/services/pages/pageService";
import {
  createRevision,
  listRevisions,
  restoreRevision,
} from "../../../core/services/pages/revisionService";

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
let userId: string | undefined;

const cleanup = async () => {
  if (pageId) {
    await db.delete(pageRevisions).where(eq(pageRevisions.pageId, pageId));
    await db.delete(pages).where(eq(pages.id, pageId));
  }
  if (userId) {
    await db.delete(users).where(eq(users.id, userId));
  }
};

afterAll(async () => {
  await cleanup();
});

testIfDb("creates and restores revisions", async () => {
  const email = `editor-${randomUUID()}@example.com`;
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: "test", status: "active" })
    .returning();
  userId = user?.id;

  const page = await createPage({
    title: "Page",
    slug: `page-${randomUUID()}`,
    data: { schemaVersion: 1, blocks: [] },
  });
  pageId = page.id;

  const revision1 = await createRevision(page.id, { step: 1 }, userId!);
  const revision2 = await createRevision(page.id, { step: 2 }, userId!);

  expect(revision1?.version).toBe(1);
  expect(revision2?.version).toBe(2);

  const revisions = await listRevisions(page.id);
  expect(revisions.length).toBe(2);
  expect(revisions[0]?.kind).toBe("publish");

  await restoreRevision(page.id, revision1!.id);
  const [updated] = await db.select().from(pages).where(eq(pages.id, page.id));
  expect(updated?.currentData).toEqual({ step: 1 });

  await cleanup();
  pageId = undefined;
  userId = undefined;
});
