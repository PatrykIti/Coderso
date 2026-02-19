import { afterAll, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  commerceCollections,
  commerceProductCollections,
  commerceProducts,
} from "../../../core/db/schema";
import {
  createCommerceCollection,
  createCommerceProduct,
  getCommerceProduct,
  listCommerceCollections,
  listCommerceProducts,
  updateCommerceProduct,
} from "../../../core/services/commerce/commerceService";

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

const cleanup = async () => {
  if (!hasDb) return;
  await db.delete(commerceProductCollections);
  await db.delete(commerceProducts);
  await db.delete(commerceCollections);
};

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

testIfDb("createCommerceProduct stores normalized payload with collection links", async () => {
  const collection = await createCommerceCollection({
    name: `Modern ${randomUUID()}`,
  });

  const product = await createCommerceProduct({
    title: "Oak Residence",
    pricing: { amount: 450000, currency: "usd", compareAtAmount: 470000 },
    stock: { state: "in_stock", quantity: 2 },
    collectionIds: [collection.id],
    variants: [
      {
        title: "Standard",
        pricing: { amount: 450000, currency: "USD", compareAtAmount: null },
        stock: { state: "in_stock", quantity: 1 },
        attributes: { finish: "oak" },
        isDefault: true,
      },
    ],
  });

  expect(product.slug).toBe("oak-residence");
  expect(product.pricing.currency).toBe("USD");
  expect(product.collectionIds).toEqual([collection.id]);
  expect(product.variants).toHaveLength(1);

  const rows = await db
    .select({
      productId: commerceProductCollections.productId,
      collectionId: commerceProductCollections.collectionId,
    })
    .from(commerceProductCollections)
    .where(eq(commerceProductCollections.productId, product.id));
  expect(rows).toHaveLength(1);
});

testIfDb("updateCommerceProduct controls publish lifecycle and keeps slug when title changes", async () => {
  const created = await createCommerceProduct({
    title: "Pine Loft",
    pricing: { amount: 200000, currency: "USD", compareAtAmount: null },
    stock: { state: "out_of_stock", quantity: 0 },
  });
  const originalSlug = created.slug;

  const published = await updateCommerceProduct(created.id, {
    title: "Pine Loft Updated",
    status: "published",
  });
  expect(published).not.toBeNull();
  expect(published?.slug).toBe(originalSlug);
  expect(published?.publishedAt).not.toBeNull();

  const archived = await updateCommerceProduct(created.id, {
    status: "archived",
  });
  expect(archived).not.toBeNull();
  expect(archived?.publishedAt).toBeNull();
});

testIfDb("product and collection slug uniqueness is enforced", async () => {
  await createCommerceCollection({
    name: "Collection A",
    slug: "shared-slug",
  });
  await expect(
    createCommerceCollection({
      name: "Collection B",
      slug: "shared-slug",
    })
  ).rejects.toThrow("commerce_collection_slug_exists");

  await createCommerceProduct({
    title: "Home A",
    slug: "shared-product-slug",
    pricing: { amount: 1000, currency: "USD", compareAtAmount: null },
    stock: { state: "in_stock", quantity: 1 },
  });
  await expect(
    createCommerceProduct({
      title: "Home B",
      slug: "shared-product-slug",
      pricing: { amount: 1200, currency: "USD", compareAtAmount: null },
      stock: { state: "in_stock", quantity: 1 },
    })
  ).rejects.toThrow("commerce_product_slug_exists");
});

testIfDb("list/get helpers return hydrated products and collections", async () => {
  const collection = await createCommerceCollection({
    name: "Premium",
  });
  const product = await createCommerceProduct({
    title: "Cedar Villa",
    pricing: { amount: 700000, currency: "USD", compareAtAmount: null },
    stock: { state: "backorder", quantity: 1 },
    collectionIds: [collection.id],
  });

  const products = await listCommerceProducts();
  const collections = await listCommerceCollections();
  const fetched = await getCommerceProduct(product.id);

  expect(products).toHaveLength(1);
  expect(collections).toHaveLength(1);
  expect(fetched?.collectionIds).toEqual([collection.id]);
});
