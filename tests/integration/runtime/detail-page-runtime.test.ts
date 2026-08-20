import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries, contentTypes, detailPageDocuments, users } from "../../../core/db/schema";
import { createEntry, updateEntryMetadata } from "../../../core/services/content/entryService";
import { normalizeDetailPageDocument } from "../../../core/services/content/detailPageSchema";
import type { DetailPageDocument } from "../../../core/services/content/detailPageTypes";
import {
  buildListingRuntimeParamName,
  listingRuntimeTokens,
} from "../../../core/services/search/filterContract";
import { createContentType } from "../../../core/services/content/typeService";
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
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;
const dbRuntimeTimeout = 30_000;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const trackedUserIds = new Set<string>();
const trackedContentEntryIds = new Set<string>();
const trackedContentTypeIds = new Set<string>();
const trackedDetailPageIds = new Set<string>();
const settingSnapshots = new Map<string, { exists: boolean; value: unknown }>();

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
  const detailPageIds = [...trackedDetailPageIds];
  const contentEntryIds = [...trackedContentEntryIds];
  const contentTypeIds = [...trackedContentTypeIds];
  const userIds = [...trackedUserIds];

  if (detailPageIds.length > 0) {
    await db.delete(detailPageDocuments).where(inArray(detailPageDocuments.id, detailPageIds));
  }
  if (contentEntryIds.length > 0) {
    await db.delete(contentEntries).where(inArray(contentEntries.id, contentEntryIds));
  }
  if (contentTypeIds.length > 0) {
    await db.delete(contentTypes).where(inArray(contentTypes.id, contentTypeIds));
  }
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }

  trackedDetailPageIds.clear();
  trackedContentEntryIds.clear();
  trackedContentTypeIds.clear();
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
        "user-agent": "detail-page-runtime-test",
        "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
      },
    })
  );

const createActor = async () => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `detail-page-runtime-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  if (!actor?.id) throw new Error("missing_detail_page_runtime_actor");
  trackedUserIds.add(actor.id);
  return actor;
};

const createProductFixture = async (status: "draft" | "published" = "published") => {
  const actor = await createActor();
  const token = randomUUID().slice(0, 8);
  const contentType = await createContentType({
    name: `Products ${token}`,
    slug: `products-${token}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        headline: { type: "string", xFieldType: "text" },
        summary: { type: "string", xFieldType: "textarea" },
        coverImage: { type: "string", xFieldType: "text" },
      },
    },
  });
  trackedContentTypeIds.add(contentType.id);

  const entry = await createEntry(contentType.id, {
    title: `Runtime product ${token}`,
    slug: `runtime-product-${token}`,
    authorId: actor.id,
    data: {
      headline: `Bound detail headline ${token}`,
      summary: `Bound detail summary ${token}`,
      coverImage: `/media/detail-cover-${token}.jpg`,
    },
  });
  if (!entry) throw new Error("missing_runtime_detail_entry");
  if (status === "published") {
    await updateEntryMetadata(entry.id, { status: "published" }, actor.id);
  }
  trackedContentEntryIds.add(entry.id);

  return { actor, contentType, entry, token };
};

const insertPublishedDetailPageDocument = async (input: {
  id: string;
  contentTypeId: string;
  contentTypeSlug: string;
  documentOverrides?: Partial<DetailPageDocument>;
}) => {
  const baseDocument: DetailPageDocument = {
    schemaVersion: 2,
    id: input.id,
    name: "Product detail page",
    contentTypeId: input.contentTypeId,
    contentTypeSlug: input.contentTypeSlug,
    status: "published",
    titlePattern: "{{ title }}",
    settings: {
      template: "detail",
      layout: {
        wrapper: {
          container: "default",
          padding: { top: "md", bottom: "lg" },
          background: {
            color: "#ffffff",
            image: null,
            media: {
              type: "none",
              source: "external",
              src: null,
            },
          },
        },
        sections: {
          gap: "lg",
          defaults: {
            container: "default",
            padding: { top: "xl", bottom: "xl" },
            margin: { top: "none", bottom: "none" },
          },
        },
        applyDefaultsToNewBlocks: false,
      },
    },
    sections: [
      {
        id: "hero",
        type: "hero",
        name: "Hero",
        variant: "centered",
        layout: {
          columns: 1,
          align: "start",
          justify: "start",
          maxWidth: 1080,
          stackVertical: false,
        },
        style: {
          background: "#ffffff",
          backgroundType: "color",
          backgroundImage: null,
          accent: "#0d9488",
          radius: 0,
          shadow: "none",
        },
        spacing: { paddingTop: 64, paddingBottom: 64, paddingLeft: 40, paddingRight: 40, gap: 24 },
        visibility: { visible: true, authOnly: false, anchor: null, startsAt: null, endsAt: null },
        responsive: {},
        blocks: [
          {
            id: "hero-heading",
            type: "heading",
            props: { text: "Default detail headline", level: "h2", align: "left" },
            visibility: { visible: true },
          },
          {
            id: "hero-text",
            type: "text",
            props: { text: "Composed detail template body", format: "plain", align: "left" },
            visibility: { visible: true },
          },
        ],
      },
    ],
    bindings: [
      {
        id: "binding-headline",
        blockId: "hero-heading",
        propPath: "text",
        source: {
          kind: "entry-field",
          field: "headline",
        },
        transform: "text",
        required: true,
      },
    ],
  };
  const document = normalizeDetailPageDocument({
    ...baseDocument,
    ...(input.documentOverrides ?? {}),
  });

  await db.insert(detailPageDocuments).values({
    id: input.id,
    name: "Product detail page",
    contentTypeId: input.contentTypeId,
    status: "published",
    currentDocument: document,
    publishedDocument: document,
  });
  trackedDetailPageIds.add(input.id);
};

testIfDbWithOptions(
  "content route list pages still render the list view when detailPageId is linked",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);

    const fixture = await createProductFixture("published");
    const detailPageId = randomUUID();
    await insertPublishedDetailPageDocument({
      id: detailPageId,
      contentTypeId: fixture.contentType.id,
      contentTypeSlug: fixture.contentType.slug,
    });
    await setTestSetting("site.contentRoutes", [
      {
        type: fixture.contentType.slug,
        listPath: `/${fixture.contentType.slug}`,
        detailPath: `/${fixture.contentType.slug}/:slug`,
        enabled: true,
        detailPageId,
      } satisfies ContentRouteSetting,
    ]);

    const response = await requestPublicPath(`/${fixture.contentType.slug}`);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`/${fixture.contentType.slug}/${fixture.entry.slug}`);
    expect(html).toContain(`Runtime product ${fixture.token}`);
    expect(html).not.toContain("Composed detail template body");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "published content routes render composed detail-page blocks when detailPageId is linked",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);

    const fixture = await createProductFixture("published");
    const detailPageId = randomUUID();
    await insertPublishedDetailPageDocument({
      id: detailPageId,
      contentTypeId: fixture.contentType.id,
      contentTypeSlug: fixture.contentType.slug,
    });
    await setTestSetting("site.contentRoutes", [
      {
        type: fixture.contentType.slug,
        listPath: `/${fixture.contentType.slug}`,
        detailPath: `/${fixture.contentType.slug}/:slug`,
        enabled: true,
        detailPageId,
      } satisfies ContentRouteSetting,
    ]);

    const response = await requestPublicPath(`/${fixture.contentType.slug}/${fixture.entry.slug}`);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`Bound detail headline ${fixture.token}`);
    expect(html).toContain("Composed detail template body");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "published content routes with :id detail paths resolve composed detail pages by entry id",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);

    const fixture = await createProductFixture("published");
    const detailPageId = randomUUID();
    await insertPublishedDetailPageDocument({
      id: detailPageId,
      contentTypeId: fixture.contentType.id,
      contentTypeSlug: fixture.contentType.slug,
    });
    await setTestSetting("site.contentRoutes", [
      {
        type: fixture.contentType.slug,
        listPath: `/${fixture.contentType.slug}`,
        detailPath: `/${fixture.contentType.slug}/:id`,
        enabled: true,
        detailPageId,
      } satisfies ContentRouteSetting,
    ]);

    const response = await requestPublicPath(`/${fixture.contentType.slug}/${fixture.entry.id}`);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`Bound detail headline ${fixture.token}`);
    expect(html).toContain("Composed detail template body");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "content routes fall back to the legacy entry detail renderer when no detailPageId is linked",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);

    const fixture = await createProductFixture("published");
    await setTestSetting("site.contentRoutes", [
      {
        type: fixture.contentType.slug,
        listPath: `/${fixture.contentType.slug}`,
        detailPath: `/${fixture.contentType.slug}/:slug`,
        enabled: true,
      } satisfies ContentRouteSetting,
    ]);

    const response = await requestPublicPath(`/${fixture.contentType.slug}/${fixture.entry.slug}`);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('data-template="content-detail"');
    expect(html).toContain(`Bound detail headline ${fixture.token}`);
    expect(html).not.toContain("Composed detail template body");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "composed detail pages pass query-string runtime state into hydrated widgets",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);

    const fixture = await createProductFixture("published");
    const detailPageId = randomUUID();
    // V2 detail-page authoring (TASK-580-03-L06) has no search-box widget; the
    // listing-filters block hydrates `lq.<id>.__q` state from the query string
    // against a real saved query, mirroring the v1 search-box runtime contract.
    const { createListingQuery, deleteListingQuery } =
      await import("../../../core/services/content/listingQueriesService");
    const listingQuery = await createListingQuery({
      name: `Detail runtime filters query ${fixture.token}`,
      query: {
        source: "entries",
        sourceConfig: { contentTypeId: fixture.contentType.id },
        filters: [],
        sort: [{ field: "title", dir: "asc" }],
        pagination: { limit: 20, offset: 0 },
        fields: ["id", "title", "slug", "status", "publishedAt", "updatedAt"],
      },
    });
    const searchToken = buildListingRuntimeParamName(listingQuery.id, listingRuntimeTokens.search);
    await insertPublishedDetailPageDocument({
      id: detailPageId,
      contentTypeId: fixture.contentType.id,
      contentTypeSlug: fixture.contentType.slug,
      documentOverrides: {
        sections: [
          {
            id: "search",
            type: "content",
            name: "Search",
            variant: "default",
            layout: {
              columns: 1,
              align: "start",
              justify: "start",
              maxWidth: 1080,
              stackVertical: false,
            },
            style: {
              background: "#ffffff",
              backgroundType: "color",
              backgroundImage: null,
              accent: "#0d9488",
              radius: 0,
              shadow: "none",
            },
            spacing: {
              paddingTop: 64,
              paddingBottom: 64,
              paddingLeft: 40,
              paddingRight: 40,
              gap: 24,
            },
            visibility: {
              visible: true,
              authOnly: false,
              anchor: null,
              startsAt: null,
              endsAt: null,
            },
            responsive: {},
            blocks: [
              {
                id: "search",
                type: "filters",
                props: { queryId: listingQuery.id, showSearch: true, showCount: false },
                visibility: { visible: true },
              },
            ],
          },
        ],
        bindings: [],
      },
    });
    await setTestSetting("site.contentRoutes", [
      {
        type: fixture.contentType.slug,
        listPath: `/${fixture.contentType.slug}`,
        detailPath: `/${fixture.contentType.slug}/:slug`,
        enabled: true,
        detailPageId,
      } satisfies ContentRouteSetting,
    ]);

    try {
      const response = await requestPublicPath(
        `/${fixture.contentType.slug}/${fixture.entry.slug}?${searchToken}=desk`
      );

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain(`name="${searchToken}"`);
      expect(html).toContain('value="desk"');
    } finally {
      await deleteListingQuery(listingQuery.id);
    }
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "composed detail pages preserve entry canonical SEO metadata",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);

    const fixture = await createProductFixture("published");
    const detailPageId = randomUUID();
    const canonicalUrl = `https://example.test/${fixture.contentType.slug}/${fixture.entry.slug}`;
    await updateEntryMetadata(
      fixture.entry.id,
      {
        seo: {
          canonicalUrl,
        },
      },
      fixture.actor.id
    );
    await insertPublishedDetailPageDocument({
      id: detailPageId,
      contentTypeId: fixture.contentType.id,
      contentTypeSlug: fixture.contentType.slug,
    });
    await setTestSetting("site.contentRoutes", [
      {
        type: fixture.contentType.slug,
        listPath: `/${fixture.contentType.slug}`,
        detailPath: `/${fixture.contentType.slug}/:slug`,
        enabled: true,
        detailPageId,
      } satisfies ContentRouteSetting,
    ]);

    const response = await requestPublicPath(`/${fixture.contentType.slug}/${fixture.entry.slug}`);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`rel="canonical" href="${canonicalUrl}"`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "composed detail pages apply detail-page title and SEO field mappings",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);

    const fixture = await createProductFixture("published");
    const detailPageId = randomUUID();
    await updateEntryMetadata(
      fixture.entry.id,
      {
        seo: {
          description: "Entry SEO fallback should not win",
        },
      },
      fixture.actor.id
    );
    await insertPublishedDetailPageDocument({
      id: detailPageId,
      contentTypeId: fixture.contentType.id,
      contentTypeSlug: fixture.contentType.slug,
      documentOverrides: {
        titlePattern: "{{ title }} | Product catalog",
        seo: {
          titlePattern: "{{ title }} | Canonical detail",
          descriptionField: "summary",
          imageField: "coverImage",
        },
      },
    });
    await setTestSetting("site.contentRoutes", [
      {
        type: fixture.contentType.slug,
        listPath: `/${fixture.contentType.slug}`,
        detailPath: `/${fixture.contentType.slug}/:slug`,
        enabled: true,
        detailPageId,
      } satisfies ContentRouteSetting,
    ]);

    const response = await requestPublicPath(`/${fixture.contentType.slug}/${fixture.entry.slug}`);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<title>${fixture.entry.title} | Canonical detail</title>`);
    expect(html).toContain(`name="description" content="Bound detail summary ${fixture.token}"`);
    expect(html).toContain(
      `property="og:image" content="/media/detail-cover-${fixture.token}.jpg"`
    );
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "draft entries stay hidden on public content routes even when detailPageId is linked",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);

    const fixture = await createProductFixture("draft");
    const detailPageId = randomUUID();
    await insertPublishedDetailPageDocument({
      id: detailPageId,
      contentTypeId: fixture.contentType.id,
      contentTypeSlug: fixture.contentType.slug,
    });
    await setTestSetting("site.contentRoutes", [
      {
        type: fixture.contentType.slug,
        listPath: `/${fixture.contentType.slug}`,
        detailPath: `/${fixture.contentType.slug}/:slug`,
        enabled: true,
        detailPageId,
      } satisfies ContentRouteSetting,
    ]);

    const response = await requestPublicPath(`/${fixture.contentType.slug}/${fixture.entry.slug}`);

    expect(response.status).toBe(404);
  },
  { timeout: dbRuntimeTimeout }
);
