import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";

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
import {
  pageBlockCapabilities,
  pageBlockTypes,
  type PageBlockType,
} from "../../../core/services/pages/pageDocumentV2";
import { createPage, publishPage, updatePage } from "../../../core/services/pages/pageService";
import { createPreviewToken } from "../../../core/services/pages/previewService";
import {
  deleteSetting,
  getSettingRecord,
  setSetting,
} from "../../../core/services/settings/settingsService";
import { clearSiteCache, getSiteCacheStats } from "../../../core/site/cache/siteCache";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";

const hasDb = Boolean(process.env.DATABASE_URL);
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;
const dbRuntimeTimeout = 30_000;

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

const task538CustomSvgMarkup = (token: string, phase: "published" | "draft") => {
  const label = phase === "published" ? "Published" : "Draft";
  return (
    `<svg class="task538-${phase}-root-${token}" ` +
    `style="--task538-${phase}-root-style-${token}:1" x="-5381" y="5382" ` +
    'width="400" height="200" transform="translate(538 538)" viewBox="0 0 40 20" ' +
    'xmlns:xlink="http://www.w3.org/1999/xlink">' +
    `<defs><linearGradient id="task538-gradient-${phase}-${token}" gradientUnits="userSpaceOnUse">` +
    '<stop offset="0" stop-color="#123456"/><stop offset="1" stop-color="#abcdef"/>' +
    `</linearGradient><path id="task538-shape-${phase}-${token}" d="M0 0h10v10z"/></defs>` +
    `<desc>${label} TASK-538 description ${token}</desc>` +
    `<g class="task538-${phase}-nested-${token}" ` +
    `style="--task538-${phase}-nested-style-${token}:1" transform="translate(2 3)" ` +
    `fill="url(#task538-gradient-${phase}-${token})">` +
    `<use xlink:href="#task538-shape-${phase}-${token}" x="4" transform="translate(1 1)"/>` +
    `<text x="2" y="18">${label} TASK-538 SVG ${token} &amp; runtime</text></g></svg>`
  );
};

const task538CustomSvgPageData = (token: string, phase: "published" | "draft") => {
  const label = phase === "published" ? "Published" : "Draft";
  const base = pageData(`${label} TASK-538 page ${token}`);
  return {
    ...base,
    sections: base.sections.map((section) => ({
      ...section,
      id: `sec-task538-${phase}-${token}`,
      blocks: [
        {
          id: `task538-invalid-${phase}-${token}`,
          type: "customSvg",
          props: { svg: "<svg><g>", drawIn: false, label: `${label} invalid SVG ${token}` },
          visibility: { visible: true },
        },
        {
          id: `task538-valid-${phase}-${token}`,
          type: "customSvg",
          props: {
            svg: task538CustomSvgMarkup(token, phase),
            drawIn: false,
            label: `${label} TASK-538 SVG ${token}`,
          },
          visibility: { visible: true },
        },
      ],
    })),
  };
};

const task538CustomSvgRootTag = (html: string) =>
  html.match(/<svg(?=[^>]*viewBox="0 0 40 20")[^>]*>/)?.[0] ?? "";

const task538CustomSvgBoundaryTag = (html: string) =>
  html.match(/<span[^>]*data-custom-svg-boundary="true"[^>]*>/)?.[0] ?? "";

const task538RuntimeBlockSlice = (html: string, blockId: string, nextBlockId: string) => {
  const start = html.indexOf(`data-block-id="${blockId}"`);
  const end = html.indexOf(`data-block-id="${nextBlockId}"`, start + 1);
  return start >= 0 && end > start ? html.slice(start, end) : "";
};

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
          id: `parity-badge-${token}`,
          type: "badge",
          props: {
            text: `Runtime badge ${token}`,
            variant: "soft",
            size: "sm",
            shape: "pill",
            weight: "semibold",
            background: null,
            textColor: null,
            icon: null,
            iconPosition: "start",
          },
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
          // TASK-521-04: the animated-icon block is now insertable + real.
          id: `parity-icon-${token}`,
          type: "icon",
          props: {
            name: "star",
            animation: "spin",
            size: 48,
            color: "var(--primary)",
            speed: 1600,
          },
          visibility: { visible: true },
        },
        {
          // TASK-522-01: the custom-SVG block is insertable, so the parity loop
          // asserts `data-page-block="customSvg"`. The sanitized-render CASE ships
          // with 522-02; here the type-agnostic block frame stamps the data-attr.
          id: `parity-custom-svg-${token}`,
          type: "customSvg",
          props: {
            svg: '<svg viewBox="0 0 10 10"><path d="M0 0 L10 10" stroke="#000"/></svg>',
            drawIn: false,
            label: "",
          },
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
          // TASK-534: the segmented switcher/tabs block is insertable, so the
          // parity loop asserts `data-page-block="switcher"`. Panels live in the
          // `panel:1..panel:N` slots (real tablist/tabpanel render).
          id: `parity-switcher-${token}`,
          type: "switcher",
          props: {
            tabs: [{ label: `Barn ${token}` }, { label: `Villa ${token}` }],
            activeIndex: 0,
            variant: "pill",
          },
          visibility: { visible: true },
          slots: {
            "panel:1": [
              {
                id: `parity-switcher-panel-1-${token}`,
                type: "text",
                props: { text: `Switcher panel one ${token}`, format: "plain", align: "left" },
                visibility: { visible: true },
              },
            ],
            "panel:2": [
              {
                id: `parity-switcher-panel-2-${token}`,
                type: "text",
                props: { text: `Switcher panel two ${token}`, format: "plain", align: "left" },
                visibility: { visible: true },
              },
            ],
          },
        },
        {
          // TASK-534: the scroll-hint block is insertable (CSS-keyframe only,
          // no runtime), so the parity loop asserts `data-page-block="scrollHint"`.
          id: `parity-scroll-hint-${token}`,
          type: "scrollHint",
          props: { glyph: "chevron", label: `Scroll for more ${token}` },
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

export {
  createActor,
  createPublishedPageWithDraft,
  dbRuntimeTimeout,
  insertPublishedLegacyPage,
  insertablePageBlockTypes,
  nestedPageData,
  pageData,
  requestPublicPath,
  responsivePageData,
  responsiveSectionContentSelector,
  runtimeParityPageData,
  setTestSetting,
  task538CustomSvgBoundaryTag,
  task538CustomSvgPageData,
  task538CustomSvgRootTag,
  task538RuntimeBlockSlice,
  testIfDb,
  testIfDbWithOptions,
  trackContentEntry,
  trackContentType,
  trackPage,
};
