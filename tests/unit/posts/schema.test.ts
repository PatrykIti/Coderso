import { afterAll, beforeEach, expect, test } from "bun:test";
import { eq, like, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentTaxonomies,
  contentTerms,
  contentTypes,
  postPreviewTokens,
  postRevisions,
  postTermAssignments,
  posts,
} from "../../../core/db/schema";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const slugPrefix = "task-059-posts-schema";

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
  await db.execute(
    sql`delete from post_term_assignments where post_id in (select id from posts where slug like ${`${slugPrefix}%`})`
  );
  await db.execute(
    sql`delete from post_preview_tokens where post_id in (select id from posts where slug like ${`${slugPrefix}%`})`
  );
  await db.execute(
    sql`delete from post_revisions where post_id in (select id from posts where slug like ${`${slugPrefix}%`})`
  );
  await db.delete(posts).where(like(posts.slug, `${slugPrefix}%`));
  await db.delete(contentTaxonomies).where(like(contentTaxonomies.slug, `${slugPrefix}%`));
  await db.delete(contentTypes).where(like(contentTypes.slug, `${slugPrefix}%`));
};

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

testIfDb("posts tables accept inserts and cascade post-owned relations", async () => {
  const [type] = await db
    .insert(contentTypes)
    .values({
      name: "Task 059 Type",
      slug: `${slugPrefix}-type`,
      schema: { type: "object", additionalProperties: true },
    })
    .returning();

  const [taxonomy] = await db
    .insert(contentTaxonomies)
    .values({
      typeId: type.id,
      name: "Task 059 Tags",
      slug: `${slugPrefix}-taxonomy`,
      kind: "tags",
    })
    .returning();

  const [term] = await db
    .insert(contentTerms)
    .values({
      taxonomyId: taxonomy.id,
      name: "Release",
      slug: `${slugPrefix}-term`,
    })
    .returning();

  const [post] = await db
    .insert(posts)
    .values({
      title: "Task 059 Post",
      slug: `${slugPrefix}-entry`,
      status: "draft",
      data: { blocks: [] },
    })
    .returning();

  await db.insert(postTermAssignments).values({
    postId: post.id,
    termId: term.id,
  });

  await db.insert(postRevisions).values({
    postId: post.id,
    version: 1,
    data: { title: "Task 059 Post", blocks: [] },
  });

  await db.insert(postPreviewTokens).values({
    postId: post.id,
    tokenHash: `${post.id}-token`,
    expiresAt: new Date(Date.now() + 60_000),
  });

  await db.delete(posts).where(eq(posts.id, post.id));

  const [assignmentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(postTermAssignments)
    .where(eq(postTermAssignments.termId, term.id));
  const [revisionCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(postRevisions)
    .where(eq(postRevisions.postId, post.id));
  const [previewCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(postPreviewTokens)
    .where(eq(postPreviewTokens.postId, post.id));

  expect(assignmentCount?.count ?? 0).toBe(0);
  expect(revisionCount?.count ?? 0).toBe(0);
  expect(previewCount?.count ?? 0).toBe(0);
});

testIfDb("posts slug must be unique", async () => {
  await db.insert(posts).values({
    title: "Primary",
    slug: `${slugPrefix}-unique`,
    status: "draft",
    data: { blocks: [] },
  });

  await expect(
    db
      .insert(posts)
      .values({
        title: "Duplicate",
        slug: `${slugPrefix}-unique`,
        status: "draft",
        data: { blocks: [] },
      })
      .execute()
  ).rejects.toThrow();
});

testIfDb("post revisions enforce unique version per post", async () => {
  const [post] = await db
    .insert(posts)
    .values({
      title: "Revisioned",
      slug: `${slugPrefix}-revisioned`,
      status: "draft",
      data: { blocks: [] },
    })
    .returning();

  await db.insert(postRevisions).values({
    postId: post.id,
    version: 1,
    data: { title: "Revision 1" },
  });

  await expect(
    db
      .insert(postRevisions)
      .values({
        postId: post.id,
        version: 1,
        data: { title: "Revision duplicate" },
      })
      .execute()
  ).rejects.toThrow();
});
