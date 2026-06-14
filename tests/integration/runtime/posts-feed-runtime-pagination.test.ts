import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { db } from "../../../core/db/client";
import { posts, previewTokens, users } from "../../../core/db/schema";
import { resolvePostsFeedRuntimeData } from "../../../core/services/content/postsFeedResolver";
import type { ContentRouteSetting } from "../../../core/services/settings/settingsService";
import { PostsFeedBlock, type PostsFeedData } from "../../../core/widgets/core/postsFeed";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;
const dbRuntimeTimeout = 15_000;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const trackedPostIds = new Set<string>();
const trackedUserIds = new Set<string>();

const trackPost = (id: string | undefined | null) => {
  if (id) trackedPostIds.add(id);
};

const trackUser = (id: string | undefined | null) => {
  if (id) trackedUserIds.add(id);
};

const cleanupTrackedRows = async () => {
  const postIds = [...trackedPostIds];
  const userIds = [...trackedUserIds];

  if (postIds.length > 0) {
    await db.delete(previewTokens).where(inArray(previewTokens.targetId, postIds));
    await db.delete(posts).where(inArray(posts.id, postIds));
  }

  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }

  trackedPostIds.clear();
  trackedUserIds.clear();
};

afterEach(async () => {
  resetRateLimitBuckets();
  if (!hasDb) return;
  await cleanupTrackedRows();
});

const createActor = async () => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `posts-feed-runtime-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  trackUser(actor?.id);
  if (!actor?.id) throw new Error("missing_test_actor");
  return actor;
};

const renderPostsFeedPath = async (
  path: string,
  block: { id: string; type: "posts-feed"; variant: string; data: PostsFeedData },
  contentRoutes: ContentRouteSetting[]
) => {
  const url = new URL(`http://public.coderso.test${path}`);
  const resolved = await resolvePostsFeedRuntimeData(block.data, {
    preview: false,
    contentRoutes,
    runtimeSearchParams: url.searchParams,
    blockId: block.id,
  });
  return renderToString(
    createElement(PostsFeedBlock, {
      data: {
        ...block.data,
        resolved,
      },
      variant: block.variant,
      blockId: block.id,
    })
  );
};

testIfDbWithOptions(
  "posts feed public runtime honors block-scoped pagination params for load-more and view-all",
  async () => {
    resetRateLimitBuckets();

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);

    const publishedRows = await db
      .insert(posts)
      .values([
        {
          authorId: actor.id,
          title: `Runtime post A ${token}`,
          slug: `runtime-post-a-${token}`,
          status: "published",
          tags: [`runtime-feed-${token}`],
          data: { title: "Runtime post A" },
          publishedAt: new Date("2026-05-19T12:00:00.000Z"),
          updatedAt: new Date("2026-05-19T12:00:00.000Z"),
        },
        {
          authorId: actor.id,
          title: `Runtime post B ${token}`,
          slug: `runtime-post-b-${token}`,
          status: "published",
          tags: [`runtime-feed-${token}`],
          data: { title: "Runtime post B" },
          publishedAt: new Date("2026-05-18T12:00:00.000Z"),
          updatedAt: new Date("2026-05-18T12:00:00.000Z"),
        },
        {
          authorId: actor.id,
          title: `Runtime post C ${token}`,
          slug: `runtime-post-c-${token}`,
          status: "published",
          tags: [`runtime-feed-${token}`],
          data: { title: "Runtime post C" },
          publishedAt: new Date("2026-05-17T12:00:00.000Z"),
          updatedAt: new Date("2026-05-17T12:00:00.000Z"),
        },
      ])
      .returning();
    publishedRows.forEach((row) => trackPost(row.id));

    const contentRoutes: ContentRouteSetting[] = [
      {
        type: "posts",
        listPath: "/news",
        detailPath: "/news/:slug",
        enabled: true,
      },
    ];

    const postsFeedPageData = (
      mode: "load-more" | "view-all"
    ): {
      blocks: Array<{ id: string; type: "posts-feed"; variant: string; data: PostsFeedData }>;
      settings: { template: string; showInNav: boolean };
    } => ({
      blocks: [
        {
          id: "posts-feed-1",
          type: "posts-feed",
          variant: "cards",
          data: {
            source: {
              mode: "category",
              category: `runtime-feed-${token}`,
              limit: 3,
              sort: "published-desc",
            },
            pagination: {
              mode,
              pageSize: 1,
            },
            fields: {
              showExcerpt: false,
              showAuthor: false,
              showDate: false,
              showCta: true,
            },
          },
        },
      ],
      settings: {
        template: "landing",
        showInNav: false,
      },
    });
    const loadMoreBlock = postsFeedPageData("load-more").blocks[0];
    if (!loadMoreBlock) throw new Error("missing_posts_feed_load_more_block");

    const loadMoreHtml = await renderPostsFeedPath(
      `/posts-feed-runtime-${token}?cl.posts-feed-1.page=2`,
      loadMoreBlock,
      contentRoutes
    );
    expect(loadMoreHtml).toContain('data-content-list-items="2"');
    expect(loadMoreHtml).toContain(`Runtime post A ${token}`);
    expect(loadMoreHtml).toContain(`Runtime post B ${token}`);
    expect(loadMoreHtml).toContain('href="?cl.posts-feed-1.page=3"');
    expect(loadMoreHtml).toContain("Load more");

    const viewAllBlock = postsFeedPageData("view-all").blocks[0];
    if (!viewAllBlock) throw new Error("missing_posts_feed_view_all_block");

    const viewAllHtml = await renderPostsFeedPath(
      `/posts-feed-runtime-${token}?cl.posts-feed-1.page=2`,
      viewAllBlock,
      contentRoutes
    );
    expect(viewAllHtml).toContain('data-content-list-items="1"');
    expect(viewAllHtml).toContain(`Runtime post A ${token}`);
    expect(viewAllHtml).not.toContain(`Runtime post B ${token}`);
    expect(viewAllHtml).not.toContain("Load more");
    expect(viewAllHtml).not.toContain('href="?cl.posts-feed-1.page=3"');
  },
  { timeout: dbRuntimeTimeout }
);
