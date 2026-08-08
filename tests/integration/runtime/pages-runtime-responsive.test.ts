import { expect } from "bun:test";
import { randomUUID } from "node:crypto";

import { createPage, publishPage } from "../../../core/services/pages/pageService";
import { createPreviewToken } from "../../../core/services/pages/previewService";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { getSiteCacheStats } from "../../../core/site/cache/siteCache";
import {
  createActor,
  createPublishedPageWithDraft,
  dbRuntimeTimeout,
  requestPublicPath,
  responsivePageData,
  responsiveSectionContentSelector,
  setTestSetting,
  testIfDbWithOptions,
  trackPage,
} from "./pages-runtime-test-support";

testIfDbWithOptions(
  "public page runtime emits scoped responsive media rules inside cached HTML while preview stays flattened",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 60);
    await setTestSetting("site.contentRoutes", []);
    await setTestSetting("site.previewEnabled", true);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const slug = `/runtime-responsive-${token}`;
    const data = responsivePageData(token, {
      tablet: { layout: { maxWidth: 640 } },
      mobile: { layout: { maxWidth: 360, stackVertical: true } },
    });
    const created = await createPage({
      title: `Runtime Responsive ${token}`,
      slug,
      authorId: actor.id,
      data,
    });
    trackPage(created?.id);
    if (!created?.id) throw new Error("missing_responsive_page");
    await publishPage(created.id, actor.id, data);

    const publicResponse = await requestPublicPath(slug);
    expect(publicResponse.status).toBe(200);
    const publicHtml = await publicResponse.text();

    // Base markup stays desktop-resolved.
    expect(publicHtml).toContain("max-width:1080px");
    // Dedicated responsive style element with both scoped @media blocks.
    expect(publicHtml).toContain('<style data-page-responsive="true">');
    expect(publicHtml).toContain("@media (min-width: 640px) and (max-width: 1023px){");
    expect(publicHtml).toContain(
      `${responsiveSectionContentSelector(token)}{max-width:640px !important}`
    );
    expect(publicHtml).toContain("@media (max-width: 639px){");
    // The mobile delta carries the TASK-425 stackVertical single-column rule
    // next to the maxWidth override, sorted by property.
    expect(publicHtml).toContain(
      `${responsiveSectionContentSelector(token)}{grid-template-columns:repeat(1, minmax(0, 1fr)) !important;max-width:360px !important}`
    );

    // The CSS lives inside the cached page HTML: one device-agnostic entry.
    expect(getSiteCacheStats().size).toBe(1);
    const cachedResponse = await requestPublicPath(slug);
    expect(cachedResponse.status).toBe(200);
    expect(await cachedResponse.text()).toBe(publicHtml);
    expect(getSiteCacheStats().size).toBe(1);

    // Explicit previewDevice keeps flattened single-breakpoint semantics.
    const { token: previewToken } = await createPreviewToken({
      targetType: "page",
      targetId: created.id,
      ttlMinutes: 5,
    });
    const previewResponse = await requestPublicPath(
      `/preview?type=page&token=${encodeURIComponent(previewToken)}&device=mobile`
    );
    expect(previewResponse.status).toBe(200);
    const previewHtml = await previewResponse.text();
    expect(previewHtml).toContain("Preview mode");
    expect(previewHtml).not.toContain("data-page-responsive");
    expect(previewHtml).not.toContain(
      `${responsiveSectionContentSelector(token)}{max-width:360px !important}`
    );
    // The mobile override is flattened into the markup instead.
    expect(previewHtml).toContain("max-width:360px");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "public page runtime emits no responsive style element for override-free documents",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const slug = `/runtime-static-${token}`;
    const data = responsivePageData(token, {});
    const created = await createPage({
      title: `Runtime Static ${token}`,
      slug,
      authorId: actor.id,
      data,
    });
    trackPage(created?.id);
    if (!created?.id) throw new Error("missing_static_page");
    await publishPage(created.id, actor.id, data);

    const response = await requestPublicPath(slug);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`Responsive runtime ${token}`);
    expect(html).not.toContain("data-page-responsive");
    expect(html).not.toContain("@media (min-width: 640px) and (max-width: 1023px)");
    expect(html).not.toContain(`${responsiveSectionContentSelector(token)}{`);
  },
  { timeout: dbRuntimeTimeout }
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
