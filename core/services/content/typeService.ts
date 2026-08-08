import { and, eq, ne, sql } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";
import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import {
  contentEntries,
  contentTaxonomies,
  contentTypes,
  customScreens,
  detailPageDocuments,
  listingQueries,
  settings,
} from "../../db/schema";
import { assertContentSchema, invalidateValidator, type ContentSchema } from "./validation";
import { normalizeContentTypeConfig } from "./contentTypeConfig";

export type { ContentTypeConfig, ContentTypePermissionCapabilities } from "./contentTypeConfig";
import type { ContentTypeConfig } from "./contentTypeConfig";

export type ContentTypeRecord = typeof contentTypes.$inferSelect;
export type ContentTypeStatus = "draft" | "published";
type ContentTypeTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CreateContentTypeInput = {
  name: string;
  slug: string;
  schema: ContentSchema;
  status?: ContentTypeStatus;
  config?: ContentTypeConfig;
};

export type UpdateContentTypeInput = {
  name?: string;
  slug?: string;
  schema?: ContentSchema;
  status?: ContentTypeStatus;
  config?: ContentTypeConfig;
};

export type DuplicateContentTypeInput = {
  name?: string;
  slug?: string;
};

export async function listContentTypes() {
  return db
    .select({
      id: contentTypes.id,
      name: contentTypes.name,
      slug: contentTypes.slug,
      schema: contentTypes.schema,
      status: contentTypes.status,
      config: contentTypes.config,
      createdAt: contentTypes.createdAt,
      updatedAt: contentTypes.updatedAt,
      entryCount: sql<number>`count(${contentEntries.id})`.mapWith(Number).as("entryCount"),
    })
    .from(contentTypes)
    .leftJoin(contentEntries, eq(contentEntries.typeId, contentTypes.id))
    .groupBy(
      contentTypes.id,
      contentTypes.name,
      contentTypes.slug,
      contentTypes.schema,
      contentTypes.status,
      contentTypes.config,
      contentTypes.createdAt,
      contentTypes.updatedAt
    )
    .orderBy(contentTypes.createdAt);
}

export async function getContentType(id: string): Promise<ContentTypeRecord | null> {
  const [row] = await db.select().from(contentTypes).where(eq(contentTypes.id, id));
  return (row as ContentTypeRecord | undefined) ?? null;
}

export async function getContentTypeBySlug(slug: string): Promise<ContentTypeRecord | null> {
  const [row] = await db.select().from(contentTypes).where(eq(contentTypes.slug, slug));
  return (row as ContentTypeRecord | undefined) ?? null;
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const generatedScreenNamePattern = /^screen\s+[0-9a-f]{8}(?:-[0-9a-f]{4}){0,3}(?:-[0-9a-f]{12})?$/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function normalizeContentTypeName(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error("content_type_name_required");
  if (generatedScreenNamePattern.test(normalized)) {
    throw new Error("content_type_name_generated_uuid");
  }
  return normalized;
}

export function normalizeContentTypeSlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) throw new Error("content_type_slug_required");
  if (!slugPattern.test(normalized)) throw new Error("content_type_slug_invalid");
  return normalized;
}

export function normalizeContentTypeStatus(status?: string): ContentTypeStatus {
  if (status === undefined) return "draft";
  if (status === "draft" || status === "published") return status;
  throw new Error("content_type_status_invalid");
}

const findUniqueCopySlugTx = async (tx: ContentTypeTransaction, baseSlug: string) => {
  const base = `${baseSlug}-copy`;
  for (let index = 1; index < 1000; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    const [existing] = await tx
      .select({ id: contentTypes.id })
      .from(contentTypes)
      .where(eq(contentTypes.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  throw new Error("content_type_duplicate_slug_unavailable");
};

const findUniqueCopyNameTx = async (tx: ContentTypeTransaction, baseName: string) => {
  const base = `Copy of ${baseName}`;
  for (let index = 1; index < 1000; index += 1) {
    const candidate = index === 1 ? base : `Copy ${index} of ${baseName}`;
    const [existing] = await tx
      .select({ id: contentTypes.id })
      .from(contentTypes)
      .where(sql`lower(${contentTypes.name}) = ${candidate.toLowerCase()}`)
      .limit(1);
    if (!existing) return candidate;
  }
  throw new Error("content_type_duplicate_name_unavailable");
};

export async function createContentType(input: CreateContentTypeInput) {
  const desired = normalizeContentTypeNativeDesired(input);
  return db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      await assertUniqueContentTypeTx(tx, desired);
      const [row] = await tx.insert(contentTypes).values(desired).returning();
      return row;
    },
    { isolationLevel: "read committed" }
  );
}

export async function updateContentType(
  id: string,
  input: UpdateContentTypeInput
): Promise<ContentTypeRecord | null> {
  if (input.schema) {
    assertContentSchema(input.schema);
  }
  const row = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [existing] = await tx
        .select()
        .from(contentTypes)
        .where(eq(contentTypes.id, id))
        .for("update");
      if (!existing) return null;
      const desired = normalizeContentTypeNativeDesired({
        name: input.name ?? existing.name,
        slug: input.slug ?? existing.slug,
        schema: input.schema ?? (existing.schema as ContentSchema),
        status: input.status ?? (existing.status as ContentTypeStatus),
        config: input.config ?? (existing.config as ContentTypeConfig),
      });
      await assertUniqueContentTypeTx(tx, desired, id);
      if (desired.slug !== existing.slug) {
        await assertContentRoutesDoNotReferenceSlugTx(tx, existing.slug);
      }
      const [updated] = await tx
        .update(contentTypes)
        .set({ ...desired, updatedAt: new Date() })
        .where(eq(contentTypes.id, id))
        .returning();
      return (updated as ContentTypeRecord | undefined) ?? null;
    },
    { isolationLevel: "read committed" }
  );

  if (row && input.schema) invalidateValidator(id);
  return row;
}

export async function duplicateContentType(
  id: string,
  input: DuplicateContentTypeInput = {}
): Promise<ContentTypeRecord | null> {
  return db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [source] = await tx
        .select()
        .from(contentTypes)
        .where(eq(contentTypes.id, id))
        .for("key share");
      if (!source) return null;
      const desired = normalizeContentTypeNativeDesired({
        name: input.name !== undefined ? input.name : await findUniqueCopyNameTx(tx, source.name),
        slug: input.slug !== undefined ? input.slug : await findUniqueCopySlugTx(tx, source.slug),
        schema: source.schema as ContentSchema,
        status: "draft",
        config: source.config as ContentTypeConfig,
      });
      await assertUniqueContentTypeTx(tx, desired);
      const [created] = await tx.insert(contentTypes).values(desired).returning();
      return (created as ContentTypeRecord | undefined) ?? null;
    },
    { isolationLevel: "read committed" }
  );
}

export async function deleteContentType(id: string): Promise<ContentTypeRecord | null> {
  const row = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [existing] = await tx
        .select()
        .from(contentTypes)
        .where(eq(contentTypes.id, id))
        .for("update");
      if (!existing) return null;
      await assertContentTypeDeleteAllowedTx(tx, existing as ContentTypeRecord);
      await assertContentRoutesDoNotReferenceSlugTx(tx, existing.slug);
      const [deleted] = await tx.delete(contentTypes).where(eq(contentTypes.id, id)).returning();
      return deleted;
    },
    { isolationLevel: "read committed" }
  );

  if (row) invalidateValidator(id);
  return (row as ContentTypeRecord | undefined) ?? null;
}

export type ContentTypeNativeDesired = Readonly<{
  name: string;
  slug: string;
  schema: ContentSchema;
  status: ContentTypeStatus;
  config: ContentTypeConfig;
}>;

export type ContentTypeNativeSnapshot = Readonly<{
  id: string;
  desired: ContentTypeNativeDesired;
}>;

export type ContentTypeAtomicMutation =
  | Readonly<{
      operation: "create";
      id: string;
      desired: ContentTypeNativeDesired;
      actorId: string;
    }>
  | Readonly<{
      operation: "replace";
      id: string;
      desired: ContentTypeNativeDesired;
      expectedCurrent: ContentTypeNativeSnapshot;
      actorId: string;
    }>
  | Readonly<{
      operation: "delete";
      id: string;
      expectedCurrent: ContentTypeNativeSnapshot;
      actorId: string;
    }>;

export type ContentTypeAtomicMutationResult = Readonly<{
  id: string;
  snapshot: ContentTypeNativeSnapshot | null;
}>;

const normalizeContentTypeNativeDesired = (
  input: CreateContentTypeInput
): ContentTypeNativeDesired => {
  assertContentSchema(input.schema);
  return {
    name: normalizeContentTypeName(input.name),
    slug: normalizeContentTypeSlug(input.slug),
    schema: input.schema,
    status: normalizeContentTypeStatus(input.status),
    config: normalizeContentTypeConfig(input.config),
  };
};

const rowToNativeSnapshot = (row: ContentTypeRecord): ContentTypeNativeSnapshot => ({
  id: row.id,
  desired: normalizeContentTypeNativeDesired({
    name: row.name,
    slug: row.slug,
    schema: row.schema as ContentSchema,
    status: row.status as ContentTypeStatus,
    config: row.config as ContentTypeConfig,
  }),
});

const assertUniqueContentTypeTx = async (
  tx: ContentTypeTransaction,
  desired: ContentTypeNativeDesired,
  excludeId?: string
): Promise<void> => {
  const [nameConflict] = await tx
    .select({ id: contentTypes.id })
    .from(contentTypes)
    .where(
      excludeId
        ? and(
            sql`lower(${contentTypes.name}) = ${desired.name.toLowerCase()}`,
            ne(contentTypes.id, excludeId)
          )
        : sql`lower(${contentTypes.name}) = ${desired.name.toLowerCase()}`
    )
    .limit(1);
  if (nameConflict) throw new Error("content_type_name_exists");
  const [slugConflict] = await tx
    .select({ id: contentTypes.id })
    .from(contentTypes)
    .where(
      excludeId
        ? and(eq(contentTypes.slug, desired.slug), ne(contentTypes.id, excludeId))
        : eq(contentTypes.slug, desired.slug)
    )
    .limit(1);
  if (slugConflict) throw new Error("content_type_slug_exists");
};

export const buildListingQueryContentTypeReferenceSelect = (
  tx: ContentTypeTransaction,
  contentTypeId: string
) =>
  tx
    .select({ id: listingQueries.id })
    .from(listingQueries)
    .where(sql`${listingQueries.query}->'sourceConfig'->>'contentTypeId' = ${contentTypeId}`)
    .limit(1);

const assertContentTypeDeleteAllowedTx = async (
  tx: ContentTypeTransaction,
  record: ContentTypeRecord
): Promise<void> => {
  const guards = [
    tx
      .select({ id: contentEntries.id })
      .from(contentEntries)
      .where(eq(contentEntries.typeId, record.id))
      .limit(1),
    tx
      .select({ id: customScreens.id })
      .from(customScreens)
      .where(eq(customScreens.contentTypeId, record.id))
      .limit(1),
    tx
      .select({ id: contentTaxonomies.id })
      .from(contentTaxonomies)
      .where(eq(contentTaxonomies.typeId, record.id))
      .limit(1),
    buildListingQueryContentTypeReferenceSelect(tx, record.id),
    tx
      .select({ id: detailPageDocuments.id })
      .from(detailPageDocuments)
      .where(eq(detailPageDocuments.contentTypeId, record.id))
      .limit(1),
  ] as const;
  const [entries, screens, taxonomies, listings, detailPages] = await Promise.all(guards);
  if (entries[0]) throw new Error("content_type_has_entries");
  if (screens[0]) throw new Error("content_type_has_custom_screens");
  if (taxonomies[0]) throw new Error("content_type_has_taxonomies");
  if (listings[0]) throw new Error("content_type_has_listings");
  if (detailPages[0]) throw new Error("content_type_has_detail_pages");
};

const assertContentRoutesDoNotReferenceSlugTx = async (
  tx: ContentTypeTransaction,
  slug: string
): Promise<void> => {
  const [row] = await tx
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "site.contentRoutes"))
    .for("update");
  if (
    Array.isArray(row?.value) &&
    row.value.some((entry) => isRecord(entry) && entry.type === slug)
  ) {
    throw new Error("content_type_has_content_routes");
  }
};

export const captureContentTypeNativeSnapshot = async (
  id: string
): Promise<ContentTypeNativeSnapshot | null> =>
  db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    const [row] = await tx.select().from(contentTypes).where(eq(contentTypes.id, id));
    return row ? rowToNativeSnapshot(row as ContentTypeRecord) : null;
  });

export async function mutateContentTypeAtomic(
  input: ContentTypeAtomicMutation
): Promise<ContentTypeAtomicMutationResult> {
  let invalidate = false;
  const result = await db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    if (input.operation === "create") {
      const desired = normalizeContentTypeNativeDesired(input.desired);
      await assertUniqueContentTypeTx(tx, desired);
      const [row] = await tx
        .insert(contentTypes)
        .values({ id: input.id, ...desired })
        .returning();
      if (!row) throw new Error("content_type_write_failed");
      return { id: row.id, snapshot: rowToNativeSnapshot(row as ContentTypeRecord) };
    }

    const [currentRow] = await tx
      .select()
      .from(contentTypes)
      .where(eq(contentTypes.id, input.id))
      .for("update");
    if (!currentRow) throw new Error("site_package_state_changed");
    const current = rowToNativeSnapshot(currentRow as ContentTypeRecord);
    if (
      input.expectedCurrent.id !== input.id ||
      !isDeepStrictEqual(current, input.expectedCurrent)
    ) {
      throw new Error("site_package_state_changed");
    }
    invalidate = true;
    if (input.operation === "delete") {
      await assertContentTypeDeleteAllowedTx(tx, currentRow as ContentTypeRecord);
      await assertContentRoutesDoNotReferenceSlugTx(tx, current.desired.slug);
      const [deleted] = await tx
        .delete(contentTypes)
        .where(eq(contentTypes.id, input.id))
        .returning({ id: contentTypes.id });
      if (!deleted) throw new Error("site_package_state_changed");
      return { id: input.id, snapshot: null };
    }

    const desired = normalizeContentTypeNativeDesired(input.desired);
    await assertUniqueContentTypeTx(tx, desired, input.id);
    if (desired.slug !== current.desired.slug) {
      await assertContentRoutesDoNotReferenceSlugTx(tx, current.desired.slug);
    }
    const [row] = await tx
      .update(contentTypes)
      .set({ ...desired, updatedAt: new Date() })
      .where(eq(contentTypes.id, input.id))
      .returning();
    if (!row) throw new Error("site_package_state_changed");
    return { id: row.id, snapshot: rowToNativeSnapshot(row as ContentTypeRecord) };
  });
  if (invalidate) invalidateValidator(input.id);
  return result;
}
