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
  users,
} from "../../../core/db/schema";
import { createEntry } from "../../../core/services/content/entryService";
import { createContentType } from "../../../core/services/content/typeService";
import {
  createPage,
  publishPage,
  updatePage,
} from "../../../core/services/pages/pageService";
import { createPreviewToken } from "../../../core/services/pages/previewService";
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
  blocks: [
    {
      id: `hero-${headline.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      type: "hero",
      variant: "centered",
      data: {
        headline,
        subhead: `${headline} subhead`,
        body: `${headline} body`,
      },
    },
  ],
  settings: {
    template: "landing",
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

const requestPublicPath = (path: string) =>
  handlePublicRequest(
    new Request(`http://public.nextless.test${path}`, {
      headers: {
        "user-agent": "pages-runtime-test",
        "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
      },
    })
  );

testIfDb("public page runtime renders published data while preview renders current draft data", async () => {
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
});

testIfDb("public page runtime rejects drafts and published rows without published data", async () => {
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
});

testIfDb("page preview runtime rejects missing, invalid, expired, and disabled tokens", async () => {
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
});

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

testIfDb("content route match takes precedence over a page slug until routes are cleared", async () => {
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
});
