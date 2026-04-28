import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentRevisions,
  contentTaxonomies,
  contentTermAssignments,
  contentTerms,
  contentTypes,
  postPreviewTokens,
  postRevisions,
  postTermAssignments,
  posts,
  previewTokens,
  seoDocuments,
  users,
} from "../../../core/db/schema";
import { runPostsBackfill } from "../../../core/services/posts/migration/postsBackfillService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const createdUserIds = new Set<string>();
const createdEntryIds = new Set<string>();
const createdPostIds = new Set<string>();
const createdTermIds = new Set<string>();
const createdTaxonomyIds = new Set<string>();
const createdTypeIds = new Set<string>();

const cleanup = async () => {
  if (createdPostIds.size > 0) {
    await db.delete(posts).where(inArray(posts.id, [...createdPostIds]));
  }

  if (createdEntryIds.size > 0) {
    await db
      .delete(seoDocuments)
      .where(
        and(
          eq(seoDocuments.targetType, "entry"),
          inArray(seoDocuments.targetId, [...createdEntryIds])
        )
      );

    await db
      .delete(previewTokens)
      .where(
        and(
          eq(previewTokens.targetType, "content"),
          inArray(previewTokens.targetId, [...createdEntryIds])
        )
      );

    await db
      .delete(contentEntries)
      .where(inArray(contentEntries.id, [...createdEntryIds]));
  }

  if (createdTermIds.size > 0) {
    await db.delete(contentTerms).where(inArray(contentTerms.id, [...createdTermIds]));
  }

  if (createdTaxonomyIds.size > 0) {
    await db
      .delete(contentTaxonomies)
      .where(inArray(contentTaxonomies.id, [...createdTaxonomyIds]));
  }

  if (createdUserIds.size > 0) {
    await db.delete(users).where(inArray(users.id, [...createdUserIds]));
  }

  if (createdTypeIds.size > 0) {
    await db.delete(contentTypes).where(inArray(contentTypes.id, [...createdTypeIds]));
  }

  createdUserIds.clear();
  createdEntryIds.clear();
  createdPostIds.clear();
  createdTermIds.clear();
  createdTaxonomyIds.clear();
  createdTypeIds.clear();
};

const createActor = async () => {
  const [created] = await db
    .insert(users)
    .values({
      email: `legacy-post-author-${randomUUID()}@coderso.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Legacy Post Author",
      status: "active",
    })
    .returning({ id: users.id });

  if (!created) throw new Error("actor_create_failed");
  createdUserIds.add(created.id);
  return created.id;
};

const ensureLegacyPostTypeId = async () => {
  const [existing] = await db
    .select({ id: contentTypes.id })
    .from(contentTypes)
    .where(inArray(contentTypes.slug, ["post", "posts"]));
  if (existing) return existing.id;

  const [created] = await db
    .insert(contentTypes)
    .values({
      name: "Post",
      slug: "post",
      schema: {
        type: "object",
        additionalProperties: true,
      },
    })
    .returning({ id: contentTypes.id });

  if (!created) throw new Error("legacy_post_type_create_failed");
  createdTypeIds.add(created.id);
  return created.id;
};

const ensureCategoryTaxonomyId = async (typeId: string) => {
  const [existing] = await db
    .select({ id: contentTaxonomies.id })
    .from(contentTaxonomies)
    .where(
      and(eq(contentTaxonomies.typeId, typeId), eq(contentTaxonomies.kind, "category"))
    );

  if (existing) return existing.id;

  const [created] = await db
    .insert(contentTaxonomies)
    .values({
      typeId,
      name: "Categories",
      slug: `categories-${randomUUID().slice(0, 8)}`,
      kind: "category",
    })
    .returning({ id: contentTaxonomies.id });

  if (!created) throw new Error("taxonomy_create_failed");
  createdTaxonomyIds.add(created.id);
  return created.id;
};

const createLegacyPostFixture = async (input?: { slug?: string }) => {
  const typeId = await ensureLegacyPostTypeId();
  const authorId = await createActor();
  const entryId = randomUUID();
  const slug = input?.slug ?? `legacy-${randomUUID().slice(0, 8)}`;
  const title = `Legacy ${randomUUID().slice(0, 8)}`;
  const now = new Date();
  const createdAt = new Date(now.getTime() - 60_000);
  const updatedAt = new Date(now.getTime() - 10_000);

  await db.insert(contentEntries).values({
    id: entryId,
    typeId,
    authorId,
    slug,
    title,
    status: "published",
    tags: ["legacy", "news"],
    data: {
      excerpt: "Legacy excerpt",
      content: "Legacy body",
    },
    publishedAt: now,
    scheduledAt: null,
    createdAt,
    updatedAt,
  });
  createdEntryIds.add(entryId);

  await db.insert(contentRevisions).values({
    id: randomUUID(),
    entryId,
    version: 1,
    data: {
      excerpt: "Legacy excerpt",
      content: "Legacy body",
    },
    createdAt: new Date(now.getTime() - 30_000),
    createdBy: authorId,
  });

  await db.insert(previewTokens).values({
    id: randomUUID(),
    targetType: "content",
    targetId: entryId,
    tokenHash: `legacy-preview-${randomUUID()}`,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1_000),
    createdAt: now,
  });

  const taxonomyId = await ensureCategoryTaxonomyId(typeId);
  const [term] = await db
    .insert(contentTerms)
    .values({
      taxonomyId,
      name: `Category ${randomUUID().slice(0, 4)}`,
      slug: `category-${randomUUID().slice(0, 8)}`,
    })
    .returning({ id: contentTerms.id });
  if (!term) throw new Error("term_create_failed");
  createdTermIds.add(term.id);

  await db.insert(contentTermAssignments).values({
    entryId,
    termId: term.id,
    createdAt: now,
  });

  await db.insert(seoDocuments).values({
    id: randomUUID(),
    targetType: "entry",
    targetId: entryId,
    title: "Legacy SEO title",
    description: "Legacy SEO description",
    canonicalUrl: "https://example.com/legacy",
    robots: "index,follow",
    status: "ok",
    issues: [],
    updatedAt: now,
    createdAt: now,
  });

  return {
    entryId,
    slug,
    title,
    updatedAt,
  };
};

afterAll(async () => {
  await cleanup();
});

testIfDbWithOptions(
  "runPostsBackfill dry-run reports migration plan without writing posts rows",
  async () => {
    const legacy = await createLegacyPostFixture();

    const report = await runPostsBackfill({
      dryRun: true,
      shadowRead: true,
      entryIds: [legacy.entryId],
    });

    expect(report.dryRun).toBe(true);
    expect(report.totals.legacyPosts).toBe(1);
    expect(report.totals.inserted).toBe(1);
    expect(report.totals.failed).toBe(0);

    const [post] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, legacy.entryId));
    expect(post).toBeUndefined();
  },
  { timeout: 20_000 }
);

testIfDbWithOptions(
  "runPostsBackfill migrates legacy post data and remains idempotent",
  async () => {
    const legacy = await createLegacyPostFixture();

    const first = await runPostsBackfill({
      dryRun: false,
      shadowRead: true,
      entryIds: [legacy.entryId],
    });

    expect(first.totals.inserted).toBe(1);
    expect(first.totals.failed).toBe(0);
    expect(first.mismatches).toHaveLength(0);

    const [post] = await db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        seo: posts.seo,
        metadata: posts.metadata,
      })
      .from(posts)
      .where(eq(posts.id, legacy.entryId));

    if (!post) throw new Error("post_missing_after_backfill");
    createdPostIds.add(post.id);

    expect(post.slug).toBe(legacy.slug);
    expect(post.title).toBe(legacy.title);
    const seo = post.seo as Record<string, unknown>;
    expect(seo.title).toBe("Legacy SEO title");
    expect(seo.canonicalUrl).toBe("https://example.com/legacy");

    const metadata = post.metadata as Record<string, unknown>;
    const migration = metadata.migration as Record<string, unknown>;
    expect(migration.source).toBe("content_entries");
    expect(migration.legacyEntryId).toBe(legacy.entryId);

    const [revisionCountRow] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(postRevisions)
      .where(eq(postRevisions.postId, legacy.entryId));
    const [tokenCountRow] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(postPreviewTokens)
      .where(eq(postPreviewTokens.postId, legacy.entryId));
    const [termCountRow] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(postTermAssignments)
      .where(eq(postTermAssignments.postId, legacy.entryId));

    expect(revisionCountRow?.count ?? 0).toBe(1);
    expect(tokenCountRow?.count ?? 0).toBe(1);
    expect(termCountRow?.count ?? 0).toBe(1);

    const second = await runPostsBackfill({
      dryRun: false,
      shadowRead: true,
      entryIds: [legacy.entryId],
    });

    expect(second.totals.inserted).toBe(0);
    expect(second.totals.updated).toBe(1);
    expect(second.totals.failed).toBe(0);
    expect(second.mismatches).toHaveLength(0);

    const [revisionCountRowAfter] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(postRevisions)
      .where(eq(postRevisions.postId, legacy.entryId));
    const [tokenCountRowAfter] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(postPreviewTokens)
      .where(eq(postPreviewTokens.postId, legacy.entryId));
    const [termCountRowAfter] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(postTermAssignments)
      .where(eq(postTermAssignments.postId, legacy.entryId));

    expect(revisionCountRowAfter?.count ?? 0).toBe(1);
    expect(tokenCountRowAfter?.count ?? 0).toBe(1);
    expect(termCountRowAfter?.count ?? 0).toBe(1);
  },
  { timeout: 25_000 }
);

testIfDbWithOptions(
  "runPostsBackfill reports slug conflicts and skips conflicting legacy rows",
  async () => {
    const legacy = await createLegacyPostFixture({
      slug: `slug-conflict-${randomUUID().slice(0, 8)}`,
    });

    const conflictingPostId = randomUUID();
    createdPostIds.add(conflictingPostId);
    await db.insert(posts).values({
      id: conflictingPostId,
      slug: legacy.slug,
      title: "Existing Post",
      status: "draft",
      tags: [],
      data: {},
      metadata: {},
      seo: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const report = await runPostsBackfill({
      dryRun: false,
      shadowRead: true,
      entryIds: [legacy.entryId],
    });

    expect(report.totals.skipped).toBe(1);
    expect(report.totals.inserted).toBe(0);
    expect(report.mismatches.some((item) => item.code === "slug_conflict")).toBe(true);

    const [post] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, legacy.entryId));
    expect(post).toBeUndefined();
  },
  { timeout: 20_000 }
);
