import { afterAll, beforeEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  commerceCollections,
  commerceProductCollections,
  commerceProducts,
} from "../../../core/db/schema";

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

testIfDb("commerce tables accept inserts and cascade relation rows", async () => {
  const [collection] = await db
    .insert(commerceCollections)
    .values({
      name: "Modern Homes",
      slug: "modern-homes",
      description: "Catalog of modern properties",
    })
    .returning();

  const [product] = await db
    .insert(commerceProducts)
    .values({
      title: "Oak Residence",
      slug: "oak-residence",
      status: "draft",
      pricing: { amount: 0, currency: "USD", compareAtAmount: null },
      stock: { state: "in_stock", quantity: null },
      mediaIds: [],
      metadata: {},
      data: { bedrooms: 4 },
    })
    .returning();

  await db.insert(commerceProductCollections).values({
    productId: product.id,
    collectionId: collection.id,
  });

  await db.delete(commerceProducts).where(eq(commerceProducts.id, product.id));

  const relationRows = await db
    .select({ productId: commerceProductCollections.productId })
    .from(commerceProductCollections)
    .where(eq(commerceProductCollections.collectionId, collection.id));

  expect(relationRows.length).toBe(0);
});

testIfDb("commerce product slug must be unique", async () => {
  await db.insert(commerceProducts).values({
    title: "Pine Residence",
    slug: "pine-residence",
    status: "draft",
    pricing: { amount: 0, currency: "USD", compareAtAmount: null },
    stock: { state: "in_stock", quantity: null },
    mediaIds: [],
    metadata: {},
    data: {},
  });

  await expect(
    db
      .insert(commerceProducts)
      .values({
        title: "Pine Residence Copy",
        slug: "pine-residence",
        status: "draft",
        pricing: { amount: 0, currency: "USD", compareAtAmount: null },
        stock: { state: "in_stock", quantity: null },
        mediaIds: [],
        metadata: {},
        data: {},
      })
      .execute()
  ).rejects.toThrow();
});
