import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "../../db/client";
import { listingTemplates } from "../../db/schema";
import { invalidateLinkedDetailPageRouteCaches } from "../../site/cache/siteCache";
import {
  normalizeListingTemplateConfig,
  type ListingActionKind,
  type ListingCardVariant,
  type ListingFieldFormat,
  type ListingGapScale,
  type ListingLayout,
  type ListingTemplateCondition,
  type ListingTemplateConditionOperator,
  type ListingTemplateConditionPrimitive,
  type ListingTemplateConditionValue,
  type ListingTemplateConfig,
  type ListingTemplateEmptyState,
  type ListingTemplateFieldBinding,
  type ListingTemplateItemAction,
  type ListingTemplateStyle,
} from "./listingTemplateConfig";

export {
  normalizeListingTemplateConfig,
  type ListingActionKind,
  type ListingCardVariant,
  type ListingFieldFormat,
  type ListingGapScale,
  type ListingLayout,
  type ListingTemplateCondition,
  type ListingTemplateConditionOperator,
  type ListingTemplateConditionPrimitive,
  type ListingTemplateConditionValue,
  type ListingTemplateConfig,
  type ListingTemplateEmptyState,
  type ListingTemplateFieldBinding,
  type ListingTemplateItemAction,
  type ListingTemplateStyle,
};

export type ListingTemplateRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  layout: ListingLayout;
  config: ListingTemplateConfig;
  createdAt: Date;
  updatedAt: Date;
};

export type ListingTemplateCreateInput = {
  name: string;
  slug?: string | null;
  description?: string | null;
  layout?: ListingLayout;
  config?: unknown;
};

export type ListingTemplateUpdateInput = {
  name?: string;
  slug?: string | null;
  description?: string | null;
  layout?: ListingLayout;
  config?: unknown;
};

const listingLayouts = new Set<ListingLayout>(["grid", "list", "table", "calendar", "map"]);

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeNullableText = (value: unknown) => normalizeText(value) ?? null;

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const normalizeLayout = (value: unknown) => {
  const layout = normalizeText(value) ?? "grid";
  if (!listingLayouts.has(layout as ListingLayout)) {
    throw new Error("listing_template_layout_invalid");
  }
  return layout as ListingLayout;
};

const normalizeName = (value: unknown) => {
  const name = normalizeText(value);
  if (!name) throw new Error("listing_template_invalid");
  return name;
};

const resolveSlug = (name: string, slug?: string | null) => {
  const candidate = slugify(normalizeText(slug) ?? name);
  if (!candidate) throw new Error("listing_template_slug_required");
  return candidate;
};

const mapRow = (row: typeof listingTemplates.$inferSelect): ListingTemplateRecord => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description ?? null,
  layout: normalizeLayout(row.layout),
  config: normalizeListingTemplateConfig(row.config),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

async function assertUniqueSlug(slug: string, excludeId?: string) {
  const [existing] = await db
    .select({ id: listingTemplates.id })
    .from(listingTemplates)
    .where(
      excludeId
        ? and(eq(listingTemplates.slug, slug), ne(listingTemplates.id, excludeId))
        : eq(listingTemplates.slug, slug)
    );

  if (existing) {
    throw new Error("listing_template_slug_exists");
  }
}

export async function listListingTemplates(): Promise<ListingTemplateRecord[]> {
  const rows = await db.select().from(listingTemplates).orderBy(desc(listingTemplates.updatedAt));
  return rows.map(mapRow);
}

export async function getListingTemplate(id: string) {
  const [row] = await db.select().from(listingTemplates).where(eq(listingTemplates.id, id));
  if (!row) return null;
  return mapRow(row);
}

export async function createListingTemplate(input: ListingTemplateCreateInput) {
  const name = normalizeName(input.name);
  const slug = resolveSlug(name, input.slug);
  await assertUniqueSlug(slug);

  const [row] = await db
    .insert(listingTemplates)
    .values({
      name,
      slug,
      description: normalizeNullableText(input.description),
      layout: normalizeLayout(input.layout),
      config: normalizeListingTemplateConfig(input.config),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!row) throw new Error("listing_template_invalid");
  return mapRow(row);
}

export async function updateListingTemplate(id: string, input: ListingTemplateUpdateInput) {
  const [existing] = await db.select().from(listingTemplates).where(eq(listingTemplates.id, id));
  if (!existing) return null;

  const nextName = input.name !== undefined ? normalizeName(input.name) : existing.name;
  const nextSlug =
    input.slug !== undefined
      ? resolveSlug(nextName, input.slug)
      : input.name !== undefined
        ? resolveSlug(nextName, existing.slug)
        : existing.slug;

  if (nextSlug !== existing.slug) {
    await assertUniqueSlug(nextSlug, id);
  }

  const [row] = await db
    .update(listingTemplates)
    .set({
      name: nextName,
      slug: nextSlug,
      description:
        input.description !== undefined
          ? normalizeNullableText(input.description)
          : existing.description,
      layout:
        input.layout !== undefined
          ? normalizeLayout(input.layout)
          : normalizeLayout(existing.layout),
      config:
        input.config !== undefined
          ? normalizeListingTemplateConfig(input.config)
          : normalizeListingTemplateConfig(existing.config),
      updatedAt: new Date(),
    })
    .where(eq(listingTemplates.id, id))
    .returning();

  if (row) {
    await invalidateLinkedDetailPageRouteCaches();
  }

  if (!row) return null;
  return mapRow(row);
}

export async function deleteListingTemplate(id: string) {
  const [row] = await db.delete(listingTemplates).where(eq(listingTemplates.id, id)).returning();
  if (row) {
    await invalidateLinkedDetailPageRouteCaches();
  }
  if (!row) return null;
  return mapRow(row);
}
