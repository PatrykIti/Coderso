import { expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries, contentTypes, pages } from "../../../core/db/schema";
import { createContentType } from "../../../core/services/content/typeService";
import { createPage } from "../../../core/services/pages/pageService";
import { createPreviewToken } from "../../../core/services/pages/previewService";
import { upsertSeoDocument } from "../../../core/services/seo/seoService";
import type { ContentRouteSetting } from "../../../core/services/settings/settingsService";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import {
  createActor,
  createPublishedPageWithDraft,
  dbRuntimeTimeout,
  insertPublishedLegacyPage,
  pageData,
  requestPublicPath,
  setTestSetting,
  testIfDb,
  testIfDbWithOptions,
  trackContentEntry,
  trackContentType,
  trackPage,
} from "./pages-runtime-test-support";

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
    expect(publicHtml).toContain('data-page-section="hero"');
    expect(publicHtml).toContain('data-page-variant="centered"');
    expect(publicHtml).toContain('data-page-section-template="hero"');
    expect(publicHtml).toContain("page-section-template-hero-centered");
    expect(publicHtml).toContain('data-page-block="heading"');
    expect(publicHtml).toContain(`data-block-id="heading-published-runtime-${fixture.token}"`);
    expect(publicHtml).toContain("--coderso-block-text:#123456");
    expect(publicHtml).toContain("background-color:#fef3c7");
    expect(publicHtml).not.toContain(`${fixture.publishedHeadline} hidden body`);
    expect(publicHtml).not.toContain(`data-block-id="hidden-published-runtime-${fixture.token}"`);
    expect(publicHtml).toContain(`data-section-id="sec-published-runtime-${fixture.token}"`);
    expect(publicHtml).toMatch(
      /style="[^"]*--coderso-section-accent:#0d9488[^"]*padding:72px 40px 72px 40px[^"]*max-width:1080px/
    );

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

testIfDb("published static page wins an exact content-list route overlap", async () => {
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
  const pageResponse = await requestPublicPath(fixture.slug);

  expect(pageResponse.status).toBe(200);
  const html = await pageResponse.text();
  expect(html).toContain(fixture.publishedHeadline);
  expect(html).not.toContain(fixture.draftHeadline);
});

testIfDb("dynamic content-detail route remains content-owned over an exact page slug", async () => {
  resetRateLimitBuckets();
  await setTestSetting("site.cacheTtlSeconds", 0);
  const fixture = await createPublishedPageWithDraft();
  const detailSlug = `${fixture.slug}/authored-detail`;
  const authoredHeadline = `Authored detail ${fixture.token}`;
  await insertPublishedLegacyPage({
    title: authoredHeadline,
    slug: detailSlug,
    authorId: fixture.actor.id,
    data: pageData(authoredHeadline),
  });
  const contentRoutes: ContentRouteSetting[] = [
    {
      type: `missing-type-${fixture.token}`,
      listPath: fixture.slug,
      detailPath: `${fixture.slug}/:slug`,
      enabled: true,
    },
  ];

  await setTestSetting("site.contentRoutes", contentRoutes);
  const detailResponse = await requestPublicPath(detailSlug);

  expect(detailResponse.status).toBe(404);
  expect(await detailResponse.text()).not.toContain(authoredHeadline);
});
