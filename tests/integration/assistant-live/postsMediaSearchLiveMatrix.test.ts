import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import {
  canConnectToLiveDatabase,
  createEnabledLiveProviderRuntimes,
  createLiveCleanupStack,
  createLiveRunPrefix,
  planWithLiveProvider,
  type LiveProviderRuntime,
} from "./liveCmsHarness";

const hasDb = await canConnectToLiveDatabase();
const providers = createEnabledLiveProviderRuntimes();
const testIfLive = hasDb && providers.length > 0 ? test : test.skip;
const globalCleanup = createLiveCleanupStack();

const loadDb = async () => {
  const [{ db }, { media, users }] = await Promise.all([
    import("../../../core/db/client"),
    import("../../../core/db/schema"),
  ]);
  return { db, media, users };
};

const loadPosts = () => import("../../../core/services/content/postsService");
const loadSearch = () => import("../../../core/services/search/searchService");

const createActor = async (prefix: string) => {
  const { db, users } = await loadDb();
  const [actor] = await db
    .insert(users)
    .values({
      email: `${prefix}-${randomUUID()}@coderso.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Assistant Live Posts Search Actor",
      status: "active",
    })
    .returning();
  if (!actor) throw new Error("assistant_live_actor_create_failed");
  globalCleanup.add(`user:${actor.id}`, async () => {
    await db
      .delete(users)
      .where(eq(users.id, actor.id))
      .catch(() => undefined);
  });
  return actor;
};

const createPostFixture = async (input: {
  prefix: string;
  actorId: string;
  cleanup: ReturnType<typeof createLiveCleanupStack>;
}) => {
  const { createPost, deletePost } = await loadPosts();
  const post = await createPost({
    title: `${input.prefix} Post Alpha`,
    slug: `${input.prefix}-post-alpha`,
    data: {
      excerpt: `${input.prefix} post excerpt`,
      content: `${input.prefix} post content`,
    },
    authorId: input.actorId,
  });
  if (!post) throw new Error("assistant_live_post_create_failed");
  input.cleanup.add(`post:${post.id}`, async () => {
    await deletePost(post.id).catch(() => undefined);
  });
  return post;
};

const createMediaRowFixture = async (input: {
  prefix: string;
  actorId: string;
  cleanup: ReturnType<typeof createLiveCleanupStack>;
}) => {
  const { db, media } = await loadDb();
  const [row] = await db
    .insert(media)
    .values({
      key: `${input.prefix}/search-media.png`,
      url: `/media/${input.prefix}/search-media.png`,
      originalName: `${input.prefix}-search-media.png`,
      type: "image",
      mimeType: "image/png",
      size: 68,
      title: `${input.prefix} Media Alpha`,
      alt: `${input.prefix} Media Alt`,
      caption: null,
      createdBy: input.actorId,
    })
    .returning();
  if (!row) throw new Error("assistant_live_media_create_failed");
  input.cleanup.add(`media:${row.id}`, async () => {
    await db
      .delete(media)
      .where(eq(media.id, row.id))
      .catch(() => undefined);
  });
  return row;
};

const assertNoExecutableActions = (
  plan: Awaited<ReturnType<typeof planWithLiveProvider>>,
  provider: string
) => {
  expect(plan.actions, provider).toEqual([]);
  expect(
    plan.responseKind === "needs_input" ||
      plan.responseKind === "inspection" ||
      plan.responseKind === "docs" ||
      plan.responseKind === "gated",
    provider
  ).toBe(true);
};

const runPostsMediaSearchForProvider = async (provider: LiveProviderRuntime) => {
  const cleanup = createLiveCleanupStack();
  const prefix = createLiveRunPrefix(`posts-media-search-${provider.id}`);
  const actor = await createActor(prefix);
  const post = await createPostFixture({ prefix, actorId: actor.id, cleanup });
  const media = await createMediaRowFixture({ prefix, actorId: actor.id, cleanup });

  try {
    const createPostPlan = await planWithLiveProvider({
      provider,
      context: {
        page: "/admin/posts",
        locale: "pl-PL",
        includeResourceCatalog: true,
        resourceCatalog: {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          budget: { maxItemsPerGroup: 20, maxFieldsPerResource: 24, truncated: false },
          pages: [],
          contentTypes: [],
          customScreens: [],
          listings: { queries: [], templates: [] },
          forms: [],
          menus: [],
          seoDocuments: [],
          widgets: [],
          warnings: [],
        },
      },
      prompt: `Utworz post blogowy o tytule "${prefix} New Post"`,
    });
    assertNoExecutableActions(createPostPlan, provider.id);

    const uploadPlan = await planWithLiveProvider({
      provider,
      context: {
        page: "/admin/media",
        locale: "pl-PL",
      },
      prompt: `Wgraj nowy obraz "${prefix} upload.png" z internetu`,
    });
    assertNoExecutableActions(uploadPlan, provider.id);

    const { searchAll } = await loadSearch();
    const results = await searchAll(prefix, { limit: 20 });
    const titles = results.map((item) => item.title);
    expect(titles, provider.id).toContain(media.title);
    expect(titles, provider.id).not.toContain(post.title);
  } finally {
    await cleanup.run();
  }
};

afterAll(async () => {
  await globalCleanup.run();
});

testIfLive(
  "assistant live providers keep posts/media mutations gated and admin search finds fixtures",
  async () => {
    for (const provider of providers) {
      await runPostsMediaSearchForProvider(provider);
    }
  },
  120_000
);
