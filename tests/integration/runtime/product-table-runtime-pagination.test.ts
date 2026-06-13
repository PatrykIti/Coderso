import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { db } from "../../../core/db/client";
import {
  commerceCollections,
  commerceProductCollections,
  commerceProducts,
} from "../../../core/db/schema";
import {
  createCommerceCollection,
  createCommerceProduct,
} from "../../../core/services/commerce/commerceService";
import { hydrateProductTableRuntimeData } from "../../../core/services/commerce/commerceWidgetRuntime";
import {
  ProductTableBlock,
  type ProductTableControls,
  type ProductTableData,
} from "../../../core/widgets/core/productTable";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;
const dbRuntimeTimeout = 15_000;
const slowDbRuntimeTimeout = 30_000;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const trackedProductIds = new Set<string>();
const trackedCollectionIds = new Set<string>();

const trackProduct = (id: string | undefined | null) => {
  if (id) trackedProductIds.add(id);
};

const trackCollection = (id: string | undefined | null) => {
  if (id) trackedCollectionIds.add(id);
};

const cleanupTrackedRows = async () => {
  const productIds = [...trackedProductIds];
  const collectionIds = [...trackedCollectionIds];

  if (productIds.length > 0) {
    await db
      .delete(commerceProductCollections)
      .where(inArray(commerceProductCollections.productId, productIds));
    await db.delete(commerceProducts).where(inArray(commerceProducts.id, productIds));
  }

  if (collectionIds.length > 0) {
    await db.delete(commerceCollections).where(inArray(commerceCollections.id, collectionIds));
  }

  trackedProductIds.clear();
  trackedCollectionIds.clear();
};

afterEach(async () => {
  resetRateLimitBuckets();
  if (!hasDb) return;
  await cleanupTrackedRows();
});

const buildPageData = (
  primaryCollectionId: string,
  secondaryCollectionId: string,
  controls: ProductTableControls = {
    showSearchInput: true,
    showCollectionFilter: true,
    showStatusFilter: true,
    sorting: "interactive" as const,
    pagination: "paged" as const,
    pageSize: 2,
  }
) => ({
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
        controls,
      },
    },
  ],
  settings: {
    template: "landing",
    showInNav: false,
  },
});

const renderProductTablePath = async (pathname: string, data: ReturnType<typeof buildPageData>) => {
  const url = new URL(`http://public.coderso.test${pathname}`);
  const block = data.blocks[0];
  if (!block) throw new Error("missing_product_table_block");
  const hydrated = await hydrateProductTableRuntimeData(block.data as ProductTableData, {
    preview: false,
    runtimeSearchParams: url.searchParams,
    blockId: block.id,
    cache: new Map(),
  });
  return renderToString(
    createElement(ProductTableBlock, {
      data: hydrated,
      variant: block.variant,
      blockId: block.id,
    })
  );
};

testIfDbWithOptions(
  "product table public runtime honors SSR query params and rejects unsafe public status filters",
  async () => {
    resetRateLimitBuckets();

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

    const data = buildPageData(primaryCollection.id, secondaryCollection.id);
    const html = await renderProductTablePath(
      `/product-table-runtime-${token}?foo=bar&pt.product-table-1.q=home&pt.product-table-1.collection=${encodeURIComponent(primaryCollection.id)}&pt.product-table-1.status=draft&pt.product-table-1.sort=title&pt.product-table-1.dir=asc&pt.product-table-1.page=2`,
      data
    );

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
  { timeout: slowDbRuntimeTimeout }
);

testIfDbWithOptions(
  "product table public runtime supports load-more pagination and indicator-only sort affordances",
  async () => {
    resetRateLimitBuckets();

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

    const data = buildPageData(primaryCollection.id, secondaryCollection.id, {
      showSearchInput: true,
      showCollectionFilter: true,
      showStatusFilter: true,
      sorting: "indicator",
      pagination: "load-more",
      pageSize: 2,
    });
    const html = await renderProductTablePath(
      `/product-table-load-more-${token}?foo=bar&pt.product-table-1.q=home&pt.product-table-1.collection=${encodeURIComponent(primaryCollection.id)}&pt.product-table-1.sort=title&pt.product-table-1.dir=asc`,
      data
    );

    expect(html).toContain('data-widget="product-table"');
    expect(html).toContain('data-product-table-page="1"');
    expect(html).toContain("Showing 2 of 4 products");
    expect(html).toContain("Sort: <!-- -->Title ascending");
    expect(html).toContain("Load more");
    expect(html).toContain('aria-sort="ascending"');
    expect(html).not.toContain('aria-label="Sort by Product descending"');
    expect(html).not.toContain("Page <!-- -->1<!-- --> of <!-- -->2");
    expect(html).toContain(
      `href="?foo=bar&amp;pt.product-table-1.q=home&amp;pt.product-table-1.collection=${primaryCollection.id}&amp;pt.product-table-1.sort=title&amp;pt.product-table-1.dir=asc&amp;pt.product-table-1.page=2"`
    );
    expect(html).toContain(`Alpha Home ${token}`);
    expect(html).toContain(`Beta Home ${token}`);
    expect(html).not.toContain(`Gamma Home ${token}`);
    expect(html).not.toContain(`Omega Home ${token}`);
    expect(html).not.toContain(`Zeta Home ${token}`);
    expect(html).not.toContain(`Draft Home ${token}`);
  },
  { timeout: dbRuntimeTimeout }
);
