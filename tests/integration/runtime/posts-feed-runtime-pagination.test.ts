import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { pageRevisions, pages, posts, previewTokens, users } from "../../../core/db/schema";
import { createPage, publishPage } from "../../../core/services/pages/pageService";
import {
  deleteSetting,
  getSettingRecord,
  setSetting,
  type ContentRouteSetting,
} from "../../../core/services/settings/settingsService";
import { clearSiteCache } from "../../../core/site/cache/siteCache";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const dbRuntimeTimeout = 15_000;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const trackedPageIds = new Set<string>();
const trackedPostIds = new Set<string>();
const trackedUserIds = new Set<string>();
const settingSnapshots = new Map<string, { exists: boolean; value: unknown }>();

const trackPage = (id: string | undefined | null) => {
  if (id) trackedPageIds.add(id);
};

const trackPost = (id: string | undefined | null) => {
  if (id) trackedPostIds.add(id);
};

const trackUser = (id: string | undefined | null) => {
  if (id) trackedUserIds.add(id);
};

const rememberSetting = async (key: string) => {
  if (settingSnapshots.has(key)) return;
  const row = await getSettingRecord(key);
  settingSnapshots.set(key, {
    exists: Boolean(row),
    value: row?.value,
  });
};

const setTestSetting = async (key: string, value: unknown) => {
  await rememberSetting(key);
  await setSetting(key, value);
};

const restoreSettings = async () => {
  for (const [key, snapshot] of [...settingSnapshots].reverse()) {
    if (snapshot.exists) {
      await setSetting(key, snapshot.value);
    } else {
      await deleteSetting(key);
    }
  }
  settingSnapshots.clear();
};

const cleanupTrackedRows = async () => {
  const pageIds = [...trackedPageIds];
  const postIds = [...trackedPostIds];
  const userIds = [...trackedUserIds];

  if (pageIds.length > 0) {
    await db.delete(previewTokens).where(inArray(previewTokens.targetId, pageIds));
    await db.delete(pageRevisions).where(inArray(pageRevisions.pageId, pageIds));
    await db.delete(pages).where(inArray(pages.id, pageIds));
  }

  if (postIds.length > 0) {
    await db.delete(previewTokens).where(inArray(previewTokens.targetId, postIds));
    await db.delete(posts).where(inArray(posts.id, postIds));
  }

  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }

  trackedPageIds.clear();
  trackedPostIds.clear();
  trackedUserIds.clear();
};

afterEach(async () => {
  clearSiteCache();
  resetRateLimitBuckets();
  if (!hasDb) return;
  await restoreSettings();
  await cleanupTrackedRows();
});

const requestPublicPath = (path: string) =>
  handlePublicRequest(
    new Request(`http://public.coderso.test${path}`, {
      headers: {
        "user-agent": "posts-feed-runtime-pagination-test",
        "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
      },
    })
  );

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

testIfDb(
  "posts feed public runtime honors block-scoped pagination params for load-more and view-all",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);

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

    await setTestSetting("site.contentRoutes", [
      {
        type: "posts",
        listPath: "/news",
        detailPath: "/news/:slug",
        enabled: true,
      } satisfies ContentRouteSetting,
    ]);

    const pageSlug = `/posts-feed-runtime-${token}`;
    const postsFeedPageData = (mode: "load-more" | "view-all") => ({
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

    const page = await createPage({
      title: `Posts Feed Runtime ${token}`,
      slug: pageSlug,
      authorId: actor.id,
      data: postsFeedPageData("load-more"),
    });
    trackPage(page.id);
    await publishPage(page.id, actor.id, postsFeedPageData("load-more"));

    const loadMoreResponse = await requestPublicPath(`${pageSlug}?cl.posts-feed-1.page=2`);
    expect(loadMoreResponse.status).toBe(200);
    const loadMoreHtml = await loadMoreResponse.text();
    expect(loadMoreHtml).toContain('data-content-list-items="2"');
    expect(loadMoreHtml).toContain(`Runtime post A ${token}`);
    expect(loadMoreHtml).toContain(`Runtime post B ${token}`);
    expect(loadMoreHtml).toContain('href="?cl.posts-feed-1.page=3"');
    expect(loadMoreHtml).toContain("Load more");

    await publishPage(page.id, actor.id, postsFeedPageData("view-all"));

    const viewAllResponse = await requestPublicPath(`${pageSlug}?cl.posts-feed-1.page=2`);
    expect(viewAllResponse.status).toBe(200);
    const viewAllHtml = await viewAllResponse.text();
    expect(viewAllHtml).toContain('data-content-list-items="1"');
    expect(viewAllHtml).toContain(`Runtime post A ${token}`);
    expect(viewAllHtml).not.toContain(`Runtime post B ${token}`);
    expect(viewAllHtml).not.toContain("Load more");
    expect(viewAllHtml).not.toContain('href="?cl.posts-feed-1.page=3"');
  },
  { timeout: dbRuntimeTimeout }
);
