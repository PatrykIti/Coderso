import { afterAll, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { like, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { posts } from "../../../core/db/schema";
import {
  createPost,
  deletePost,
  duplicatePost,
  ensurePostContentType,
  getPost,
  listPosts,
  POST_CONTENT_TYPE_SLUG,
  updatePostMetadata,
} from "../../../core/services/content/postsService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const slugPrefix = "task-059-02-posts-service";

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const cleanup = async () => {
  if (!hasDb) return;
  await db.delete(posts).where(like(posts.slug, `${slugPrefix}%`));
};

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

test("ensurePostContentType returns stable virtual post type contract", async () => {
  const first = await ensurePostContentType();
  const second = await ensurePostContentType();

  expect(first.slug).toBe(POST_CONTENT_TYPE_SLUG);
  expect(first.id).toBe(POST_CONTENT_TYPE_SLUG);
  expect(second.id).toBe(first.id);
  expect(
    typeof (first.schema as Record<string, unknown>)?.properties === "object" &&
      (first.schema as Record<string, unknown>)?.properties !== null &&
      Object.prototype.hasOwnProperty.call(
        (first.schema as Record<string, unknown>).properties as Record<string, unknown>,
        "document"
      )
  ).toBe(true);
});

testIfDb("listPosts and getPost return records from dedicated posts table", async () => {
  const created = await createPost({
    title: `Task 059 post ${randomUUID()}`,
    slug: `${slugPrefix}-list`,
    data: { excerpt: "Post body" },
  });
  if (!created) throw new Error("post_create_failed");

  const items = await listPosts();
  expect(items.some((item) => item.id === created.id)).toBe(true);

  const loaded = await getPost(created.id);
  expect(loaded?.id).toBe(created.id);
  expect(loaded?.typeId).toBe(POST_CONTENT_TYPE_SLUG);
  expect(loaded?.data).toHaveProperty("document");
});

testIfDb("duplicatePost creates a draft clone with copied metadata", async () => {
  const source = await createPost({
    title: `Original ${randomUUID()}`,
    slug: `${slugPrefix}-original`,
    data: {
      excerpt: "Source excerpt",
      content: "Source content",
    },
  });
  if (!source) throw new Error("post_create_failed");

  await updatePostMetadata(source.id, {
    tags: ["news", "release"],
    seo: {
      description: "SEO description",
    },
  });

  const duplicated = await duplicatePost(source.id);
  if (!duplicated) throw new Error("post_duplicate_failed");

  expect(duplicated.id).not.toBe(source.id);
  expect(duplicated.slug).not.toBe(source.slug);
  expect(duplicated.title).toContain("(Copy");
  expect(duplicated.status).toBe("draft");
  expect(duplicated.tags).toEqual(expect.arrayContaining(["news", "release"]));
  expect(duplicated.seo?.description).toBe("SEO description");

  const deleted = await deletePost(duplicated.id);
  expect(deleted.ok).toBe(true);
});
