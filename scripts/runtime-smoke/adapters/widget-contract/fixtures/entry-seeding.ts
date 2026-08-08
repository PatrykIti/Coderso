import type { WidgetSmokeCase } from "../contracts";
import {
  entryTeaserFixtureContentTypeName,
  entryTeaserFixtureContentTypeSlug,
  entryTeaserFixtureEntrySeeds,
  entryTeaserFixtureFallbackQueryName,
  entryTeaserFixtureListingQueryName,
  entryTeaserFixtureListingTemplateName,
  entryTeaserFixtureListingTemplateSlug,
  type ContentListFixturePageDetail,
  type ContentListFixturePageListItem,
  type EntryTeaserFixtureContentTypeListItem,
  type EntryTeaserFixtureContext,
  type EntryTeaserFixtureEntryListItem,
  type EntryTeaserFixtureEntrySeed,
  type EntryTeaserFixtureListingQueryListItem,
  type EntryTeaserFixtureListingQueryListPayload,
  type EntryTeaserFixtureListingTemplateListItem,
  type EntryTeaserFixtureListingTemplateListPayload,
  type EntryTeaserFixtureSettingsPayload,
} from "../fixture-data";
import {
  entryTeaserFixtureWidgetTypes,
  selectedCasesNeedEntryTeaserFixtures,
} from "../fixture-selection";
import { fetchAdminCsrfToken, requestAdminJson } from "../auth";
import {
  buildEntryTeaserFixtureContentRoutes,
  buildEntryTeaserFixtureEntryData,
  buildEntryTeaserFixtureListingQuery,
  buildEntryTeaserFixtureListingTemplateConfig,
  buildEntryTeaserFixturePageData,
  buildEntryTeaserFixtureSchema,
  normalizeEntryTeaserFixtureContentRoutes,
} from "./entry-builders";
import { normalizeFixtureSlug, stableJson } from "./content-seeding";

function normalizeEntryTeaserFixtureContentTypes(
  payload:
    EntryTeaserFixtureContentTypeListItem[] | { items?: EntryTeaserFixtureContentTypeListItem[] }
): EntryTeaserFixtureContentTypeListItem[] {
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

function buildEntryTeaserFixtureContentTypePatch(
  existing: EntryTeaserFixtureContentTypeListItem
): Record<string, unknown> | null {
  const expectedSchema = buildEntryTeaserFixtureSchema();
  const patch: Record<string, unknown> = {};
  if (existing.name !== entryTeaserFixtureContentTypeName) {
    patch.name = entryTeaserFixtureContentTypeName;
  }
  if (existing.slug !== entryTeaserFixtureContentTypeSlug) {
    patch.slug = entryTeaserFixtureContentTypeSlug;
  }
  if (existing.status !== "published") {
    patch.status = "published";
  }
  if (stableJson(existing.schema ?? {}) !== stableJson(expectedSchema)) {
    patch.schema = expectedSchema;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export function buildEntryTeaserFixtureEntryPatch(
  existing: EntryTeaserFixtureEntryListItem,
  seed: EntryTeaserFixtureEntrySeed
): Record<string, unknown> | null {
  const expectedData = buildEntryTeaserFixtureEntryData(seed);
  const patch: Record<string, unknown> = {};
  if (existing.title !== seed.title) patch.title = seed.title;
  if (existing.slug !== seed.slug) patch.slug = seed.slug;
  if (stableJson(existing.data ?? {}) !== stableJson(expectedData)) {
    patch.data = expectedData;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

function entryTeaserFixtureMetadataPayload(
  seed: EntryTeaserFixtureEntrySeed
): Record<string, unknown> {
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

function normalizeEntryTeaserFixtureEntries(
  payload: EntryTeaserFixtureEntryListItem[] | { items?: EntryTeaserFixtureEntryListItem[] }
): EntryTeaserFixtureEntryListItem[] {
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

function normalizeEntryTeaserFixtureListingQueries(
  payload: EntryTeaserFixtureListingQueryListItem[] | EntryTeaserFixtureListingQueryListPayload
): EntryTeaserFixtureListingQueryListItem[] {
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

function normalizeEntryTeaserFixtureListingTemplates(
  payload:
    EntryTeaserFixtureListingTemplateListItem[] | EntryTeaserFixtureListingTemplateListPayload
): EntryTeaserFixtureListingTemplateListItem[] {
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

function buildEntryTeaserListingQueryPayload(
  contentTypeId: string,
  options: { fallbackOnly: boolean }
): Record<string, unknown> {
  const name = options.fallbackOnly
    ? entryTeaserFixtureFallbackQueryName
    : entryTeaserFixtureListingQueryName;
  return {
    name,
    description: options.fallbackOnly
      ? "Deterministic fallback-only listing query for Entry Teaser widget smoke."
      : "Deterministic populated listing query for Entry Teaser widget smoke.",
    query: buildEntryTeaserFixtureListingQuery(contentTypeId, options),
  };
}

function buildEntryTeaserListingTemplatePayload(): Record<string, unknown> {
  return {
    name: entryTeaserFixtureListingTemplateName,
    slug: entryTeaserFixtureListingTemplateSlug,
    description: "Deterministic cards template for Entry Teaser widget smoke.",
    layout: "grid",
    config: buildEntryTeaserFixtureListingTemplateConfig(),
  };
}

function entryTeaserListingQueryDrifted(
  existing: EntryTeaserFixtureListingQueryListItem,
  expected: Record<string, unknown>
): boolean {
  return (
    existing.name !== expected.name ||
    (existing.description ?? null) !== (expected.description ?? null) ||
    stableJson(existing.query ?? {}) !== stableJson(expected.query)
  );
}

function entryTeaserListingTemplateDrifted(
  existing: EntryTeaserFixtureListingTemplateListItem,
  expected: Record<string, unknown>
): boolean {
  return (
    existing.name !== expected.name ||
    existing.slug !== expected.slug ||
    (existing.description ?? null) !== (expected.description ?? null) ||
    (existing.layout ?? "grid") !== expected.layout ||
    stableJson(existing.config ?? {}) !== stableJson(expected.config)
  );
}

async function ensureEntryTeaserListingQuery({
  adminUrl,
  sessionValue,
  csrfToken,
  listingQueries,
  contentTypeId,
  fallbackOnly,
}: {
  adminUrl: string;
  sessionValue: string;
  csrfToken: string;
  listingQueries: EntryTeaserFixtureListingQueryListItem[];
  contentTypeId: string;
  fallbackOnly: boolean;
}): Promise<string> {
  const expected = buildEntryTeaserListingQueryPayload(contentTypeId, { fallbackOnly });
  const name = String(expected.name);
  const existing = listingQueries.find((item) => item.name === name);
  if (!existing) {
    const created = await requestAdminJson<EntryTeaserFixtureListingQueryListItem>({
      adminUrl,
      sessionValue,
      path: "/api/listings/queries",
      method: "POST",
      body: expected,
      csrfToken,
    });
    return created.id;
  }

  if (entryTeaserListingQueryDrifted(existing, expected)) {
    await requestAdminJson<EntryTeaserFixtureListingQueryListItem>({
      adminUrl,
      sessionValue,
      path: `/api/listings/queries/${encodeURIComponent(existing.id)}`,
      method: "PATCH",
      body: expected,
      csrfToken,
    });
  }

  return existing.id;
}

async function ensureEntryTeaserListingTemplate({
  adminUrl,
  sessionValue,
  csrfToken,
  listingTemplates,
}: {
  adminUrl: string;
  sessionValue: string;
  csrfToken: string;
  listingTemplates: EntryTeaserFixtureListingTemplateListItem[];
}): Promise<string> {
  const expected = buildEntryTeaserListingTemplatePayload();
  const existing = listingTemplates.find(
    (item) => item.slug === entryTeaserFixtureListingTemplateSlug
  );
  if (!existing) {
    const created = await requestAdminJson<EntryTeaserFixtureListingTemplateListItem>({
      adminUrl,
      sessionValue,
      path: "/api/listings/templates",
      method: "POST",
      body: expected,
      csrfToken,
    });
    return created.id;
  }

  if (entryTeaserListingTemplateDrifted(existing, expected)) {
    await requestAdminJson<EntryTeaserFixtureListingTemplateListItem>({
      adminUrl,
      sessionValue,
      path: `/api/listings/templates/${encodeURIComponent(existing.id)}`,
      method: "PATCH",
      body: expected,
      csrfToken,
    });
  }

  return existing.id;
}

export async function ensureEntryTeaserWidgetFixtures(
  adminUrl: string,
  sessionValue: string,
  selectedCases: WidgetSmokeCase[]
): Promise<void> {
  if (!selectedCasesNeedEntryTeaserFixtures(selectedCases)) {
    return;
  }

  let csrfToken: string | null = null;
  const ensureCsrf = async () => {
    if (csrfToken) return csrfToken;
    csrfToken = await fetchAdminCsrfToken(adminUrl, sessionValue);
    return csrfToken;
  };

  const contentTypesPayload = await requestAdminJson<
    EntryTeaserFixtureContentTypeListItem[] | { items?: EntryTeaserFixtureContentTypeListItem[] }
  >({
    adminUrl,
    sessionValue,
    path: "/api/content-types",
  });
  const contentTypes = normalizeEntryTeaserFixtureContentTypes(contentTypesPayload);
  let contentType = contentTypes.find((item) => item.slug === entryTeaserFixtureContentTypeSlug);
  if (!contentType) {
    contentType = await requestAdminJson<EntryTeaserFixtureContentTypeListItem>({
      adminUrl,
      sessionValue,
      path: "/api/content-types",
      method: "POST",
      body: {
        name: entryTeaserFixtureContentTypeName,
        slug: entryTeaserFixtureContentTypeSlug,
        schema: buildEntryTeaserFixtureSchema(),
        status: "published",
      },
      csrfToken: await ensureCsrf(),
    });
  } else {
    const patch = buildEntryTeaserFixtureContentTypePatch(contentType);
    if (patch) {
      contentType = await requestAdminJson<EntryTeaserFixtureContentTypeListItem>({
        adminUrl,
        sessionValue,
        path: `/api/content-types/${encodeURIComponent(contentType.id)}`,
        method: "PATCH",
        body: patch,
        csrfToken: await ensureCsrf(),
      });
    }
  }

  if (!contentType?.id) {
    throw new Error("entry_teaser_fixture_content_type_id_missing");
  }

  const settingsPayload = await requestAdminJson<EntryTeaserFixtureSettingsPayload>({
    adminUrl,
    sessionValue,
    path: "/api/settings",
  });
  const currentRoutes = normalizeEntryTeaserFixtureContentRoutes(
    settingsPayload["site.contentRoutes"]
  );
  const nextRoutes = buildEntryTeaserFixtureContentRoutes(currentRoutes);
  if (stableJson(currentRoutes) !== stableJson(nextRoutes)) {
    await requestAdminJson<EntryTeaserFixtureSettingsPayload>({
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

  const entriesPayload = await requestAdminJson<
    EntryTeaserFixtureEntryListItem[] | { items?: EntryTeaserFixtureEntryListItem[] }
  >({
    adminUrl,
    sessionValue,
    path: `/api/content/${encodeURIComponent(entryTeaserFixtureContentTypeSlug)}/entries`,
  });
  const entryBySlug = new Map(
    normalizeEntryTeaserFixtureEntries(entriesPayload).map((item) => [item.slug, item] as const)
  );
  const entryIdsByKey = new Map<EntryTeaserFixtureEntrySeed["key"], string>();

  for (const seed of entryTeaserFixtureEntrySeeds) {
    const existing = entryBySlug.get(seed.slug);
    let entryId = existing?.id;
    if (!existing) {
      const created = await requestAdminJson<EntryTeaserFixtureEntryListItem>({
        adminUrl,
        sessionValue,
        path: `/api/content/${encodeURIComponent(entryTeaserFixtureContentTypeSlug)}/entries`,
        method: "POST",
        body: {
          title: seed.title,
          slug: seed.slug,
          data: buildEntryTeaserFixtureEntryData(seed),
        },
        csrfToken: await ensureCsrf(),
      });
      entryId = created.id;
      entryBySlug.set(seed.slug, created);
    } else {
      const patch = buildEntryTeaserFixtureEntryPatch(existing, seed);
      if (patch) {
        await requestAdminJson<EntryTeaserFixtureEntryListItem>({
          adminUrl,
          sessionValue,
          path: `/api/content/${encodeURIComponent(
            entryTeaserFixtureContentTypeSlug
          )}/entries/${encodeURIComponent(existing.id)}`,
          method: "PATCH",
          body: patch,
          csrfToken: await ensureCsrf(),
        });
      }
    }

    if (!entryId) {
      throw new Error(`entry_teaser_fixture_entry_id_missing:${seed.slug}`);
    }

    await requestAdminJson<EntryTeaserFixtureEntryListItem>({
      adminUrl,
      sessionValue,
      path: `/api/content/${encodeURIComponent(
        entryTeaserFixtureContentTypeSlug
      )}/entries/${encodeURIComponent(entryId)}/metadata`,
      method: "PATCH",
      body: entryTeaserFixtureMetadataPayload(seed),
      csrfToken: await ensureCsrf(),
    });
    await requestAdminJson<{ ok: boolean }>({
      adminUrl,
      sessionValue,
      path: `/api/content/${encodeURIComponent(
        entryTeaserFixtureContentTypeSlug
      )}/entries/${encodeURIComponent(entryId)}/publish`,
      method: "POST",
      csrfToken: await ensureCsrf(),
    });
    entryIdsByKey.set(seed.key, entryId);
  }

  const listingQueriesPayload = await requestAdminJson<
    EntryTeaserFixtureListingQueryListItem[] | EntryTeaserFixtureListingQueryListPayload
  >({
    adminUrl,
    sessionValue,
    path: "/api/listings/queries",
  });
  const listingQueries = normalizeEntryTeaserFixtureListingQueries(listingQueriesPayload);
  const listingQueryId = await ensureEntryTeaserListingQuery({
    adminUrl,
    sessionValue,
    csrfToken: await ensureCsrf(),
    listingQueries,
    contentTypeId: contentType.id,
    fallbackOnly: false,
  });
  const listingFallbackQueryId = await ensureEntryTeaserListingQuery({
    adminUrl,
    sessionValue,
    csrfToken: await ensureCsrf(),
    listingQueries,
    contentTypeId: contentType.id,
    fallbackOnly: true,
  });

  const listingTemplatesPayload = await requestAdminJson<
    EntryTeaserFixtureListingTemplateListItem[] | EntryTeaserFixtureListingTemplateListPayload
  >({
    adminUrl,
    sessionValue,
    path: "/api/listings/templates",
  });
  const listingTemplateId = await ensureEntryTeaserListingTemplate({
    adminUrl,
    sessionValue,
    csrfToken: await ensureCsrf(),
    listingTemplates: normalizeEntryTeaserFixtureListingTemplates(listingTemplatesPayload),
  });

  const context: EntryTeaserFixtureContext = {
    contentTypeId: contentType.id,
    listingQueryId,
    listingFallbackQueryId,
    listingTemplateId,
    manualEntryId: entryIdsByKey.get("manual") ?? "",
    featuredEntryId: entryIdsByKey.get("featured") ?? "",
    fallbackEntryId: entryIdsByKey.get("fallback") ?? "",
  };

  if (!context.manualEntryId || !context.featuredEntryId || !context.fallbackEntryId) {
    throw new Error("entry_teaser_fixture_entry_context_incomplete");
  }

  const pages = await requestAdminJson<ContentListFixturePageListItem[]>({
    adminUrl,
    sessionValue,
    path: "/api/pages",
  });

  for (const item of selectedCases.filter((current) =>
    entryTeaserFixtureWidgetTypes.has(current.widgetType)
  )) {
    const expectedSlug = normalizeFixtureSlug(item.adminFixtureSlug);
    const pageRow = pages.find((page) => normalizeFixtureSlug(page.slug) === expectedSlug);
    if (!pageRow) {
      throw new Error(`entry_teaser_fixture_page_not_found:${item.adminFixtureSlug}`);
    }
    const detail = await requestAdminJson<ContentListFixturePageDetail>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
    });
    const data = buildEntryTeaserFixturePageData(detail.currentData, context);
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
