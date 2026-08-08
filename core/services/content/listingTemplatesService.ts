import { and, desc, eq, ne } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { listingTemplates } from "../../db/schema";
import { invalidateLinkedDetailPageRouteCaches } from "../../site/cache/siteCache";
import {
  normalizeListingTemplateConfig,
  normalizeListingTemplateWriteInput,
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

type ListingTemplateTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

async function assertUniqueSlugTx(
  tx: ListingTemplateTransaction,
  slug: string,
  excludeId?: string
) {
  const [existing] = await tx
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
  const desired = {
    name,
    slug,
    description: normalizeNullableText(input.description),
    layout: normalizeLayout(input.layout),
    config: normalizeListingTemplateConfig(input.config),
  };
  const row = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      await assertUniqueSlugTx(tx, slug);
      const now = new Date();
      const [created] = await tx
        .insert(listingTemplates)
        .values({ ...desired, createdAt: now, updatedAt: now })
        .returning();
      return created;
    },
    { isolationLevel: "read committed" }
  );

  if (!row) throw new Error("listing_template_invalid");
  return mapRow(row);
}

export async function updateListingTemplate(id: string, input: ListingTemplateUpdateInput) {
  const row = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [existing] = await tx
        .select()
        .from(listingTemplates)
        .where(eq(listingTemplates.id, id))
        .for("update");
      if (!existing) return null;
      const nextName = input.name !== undefined ? normalizeName(input.name) : existing.name;
      const nextSlug =
        input.slug !== undefined
          ? resolveSlug(nextName, input.slug)
          : input.name !== undefined
            ? resolveSlug(nextName, existing.slug)
            : existing.slug;
      if (nextSlug !== existing.slug) await assertUniqueSlugTx(tx, nextSlug, id);
      const [updated] = await tx
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
      return updated ?? null;
    },
    { isolationLevel: "read committed" }
  );

  if (row) {
    await invalidateLinkedDetailPageRouteCaches();
  }

  if (!row) return null;
  return mapRow(row);
}

export async function deleteListingTemplate(id: string) {
  const row = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [current] = await tx
        .select({ id: listingTemplates.id })
        .from(listingTemplates)
        .where(eq(listingTemplates.id, id))
        .for("update");
      if (!current) return null;
      const [deleted] = await tx
        .delete(listingTemplates)
        .where(eq(listingTemplates.id, id))
        .returning();
      return deleted ?? null;
    },
    { isolationLevel: "read committed" }
  );
  if (row) {
    await invalidateLinkedDetailPageRouteCaches();
  }
  if (!row) return null;
  return mapRow(row);
}

export type ListingTemplateNativeDesired = ReturnType<typeof normalizeListingTemplateWriteInput>;

export type ListingTemplateNativeSnapshot = Readonly<{
  id: string;
  desired: ListingTemplateNativeDesired;
}>;

export type ListingTemplateAtomicMutation =
  | Readonly<{
      operation: "create";
      id: string;
      desired: ListingTemplateNativeDesired;
      actorId: string;
    }>
  | Readonly<{
      operation: "replace";
      id: string;
      desired: ListingTemplateNativeDesired;
      expectedCurrent: ListingTemplateNativeSnapshot;
      actorId: string;
    }>
  | Readonly<{
      operation: "delete";
      id: string;
      expectedCurrent: ListingTemplateNativeSnapshot;
      actorId: string;
    }>;

export type ListingTemplateAtomicMutationResult = Readonly<{
  id: string;
  snapshot: ListingTemplateNativeSnapshot | null;
}>;

const rowToNativeSnapshot = (
  row: typeof listingTemplates.$inferSelect
): ListingTemplateNativeSnapshot => ({
  id: row.id,
  desired: normalizeListingTemplateWriteInput({
    name: row.name,
    slug: row.slug,
    description: row.description,
    layout: row.layout,
    config: row.config,
  }),
});

export const captureListingTemplateNativeSnapshot = async (
  id: string
): Promise<ListingTemplateNativeSnapshot | null> =>
  db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    const [row] = await tx.select().from(listingTemplates).where(eq(listingTemplates.id, id));
    return row ? rowToNativeSnapshot(row) : null;
  });

export async function mutateListingTemplateAtomic(
  input: ListingTemplateAtomicMutation
): Promise<ListingTemplateAtomicMutationResult> {
  let invalidatesLinkedRoutes = false;
  try {
    const result = await db.transaction(async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const desired =
        input.operation === "delete" ? null : normalizeListingTemplateWriteInput(input.desired);
      if (input.operation === "create") {
        const [conflict] = await tx
          .select({ id: listingTemplates.id })
          .from(listingTemplates)
          .where(eq(listingTemplates.slug, desired!.slug))
          .limit(1);
        if (conflict) throw new Error("listing_template_slug_exists");
        const now = new Date();
        const [row] = await tx
          .insert(listingTemplates)
          .values({ id: input.id, ...desired!, createdAt: now, updatedAt: now })
          .returning();
        if (!row) throw new Error("listing_template_invalid");
        return { id: row.id, snapshot: rowToNativeSnapshot(row) };
      }

      const [currentRow] = await tx
        .select()
        .from(listingTemplates)
        .where(eq(listingTemplates.id, input.id))
        .for("update");
      if (!currentRow) throw new Error("site_package_state_changed");
      const current = rowToNativeSnapshot(currentRow);
      if (
        input.expectedCurrent.id !== input.id ||
        !isDeepStrictEqual(current, input.expectedCurrent)
      ) {
        throw new Error("site_package_state_changed");
      }
      invalidatesLinkedRoutes = true;
      if (input.operation === "delete") {
        const [deleted] = await tx
          .delete(listingTemplates)
          .where(eq(listingTemplates.id, input.id))
          .returning({ id: listingTemplates.id });
        if (!deleted) throw new Error("site_package_state_changed");
        return { id: input.id, snapshot: null };
      }
      if (desired!.slug !== current.desired.slug) {
        const [conflict] = await tx
          .select({ id: listingTemplates.id })
          .from(listingTemplates)
          .where(and(eq(listingTemplates.slug, desired!.slug), ne(listingTemplates.id, input.id)))
          .limit(1);
        if (conflict) throw new Error("listing_template_slug_exists");
      }
      const [row] = await tx
        .update(listingTemplates)
        .set({ ...desired!, updatedAt: new Date() })
        .where(eq(listingTemplates.id, input.id))
        .returning();
      if (!row) throw new Error("site_package_state_changed");
      return { id: row.id, snapshot: rowToNativeSnapshot(row) };
    });
    if (invalidatesLinkedRoutes) await invalidateLinkedDetailPageRouteCaches();
    return result;
  } catch (error) {
    if (
      Boolean(error) &&
      typeof error === "object" &&
      (error as { code?: unknown }).code === "23505"
    ) {
      throw new Error("listing_template_slug_exists");
    }
    throw error;
  }
}
