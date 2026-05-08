import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentTypes,
  detailPageDocuments,
  previewTokens,
  users,
} from "../../../core/db/schema";
import {
  createEntry,
  updateEntry,
  updateEntryMetadata,
} from "../../../core/services/content/entryService";
import { normalizeDetailPageDocument } from "../../../core/services/content/detailPageSchema";
import type { DetailPageDocument } from "../../../core/services/content/detailPageTypes";
import { createContentType } from "../../../core/services/content/typeService";
import { createPreviewToken } from "../../../core/services/pages/previewService";
import {
  deleteSetting,
  getSettingRecord,
  setSetting,
  type ContentRouteSetting,
} from "../../../core/services/settings/settingsService";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { clearSiteCache } from "../../../core/site/cache/siteCache";

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
    await db.delete(previewTokens).where(inArray(previewTokens.targetId, detailPageIds));
    await db.delete(detailPageDocuments).where(inArray(detailPageDocuments.id, detailPageIds));
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
        "user-agent": "detail-page-preview-cache-test",
        "x-forwarded-for": `127.0.1.${Math.floor(Math.random() * 200) + 1}`,
      },
    })
  );

const createActor = async () => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `detail-page-preview-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  if (!actor?.id) throw new Error("missing_detail_page_preview_actor");
  trackedUserIds.add(actor.id);
  return actor;
};

const createProductFixture = async () => {
  const actor = await createActor();
  const token = randomUUID().slice(0, 8);
  const contentType = await createContentType({
    name: `Preview Products ${token}`,
    slug: `preview-products-${token}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        headline: { type: "string", xFieldType: "text" },
        summary: { type: "string", xFieldType: "textarea" },
      },
    },
  });
  trackedContentTypeIds.add(contentType.id);

  const entry = await createEntry(contentType.id, {
    title: `Preview product ${token}`,
    slug: `preview-product-${token}`,
    authorId: actor.id,
    data: {
      headline: `Published detail headline ${token}`,
      summary: `Published detail summary ${token}`,
    },
  });
  if (!entry) throw new Error("missing_detail_page_preview_entry");
  trackedContentEntryIds.add(entry.id);
  await updateEntryMetadata(entry.id, { status: "published" }, actor.id);

  return { actor, contentType, entry, token };
};

const insertDetailPageDocument = async (input: {
  id: string;
  contentTypeId: string;
  contentTypeSlug: string;
  status?: "draft" | "published";
  currentBody: string;
  publishedBody?: string;
}) => {
  const currentDocument = normalizeDetailPageDocument({
    schemaVersion: 1,
    id: input.id,
    name: "Preview detail page",
    contentTypeId: input.contentTypeId,
    contentTypeSlug: input.contentTypeSlug,
    status: input.status ?? "published",
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
    blocks: [
      {
        id: "hero",
        type: "hero",
        variant: "centered",
        data: {
          headline: "Default detail headline",
          body: input.currentBody,
        },
      },
    ],
    bindings: [
      {
        id: "binding-headline",
        blockId: "hero",
        propPath: "headline",
        source: {
          kind: "entry-field",
          field: "headline",
        },
        transform: "text",
        required: true,
      },
    ],
  } satisfies DetailPageDocument);

  const publishedDocument =
    input.publishedBody === undefined
      ? currentDocument
      : normalizeDetailPageDocument({
          ...currentDocument,
          status: "published",
          blocks: [
            {
              id: "hero",
              type: "hero",
              variant: "centered",
              data: {
                headline: "Default detail headline",
                body: input.publishedBody,
              },
            },
          ],
        } satisfies DetailPageDocument);

  await db.insert(detailPageDocuments).values({
    id: input.id,
    name: "Preview detail page",
    contentTypeId: input.contentTypeId,
    status: input.status ?? "published",
    currentDocument,
    publishedDocument,
  });
  trackedDetailPageIds.add(input.id);
};

testIfDb(
  "detail-page preview tokens render current documents with server-side sample-entry context",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.previewEnabled", true);
    await setTestSetting("site.cacheTtlSeconds", 0);

    const fixture = await createProductFixture();
    const detailPageId = "a4d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c";
    await insertDetailPageDocument({
      id: detailPageId,
      contentTypeId: fixture.contentType.id,
      contentTypeSlug: fixture.contentType.slug,
      status: "draft",
      currentBody: "Draft detail template body",
      publishedBody: "Published detail template body",
    });

    const { token } = await createPreviewToken({
      targetType: "detail-page",
      targetId: detailPageId,
      context: {
        kind: "detail-page",
        sampleEntryId: fixture.entry.id,
      },
    });

    const response = await requestPublicPath(
      `/preview?type=detail-page&token=${encodeURIComponent(token)}&sampleEntryId=bogus&device=mobile`
    );

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`Published detail headline ${fixture.token}`);
    expect(html).toContain("Draft detail template body");
    expect(html).not.toContain("Published detail template body");
    expect(html).toContain("Preview mode");
  }
);

testIfDb(
  "content preview reuses the canonical route-linked published detail template with draft entry data",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.previewEnabled", true);
    await setTestSetting("site.cacheTtlSeconds", 0);

    const fixture = await createProductFixture();
    const detailPageId = "b4d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c";
    await insertDetailPageDocument({
      id: detailPageId,
      contentTypeId: fixture.contentType.id,
      contentTypeSlug: fixture.contentType.slug,
      currentBody: "Published detail template body",
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

    await updateEntry(fixture.entry.id, {
      data: {
        headline: `Draft preview headline ${fixture.token}`,
        summary: `Draft preview summary ${fixture.token}`,
      },
    });

    const { token } = await createPreviewToken({
      targetType: "content",
      targetId: fixture.entry.id,
    });
    const response = await requestPublicPath(
      `/preview?type=content&token=${encodeURIComponent(token)}&contentType=${encodeURIComponent(fixture.contentType.slug)}&slug=${encodeURIComponent(fixture.entry.slug)}`
    );

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`Draft preview headline ${fixture.token}`);
    expect(html).toContain("Published detail template body");
    expect(html).toContain("Preview mode");
  }
);

testIfDb(
  "content route cache invalidates when the linked detail-page template changes",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 300);

    const fixture = await createProductFixture();
    const firstDetailPageId = "c4d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c";
    const secondDetailPageId = "d4d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c";
    await insertDetailPageDocument({
      id: firstDetailPageId,
      contentTypeId: fixture.contentType.id,
      contentTypeSlug: fixture.contentType.slug,
      currentBody: "First cached detail template body",
    });
    await insertDetailPageDocument({
      id: secondDetailPageId,
      contentTypeId: fixture.contentType.id,
      contentTypeSlug: fixture.contentType.slug,
      currentBody: "Second cached detail template body",
    });

    const buildRoutes = (detailPageId: string) =>
      [
        {
          type: fixture.contentType.slug,
          listPath: `/${fixture.contentType.slug}`,
          detailPath: `/${fixture.contentType.slug}/:slug`,
          enabled: true,
          detailPageId,
        } satisfies ContentRouteSetting,
      ] as ContentRouteSetting[];

    await setTestSetting("site.contentRoutes", buildRoutes(firstDetailPageId));

    const firstResponse = await requestPublicPath(
      `/${fixture.contentType.slug}/${fixture.entry.slug}`
    );
    expect(firstResponse.status).toBe(200);
    const firstHtml = await firstResponse.text();
    expect(firstHtml).toContain("First cached detail template body");

    await setSetting("site.contentRoutes", buildRoutes(secondDetailPageId));

    const secondResponse = await requestPublicPath(
      `/${fixture.contentType.slug}/${fixture.entry.slug}`
    );
    expect(secondResponse.status).toBe(200);
    const secondHtml = await secondResponse.text();
    expect(secondHtml).toContain("Second cached detail template body");
    expect(secondHtml).not.toContain("First cached detail template body");
  }
);

testIfDb("detail-page preview returns 404 when preview mode is disabled", async () => {
  resetRateLimitBuckets();
  await setTestSetting("site.previewEnabled", false);
  await setTestSetting("site.cacheTtlSeconds", 0);

  const fixture = await createProductFixture();
  const detailPageId = "e4d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c";
  await insertDetailPageDocument({
    id: detailPageId,
    contentTypeId: fixture.contentType.id,
    contentTypeSlug: fixture.contentType.slug,
    status: "draft",
    currentBody: "Draft detail template body",
    publishedBody: "Published detail template body",
  });

  const { token } = await createPreviewToken({
    targetType: "detail-page",
    targetId: detailPageId,
    context: {
      kind: "detail-page",
      sampleEntryId: fixture.entry.id,
    },
  });

  const response = await requestPublicPath(
    `/preview?type=detail-page&token=${encodeURIComponent(token)}`
  );
  expect(response.status).toBe(404);
});

testIfDb(
  "detail-page preview returns 410 for expired tokens and 404 for draft sample entries",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.previewEnabled", true);
    await setTestSetting("site.cacheTtlSeconds", 0);

    const fixture = await createProductFixture();
    const detailPageId = "f4d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c";
    await insertDetailPageDocument({
      id: detailPageId,
      contentTypeId: fixture.contentType.id,
      contentTypeSlug: fixture.contentType.slug,
      status: "draft",
      currentBody: "Draft detail template body",
      publishedBody: "Published detail template body",
    });

    const expired = await createPreviewToken({
      targetType: "detail-page",
      targetId: detailPageId,
      ttlMinutes: -1,
      context: {
        kind: "detail-page",
        sampleEntryId: fixture.entry.id,
      },
    });
    const expiredResponse = await requestPublicPath(
      `/preview?type=detail-page&token=${encodeURIComponent(expired.token)}`
    );
    expect(expiredResponse.status).toBe(410);

    await updateEntryMetadata(fixture.entry.id, { status: "draft" }, fixture.actor.id);

    const active = await createPreviewToken({
      targetType: "detail-page",
      targetId: detailPageId,
      context: {
        kind: "detail-page",
        sampleEntryId: fixture.entry.id,
      },
    });
    const draftResponse = await requestPublicPath(
      `/preview?type=detail-page&token=${encodeURIComponent(active.token)}`
    );
    expect(draftResponse.status).toBe(404);
  }
);
