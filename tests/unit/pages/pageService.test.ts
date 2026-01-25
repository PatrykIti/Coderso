import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { pageRevisions, pages, users } from "../../../core/db/schema";
import {
  createPage,
  publishPage,
  unpublishPage,
  updatePage,
} from "../../../core/services/pages/pageService";
import { listRevisions } from "../../../core/services/pages/revisionService";

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

const cleanup = async (pageId?: string, userId?: string) => {
  if (pageId) {
    await db.delete(pageRevisions).where(eq(pageRevisions.pageId, pageId));
    await db.delete(pages).where(eq(pages.id, pageId));
  }
  if (userId) {
    await db.delete(users).where(eq(users.id, userId));
  }
};

let createdPageId: string | undefined;
let createdUserId: string | undefined;

beforeAll(async () => {
  if (!hasDb) return;

  const email = `admin-${randomUUID()}@example.com`;
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash: "test",
      status: "active",
    })
    .returning();

  createdUserId = user?.id;
});

afterAll(async () => {
  await cleanup(createdPageId, createdUserId);
});

testIfDb("create/update/publish/unpublish page", async () => {
  if (!createdUserId) throw new Error("missing_test_user");

  const slug = `page-${randomUUID()}`;
  const page = await createPage({
    title: "Home",
    slug,
    data: {
      schemaVersion: 1,
      blocks: [
        {
          id: "b1",
          type: "hero",
          editor: { mode: "visual", wizardCompleted: true },
        },
      ],
    },
  });

  createdPageId = page.id;

  const updated = await updatePage(page.id, { title: "Home Updated" });
  expect(updated?.title).toBe("Home Updated");

  const published = await publishPage(page.id, createdUserId);
  expect(published?.status).toBe("published");
  expect(
    (published?.publishedData as { blocks?: Array<Record<string, unknown>> })
      ?.blocks?.[0]?.editor
  ).toBeUndefined();

  const revisions = await listRevisions(page.id);
  expect(revisions.length).toBe(1);

  const draft = await unpublishPage(page.id);
  expect(draft?.status).toBe("draft");

  await cleanup(page.id, createdUserId);
  createdPageId = undefined;
  createdUserId = undefined;
});
