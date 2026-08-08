import type { WidgetSmokeCase } from "../contracts";
import {
  commerceFixtureCollectionSeeds,
  commerceFixtureProductSeeds,
  type CommerceCollectionListItem,
  type CommerceFixtureProductSeed,
  type CommerceFixtureSettingsPayload,
  type CommerceProductListItem,
  type ContentListFixturePageDetail,
  type ContentListFixturePageListItem,
  type MediaFixtureListItem,
  type MediaFixtureListPayload,
} from "../fixture-data";
import { fetchAdminCsrfToken, requestAdminJson } from "../auth";
import {
  productCompareFixtureWidgetTypes,
  productGalleryFixtureWidgetTypes,
  productTableFixtureWidgetTypes,
  selectedCasesNeedCommerceFixtures,
  selectedCasesNeedProductCompareFixture,
  selectedCasesNeedProductGalleryFixture,
  selectedCasesNeedProductTableFixture,
} from "../fixture-selection";
import {
  buildCommerceFixtureContentRoutes,
  buildProductCompareFixturePageData,
  buildProductGalleryFixturePageData,
  buildProductTableFixturePageData,
  normalizeCommerceFixtureContentRoutes,
} from "./content-builders";
import { normalizeFixtureSlug, stableJson } from "./content-seeding";

export function buildCommerceFixtureProductPatch(
  existing: CommerceProductListItem,
  seed: CommerceFixtureProductSeed,
  expectedMediaIds: string[] = []
): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {};
  if (existing.title !== seed.title) patch.title = seed.title;
  if ((existing.excerpt ?? null) !== seed.excerpt) patch.excerpt = seed.excerpt;
  if ((existing.description ?? null) !== seed.description) patch.description = seed.description;
  if (existing.status !== seed.status) patch.status = seed.status;
  if (
    existing.pricing?.amount !== seed.pricing.amount ||
    existing.pricing?.currency !== seed.pricing.currency ||
    (existing.pricing?.compareAtAmount ?? null) !== seed.pricing.compareAtAmount
  ) {
    patch.pricing = seed.pricing;
  }
  if (
    existing.stock?.state !== seed.stock.state ||
    (existing.stock?.quantity ?? null) !== seed.stock.quantity
  ) {
    patch.stock = seed.stock;
  }
  if (expectedMediaIds.length > 0) {
    const existingMediaIds = Array.isArray(existing.mediaIds) ? [...existing.mediaIds].sort() : [];
    const sortedExpectedMediaIds = [...expectedMediaIds].sort();
    if (existingMediaIds.join(",") !== sortedExpectedMediaIds.join(",")) {
      patch.mediaIds = expectedMediaIds;
    }
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export function resolveCommerceFixtureCollectionIds(
  collectionBySlug: Map<string, CommerceCollectionListItem>,
  productSeed: CommerceFixtureProductSeed
): string[] {
  return productSeed.collectionSlugs
    .map((slug) => collectionBySlug.get(slug)?.id ?? "")
    .filter((id) => id.length > 0);
}

function resolveCommerceFixtureMediaIds(
  mediaByOriginalName: Map<string, MediaFixtureListItem>,
  productSeed: CommerceFixtureProductSeed
): string[] {
  if (!productSeed.mediaOriginalName) return [];
  const media = mediaByOriginalName.get(productSeed.mediaOriginalName);
  if (!media || media.type !== "image" || !media.id) return [];
  return [media.id];
}
export async function ensureCommerceWidgetFixtures(
  adminUrl: string,
  sessionValue: string,
  selectedCases: WidgetSmokeCase[]
): Promise<void> {
  if (!selectedCasesNeedCommerceFixtures(selectedCases)) {
    return;
  }

  const collectionsPayload = await requestAdminJson<{ items?: CommerceCollectionListItem[] }>({
    adminUrl,
    sessionValue,
    path: "/api/commerce/collections",
  });
  const collectionBySlug = new Map(
    (collectionsPayload.items ?? []).map((item) => [item.slug, item] as const)
  );
  const needsCommerceMedia =
    selectedCasesNeedProductGalleryFixture(selectedCases) ||
    selectedCasesNeedProductCompareFixture(selectedCases) ||
    selectedCasesNeedProductTableFixture(selectedCases);
  const mediaPayload = needsCommerceMedia
    ? await requestAdminJson<MediaFixtureListItem[] | MediaFixtureListPayload>({
        adminUrl,
        sessionValue,
        path: "/api/media",
      })
    : { items: [] };
  const mediaItems = Array.isArray(mediaPayload) ? mediaPayload : (mediaPayload.items ?? []);
  const mediaByOriginalName = new Map(
    mediaItems
      .filter((item) => typeof item.originalName === "string")
      .map((item) => [item.originalName as string, item] as const)
  );

  let csrfToken: string | null = null;
  const ensureCsrf = async () => {
    if (csrfToken) return csrfToken;
    csrfToken = await fetchAdminCsrfToken(adminUrl, sessionValue);
    return csrfToken;
  };

  const needsCommerceProductRoute =
    selectedCasesNeedProductCompareFixture(selectedCases) ||
    selectedCasesNeedProductTableFixture(selectedCases);
  if (needsCommerceProductRoute) {
    const settingsPayload = await requestAdminJson<CommerceFixtureSettingsPayload>({
      adminUrl,
      sessionValue,
      path: "/api/settings",
    });
    const currentRoutes = normalizeCommerceFixtureContentRoutes(
      settingsPayload["site.contentRoutes"]
    );
    const nextRoutes = buildCommerceFixtureContentRoutes(currentRoutes);
    if (stableJson(currentRoutes) !== stableJson(nextRoutes)) {
      await requestAdminJson<CommerceFixtureSettingsPayload>({
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
  }

  for (const seed of commerceFixtureCollectionSeeds) {
    if (collectionBySlug.has(seed.slug)) continue;
    const created = await requestAdminJson<CommerceCollectionListItem>({
      adminUrl,
      sessionValue,
      path: "/api/commerce/collections",
      method: "POST",
      body: {
        name: seed.name,
        slug: seed.slug,
        description: seed.description,
      },
      csrfToken: await ensureCsrf(),
    });
    collectionBySlug.set(created.slug, created);
  }

  const productsPayload = await requestAdminJson<{ items?: CommerceProductListItem[] }>({
    adminUrl,
    sessionValue,
    path: "/api/commerce/products",
  });
  const productBySlug = new Map(
    (productsPayload.items ?? []).map((item) => [item.slug, item] as const)
  );

  for (const seed of commerceFixtureProductSeeds) {
    const existing = productBySlug.get(seed.slug);
    const collectionIds = resolveCommerceFixtureCollectionIds(collectionBySlug, seed);
    const mediaIds = resolveCommerceFixtureMediaIds(mediaByOriginalName, seed);
    if (!existing) {
      const created = await requestAdminJson<CommerceProductListItem>({
        adminUrl,
        sessionValue,
        path: "/api/commerce/products",
        method: "POST",
        body: {
          title: seed.title,
          slug: seed.slug,
          status: seed.status,
          excerpt: seed.excerpt,
          description: seed.description,
          pricing: seed.pricing,
          stock: seed.stock,
          ...(mediaIds.length > 0 ? { mediaIds } : {}),
        },
        csrfToken: await ensureCsrf(),
      });
      productBySlug.set(created.slug, created);
      if (collectionIds.length > 0) {
        await requestAdminJson<CommerceProductListItem>({
          adminUrl,
          sessionValue,
          path: `/api/commerce/products/${created.id}/collections`,
          method: "PUT",
          body: { collectionIds },
          csrfToken: await ensureCsrf(),
        });
      }
      continue;
    }

    const patch = buildCommerceFixtureProductPatch(existing, seed, mediaIds);
    if (patch) {
      await requestAdminJson<CommerceProductListItem>({
        adminUrl,
        sessionValue,
        path: `/api/commerce/products/${existing.id}`,
        method: "PATCH",
        body: patch,
        csrfToken: await ensureCsrf(),
      });
    }
    const existingCollections = Array.isArray(existing.collectionIds)
      ? [...existing.collectionIds]
      : [];
    const expectedCollections = [...collectionIds].sort();
    if (existingCollections.sort().join(",") !== expectedCollections.join(",")) {
      await requestAdminJson<CommerceProductListItem>({
        adminUrl,
        sessionValue,
        path: `/api/commerce/products/${existing.id}/collections`,
        method: "PUT",
        body: { collectionIds },
        csrfToken: await ensureCsrf(),
      });
    }
  }

  if (selectedCasesNeedProductGalleryFixture(selectedCases)) {
    const pages = await requestAdminJson<ContentListFixturePageListItem[]>({
      adminUrl,
      sessionValue,
      path: "/api/pages",
    });

    for (const item of selectedCases.filter((current) =>
      productGalleryFixtureWidgetTypes.has(current.widgetType)
    )) {
      const expectedSlug = normalizeFixtureSlug(item.adminFixtureSlug);
      const pageRow = pages.find((page) => normalizeFixtureSlug(page.slug) === expectedSlug);
      if (!pageRow) {
        throw new Error(`product_gallery_fixture_page_not_found:${item.adminFixtureSlug}`);
      }
      const detail = await requestAdminJson<ContentListFixturePageDetail>({
        adminUrl,
        sessionValue,
        path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
      });
      const data = buildProductGalleryFixturePageData(detail.currentData);
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

  if (selectedCasesNeedProductCompareFixture(selectedCases)) {
    const pages = await requestAdminJson<ContentListFixturePageListItem[]>({
      adminUrl,
      sessionValue,
      path: "/api/pages",
    });

    for (const item of selectedCases.filter((current) =>
      productCompareFixtureWidgetTypes.has(current.widgetType)
    )) {
      const expectedSlug = normalizeFixtureSlug(item.adminFixtureSlug);
      const pageRow = pages.find((page) => normalizeFixtureSlug(page.slug) === expectedSlug);
      if (!pageRow) {
        throw new Error(`product_compare_fixture_page_not_found:${item.adminFixtureSlug}`);
      }
      const detail = await requestAdminJson<ContentListFixturePageDetail>({
        adminUrl,
        sessionValue,
        path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
      });
      const data = buildProductCompareFixturePageData(detail.currentData);
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

  if (selectedCasesNeedProductTableFixture(selectedCases)) {
    const pages = await requestAdminJson<ContentListFixturePageListItem[]>({
      adminUrl,
      sessionValue,
      path: "/api/pages",
    });

    for (const item of selectedCases.filter((current) =>
      productTableFixtureWidgetTypes.has(current.widgetType)
    )) {
      const expectedSlug = normalizeFixtureSlug(item.adminFixtureSlug);
      const pageRow = pages.find((page) => normalizeFixtureSlug(page.slug) === expectedSlug);
      if (!pageRow) {
        throw new Error(`product_table_fixture_page_not_found:${item.adminFixtureSlug}`);
      }
      const detail = await requestAdminJson<ContentListFixturePageDetail>({
        adminUrl,
        sessionValue,
        path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
      });
      const data = buildProductTableFixturePageData(detail.currentData);
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
}
