/**
 * Commerce catalogue: products, collections and their many-to-many membership.
 *
 * Re-exported verbatim by `core/db/schema.ts`; import from there, not from here.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const commerceProducts = pgTable(
  "commerce_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("draft"),
    excerpt: text("excerpt"),
    description: text("description"),
    pricing: jsonb("pricing").notNull().default({}),
    stock: jsonb("stock").notNull().default({}),
    mediaIds: jsonb("media_ids").notNull().default([]),
    metadata: jsonb("metadata").notNull().default({}),
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    publishedAt: timestamp("published_at"),
  },
  (t) => ({
    slugIdx: uniqueIndex("commerce_products_slug_idx").on(t.slug),
    statusIdx: index("commerce_products_status_idx").on(t.status),
    updatedAtIdx: index("commerce_products_updated_at_idx").on(t.updatedAt),
    publishedAtIdx: index("commerce_products_published_at_idx").on(t.publishedAt),
  })
);

export const commerceCollections = pgTable(
  "commerce_collections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("commerce_collections_slug_idx").on(t.slug),
    nameIdx: index("commerce_collections_name_idx").on(t.name),
    updatedAtIdx: index("commerce_collections_updated_at_idx").on(t.updatedAt),
  })
);

export const commerceProductCollections = pgTable(
  "commerce_product_collections",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => commerceProducts.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => commerceCollections.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.collectionId] }),
    productIdx: index("commerce_product_collections_product_idx").on(t.productId),
    collectionIdx: index("commerce_product_collections_collection_idx").on(t.collectionId),
  })
);
