import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  commerceCollections,
  commerceProductCollections,
  commerceProducts,
  pageRevisions,
  pages,
  previewTokens,
  users,
} from "../../../core/db/schema";
import {
  createCommerceCollection,
  createCommerceProduct,
} from "../../../core/services/commerce/commerceService";
import { createPage, publishPage } from "../../../core/services/pages/pageService";
import {
  deleteSetting,
  getSettingRecord,
  setSetting,
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
const trackedProductIds = new Set<string>();
const trackedCollectionIds = new Set<string>();
const trackedUserIds = new Set<string>();
const settingSnapshots = new Map<string, { exists: boolean; value: unknown }>();

const trackPage = (id: string | undefined | null) => {
  if (id) trackedPageIds.add(id);
};

const trackProduct = (id: string | undefined | null) => {
  if (id) trackedProductIds.add(id);
};

const trackCollection = (id: string | undefined | null) => {
  if (id) trackedCollectionIds.add(id);
};

const trackUser = (id: string | undefined | null) => {
  if (id) trackedUserIds.add(id);
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
  const productIds = [...trackedProductIds];
  const collectionIds = [...trackedCollectionIds];
  const userIds = [...trackedUserIds];

  if (pageIds.length > 0) {
    await db.delete(previewTokens).where(inArray(previewTokens.targetId, pageIds));
    await db.delete(pageRevisions).where(inArray(pageRevisions.pageId, pageIds));
    await db.delete(pages).where(inArray(pages.id, pageIds));
  }

  if (productIds.length > 0) {
    await db
      .delete(commerceProductCollections)
      .where(inArray(commerceProductCollections.productId, productIds));
    await db.delete(commerceProducts).where(inArray(commerceProducts.id, productIds));
  }

  if (collectionIds.length > 0) {
    await db.delete(commerceCollections).where(inArray(commerceCollections.id, collectionIds));
  }

  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }

  trackedPageIds.clear();
  trackedProductIds.clear();
  trackedCollectionIds.clear();
  trackedUserIds.clear();
};

afterEach(async () => {
  clearSiteCache();
  resetRateLimitBuckets();
  if (!hasDb) return;
  await restoreSettings();
  await cleanupTrackedRows();
});

const requestPublicPath = (pathname: string) =>
  handlePublicRequest(
    new Request(`http://public.coderso.test${pathname}`, {
      headers: {
        "user-agent": "product-table-runtime-pagination-test",
        "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
      },
    })
  );

const createActor = async () => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `product-table-runtime-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  trackUser(actor?.id);
  if (!actor?.id) throw new Error("missing_product_table_runtime_actor");
  return actor;
};

const buildPageData = (primaryCollectionId: string, secondaryCollectionId: string) => ({
  blocks: [
    {
      id: "product-table-1",
      type: "product-table",
      variant: "default",
      data: {
        source: {
          limit: 12,
          search: "",
          collectionIds: [primaryCollectionId, secondaryCollectionId],
          status: ["draft", "published"],
          sortField: "updatedAt",
          sortDir: "desc",
        },
        fields: {
          showTitle: true,
          showSlug: false,
          showPrice: true,
          showStatus: false,
          showStock: false,
          showCompareAt: false,
          showCollectionCount: false,
        },
        controls: {
          showSearchInput: true,
          showCollectionFilter: true,
          showStatusFilter: true,
          sorting: "interactive",
          pagination: "paged",
          pageSize: 2,
        },
      },
    },
  ],
  settings: {
    template: "landing",
    showInNav: false,
  },
});

testIfDbWithOptions(
  "product table public runtime honors SSR query params and rejects unsafe public status filters",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);

    const primaryCollection = await createCommerceCollection({
      name: `Primary Collection ${token}`,
    });
    const secondaryCollection = await createCommerceCollection({
      name: `Secondary Collection ${token}`,
    });
    trackCollection(primaryCollection.id);
    trackCollection(secondaryCollection.id);

    const createPublishedProduct = async (title: string, collectionIds: string[]) => {
      const product = await createCommerceProduct({
        title,
        status: "published",
        pricing: { amount: 120000, currency: "USD", compareAtAmount: null },
        stock: { state: "in_stock", quantity: 2 },
        collectionIds,
      });
      trackProduct(product.id);
      return product;
    };

    await createPublishedProduct(`Alpha Home ${token}`, [primaryCollection.id]);
    await createPublishedProduct(`Beta Home ${token}`, [primaryCollection.id]);
    await createPublishedProduct(`Gamma Home ${token}`, [primaryCollection.id]);
    await createPublishedProduct(`Omega Home ${token}`, [primaryCollection.id]);
    await createPublishedProduct(`Zeta Home ${token}`, [secondaryCollection.id]);

    const draftProduct = await createCommerceProduct({
      title: `Draft Home ${token}`,
      status: "draft",
      pricing: { amount: 120000, currency: "USD", compareAtAmount: null },
      stock: { state: "in_stock", quantity: 1 },
      collectionIds: [primaryCollection.id],
    });
    trackProduct(draftProduct.id);

    const slug = `/product-table-runtime-${token}`;
    const data = buildPageData(primaryCollection.id, secondaryCollection.id);
    const page = await createPage({
      title: `Product Table Runtime ${token}`,
      slug,
      authorId: actor.id,
      data,
    });
    trackPage(page?.id);
    if (!page?.id) throw new Error("missing_product_table_runtime_page");

    await publishPage(page.id, actor.id, data);

    const response = await requestPublicPath(
      `${slug}?foo=bar&pt.product-table-1.q=home&pt.product-table-1.collection=${encodeURIComponent(primaryCollection.id)}&pt.product-table-1.status=draft&pt.product-table-1.sort=title&pt.product-table-1.dir=asc&pt.product-table-1.page=2`
    );
    expect(response.status).toBe(200);
    const html = await response.text();

    expect(html).toContain('data-widget="product-table"');
    expect(html).toContain('data-product-table-page="2"');
    expect(html).toContain("Showing 3-4 of 4 products");
    expect(html).toContain("Page <!-- -->2<!-- --> of <!-- -->2");
    expect(html).toContain(`Gamma Home ${token}`);
    expect(html).toContain(`Omega Home ${token}`);
    expect(html).not.toContain(`Alpha Home ${token}`);
    expect(html).not.toContain(`Beta Home ${token}`);
    expect(html).not.toContain(`Zeta Home ${token}`);
    expect(html).not.toContain(`Draft Home ${token}`);
    expect(html).toContain('aria-sort="ascending"');
    expect(html).toContain('aria-label="Sort by Product descending"');
    expect(html).toContain('name="pt.product-table-1.q"');
    expect(html).toContain('value="home"');
    expect(html).toContain('name="pt.product-table-1.collection"');
    expect(html).toContain(`value="${primaryCollection.id}"`);
    expect(html).toContain('checked=""');
    expect(html).toContain('href="?foo=bar"');
    expect(html).toContain("Ignored invalid table parameters.");
  },
  { timeout: dbRuntimeTimeout }
);
