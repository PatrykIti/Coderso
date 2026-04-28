import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { users } from "../../../core/db/schema";
import {
  createPost,
  deletePost,
  getPostBySlug,
  publishPost,
} from "../../../core/services/content/postsService";
import { executeListingQuery } from "../../../core/services/content/queryBuilderService";
import { searchPublicIndex } from "../../../core/services/search/searchIndexService";

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

const createdPostIds = new Set<string>();
const createdUserIds = new Set<string>();

const cleanup = async () => {
  for (const postId of createdPostIds) {
    await deletePost(postId).catch(() => undefined);
  }
  createdPostIds.clear();

  for (const userId of createdUserIds) {
    await db.delete(users).where(eq(users.id, userId)).catch(() => undefined);
  }
  createdUserIds.clear();
};

const createActor = async () => {
  const [created] = await db
    .insert(users)
    .values({
      email: `posts-runtime-${randomUUID()}@coderso.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Posts Runtime Actor",
      status: "active",
    })
    .returning();
  if (!created) throw new Error("actor_create_failed");
  createdUserIds.add(created.id);
  return created;
};

afterAll(async () => {
  await cleanup();
});

testIfDb("posts runtime/listing/search use dedicated posts storage", async () => {
  const actor = await createActor();
  const token = randomUUID().replace(/-/g, "").slice(0, 10);

  const post = await createPost({
    title: `Runtime ${token}`,
    slug: `runtime-${token}`,
    data: {
      excerpt: `Runtime excerpt ${token}`,
      content: `Runtime body ${token}`,
    },
    authorId: actor.id,
  });
  if (!post) throw new Error("post_create_failed");
  createdPostIds.add(post.id);

  await publishPost(post.id, actor.id);

  const bySlug = await getPostBySlug(post.slug);
  expect(bySlug?.id).toBe(post.id);

  const listing = await executeListingQuery({
    source: "posts",
    sourceConfig: { includeDrafts: false },
    filters: [{ field: "slug", op: "eq", value: post.slug }],
    sort: [{ field: "updatedAt", dir: "desc" }],
    pagination: { limit: 10, offset: 0 },
    fields: ["id", "slug", "title", "status"],
  });

  expect(listing.rows).toHaveLength(1);
  expect(listing.rows[0]).toEqual({
    id: post.id,
    slug: post.slug,
    title: `Runtime ${token}`,
    status: "published",
  });

  const search = await searchPublicIndex(token, {
    sources: "posts",
    contentRoutes: [
      {
        type: "posts",
        listPath: "/blog",
        detailPath: "/blog/:slug",
        enabled: true,
      },
    ],
  });

  expect(search.items.some((item) => item.id === post.id && item.href === `/blog/${post.slug}`)).toBe(
    true
  );
});
