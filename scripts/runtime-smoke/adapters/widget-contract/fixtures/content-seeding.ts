import type { WidgetSmokeCase } from "../contracts";
import {
  postsFeedFixturePostSeeds,
  type ContentListFixturePageDetail,
  type ContentListFixturePageListItem,
  type PostsFeedFixturePostListItem,
  type PostsFeedFixturePostListPayload,
  type PostsFeedFixturePostSeed,
  type PostsFeedFixtureSettingsPayload,
} from "../fixture-data";
import {
  contentFixtureWidgetTypes,
  postsFixtureWidgetTypes,
  selectedCasesNeedContentFixtures,
  selectedCasesNeedPostsFixtures,
} from "../fixture-selection";
import { fetchAdminCsrfToken, requestAdminJson } from "../auth";
import {
  buildContentListFixturePageData,
  buildPostsFeedFixtureContentRoutes,
  buildPostsFeedFixturePageData,
  buildPostsFeedFixturePostData,
  normalizePostsFeedFixtureContentRoutes,
} from "./content-builders";

export function normalizeFixtureSlug(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export async function ensureContentListWidgetFixtures(
  adminUrl: string,
  sessionValue: string,
  selectedCases: WidgetSmokeCase[]
): Promise<void> {
  if (!selectedCasesNeedContentFixtures(selectedCases)) {
    return;
  }

  const pages = await requestAdminJson<ContentListFixturePageListItem[]>({
    adminUrl,
    sessionValue,
    path: "/api/pages",
  });
  let csrfToken: string | null = null;
  const ensureCsrf = async () => {
    if (csrfToken) return csrfToken;
    csrfToken = await fetchAdminCsrfToken(adminUrl, sessionValue);
    return csrfToken;
  };

  for (const item of selectedCases.filter((current) =>
    contentFixtureWidgetTypes.has(current.widgetType)
  )) {
    const expectedSlug = normalizeFixtureSlug(item.adminFixtureSlug);
    const pageRow = pages.find((page) => normalizeFixtureSlug(page.slug) === expectedSlug);
    if (!pageRow) {
      throw new Error(`content_list_fixture_page_not_found:${item.adminFixtureSlug}`);
    }
    const detail = await requestAdminJson<ContentListFixturePageDetail>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
    });
    const data = buildContentListFixturePageData(detail.currentData);
    await requestAdminJson<ContentListFixturePageDetail>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
      method: "PATCH",
      body: { data },
      csrfToken: await ensureCsrf(),
    });
    await requestAdminJson<{ ok: boolean }>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}/publish`,
      method: "POST",
      body: { data },
      csrfToken: await ensureCsrf(),
    });
  }
}

export function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function buildPostsFeedFixturePostPatch(
  existing: PostsFeedFixturePostListItem,
  seed: PostsFeedFixturePostSeed
): Record<string, unknown> | null {
  const expectedData = buildPostsFeedFixturePostData(seed);
  const patch: Record<string, unknown> = {};
  if (existing.title !== seed.title) patch.title = seed.title;
  if (existing.slug !== seed.slug) patch.slug = seed.slug;
  if (stableJson(existing.data ?? {}) !== stableJson(expectedData)) {
    patch.data = expectedData;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

function postsFeedFixtureMetadataPayload(seed: PostsFeedFixturePostSeed): Record<string, unknown> {
  return {
    status: "published",
    scheduledAt: null,
    tags: seed.tags,
    seo: {
      title: seed.title,
      description: seed.excerpt,
    },
  };
}

function normalizePostFixtureListItems(
  payload: PostsFeedFixturePostListItem[] | PostsFeedFixturePostListPayload
): PostsFeedFixturePostListItem[] {
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

export async function ensurePostsFeedWidgetFixtures(
  adminUrl: string,
  sessionValue: string,
  selectedCases: WidgetSmokeCase[]
): Promise<void> {
  if (!selectedCasesNeedPostsFixtures(selectedCases)) {
    return;
  }

  const postsPayload = await requestAdminJson<
    PostsFeedFixturePostListItem[] | PostsFeedFixturePostListPayload
  >({
    adminUrl,
    sessionValue,
    path: "/api/posts",
  });
  const postBySlug = new Map(
    normalizePostFixtureListItems(postsPayload).map((item) => [item.slug, item] as const)
  );
  let csrfToken: string | null = null;
  const ensureCsrf = async () => {
    if (csrfToken) return csrfToken;
    csrfToken = await fetchAdminCsrfToken(adminUrl, sessionValue);
    return csrfToken;
  };
  const settingsPayload = await requestAdminJson<PostsFeedFixtureSettingsPayload>({
    adminUrl,
    sessionValue,
    path: "/api/settings",
  });
  const currentRoutes = normalizePostsFeedFixtureContentRoutes(
    settingsPayload["site.contentRoutes"]
  );
  const nextRoutes = buildPostsFeedFixtureContentRoutes(currentRoutes);
  if (stableJson(currentRoutes) !== stableJson(nextRoutes)) {
    await requestAdminJson<PostsFeedFixtureSettingsPayload>({
      adminUrl,
      sessionValue,
      path: "/api/settings",
      method: "PATCH",
      body: {
        "site.contentRoutes": nextRoutes,
      },
      csrfToken: await ensureCsrf(),
    });
  }

  for (const seed of postsFeedFixturePostSeeds) {
    const existing = postBySlug.get(seed.slug);
    let postId = existing?.id;
    if (!existing) {
      const created = await requestAdminJson<PostsFeedFixturePostListItem>({
        adminUrl,
        sessionValue,
        path: "/api/posts",
        method: "POST",
        body: {
          title: seed.title,
          slug: seed.slug,
          data: buildPostsFeedFixturePostData(seed),
        },
        csrfToken: await ensureCsrf(),
      });
      postId = created.id;
      postBySlug.set(seed.slug, created);
    } else {
      const patch = buildPostsFeedFixturePostPatch(existing, seed);
      if (patch) {
        await requestAdminJson<PostsFeedFixturePostListItem>({
          adminUrl,
          sessionValue,
          path: `/api/posts/${encodeURIComponent(existing.id)}`,
          method: "PATCH",
          body: patch,
          csrfToken: await ensureCsrf(),
        });
      }
    }

    if (!postId) {
      throw new Error(`posts_feed_fixture_post_id_missing:${seed.slug}`);
    }

    await requestAdminJson<PostsFeedFixturePostListItem>({
      adminUrl,
      sessionValue,
      path: `/api/posts/${encodeURIComponent(postId)}/metadata`,
      method: "PATCH",
      body: postsFeedFixtureMetadataPayload(seed),
      csrfToken: await ensureCsrf(),
    });
    await requestAdminJson<{ ok: boolean }>({
      adminUrl,
      sessionValue,
      path: `/api/posts/${encodeURIComponent(postId)}/publish`,
      method: "POST",
      csrfToken: await ensureCsrf(),
    });
  }

  const pages = await requestAdminJson<ContentListFixturePageListItem[]>({
    adminUrl,
    sessionValue,
    path: "/api/pages",
  });

  for (const item of selectedCases.filter((current) =>
    postsFixtureWidgetTypes.has(current.widgetType)
  )) {
    const expectedSlug = normalizeFixtureSlug(item.adminFixtureSlug);
    const pageRow = pages.find((page) => normalizeFixtureSlug(page.slug) === expectedSlug);
    if (!pageRow) {
      throw new Error(`posts_feed_fixture_page_not_found:${item.adminFixtureSlug}`);
    }
    const detail = await requestAdminJson<ContentListFixturePageDetail>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
    });
    const data = buildPostsFeedFixturePageData(detail.currentData);
    await requestAdminJson<ContentListFixturePageDetail>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
      method: "PATCH",
      body: { data },
      csrfToken: await ensureCsrf(),
    });
    await requestAdminJson<{ ok: boolean }>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}/publish`,
      method: "POST",
      body: { data },
      csrfToken: await ensureCsrf(),
    });
  }
}
