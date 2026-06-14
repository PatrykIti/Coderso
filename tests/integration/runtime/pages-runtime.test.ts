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
import { createEntry } from "../../../core/services/content/entryService";
import { createContentType } from "../../../core/services/content/typeService";
import {
  pageBlockCapabilities,
  pageBlockTypes,
  type PageBlockType,
} from "../../../core/services/pages/pageDocumentV2";
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
          style: {
            width: "full",
            align: "center",
            textColor: "#123456",
            background: "#fef3c7",
            backgroundType: "color",
            opacity: 0.9,
            radius: 12,
            shadow: "sm",
            borderColor: "#cbd5e1",
            padding: { top: 8, right: 12, bottom: 8, left: 12 },
            margin: { bottom: 6 },
          },
          visibility: { visible: true },
        },
        {
          id: `text-${headline.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          type: "text",
          props: { text: `${headline} body`, format: "plain", align: "center" },
          visibility: { visible: true },
        },
        {
          id: `hidden-${headline.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          type: "text",
          props: { text: `${headline} hidden body`, format: "plain", align: "left" },
          visibility: { visible: false },
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

const nestedPageData = (token: string, label: "published" | "draft") => {
  const titleLabel = label === "published" ? "Published" : "Draft";
  return {
    schemaVersion: 2,
    breakpoints: ["desktop", "tablet", "mobile"],
    sections: [
      {
        id: `sec-nested-${label}-${token}`,
        type: "content",
        name: "Nested Runtime",
        variant: "default",
        layout: { columns: 1, align: "stretch", justify: "start", maxWidth: 1080 },
        style: {
          background: "#ffffff",
          backgroundType: "color",
          backgroundImage: null,
          accent: "#0d9488",
          radius: 0,
          shadow: "none",
        },
        spacing: {
          paddingTop: 48,
          paddingBottom: 48,
          paddingLeft: 32,
          paddingRight: 32,
          gap: 24,
        },
        visibility: {
          visible: true,
          authOnly: false,
          anchor: "nested-runtime",
          startsAt: null,
          endsAt: null,
        },
        responsive: {},
        blocks: [
          {
            id: `columns-${label}-${token}`,
            type: "columns",
            props: { count: 2, gap: 24, distribution: "equal" },
            style: { width: "full", align: "center" },
            visibility: { visible: true },
            slots: {
              "column:1": [
                {
                  id: `nested-heading-${label}-${token}`,
                  type: "heading",
                  props: {
                    text: `${titleLabel} nested desktop ${token}`,
                    level: "h2",
                    align: "left",
                  },
                  visibility: { visible: true },
                  responsive: {
                    mobile: {
                      props: { text: `${titleLabel} nested mobile ${token}` },
                    },
                  },
                },
              ],
              "column:2": [
                {
                  id: `nested-hidden-${label}-${token}`,
                  type: "text",
                  props: {
                    text: `${titleLabel} hidden nested ${token}`,
                    format: "plain",
                    align: "left",
                  },
                  visibility: { visible: false },
                },
              ],
              "column:3": [
                {
                  id: `nested-dormant-${label}-${token}`,
                  type: "heading",
                  props: {
                    text: `${titleLabel} dormant nested ${token}`,
                    level: "h2",
                    align: "left",
                  },
                  visibility: { visible: true },
                },
              ],
            },
          },
        ],
      },
    ],
    settings: {
      template: "page-v2",
      showInNav: true,
    },
    seo: {
      description: `${titleLabel} nested runtime ${token}`,
    },
  };
};

const insertablePageBlockTypes = pageBlockTypes.filter(
  (type): type is PageBlockType => pageBlockCapabilities[type].insertable
);

const responsivePageData = (token: string, responsive: Record<string, unknown>) => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  sections: [
    {
      id: `sec-responsive-${token}`,
      type: "content",
      name: "Responsive Runtime",
      variant: "default",
      layout: { columns: 1, align: "stretch", justify: "start", maxWidth: 1080 },
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
      },
      spacing: {
        paddingTop: 48,
        paddingBottom: 48,
        paddingLeft: 32,
        paddingRight: 32,
        gap: 24,
      },
      visibility: {
        visible: true,
        authOnly: false,
        anchor: "responsive-runtime",
        startsAt: null,
        endsAt: null,
      },
      responsive,
      blocks: [
        {
          id: `responsive-heading-${token}`,
          type: "heading",
          props: { text: `Responsive runtime ${token}`, level: "h2", align: "left" },
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
    description: `Responsive runtime ${token}`,
  },
});

const responsiveSectionContentSelector = (token: string) =>
  `[data-section-id="sec-responsive-${token}"] > [data-page-section-content="true"]`;

const runtimeParityPageData = (token: string) => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  sections: [
    {
      id: `sec-runtime-parity-${token}`,
      type: "content",
      name: "Runtime Parity",
      variant: "default",
      layout: { columns: 1, align: "stretch", justify: "start", maxWidth: 1080 },
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
      },
      spacing: {
        paddingTop: 48,
        paddingBottom: 48,
        paddingLeft: 32,
        paddingRight: 32,
        gap: 24,
      },
      visibility: {
        visible: true,
        authOnly: false,
        anchor: "runtime-parity",
        startsAt: null,
        endsAt: null,
      },
      responsive: {},
      blocks: [
        {
          id: `parity-heading-${token}`,
          type: "heading",
          props: { text: `Runtime parity heading ${token}`, level: "h2", align: "left" },
          visibility: { visible: true },
        },
        {
          id: `parity-text-${token}`,
          type: "text",
          props: { text: `Runtime parity copy ${token}`, format: "plain", align: "left" },
          visibility: { visible: true },
        },
        {
          id: `parity-button-${token}`,
          type: "button",
          props: { label: `Runtime CTA ${token}`, href: "/contact", target: "self" },
          visibility: { visible: true },
        },
        {
          id: `parity-image-${token}`,
          type: "image",
          props: {
            src: `https://cdn.example.test/runtime-image-${token}.jpg`,
            alt: "Runtime image",
            caption: `Runtime image caption ${token}`,
            fit: "cover",
          },
          visibility: { visible: true },
        },
        {
          id: `parity-video-${token}`,
          type: "video",
          props: {
            src: `https://cdn.example.test/runtime-video-${token}.mp4`,
            title: "Runtime video",
            autoplay: false,
            muted: true,
          },
          visibility: { visible: true },
        },
        {
          id: `parity-list-${token}`,
          type: "list",
          props: {
            items: [
              `Runtime list item ${token}`,
              { label: "Runtime linked item", href: "/linked" },
            ],
            ordered: false,
          },
          visibility: { visible: true },
        },
        {
          id: `parity-card-${token}`,
          type: "card",
          props: { title: `Runtime card ${token}`, text: "Card body", image: null, href: null },
          visibility: { visible: true },
        },
        {
          id: `parity-divider-${token}`,
          type: "divider",
          props: { tone: "neutral", thickness: 2 },
          visibility: { visible: true },
        },
        {
          id: `parity-spacer-${token}`,
          type: "spacer",
          props: { size: 16 },
          visibility: { visible: true },
        },
        {
          id: `parity-statistic-${token}`,
          type: "statistic",
          props: { value: "42", label: `Runtime metric ${token}`, caption: "Measured" },
          visibility: { visible: true },
        },
        {
          id: `parity-quote-${token}`,
          type: "quote",
          props: { text: `Runtime quote ${token}`, cite: "Coderso" },
          visibility: { visible: true },
        },
        {
          id: `parity-container-${token}`,
          type: "container",
          props: {},
          visibility: { visible: true },
          slots: {
            children: [
              {
                id: `parity-container-text-${token}`,
                type: "text",
                props: {
                  text: `Container child ${token}`,
                  format: "plain",
                  align: "left",
                },
                visibility: { visible: true },
              },
            ],
          },
        },
        {
          id: `parity-columns-${token}`,
          type: "columns",
          props: { count: 2, gap: 24, distribution: "equal" },
          visibility: { visible: true },
          slots: {
            "column:1": [
              {
                id: `parity-column-heading-${token}`,
                type: "heading",
                props: { text: `Column child ${token}`, level: "h3", align: "left" },
                visibility: { visible: true },
              },
            ],
            "column:2": [
              {
                id: `parity-column-text-${token}`,
                type: "text",
                props: { text: `Second column ${token}`, format: "plain", align: "left" },
                visibility: { visible: true },
              },
            ],
          },
        },
        {
          id: `parity-group-${token}`,
          type: "group",
          props: { direction: "row", wrap: true, gap: 12 },
          visibility: { visible: true },
          slots: {
            children: [
              {
                id: `parity-group-button-${token}`,
                type: "button",
                props: { label: `Group button ${token}`, href: "/group", target: "self" },
                visibility: { visible: true },
              },
            ],
          },
        },
        {
          id: `parity-gallery-${token}`,
          type: "gallery",
          props: {
            layout: "grid",
            items: [
              {
                src: `https://cdn.example.test/runtime-gallery-${token}.jpg`,
                alt: "Runtime gallery",
                caption: `Runtime gallery caption ${token}`,
              },
            ],
          },
          visibility: { visible: true },
        },
        {
          id: `parity-collection-${token}`,
          type: "collection",
          props: { contentTypeId: "ct-private", queryId: "query-private", limit: 6 },
          visibility: { visible: true },
        },
        {
          // TASK-459-02: a dangling saved query renders the fail-closed inert
          // placeholder (never a fake facet form, never the query id).
          id: `parity-filters-${token}`,
          type: "filters",
          props: { queryId: "query-private", facets: [] },
          visibility: { visible: true },
        },
        {
          id: `parity-form-${token}`,
          type: "form",
          props: { formId: "form-private", title: "Runtime form" },
          visibility: { visible: true },
        },
        {
          id: `parity-embed-${token}`,
          type: "embed",
          props: {
            html: "<script>alert('runtime')</script>",
            url: "javascript:alert('runtime')",
            provider: "custom",
          },
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
    description: `Runtime parity ${token}`,
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
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("javascript:alert");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "public page runtime resolves collection blocks with published-only content",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 60);
    await setTestSetting("site.contentRoutes", []);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const contentType = await createContentType({
      name: `Runtime Collection ${token}`,
      slug: `runtime-collection-${token}`,
      status: "published",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["summary"],
        properties: {
          summary: { type: "string" },
        },
      },
    });
    trackContentType(contentType.id);

    const publishedEntry = await createEntry(contentType.id, {
      title: `Published collection item ${token}`,
      slug: `published-collection-item-${token}`,
      authorId: actor.id,
      data: { summary: `Published summary ${token}` },
    });
    trackContentEntry(publishedEntry?.id);
    if (!publishedEntry?.id) throw new Error("missing_published_entry");
    await db
      .update(contentEntries)
      .set({ status: "published", publishedAt: new Date("2026-06-01T10:00:00.000Z") })
      .where(eq(contentEntries.id, publishedEntry.id));

    const draftEntry = await createEntry(contentType.id, {
      title: `Draft collection item ${token}`,
      slug: `draft-collection-item-${token}`,
      authorId: actor.id,
      data: { summary: `Draft summary ${token}` },
    });
    trackContentEntry(draftEntry?.id);
    if (!draftEntry?.id) throw new Error("missing_draft_entry");

    const slug = `/runtime-collection-page-${token}`;
    const pageDocument = {
      ...pageData(`Runtime Collection Page ${token}`),
      sections: [
        {
          ...pageData(`Runtime Collection Page ${token}`).sections[0]!,
          blocks: [
            {
              id: `runtime-collection-block-${token}`,
              type: "collection",
              props: {
                contentTypeId: contentType.id,
                limit: 6,
              },
              visibility: { visible: true },
            },
          ],
        },
      ],
    };
    const created = await createPage({
      title: `Runtime Collection Page ${token}`,
      slug,
      authorId: actor.id,
      data: pageDocument,
    });
    trackPage(created?.id);
    if (!created?.id) throw new Error("missing_collection_page");
    await publishPage(created.id, actor.id, pageDocument);

    const firstResponse = await requestPublicPath(slug);
    expect(firstResponse.status).toBe(200);
    const firstHtml = await firstResponse.text();
    expect(firstHtml).toContain('data-content-list-state="ready"');
    expect(firstHtml).toContain(`Published collection item ${token}`);
    expect(firstHtml).toContain(`Published summary ${token}`);
    expect(firstHtml).not.toContain(`Draft collection item ${token}`);
    expect(firstHtml).not.toContain(`Draft summary ${token}`);

    const statsAfterFirstRender = getSiteCacheStats();
    expect(statsAfterFirstRender.size).toBe(1);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "public v2 filters block renders facets, applies lq filters and sort, and ships the runtime script only when needed (TASK-459-02)",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 60);
    await setTestSetting("site.contentRoutes", []);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const contentType = await createContentType({
      name: `Runtime Filters ${token}`,
      slug: `runtime-filters-${token}`,
      status: "published",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["summary"],
        properties: {
          summary: { type: "string" },
          rooms: { type: "number" },
        },
      },
    });
    trackContentType(contentType.id);

    const seedEntry = async (title: string, slug: string, rooms: number) => {
      const entry = await createEntry(contentType.id, {
        title,
        slug,
        authorId: actor.id,
        data: { summary: `${title} summary`, rooms },
      });
      trackContentEntry(entry?.id);
      if (!entry?.id) throw new Error("missing_filters_entry");
      await db
        .update(contentEntries)
        .set({ status: "published", publishedAt: new Date("2026-06-01T10:00:00.000Z") })
        .where(eq(contentEntries.id, entry.id));
      return entry;
    };
    await seedEntry(`Alpha filtered ${token}`, `alpha-filtered-${token}`, 3);
    await seedEntry(`Beta filtered ${token}`, `beta-filtered-${token}`, 2);

    const { createListingQuery, deleteListingQuery } =
      await import("../../../core/services/content/listingQueriesService");
    const listingQuery = await createListingQuery({
      name: `Runtime filters query ${token}`,
      query: {
        source: "entries",
        sourceConfig: { contentTypeId: contentType.id },
        filters: [],
        sort: [{ field: "title", dir: "asc" }],
        pagination: { limit: 20, offset: 0 },
        fields: ["id", "title", "slug", "status", "publishedAt", "updatedAt"],
      },
    });

    try {
      const queryId = listingQuery.id;
      const buildPage = (headline: string, blocks: unknown[]) => ({
        ...pageData(headline),
        sections: [
          {
            ...pageData(headline).sections[0]!,
            blocks,
          },
        ],
      });

      const filtersPageData = buildPage(`Runtime Filters Page ${token}`, [
        {
          id: `runtime-filters-block-${token}`,
          type: "filters",
          props: {
            queryId,
            autoApply: true,
            showSearch: true,
            showCount: true,
            facets: [
              {
                id: "rooms",
                kind: "checkbox",
                label: "Rooms",
                field: "data.rooms",
                op: "in",
                options: [
                  { value: "2", label: "Two rooms" },
                  { value: "3", label: "Three rooms" },
                ],
              },
              {
                id: "sort",
                kind: "sort",
                label: "Sort",
                sortOptions: [
                  {
                    value: "data.rooms:asc",
                    label: "Rooms ascending",
                    field: "data.rooms",
                    dir: "asc",
                  },
                  {
                    value: "data.rooms:desc",
                    label: "Rooms descending",
                    field: "data.rooms",
                    dir: "desc",
                  },
                ],
              },
            ],
          },
          visibility: { visible: true },
        },
        {
          id: `runtime-filters-collection-${token}`,
          type: "collection",
          props: { contentTypeId: contentType.id, queryId, limit: 6 },
          visibility: { visible: true },
        },
      ]);
      const filtersSlug = `/runtime-filters-page-${token}`;
      const filtersPage = await createPage({
        title: `Runtime Filters Page ${token}`,
        slug: filtersSlug,
        authorId: actor.id,
        data: filtersPageData,
      });
      trackPage(filtersPage?.id);
      if (!filtersPage?.id) throw new Error("missing_filters_page");
      await publishPage(filtersPage.id, actor.id, filtersPageData);

      // 1) Unfiltered render: the facet GET form (no-JS fallback), the sort
      // control, the result count, and exactly one runtime script tag.
      const baseResponse = await requestPublicPath(filtersSlug);
      expect(baseResponse.status).toBe(200);
      const baseHtml = await baseResponse.text();
      expect(baseHtml).toContain("data-listing-runtime-form");
      expect(baseHtml).toContain('method="get"');
      expect(baseHtml).toContain(`name="lq.${queryId}.data.rooms.in"`);
      expect(baseHtml).toContain(`name="lq.${queryId}.__sort"`);
      expect(baseHtml).toContain(`name="lq.${queryId}.__q"`);
      expect(baseHtml).toContain('data-page-filters-count="2"');
      expect(baseHtml).toContain(`Alpha filtered ${token}`);
      expect(baseHtml).toContain(`Beta filtered ${token}`);
      expect(baseHtml.split('data-coderso-runtime-script="listing-runtime"')).toHaveLength(2);

      // 2) Filtered render through the existing lq.* server pipeline: the
      // collection narrows, the count updates, the facet shows applied state.
      const filteredResponse = await requestPublicPath(
        `${filtersSlug}?lq.${queryId}.data.rooms.in=3`
      );
      expect(filteredResponse.status).toBe(200);
      const filteredHtml = await filteredResponse.text();
      expect(filteredHtml).toContain(`Alpha filtered ${token}`);
      expect(filteredHtml).not.toContain(`Beta filtered ${token}`);
      expect(filteredHtml).toContain('data-page-filters-count="1"');
      // Applied state: the matching facet option renders checked and the
      // active-filters chip row (with its clear-all affordance) appears.
      expect(filteredHtml).toContain('checked="" value="3"');
      expect(filteredHtml).toContain('data-listing-clear-all="1"');

      // 3) Visitor sort: lq.<id>.__sort reorders the listing both ways.
      const ascHtml = await (
        await requestPublicPath(`${filtersSlug}?lq.${queryId}.__sort=data.rooms%3Aasc`)
      ).text();
      expect(ascHtml.indexOf(`Beta filtered ${token}`)).toBeLessThan(
        ascHtml.indexOf(`Alpha filtered ${token}`)
      );
      const descHtml = await (
        await requestPublicPath(`${filtersSlug}?lq.${queryId}.__sort=data.rooms%3Adesc`)
      ).text();
      expect(descHtml.indexOf(`Alpha filtered ${token}`)).toBeLessThan(
        descHtml.indexOf(`Beta filtered ${token}`)
      );

      // 4) Pages without a filters block stay script-free (seam gating).
      const plainPageData = buildPage(`Runtime Filters Plain ${token}`, [
        {
          id: `runtime-filters-plain-collection-${token}`,
          type: "collection",
          props: { contentTypeId: contentType.id, queryId, limit: 6 },
          visibility: { visible: true },
        },
      ]);
      const plainSlug = `/runtime-filters-plain-${token}`;
      const plainPage = await createPage({
        title: `Runtime Filters Plain ${token}`,
        slug: plainSlug,
        authorId: actor.id,
        data: plainPageData,
      });
      trackPage(plainPage?.id);
      if (!plainPage?.id) throw new Error("missing_plain_page");
      await publishPage(plainPage.id, actor.id, plainPageData);
      const plainHtml = await (await requestPublicPath(plainSlug)).text();
      expect(plainHtml).toContain(`Alpha filtered ${token}`);
      expect(plainHtml).not.toContain('data-coderso-runtime-script="listing-runtime"');
    } finally {
      await deleteListingQuery(listingQuery.id);
    }
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "public v2 collection pagination pages through lq page params with the numbered pager; default none and dangling routes stay guarded (TASK-459-03)",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 60);
    await setTestSetting("site.contentRoutes", []);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const contentType = await createContentType({
      name: `Runtime Pagination ${token}`,
      slug: `runtime-pagination-${token}`,
      status: "published",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["summary"],
        properties: {
          summary: { type: "string" },
        },
      },
    });
    trackContentType(contentType.id);

    const seedEntry = async (title: string, slug: string) => {
      const entry = await createEntry(contentType.id, {
        title,
        slug,
        authorId: actor.id,
        data: { summary: `${title} summary` },
      });
      trackContentEntry(entry?.id);
      if (!entry?.id) throw new Error("missing_pagination_entry");
      await db
        .update(contentEntries)
        .set({ status: "published", publishedAt: new Date("2026-06-01T10:00:00.000Z") })
        .where(eq(contentEntries.id, entry.id));
      return entry;
    };
    await seedEntry(`Aurora paged ${token}`, `aurora-paged-${token}`);
    await seedEntry(`Borealis paged ${token}`, `borealis-paged-${token}`);
    await seedEntry(`Cascade paged ${token}`, `cascade-paged-${token}`);

    const { createListingQuery, deleteListingQuery } =
      await import("../../../core/services/content/listingQueriesService");
    const listingQuery = await createListingQuery({
      name: `Runtime pagination query ${token}`,
      query: {
        source: "entries",
        sourceConfig: { contentTypeId: contentType.id },
        filters: [],
        sort: [{ field: "title", dir: "asc" }],
        pagination: { limit: 20, offset: 0 },
        fields: ["id", "title", "slug", "status", "publishedAt", "updatedAt"],
      },
    });

    try {
      const queryId = listingQuery.id;
      const buildPage = (headline: string, blocks: unknown[]) => ({
        ...pageData(headline),
        sections: [
          {
            ...pageData(headline).sections[0]!,
            blocks,
          },
        ],
      });

      const pagedPageData = buildPage(`Runtime Pagination Page ${token}`, [
        {
          id: `runtime-pagination-block-${token}`,
          type: "collection",
          props: {
            contentTypeId: contentType.id,
            queryId,
            limit: 6,
            paginationMode: "paged",
            pageSize: 2,
          },
          visibility: { visible: true },
        },
      ]);
      const pagedSlug = `/runtime-pagination-page-${token}`;
      const pagedPage = await createPage({
        title: `Runtime Pagination Page ${token}`,
        slug: pagedSlug,
        authorId: actor.id,
        data: pagedPageData,
      });
      trackPage(pagedPage?.id);
      if (!pagedPage?.id) throw new Error("missing_pagination_page");
      await publishPage(pagedPage.id, actor.id, pagedPageData);

      // 1) Page 1: two of three entries, the numbered pager with totals, the
      // lq page-token next href, and the fetch-swap script (paged + listing).
      const firstResponse = await requestPublicPath(pagedSlug);
      expect(firstResponse.status).toBe(200);
      const firstHtml = await firstResponse.text();
      expect(firstHtml).toContain(`Aurora paged ${token}`);
      expect(firstHtml).toContain(`Borealis paged ${token}`);
      expect(firstHtml).not.toContain(`Cascade paged ${token}`);
      expect(firstHtml).toContain('data-content-list-pagination="paged"');
      expect(firstHtml).toContain('data-content-list-total="3"');
      expect(firstHtml.replace(/<!-- -->/g, "")).toContain("3 results");
      expect(firstHtml).toContain(`href="?lq.${queryId}.__page=2"`);
      expect(firstHtml).toContain('data-listing-page-link="1"');
      expect(firstHtml.split('data-coderso-runtime-script="listing-runtime"')).toHaveLength(2);

      // 2) Page 2 via the validated lq grammar: the remaining entry, the
      // canonical previous href (page 1 drops the param), current page marked.
      const secondResponse = await requestPublicPath(`${pagedSlug}?lq.${queryId}.__page=2`);
      expect(secondResponse.status).toBe(200);
      const secondHtml = await secondResponse.text();
      expect(secondHtml).toContain(`Cascade paged ${token}`);
      expect(secondHtml).not.toContain(`Aurora paged ${token}`);
      expect(secondHtml).toContain('aria-current="page"');
      expect(secondHtml).toContain('data-content-list-page="2"');
      expect(secondHtml).toContain('href="?"');

      // 3) Dangling-route guard (frozen policy): no content route is
      // registered, so cards render unlinked with the explicit note instead
      // of `/${typeSlug}/:slug` hrefs the matcher cannot match.
      expect(firstHtml).toContain('data-content-list-link-unavailable="1"');
      expect(firstHtml).not.toContain(`href="/runtime-pagination-${token}/`);

      // 4) Legacy documents (no pagination props) keep the default "none":
      // no pager, no runtime script — byte-for-byte today's render contract.
      const legacyPageData = buildPage(`Runtime Pagination Legacy ${token}`, [
        {
          id: `runtime-pagination-legacy-${token}`,
          type: "collection",
          props: { contentTypeId: contentType.id, queryId, limit: 6 },
          visibility: { visible: true },
        },
      ]);
      const legacySlug = `/runtime-pagination-legacy-${token}`;
      const legacyPage = await createPage({
        title: `Runtime Pagination Legacy ${token}`,
        slug: legacySlug,
        authorId: actor.id,
        data: legacyPageData,
      });
      trackPage(legacyPage?.id);
      if (!legacyPage?.id) throw new Error("missing_legacy_pagination_page");
      await publishPage(legacyPage.id, actor.id, legacyPageData);
      const legacyHtml = await (await requestPublicPath(legacySlug)).text();
      expect(legacyHtml).toContain(`Cascade paged ${token}`);
      expect(legacyHtml).not.toContain('data-content-list-pagination="paged"');
      expect(legacyHtml).not.toContain('data-coderso-runtime-script="listing-runtime"');
    } finally {
      await deleteListingQuery(listingQuery.id);
    }
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "auto entry-list routes paginate and sort through searchParams (TASK-459-03)",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const contentType = await createContentType({
      name: `Runtime List Route ${token}`,
      slug: `runtime-list-route-${token}`,
      status: "published",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          summary: { type: "string" },
        },
      },
    });
    trackContentType(contentType.id);

    // 25 published entries: one more than the contract page size (24).
    // Bulk-seeded in one statement to keep the fixture inside the runtime
    // test budget; ids are tracked for the standard scoped cleanup.
    const seededEntries = await db
      .insert(contentEntries)
      .values(
        Array.from({ length: 25 }, (_, offset) => {
          const label = String(offset + 1).padStart(2, "0");
          return {
            typeId: contentType.id,
            authorId: actor.id,
            slug: `listed-entry-${label}-${token}`,
            title: `Listed entry ${label} ${token}`,
            status: "published",
            data: { summary: `Listed entry ${label}` },
            publishedAt: new Date(`2026-05-01T10:${label}:00.000Z`),
          };
        })
      )
      .returning({ id: contentEntries.id });
    seededEntries.forEach((row) => trackContentEntry(row.id));
    if (seededEntries.length !== 25) throw new Error("missing_list_route_entries");

    await setTestSetting("site.contentRoutes", [
      {
        type: contentType.slug,
        listPath: `/listed-${token}`,
        detailPath: `/listed-${token}/:slug`,
        enabled: true,
      },
    ]);

    try {
      // Page 1: the newest 24 entries (published-desc default) + the pager.
      // Entry 01 (the oldest) belongs to page 2.
      const firstResponse = await requestPublicPath(`/listed-${token}`);
      expect(firstResponse.status).toBe(200);
      const firstHtml = await firstResponse.text();
      expect(firstHtml).toContain(`Listed entry 25 ${token}`);
      expect(firstHtml).toContain(`Listed entry 02 ${token}`);
      expect(firstHtml).not.toContain(`Listed entry 01 ${token}`);
      expect(firstHtml).toContain('data-content-list-pagination="paged"');
      expect(firstHtml).toContain('data-content-list-total="25"');
      expect(firstHtml).toContain('href="?page=2"');

      // Page 2 via searchParams: the remaining entry only.
      const secondHtml = await (await requestPublicPath(`/listed-${token}?page=2`)).text();
      expect(secondHtml).toContain(`Listed entry 01 ${token}`);
      expect(secondHtml).not.toContain(`Listed entry 25 ${token}`);

      // Sort rides the same validated grammar (title-asc puts entry 01 on
      // page 1); unknown sort values fall back to the default ordering.
      const sortedHtml = await (await requestPublicPath(`/listed-${token}?sort=title-asc`)).text();
      expect(sortedHtml).toContain(`Listed entry 01 ${token}`);
      expect(sortedHtml).not.toContain(`Listed entry 25 ${token}`);
      const fallbackHtml = await (await requestPublicPath(`/listed-${token}?sort=__nope__`)).text();
      expect(fallbackHtml).toContain(`Listed entry 25 ${token}`);
      expect(fallbackHtml).not.toContain(`Listed entry 01 ${token}`);

      // Out-of-range pages clamp into range instead of 404ing.
      const clampedHtml = await (await requestPublicPath(`/listed-${token}?page=99`)).text();
      expect(clampedHtml).toContain(`Listed entry 01 ${token}`);
    } finally {
      await setTestSetting("site.contentRoutes", []);
    }
  },
  // Five full public renders over a 25-entry corpus: double the standard
  // runtime budget.
  { timeout: dbRuntimeTimeout * 2 }
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
