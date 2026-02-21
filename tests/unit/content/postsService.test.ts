import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries, contentTypes } from "../../../core/db/schema";
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
import { createContentType } from "../../../core/services/content/typeService";
import { createEntry } from "../../../core/services/content/entryService";

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

const createdTypeIds = new Set<string>();
const createdEntryIds = new Set<string>();
let shouldDeletePostType = false;
let postTypeIdToDelete: string | null = null;

const recordType = (id: string) => createdTypeIds.add(id);
const recordEntry = (id: string) => createdEntryIds.add(id);

const cleanup = async () => {
  for (const entryId of createdEntryIds) {
    await db.delete(contentEntries).where(eq(contentEntries.id, entryId));
  }
  createdEntryIds.clear();

  for (const typeId of createdTypeIds) {
    await db.delete(contentTypes).where(eq(contentTypes.id, typeId));
  }
  createdTypeIds.clear();

  if (shouldDeletePostType && postTypeIdToDelete) {
    await db.delete(contentTypes).where(eq(contentTypes.id, postTypeIdToDelete));
    shouldDeletePostType = false;
    postTypeIdToDelete = null;
  }
};

afterAll(async () => {
  await cleanup();
});

testIfDb("ensurePostContentType is idempotent", async () => {
  const before = await db
    .select()
    .from(contentTypes)
    .where(eq(contentTypes.slug, POST_CONTENT_TYPE_SLUG));
  const postType = await ensurePostContentType();
  const second = await ensurePostContentType();

  expect(postType.slug).toBe(POST_CONTENT_TYPE_SLUG);
  expect(second.id).toBe(postType.id);
  expect(
    typeof (postType.schema as Record<string, unknown>)?.properties === "object" &&
      (postType.schema as Record<string, unknown>)?.properties !== null &&
      Object.prototype.hasOwnProperty.call(
        (postType.schema as Record<string, unknown>).properties as Record<string, unknown>,
        "document"
      )
  ).toBe(true);

  if (before.length === 0) {
    shouldDeletePostType = true;
    postTypeIdToDelete = postType.id;
  }
});

testIfDb("listPosts returns only entries for reserved post type", async () => {
  const postType = await ensurePostContentType();
  const post = await createPost({
    title: `Post ${randomUUID()}`,
    data: { content: "Post body" },
  });
  if (!post) throw new Error("post_create_failed");
  recordEntry(post.id);

  const customType = await createContentType({
    name: `News ${randomUUID()}`,
    slug: `news-${randomUUID()}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
      },
    },
  });
  recordType(customType.id);

  const customEntry = await createEntry(customType.id, {
    title: "Other",
    slug: `other-${randomUUID()}`,
    data: { title: "Other" },
  });
  if (!customEntry) throw new Error("entry_create_failed");
  recordEntry(customEntry.id);

  const items = await listPosts();
  expect(items.some((item) => item.id === post.id)).toBe(true);
  expect(items.some((item) => item.id === customEntry.id)).toBe(false);

  const loaded = await getPost(post.id);
  expect(loaded?.typeId).toBe(postType.id);
  expect(loaded?.data).toHaveProperty("document");
  const missing = await getPost(customEntry.id);
  expect(missing).toBeNull();
});

testIfDb("duplicatePost creates a draft clone with copied metadata", async () => {
  const source = await createPost({
    title: `Original ${randomUUID()}`,
    data: {
      excerpt: "Source excerpt",
      content: "Source content",
    },
  });
  if (!source) throw new Error("post_create_failed");
  recordEntry(source.id);

  await updatePostMetadata(source.id, {
    tags: ["news", "release"],
    seo: {
      description: "SEO description",
    },
  });

  const duplicated = await duplicatePost(source.id);
  if (!duplicated) throw new Error("post_duplicate_failed");
  recordEntry(duplicated.id);

  expect(duplicated.id).not.toBe(source.id);
  expect(duplicated.slug).not.toBe(source.slug);
  expect(duplicated.title).toContain("(Copy");
  expect(duplicated.status).toBe("draft");
  expect(duplicated.tags).toEqual(expect.arrayContaining(["news", "release"]));
  expect(duplicated.seo?.description).toBe("SEO description");

  const deleted = await deletePost(duplicated.id);
  expect(deleted.ok).toBe(true);
  createdEntryIds.delete(duplicated.id);
});
