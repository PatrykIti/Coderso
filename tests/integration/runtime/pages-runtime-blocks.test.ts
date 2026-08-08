import { expect } from "bun:test";
import { randomUUID } from "node:crypto";

import { createPage, publishPage, updatePage } from "../../../core/services/pages/pageService";
import { createPreviewToken } from "../../../core/services/pages/previewService";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import {
  createActor,
  dbRuntimeTimeout,
  insertablePageBlockTypes,
  nestedPageData,
  requestPublicPath,
  runtimeParityPageData,
  setTestSetting,
  task538CustomSvgBoundaryTag,
  task538CustomSvgPageData,
  task538CustomSvgRootTag,
  task538RuntimeBlockSlice,
  testIfDbWithOptions,
  trackPage,
} from "./pages-runtime-test-support";

testIfDbWithOptions(
  "TASK-538 public and preview page runtime preserve custom SVG isolation",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);
    await setTestSetting("site.previewEnabled", true);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const slug = `/runtime-task538-svg-${token}`;
    const draftData = task538CustomSvgPageData(token, "draft");
    const publishedData = task538CustomSvgPageData(token, "published");
    const created = await createPage({
      title: `TASK-538 SVG Runtime ${token}`,
      slug,
      authorId: actor.id,
      data: draftData,
    });
    trackPage(created?.id);
    if (!created?.id) throw new Error("missing_task538_svg_page");

    await publishPage(created.id, actor.id, publishedData);
    await updatePage(created.id, { data: draftData });

    const assertIsolatedSvg = (html: string, phase: "published" | "draft") => {
      const label = phase === "published" ? "Published" : "Draft";
      const root = task538CustomSvgRootTag(html);
      const boundary = task538CustomSvgBoundaryTag(html);
      const invalidBlock = task538RuntimeBlockSlice(
        html,
        `task538-invalid-${phase}-${token}`,
        `task538-valid-${phase}-${token}`
      );

      expect(html).toContain(`aria-label="${label} TASK-538 SVG ${token}"`);
      expect(html).toContain(`${label} TASK-538 SVG ${token} &amp; runtime`);
      expect(html).toContain(`<desc>${label} TASK-538 description ${token}</desc>`);
      expect(html).toContain(`<linearGradient`);
      expect(html).toContain(`id="task538-gradient-${phase}-${token}"`);
      expect(html).toContain(`fill="url(#task538-gradient-${phase}-${token})"`);
      expect(html).toContain(`xlink:href="#task538-shape-${phase}-${token}"`);
      expect(html).toContain('transform="translate(2 3)"');
      expect(html).toContain('transform="translate(1 1)"');
      expect(html).not.toContain(`task538-${phase}-root-${token}`);
      expect(html).not.toContain(`task538-${phase}-nested-${token}`);
      expect(html).not.toContain(`--task538-${phase}-root-style-${token}`);
      expect(html).not.toContain(`--task538-${phase}-nested-style-${token}`);
      expect(html).not.toContain("translate(538 538)");

      expect(root).toContain('width="100%"');
      expect(root).not.toContain(' x="');
      expect(root).not.toContain(' y="');
      expect(root).not.toContain(' height="');
      expect(root).not.toContain(' transform="');
      expect(root).toContain(
        'style="display:block;inline-size:100%;max-inline-size:100%;block-size:auto;max-block-size:1024px;aspect-ratio:2;overflow:hidden;pointer-events:none"'
      );
      expect(boundary).toContain(
        'style="display:block;inline-size:100%;max-inline-size:100%;max-block-size:1024px;overflow:hidden;contain:layout paint;pointer-events:none"'
      );

      expect(invalidBlock).toContain("▢");
      expect(invalidBlock).not.toContain("<svg");
      expect(invalidBlock).not.toContain("data-custom-svg-boundary");
    };

    const publicResponse = await requestPublicPath(slug);
    expect(publicResponse.status).toBe(200);
    const publicHtml = await publicResponse.text();
    assertIsolatedSvg(publicHtml, "published");
    expect(publicHtml).not.toContain(`Draft TASK-538 SVG ${token}`);
    expect(publicHtml).not.toContain("Preview mode");

    const { token: previewToken } = await createPreviewToken({
      targetType: "page",
      targetId: created.id,
      ttlMinutes: 5,
    });
    const previewResponse = await requestPublicPath(
      `/preview?type=page&token=${encodeURIComponent(previewToken)}&device=desktop`
    );
    expect(previewResponse.status).toBe(200);
    const previewHtml = await previewResponse.text();
    assertIsolatedSvg(previewHtml, "draft");
    expect(previewHtml).not.toContain(`Published TASK-538 SVG ${token}`);
    expect(previewHtml).toContain("Preview mode");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "public and preview page runtime render nested layout slots recursively",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);
    await setTestSetting("site.previewEnabled", true);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const slug = `/runtime-nested-${token}`;
    const created = await createPage({
      title: `Nested Runtime ${token}`,
      slug,
      authorId: actor.id,
      data: nestedPageData(token, "draft"),
    });
    trackPage(created?.id);
    if (!created?.id) throw new Error("missing_nested_page");

    await publishPage(created.id, actor.id, nestedPageData(token, "published"));
    await updatePage(created.id, {
      data: nestedPageData(token, "draft"),
    });

    const publicResponse = await requestPublicPath(slug);
    expect(publicResponse.status).toBe(200);
    const publicHtml = await publicResponse.text();
    expect(publicHtml).toContain(`Published nested desktop ${token}`);
    expect(publicHtml).not.toContain(`Published nested mobile ${token}`);
    expect(publicHtml).not.toContain(`Draft nested desktop ${token}`);
    expect(publicHtml).not.toContain(`Published hidden nested ${token}`);
    expect(publicHtml).not.toContain(`Published dormant nested ${token}`);
    expect(publicHtml).toContain(`data-block-id="columns-published-${token}"`);
    expect(publicHtml).toContain('data-page-layout-block="columns"');
    expect(publicHtml).toContain('data-page-block-slot="column:1"');
    expect(publicHtml).toContain('data-page-block-slot="column:2"');
    expect(publicHtml).not.toContain('data-page-block-slot="column:3"');

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
    expect(previewHtml).toContain(`Draft nested mobile ${token}`);
    expect(previewHtml).not.toContain(`Draft nested desktop ${token}`);
    expect(previewHtml).not.toContain(`Published nested desktop ${token}`);
    expect(previewHtml).not.toContain(`Draft hidden nested ${token}`);
    expect(previewHtml).not.toContain(`Draft dormant nested ${token}`);
    expect(previewHtml).toContain("Preview mode");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "public page runtime renders every insertable block plus emitted gallery and fail-closed data-bound errors",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const slug = `/runtime-parity-${token}`;
    const created = await createPage({
      title: `Runtime Parity ${token}`,
      slug,
      authorId: actor.id,
      data: runtimeParityPageData(token),
    });
    trackPage(created?.id);
    if (!created?.id) throw new Error("missing_runtime_parity_page");

    await publishPage(created.id, actor.id, runtimeParityPageData(token));

    const response = await requestPublicPath(slug);
    expect(response.status).toBe(200);
    const html = await response.text();

    for (const type of insertablePageBlockTypes) {
      expect(html).toContain(`data-page-block="${type}"`);
    }
    expect(html).toContain(`Runtime parity heading ${token}`);
    expect(html).toContain(`Runtime badge ${token}`);
    expect(html).toContain(`Runtime CTA ${token}`);
    expect(html).toContain(`https://cdn.example.test/runtime-image-${token}.jpg`);
    expect(html).toContain(`https://cdn.example.test/runtime-video-${token}.mp4`);
    expect(html).toContain(`Runtime list item ${token}`);
    expect(html).toContain(`Runtime card ${token}`);
    expect(html).toContain(`Runtime metric ${token}`);
    expect(html).toContain(`Runtime quote ${token}`);
    expect(html).toContain(`Container child ${token}`);
    expect(html).toContain(`Column child ${token}`);
    expect(html).toContain(`Group button ${token}`);
    expect(html).toContain('data-page-gallery="true"');
    expect(html).toContain(`Runtime gallery caption ${token}`);
    expect(html).toContain(`https://cdn.example.test/runtime-gallery-${token}.jpg`);
    expect(html).toContain('data-page-block-inert="collection"');
    expect(html).toContain('data-page-block-inert="filters"');
    expect(html).toContain('data-page-block-inert="embed"');
    expect(html).toContain('data-form-embed-runtime-boundary="error"');
    expect(html).toContain("This form is not available right now.");
    expect(html).not.toContain("ct-private");
    expect(html).not.toContain("query-private");
    expect(html).not.toContain("form-private");
    // The analytics tracking beacon (TASK-483) is a legitimate first-party inline <script>
    // that the public render injects when analytics is enabled. Exclude it, then assert NO
    // OTHER inline <script> leaked (the XSS / injected-script hygiene guard) — so this
    // block-render test is deterministic whether or not ANALYTICS_BEACON_NONCE_SECRET is set.
    const htmlWithoutAnalyticsBeacon = html.replace(
      /<script>[\s\S]*?_analytics\/collect[\s\S]*?<\/script>/g,
      ""
    );
    expect(htmlWithoutAnalyticsBeacon).not.toContain("<script>");
    expect(html).not.toContain("javascript:alert");
  },
  { timeout: dbRuntimeTimeout }
);
