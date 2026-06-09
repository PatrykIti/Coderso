import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentTypes,
  pageRevisions,
  pages,
  previewTokens,
  seoDocuments,
  users,
} from "../../../core/db/schema";
import { createContentType } from "../../../core/services/content/typeService";
import { createPage, publishPage, updatePage } from "../../../core/services/pages/pageService";
import { createPreviewToken } from "../../../core/services/pages/previewService";
import { upsertSeoDocument } from "../../../core/services/seo/seoService";
import {
  deleteSetting,
  getSettingRecord,
  setSetting,
  type ContentRouteSetting,
} from "../../../core/services/settings/settingsService";
import { clearSiteCache, getSiteCacheStats } from "../../../core/site/cache/siteCache";
import { handlePublicRequest } from "../../../core/server/publicSite";
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

const trackedPageIds = new Set<string>();
const trackedUserIds = new Set<string>();
const trackedContentEntryIds = new Set<string>();
const trackedContentTypeIds = new Set<string>();
const settingSnapshots = new Map<string, { exists: boolean; value: unknown }>();

const trackPage = (id: string | undefined | null) => {
  if (id) trackedPageIds.add(id);
};

const trackUser = (id: string | undefined | null) => {
  if (id) trackedUserIds.add(id);
};

const trackContentEntry = (id: string | undefined | null) => {
  if (id) trackedContentEntryIds.add(id);
};

const trackContentType = (id: string | undefined | null) => {
  if (id) trackedContentTypeIds.add(id);
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
  const userIds = [...trackedUserIds];
  const contentEntryIds = [...trackedContentEntryIds];
  const contentTypeIds = [...trackedContentTypeIds];

  if (pageIds.length > 0) {
    await db.delete(seoDocuments).where(inArray(seoDocuments.targetId, pageIds));
    await db.delete(previewTokens).where(inArray(previewTokens.targetId, pageIds));
    await db.delete(pageRevisions).where(inArray(pageRevisions.pageId, pageIds));
    await db.delete(pages).where(inArray(pages.id, pageIds));
  }

  if (contentEntryIds.length > 0) {
    await db.delete(previewTokens).where(inArray(previewTokens.targetId, contentEntryIds));
    await db.delete(contentEntries).where(inArray(contentEntries.id, contentEntryIds));
  }

  if (contentTypeIds.length > 0) {
    await db.delete(contentTypes).where(inArray(contentTypes.id, contentTypeIds));
  }

  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }

  trackedPageIds.clear();
  trackedUserIds.clear();
  trackedContentEntryIds.clear();
  trackedContentTypeIds.clear();
};

afterEach(async () => {
  clearSiteCache();
  resetRateLimitBuckets();
  if (!hasDb) return;
  await restoreSettings();
  await cleanupTrackedRows();
});

const pageData = (headline: string) => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  sections: [
    {
      id: `sec-${headline.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      type: "hero",
      name: "Hero",
      variant: "centered",
      layout: { columns: 1, align: "center", justify: "center", maxWidth: 1080 },
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
      },
      spacing: {
        paddingTop: 72,
        paddingBottom: 72,
        paddingLeft: 40,
        paddingRight: 40,
        gap: 24,
      },
      visibility: {
        visible: true,
        authOnly: false,
        anchor: "hero",
        startsAt: null,
        endsAt: null,
      },
      responsive: {
        mobile: { spacing: { paddingLeft: 20, paddingRight: 20 } },
      },
      blocks: [
        {
          id: `heading-${headline.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          type: "heading",
          props: { text: headline, level: "h1", align: "center" },
          visibility: { visible: true },
        },
        {
          id: `text-${headline.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          type: "text",
          props: { text: `${headline} body`, format: "plain", align: "center" },
          visibility: { visible: true },
        },
      ],
    },
  ],
  settings: {
    template: "page-v2",
    showInNav: true,
  },
  seo: {
    description: `${headline} meta description`,
  },
});

const createActor = async () => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `pages-runtime-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  trackUser(actor?.id);
  if (!actor?.id) throw new Error("missing_test_actor");
  return actor;
};

const createPublishedPageWithDraft = async () => {
  const actor = await createActor();
  const token = randomUUID().slice(0, 8);
  const slug = `/runtime-page-${token}`;
  const created = await createPage({
    title: `Runtime Page ${token}`,
    slug,
    authorId: actor.id,
    data: pageData(`Initial Runtime ${token}`),
  });
  trackPage(created?.id);
  if (!created?.id) throw new Error("missing_test_page");

  await publishPage(created.id, actor.id, pageData(`Published Runtime ${token}`));
  await updatePage(created.id, {
    data: pageData(`Draft Runtime ${token}`),
  });

  return {
    actor,
    page: created,
    slug,
    token,
    publishedHeadline: `Published Runtime ${token}`,
    draftHeadline: `Draft Runtime ${token}`,
  };
};

const insertPublishedLegacyPage = async ({
  title,
  slug,
  data,
  authorId,
}: {
  title: string;
  slug: string;
  data: unknown;
  authorId?: string | null;
}) => {
  const [page] = await db
    .insert(pages)
    .values({
      title,
      slug,
      status: "published",
      authorId: authorId ?? null,
      currentData: data,
      publishedData: data,
    })
    .returning();
  trackPage(page?.id);
  if (!page?.id) throw new Error("missing_test_page");
  return page;
};

const requestPublicPath = (path: string) =>
  handlePublicRequest(
    new Request(`http://public.coderso.test${path}`, {
      headers: {
        "user-agent": "pages-runtime-test",
        "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
      },
    })
  );

testIfDbWithOptions(
  "public page runtime renders published data while preview renders current draft data",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);
    await setTestSetting("site.previewEnabled", true);

    const fixture = await createPublishedPageWithDraft();

    const publicResponse = await requestPublicPath(fixture.slug);
    expect(publicResponse.status).toBe(200);
    const publicHtml = await publicResponse.text();
    expect(publicHtml).toContain(fixture.publishedHeadline);
    expect(publicHtml).not.toContain(fixture.draftHeadline);
    expect(publicHtml).not.toContain("Preview mode");

    const { token } = await createPreviewToken({
      targetType: "page",
      targetId: fixture.page.id,
      ttlMinutes: 5,
    });
    const previewResponse = await requestPublicPath(
      `/preview?type=page&token=${encodeURIComponent(token)}&device=mobile`
    );
    expect(previewResponse.status).toBe(200);
    const previewHtml = await previewResponse.text();
    expect(previewHtml).toContain(fixture.draftHeadline);
    expect(previewHtml).not.toContain(fixture.publishedHeadline);
    expect(previewHtml).toContain("Preview mode");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "public page runtime renders SEO Manager metadata after a cached page save",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 60);
    await setTestSetting("site.contentRoutes", []);

    const fixture = await createPublishedPageWithDraft();
    const initialResponse = await requestPublicPath(fixture.slug);
    expect(initialResponse.status).toBe(200);
    const initialHtml = await initialResponse.text();
    expect(initialHtml).toContain(`<title>Runtime Page ${fixture.token}</title>`);
    expect(initialHtml).toContain(
      `name="description" content="${fixture.publishedHeadline} meta description"`
    );

    const seoTitle = `SEO Manager Runtime Title ${fixture.token}`;
    const seoDescription = `SEO Manager runtime description ${fixture.token} is long enough to render publicly.`;
    await upsertSeoDocument({
      targetType: "page",
      targetId: fixture.page.id,
      slug: fixture.slug,
      title: seoTitle,
      description: seoDescription,
      canonicalUrl: `https://example.test${fixture.slug}`,
      robots: "index,follow",
    });

    const updatedResponse = await requestPublicPath(fixture.slug);
    expect(updatedResponse.status).toBe(200);
    const updatedHtml = await updatedResponse.text();
    expect(updatedHtml).toContain(`<title>${seoTitle}</title>`);
    expect(updatedHtml).toContain(`name="description" content="${seoDescription}"`);
    expect(updatedHtml).toContain(`rel="canonical" href="https://example.test${fixture.slug}"`);
    expect(updatedHtml).toContain('name="robots" content="index,follow"');
    expect(updatedHtml).toContain(fixture.publishedHeadline);
    expect(updatedHtml).not.toContain(fixture.draftHeadline);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDb(
  "public page runtime derives site dev assets from the admin dev url for published and preview pages",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const previousSiteDevUrl = process.env.VITE_SITE_DEV_SERVER_URL;
    const previousAdminDevUrl = process.env.VITE_DEV_SERVER_URL;
    const previousPublicAdminDevUrl = process.env.CODERSO_PUBLIC_VITE_DEV_URL;

    delete process.env.VITE_SITE_DEV_SERVER_URL;
    delete process.env.VITE_DEV_SERVER_URL;
    process.env.CODERSO_PUBLIC_VITE_DEV_URL = "http://127.0.0.1:5173/admin/";

    try {
      const fixture = await createPublishedPageWithDraft();
      const { token } = await createPreviewToken({
        targetType: "page",
        targetId: fixture.page.id,
        ttlMinutes: 5,
      });

      const publicResponse = await requestPublicPath(fixture.slug);
      expect(publicResponse.status).toBe(200);
      const publicHtml = await publicResponse.text();
      expect(publicHtml).toContain("http://127.0.0.1:5174/site/@vite/client");
      expect(publicHtml).toContain("http://127.0.0.1:5174/site/main.ts");

      const previewResponse = await requestPublicPath(
        `/preview?type=page&token=${encodeURIComponent(token)}&device=desktop`
      );
      expect(previewResponse.status).toBe(200);
      const previewHtml = await previewResponse.text();
      expect(previewHtml).toContain("http://127.0.0.1:5174/site/@vite/client");
      expect(previewHtml).toContain("http://127.0.0.1:5174/site/main.ts");
    } finally {
      if (previousSiteDevUrl === undefined) {
        delete process.env.VITE_SITE_DEV_SERVER_URL;
      } else {
        process.env.VITE_SITE_DEV_SERVER_URL = previousSiteDevUrl;
      }
      if (previousAdminDevUrl === undefined) {
        delete process.env.VITE_DEV_SERVER_URL;
      } else {
        process.env.VITE_DEV_SERVER_URL = previousAdminDevUrl;
      }
      if (previousPublicAdminDevUrl === undefined) {
        delete process.env.CODERSO_PUBLIC_VITE_DEV_URL;
      } else {
        process.env.CODERSO_PUBLIC_VITE_DEV_URL = previousPublicAdminDevUrl;
      }
    }
  }
);

testIfDb("public root renders the configured homepage by page id", async () => {
  resetRateLimitBuckets();
  await setTestSetting("site.cacheTtlSeconds", 0);
  await setTestSetting("site.contentRoutes", []);

  const fixture = await createPublishedPageWithDraft();
  await setTestSetting("site.homepageId", fixture.page.id);

  const response = await requestPublicPath("/");
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain(fixture.publishedHeadline);
  expect(html).not.toContain(fixture.draftHeadline);
});

testIfDbWithOptions(
  "public page runtime resets published legacy widget rows to an empty v2 document",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const actor = await createActor();
    const badTemplateId = "missing-template-31-05";
    const token = randomUUID().slice(0, 8);
    const slug = `/legacy-reset-runtime-${token}`;
    await insertPublishedLegacyPage({
      title: `Legacy Reset Runtime ${token}`,
      slug,
      authorId: actor.id,
      data: {
        blocks: [
          {
            id: "legacy-template-section-runtime",
            type: "template-section",
            variant: "default",
            data: {
              templateId: badTemplateId,
              templateName: badTemplateId,
            },
          },
        ],
        settings: {
          template: "landing",
          showInNav: true,
        },
        seo: {
          description: `Legacy reset runtime ${token}`,
        },
      },
    });

    const response = await requestPublicPath(slug);
    expect(response.status).toBe(200);
    const html = await response.text();

    expect(html).toContain('data-page-v2="true"');
    expect(html).toContain("This page has no content yet.");
    expect(html).not.toContain("data-template-section-resolution");
    expect(html).not.toContain(badTemplateId);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDb(
  "public page runtime rejects drafts and published rows without published data",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const draft = await createPage({
      title: "Draft Runtime Page",
      slug: `/runtime-draft-${randomUUID()}`,
      data: pageData("Draft-only Runtime"),
    });
    trackPage(draft?.id);
    const draftResponse = await requestPublicPath(draft.slug);
    expect(draftResponse.status).toBe(404);

    const [publishedWithoutData] = await db
      .insert(pages)
      .values({
        title: "Broken Published Runtime Page",
        slug: `/runtime-broken-${randomUUID()}`,
        status: "published",
        currentData: pageData("Broken Runtime"),
        publishedData: null,
      })
      .returning();
    trackPage(publishedWithoutData?.id);
    if (!publishedWithoutData) throw new Error("missing_broken_page");

    const brokenResponse = await requestPublicPath(publishedWithoutData.slug);
    expect(brokenResponse.status).toBe(404);
  }
);

testIfDb(
  "page preview runtime rejects missing, invalid, expired, and disabled tokens",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.previewEnabled", true);
    await setTestSetting("site.cacheTtlSeconds", 0);

    const fixture = await createPublishedPageWithDraft();

    const missingToken = await requestPublicPath("/preview?type=page");
    expect(missingToken.status).toBe(404);

    const invalidType = await requestPublicPath("/preview?type=unknown&token=test");
    expect(invalidType.status).toBe(404);

    const expired = await createPreviewToken({
      targetType: "page",
      targetId: fixture.page.id,
      ttlMinutes: -1,
    });
    const expiredResponse = await requestPublicPath(
      `/preview?type=page&token=${encodeURIComponent(expired.token)}`
    );
    expect(expiredResponse.status).toBe(410);
    expect(await expiredResponse.text()).toBe("Preview expired");

    const valid = await createPreviewToken({
      targetType: "page",
      targetId: fixture.page.id,
      ttlMinutes: 5,
    });
    await setTestSetting("site.previewEnabled", false);
    const disabledResponse = await requestPublicPath(
      `/preview?type=page&token=${encodeURIComponent(valid.token)}`
    );
    expect(disabledResponse.status).toBe(404);
  }
);

testIfDb("content preview renders generic entries whose type slug is post", async () => {
  resetRateLimitBuckets();
  await setTestSetting("site.previewEnabled", true);
  await setTestSetting("site.cacheTtlSeconds", 0);

  const [existingPostType] = await db
    .select()
    .from(contentTypes)
    .where(eq(contentTypes.slug, "post"));
  const contentType =
    existingPostType ??
    (await createContentType({
      name: "Generic Post Entries",
      slug: "post",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: { title: { type: "string" } },
      },
    }));
  if (!existingPostType) trackContentType(contentType.id);

  const entrySlug = `generic-preview-${randomUUID()}`;
  const [entry] = await db
    .insert(contentEntries)
    .values({
      typeId: contentType.id,
      title: `Generic Preview ${randomUUID()}`,
      slug: entrySlug,
      status: "draft",
      data: { title: "Generic preview body" },
    })
    .returning();
  trackContentEntry(entry?.id);
  if (!entry?.id) throw new Error("missing_content_preview_entry");

  const { token } = await createPreviewToken({
    targetType: "content",
    targetId: entry.id,
    ttlMinutes: 5,
  });

  const response = await requestPublicPath(
    `/preview?type=content&token=${encodeURIComponent(token)}&contentType=post&slug=${encodeURIComponent(entry.slug)}&device=desktop`
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toContain(entry.title);
});

testIfDb(
  "content route match takes precedence over a page slug until routes are cleared",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    const fixture = await createPublishedPageWithDraft();
    const contentRoutes: ContentRouteSetting[] = [
      {
        type: `missing-type-${fixture.token}`,
        listPath: fixture.slug,
        detailPath: `${fixture.slug}/:slug`,
        enabled: true,
      },
    ];

    await setTestSetting("site.contentRoutes", contentRoutes);
    const shadowedResponse = await requestPublicPath(fixture.slug);
    expect(shadowedResponse.status).toBe(404);

    await setTestSetting("site.contentRoutes", []);
    const pageResponse = await requestPublicPath(fixture.slug);
    expect(pageResponse.status).toBe(200);
    expect(await pageResponse.text()).toContain(fixture.publishedHeadline);
  }
);

testIfDbWithOptions(
  "public page v2 runtime caches static atomic section HTML",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 60);
    await setTestSetting("site.contentRoutes", []);

    const fixture = await createPublishedPageWithDraft();
    const firstResponse = await requestPublicPath(fixture.slug);
    expect(firstResponse.status).toBe(200);
    const firstHtml = await firstResponse.text();
    expect(firstHtml).toContain('data-page-v2="true"');
    expect(firstHtml).toContain(fixture.publishedHeadline);
    expect(getSiteCacheStats().size).toBe(1);

    const secondResponse = await requestPublicPath(fixture.slug);
    expect(secondResponse.status).toBe(200);
    expect(await secondResponse.text()).toBe(firstHtml);
    expect(getSiteCacheStats().size).toBe(1);
  },
  { timeout: dbRuntimeTimeout }
);
