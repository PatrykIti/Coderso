import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";

import { db } from "../../db/client";
import {
  commerceCollections,
  commerceProductCollections,
  commerceProducts,
} from "../../db/schema";
import type {
  CommerceCollection,
  CommerceMoney,
  CommerceProduct,
  CommerceProductStatus,
  CommerceStock,
  CommerceVariant,
} from "./commerceTypes";
import {
  commerceDefaults,
  normalizeCommerceMoney,
  normalizeCommerceProductStatus,
  normalizeCommerceSlug,
  normalizeCommerceStock,
} from "./commerceValidation";

export type CommerceProductCreateInput = {
  title: string;
  slug?: string | null;
  status?: CommerceProductStatus;
  excerpt?: string | null;
  description?: string | null;
  pricing: unknown;
  stock: unknown;
  collectionIds?: unknown;
  mediaIds?: unknown;
  variants?: unknown;
  metadata?: unknown;
  data?: unknown;
};

export type CommerceProductUpdateInput = {
  title?: string;
  slug?: string | null;
  status?: CommerceProductStatus;
  excerpt?: string | null;
  description?: string | null;
  pricing?: unknown;
  stock?: unknown;
  collectionIds?: unknown;
  mediaIds?: unknown;
  variants?: unknown;
  metadata?: unknown;
  data?: unknown;
};

export type CommerceCollectionCreateInput = {
  name: string;
  slug?: string | null;
  description?: string | null;
};

export type CommerceCollectionUpdateInput = {
  name?: string;
  slug?: string | null;
  description?: string | null;
};

type DbExecutor = Pick<typeof db, "select" | "insert" | "update" | "delete">;
type ProductRow = typeof commerceProducts.$inferSelect;
type CollectionRow = typeof commerceCollections.$inferSelect;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeRequiredText = (value: unknown, errorCode: string, maxLength: number) => {
  if (typeof value !== "string") throw new Error(errorCode);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new Error(errorCode);
  return normalized;
};

const normalizeOptionalText = (value: unknown, errorCode: string, maxLength: number) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error(errorCode);
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error(errorCode);
  return normalized;
};

const normalizeObject = (value: unknown, errorCode: string) => {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) throw new Error(errorCode);
  return value;
};

const normalizeStringList = (
  value: unknown,
  errorCode: string,
  maxItems: number
): string[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(errorCode);
  if (value.length > maxItems) throw new Error(errorCode);
  const normalized = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
  return Array.from(new Set(normalized));
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const deriveSlug = (title: string, input?: string | null) =>
  normalizeCommerceSlug(input ?? slugify(title));

const safeStatus = (value: unknown): CommerceProductStatus => {
  try {
    return normalizeCommerceProductStatus(value, commerceDefaults.status);
  } catch {
    return commerceDefaults.status;
  }
};

const safeMoney = (value: unknown): CommerceMoney => {
  try {
    return normalizeCommerceMoney(value, commerceDefaults.currency);
  } catch {
    return {
      amount: 0,
      currency: commerceDefaults.currency,
      compareAtAmount: null,
    };
  }
};

const safeStock = (value: unknown): CommerceStock => {
  try {
    return normalizeCommerceStock(value);
  } catch {
    return {
      state: commerceDefaults.stockState,
      quantity: null,
    };
  }
};

const normalizeVariant = (value: unknown): CommerceVariant => {
  if (!isRecord(value)) throw new Error("commerce_variant_invalid");

  const title = normalizeRequiredText(value.title, "commerce_variant_title_invalid", 200);
  const sku = normalizeOptionalText(value.sku, "commerce_variant_sku_invalid", 128);
  const pricing = normalizeCommerceMoney(value.pricing, commerceDefaults.currency);
  const stock = normalizeCommerceStock(value.stock);
  const isDefault = typeof value.isDefault === "boolean" ? value.isDefault : false;

  const attributesRaw = value.attributes;
  if (attributesRaw !== undefined && !isRecord(attributesRaw)) {
    throw new Error("commerce_variant_attributes_invalid");
  }

  const attributes: Record<string, string> = {};
  if (isRecord(attributesRaw)) {
    for (const [key, rawValue] of Object.entries(attributesRaw)) {
      const normalizedKey = key.trim();
      if (!normalizedKey) continue;
      if (typeof rawValue !== "string") continue;
      const normalizedValue = rawValue.trim();
      if (!normalizedValue) continue;
      attributes[normalizedKey] = normalizedValue;
    }
  }

  const idRaw = value.id;
  const id = typeof idRaw === "string" && idRaw.trim().length > 0 ? idRaw.trim() : undefined;

  return {
    ...(id ? { id } : {}),
    sku,
    title,
    pricing,
    stock,
    attributes,
    isDefault,
  };
};

const normalizeVariantList = (value: unknown): CommerceVariant[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("commerce_variants_invalid");
  if (value.length > 100) throw new Error("commerce_variants_invalid");
  return value.map((entry) => normalizeVariant(entry));
};

const safeVariantList = (value: unknown): CommerceVariant[] => {
  try {
    return normalizeVariantList(value);
  } catch {
    return [];
  }
};

const toIso = (value: Date | null) => (value ? value.toISOString() : null);

const mapCollection = (row: CollectionRow): CommerceCollection => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const mapProduct = (
  row: ProductRow,
  collectionIdsByProduct: Map<string, string[]>
): CommerceProduct => {
  const data = isRecord(row.data) ? row.data : {};
  const variants = safeVariantList(data.variants);

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: safeStatus(row.status),
    excerpt: row.excerpt ?? null,
    description: row.description ?? null,
    pricing: safeMoney(row.pricing),
    stock: safeStock(row.stock),
    collectionIds: collectionIdsByProduct.get(row.id) ?? [],
    mediaIds: normalizeStringList(row.mediaIds, "commerce_media_ids_invalid", 100),
    variants,
    metadata: isRecord(row.metadata) ? row.metadata : {},
    data,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: toIso(row.publishedAt),
  };
};

const loadProductCollectionMap = async (productIds: string[]) => {
  if (productIds.length === 0) return new Map<string, string[]>();
  const rows = await db
    .select({
      productId: commerceProductCollections.productId,
      collectionId: commerceProductCollections.collectionId,
    })
    .from(commerceProductCollections)
    .where(inArray(commerceProductCollections.productId, productIds));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const bucket = map.get(row.productId) ?? [];
    bucket.push(row.collectionId);
    map.set(row.productId, bucket);
  }
  return map;
};

const assertCollectionIdsExist = async (executor: DbExecutor, collectionIds: string[]) => {
  if (collectionIds.length === 0) return;
  const rows = await executor
    .select({ id: commerceCollections.id })
    .from(commerceCollections)
    .where(inArray(commerceCollections.id, collectionIds));
  if (rows.length !== collectionIds.length) throw new Error("commerce_collection_not_found");
};

const assertProductSlugUnique = async (
  executor: DbExecutor,
  slug: string,
  excludeId?: string
) => {
  const condition = excludeId
    ? and(eq(commerceProducts.slug, slug), ne(commerceProducts.id, excludeId))
    : eq(commerceProducts.slug, slug);
  const [existing] = await executor
    .select({ id: commerceProducts.id })
    .from(commerceProducts)
    .where(condition);
  if (existing) throw new Error("commerce_product_slug_exists");
};

const assertCollectionSlugUnique = async (
  executor: DbExecutor,
  slug: string,
  excludeId?: string
) => {
  const condition = excludeId
    ? and(eq(commerceCollections.slug, slug), ne(commerceCollections.id, excludeId))
    : eq(commerceCollections.slug, slug);
  const [existing] = await executor
    .select({ id: commerceCollections.id })
    .from(commerceCollections)
    .where(condition);
  if (existing) throw new Error("commerce_collection_slug_exists");
};

const setProductCollections = async (
  executor: DbExecutor,
  productId: string,
  collectionIds: string[],
  now: Date
) => {
  await executor
    .delete(commerceProductCollections)
    .where(eq(commerceProductCollections.productId, productId));

  if (collectionIds.length === 0) return;
  await executor.insert(commerceProductCollections).values(
    collectionIds.map((collectionId) => ({
      productId,
      collectionId,
      createdAt: now,
    }))
  );
};

export async function listCommerceProducts(): Promise<CommerceProduct[]> {
  const rows = await db.select().from(commerceProducts).orderBy(desc(commerceProducts.updatedAt));
  const map = await loadProductCollectionMap(rows.map((row) => row.id));
  return rows.map((row) => mapProduct(row, map));
}

export async function getCommerceProduct(id: string): Promise<CommerceProduct | null> {
  const [row] = await db.select().from(commerceProducts).where(eq(commerceProducts.id, id));
  if (!row) return null;
  const map = await loadProductCollectionMap([row.id]);
  return mapProduct(row, map);
}

export async function getCommerceProductBySlug(slug: string): Promise<CommerceProduct | null> {
  const [row] = await db.select().from(commerceProducts).where(eq(commerceProducts.slug, slug));
  if (!row) return null;
  const map = await loadProductCollectionMap([row.id]);
  return mapProduct(row, map);
}

export async function createCommerceProduct(
  input: CommerceProductCreateInput
): Promise<CommerceProduct> {
  const title = normalizeRequiredText(input.title, "commerce_title_required", 200);
  const slug = deriveSlug(title, input.slug);
  const status = normalizeCommerceProductStatus(input.status, commerceDefaults.status);
  const excerpt = normalizeOptionalText(input.excerpt, "commerce_excerpt_invalid", 1000);
  const description = normalizeOptionalText(
    input.description,
    "commerce_description_invalid",
    20_000
  );
  const pricing = normalizeCommerceMoney(input.pricing, commerceDefaults.currency);
  const stock = normalizeCommerceStock(input.stock);
  const collectionIds = normalizeStringList(
    input.collectionIds,
    "commerce_collection_ids_invalid",
    100
  );
  const mediaIds = normalizeStringList(input.mediaIds, "commerce_media_ids_invalid", 100);
  const variants = normalizeVariantList(input.variants);
  const metadata = normalizeObject(input.metadata, "commerce_metadata_invalid");
  const data = {
    ...normalizeObject(input.data, "commerce_data_invalid"),
    variants,
  };

  const now = new Date();
  const publishedAt = status === "published" ? now : null;

  const createdId = await db.transaction(async (tx) => {
    await assertProductSlugUnique(tx, slug);
    await assertCollectionIdsExist(tx, collectionIds);

    const [created] = await tx
      .insert(commerceProducts)
      .values({
        title,
        slug,
        status,
        excerpt,
        description,
        pricing,
        stock,
        mediaIds,
        metadata,
        data,
        createdAt: now,
        updatedAt: now,
        publishedAt,
      })
      .returning({ id: commerceProducts.id });

    if (!created) throw new Error("commerce_product_create_failed");

    await setProductCollections(tx, created.id, collectionIds, now);
    return created.id;
  });

  const product = await getCommerceProduct(createdId);
  if (!product) throw new Error("commerce_product_not_found");
  return product;
}

export async function updateCommerceProduct(
  id: string,
  input: CommerceProductUpdateInput
): Promise<CommerceProduct | null> {
  const [current] = await db.select().from(commerceProducts).where(eq(commerceProducts.id, id));
  if (!current) return null;

  const title =
    input.title !== undefined
      ? normalizeRequiredText(input.title, "commerce_title_required", 200)
      : current.title;
  const slug =
    input.slug !== undefined ? deriveSlug(title, input.slug) : current.slug;
  const status =
    input.status !== undefined
      ? normalizeCommerceProductStatus(input.status, safeStatus(current.status))
      : safeStatus(current.status);
  const excerpt =
    input.excerpt !== undefined
      ? normalizeOptionalText(input.excerpt, "commerce_excerpt_invalid", 1000)
      : current.excerpt ?? null;
  const description =
    input.description !== undefined
      ? normalizeOptionalText(input.description, "commerce_description_invalid", 20_000)
      : current.description ?? null;
  const pricing =
    input.pricing !== undefined
      ? normalizeCommerceMoney(input.pricing, commerceDefaults.currency)
      : safeMoney(current.pricing);
  const stock = input.stock !== undefined ? normalizeCommerceStock(input.stock) : safeStock(current.stock);
  const mediaIds =
    input.mediaIds !== undefined
      ? normalizeStringList(input.mediaIds, "commerce_media_ids_invalid", 100)
      : normalizeStringList(current.mediaIds, "commerce_media_ids_invalid", 100);
  const variants =
    input.variants !== undefined
      ? normalizeVariantList(input.variants)
      : safeVariantList(isRecord(current.data) ? current.data.variants : []);
  const metadata =
    input.metadata !== undefined
      ? normalizeObject(input.metadata, "commerce_metadata_invalid")
      : isRecord(current.metadata)
        ? current.metadata
        : {};
  const nextDataBase =
    input.data !== undefined
      ? normalizeObject(input.data, "commerce_data_invalid")
      : isRecord(current.data)
        ? current.data
        : {};
  const data = {
    ...nextDataBase,
    variants,
  };
  const collectionIds =
    input.collectionIds !== undefined
      ? normalizeStringList(input.collectionIds, "commerce_collection_ids_invalid", 100)
      : null;

  const now = new Date();
  const publishedAt = status === "published" ? current.publishedAt ?? now : null;

  await db.transaction(async (tx) => {
    if (slug !== current.slug) {
      await assertProductSlugUnique(tx, slug, id);
    }
    if (collectionIds) {
      await assertCollectionIdsExist(tx, collectionIds);
    }

    await tx
      .update(commerceProducts)
      .set({
        title,
        slug,
        status,
        excerpt,
        description,
        pricing,
        stock,
        mediaIds,
        metadata,
        data,
        updatedAt: now,
        publishedAt,
      })
      .where(eq(commerceProducts.id, id));

    if (collectionIds !== null) {
      await setProductCollections(tx, id, collectionIds, now);
    }
  });

  return getCommerceProduct(id);
}

export async function deleteCommerceProduct(id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(commerceProducts)
    .where(eq(commerceProducts.id, id))
    .returning({ id: commerceProducts.id });
  return Boolean(deleted);
}

export async function listCommerceCollections(): Promise<CommerceCollection[]> {
  const rows = await db
    .select()
    .from(commerceCollections)
    .orderBy(asc(commerceCollections.name), asc(commerceCollections.createdAt));
  return rows.map((row) => mapCollection(row));
}

export async function getCommerceCollection(id: string): Promise<CommerceCollection | null> {
  const [row] = await db.select().from(commerceCollections).where(eq(commerceCollections.id, id));
  return row ? mapCollection(row) : null;
}

export async function createCommerceCollection(
  input: CommerceCollectionCreateInput
): Promise<CommerceCollection> {
  const name = normalizeRequiredText(input.name, "commerce_collection_name_required", 160);
  const slug = deriveSlug(name, input.slug);
  const description = normalizeOptionalText(
    input.description,
    "commerce_collection_description_invalid",
    1000
  );
  const now = new Date();

  const [row] = await db.transaction(async (tx) => {
    await assertCollectionSlugUnique(tx, slug);
    const inserted = await tx
      .insert(commerceCollections)
      .values({
        name,
        slug,
        description,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return inserted;
  });

  if (!row) throw new Error("commerce_collection_create_failed");
  return mapCollection(row);
}

export async function updateCommerceCollection(
  id: string,
  input: CommerceCollectionUpdateInput
): Promise<CommerceCollection | null> {
  const [current] = await db.select().from(commerceCollections).where(eq(commerceCollections.id, id));
  if (!current) return null;

  const name =
    input.name !== undefined
      ? normalizeRequiredText(input.name, "commerce_collection_name_required", 160)
      : current.name;
  const slug =
    input.slug !== undefined ? deriveSlug(name, input.slug) : current.slug;
  const description =
    input.description !== undefined
      ? normalizeOptionalText(input.description, "commerce_collection_description_invalid", 1000)
      : current.description ?? null;

  const [updated] = await db.transaction(async (tx) => {
    if (slug !== current.slug) {
      await assertCollectionSlugUnique(tx, slug, id);
    }
    return tx
      .update(commerceCollections)
      .set({
        name,
        slug,
        description,
        updatedAt: new Date(),
      })
      .where(eq(commerceCollections.id, id))
      .returning();
  });

  return updated ? mapCollection(updated) : null;
}

export async function deleteCommerceCollection(id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(commerceCollections)
    .where(eq(commerceCollections.id, id))
    .returning({ id: commerceCollections.id });
  return Boolean(deleted);
}

export async function setCommerceProductCollections(
  productId: string,
  collectionIdsInput: unknown
): Promise<CommerceProduct | null> {
  const [product] = await db
    .select({ id: commerceProducts.id })
    .from(commerceProducts)
    .where(eq(commerceProducts.id, productId));
  if (!product) return null;

  const collectionIds = normalizeStringList(
    collectionIdsInput,
    "commerce_collection_ids_invalid",
    100
  );
  const now = new Date();

  await db.transaction(async (tx) => {
    await assertCollectionIdsExist(tx, collectionIds);
    await setProductCollections(tx, productId, collectionIds, now);
    await tx
      .update(commerceProducts)
      .set({ updatedAt: now })
      .where(eq(commerceProducts.id, productId));
  });

  return getCommerceProduct(productId);
}
