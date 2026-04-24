import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "../../db/client";
import {
  contentEntries,
  contentTaxonomies,
  contentTypes,
  customScreens,
  listingQueries,
  settings,
} from "../../db/schema";
import {
  assertContentSchema,
  invalidateValidator,
  type ContentSchema,
} from "./validation";

export type ContentTypeRecord = typeof contentTypes.$inferSelect;
export type ContentTypeStatus = "draft" | "published";

export type CreateContentTypeInput = {
  name: string;
  slug: string;
  schema: ContentSchema;
  status?: ContentTypeStatus;
};

export type UpdateContentTypeInput = {
  name?: string;
  slug?: string;
  schema?: ContentSchema;
  status?: ContentTypeStatus;
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
      createdAt: contentTypes.createdAt,
      updatedAt: contentTypes.updatedAt,
      entryCount: sql<number>`count(${contentEntries.id})`
        .mapWith(Number)
        .as("entryCount"),
    })
    .from(contentTypes)
    .leftJoin(contentEntries, eq(contentEntries.typeId, contentTypes.id))
    .groupBy(
      contentTypes.id,
      contentTypes.name,
      contentTypes.slug,
      contentTypes.schema,
      contentTypes.status,
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
  const [row] = await db
    .select()
    .from(contentTypes)
    .where(eq(contentTypes.slug, slug));
  return (row as ContentTypeRecord | undefined) ?? null;
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const generatedScreenNamePattern =
  /^screen\s+[0-9a-f]{8}(?:-[0-9a-f]{4}){0,3}(?:-[0-9a-f]{12})?$/i;

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

const assertUniqueContentTypeName = async (name: string, excludeId?: string) => {
  const normalized = name.toLowerCase();
  const [row] = await db
    .select({ id: contentTypes.id })
    .from(contentTypes)
    .where(
      excludeId
        ? and(sql`lower(${contentTypes.name}) = ${normalized}`, ne(contentTypes.id, excludeId))
        : sql`lower(${contentTypes.name}) = ${normalized}`
    )
    .limit(1);
  if (row) throw new Error("content_type_name_exists");
};

const assertUniqueContentTypeSlug = async (slug: string, excludeId?: string) => {
  const [row] = await db
    .select({ id: contentTypes.id })
    .from(contentTypes)
    .where(
      excludeId
        ? and(eq(contentTypes.slug, slug), ne(contentTypes.id, excludeId))
        : eq(contentTypes.slug, slug)
    )
    .limit(1);
  if (row) throw new Error("content_type_slug_exists");
};

const assertContentTypeDeleteAllowed = async (record: ContentTypeRecord) => {
  const [entry] = await db
    .select({ id: contentEntries.id })
    .from(contentEntries)
    .where(eq(contentEntries.typeId, record.id))
    .limit(1);
  if (entry) throw new Error("content_type_has_entries");

  const [screen] = await db
    .select({ id: customScreens.id })
    .from(customScreens)
    .where(eq(customScreens.contentTypeId, record.id))
    .limit(1);
  if (screen) throw new Error("content_type_has_custom_screens");

  const [taxonomy] = await db
    .select({ id: contentTaxonomies.id })
    .from(contentTaxonomies)
    .where(eq(contentTaxonomies.typeId, record.id))
    .limit(1);
  if (taxonomy) throw new Error("content_type_has_taxonomies");

  const [listing] = await db
    .select({ id: listingQueries.id })
    .from(listingQueries)
    .where(sql`${listingQueries.query}->'sourceConfig'->>'contentTypeId' = ${record.id}`)
    .limit(1);
  if (listing) throw new Error("content_type_has_listings");
};

const findUniqueCopySlug = async (baseSlug: string) => {
  const base = `${baseSlug}-copy`;
  for (let index = 1; index < 1000; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    const existing = await getContentTypeBySlug(candidate);
    if (!existing) return candidate;
  }
  throw new Error("content_type_duplicate_slug_unavailable");
};

const findUniqueCopyName = async (baseName: string) => {
  const base = `Copy of ${baseName}`;
  for (let index = 1; index < 1000; index += 1) {
    const candidate = index === 1 ? base : `Copy ${index} of ${baseName}`;
    const [existing] = await db
      .select({ id: contentTypes.id })
      .from(contentTypes)
      .where(sql`lower(${contentTypes.name}) = ${candidate.toLowerCase()}`)
      .limit(1);
    if (!existing) return candidate;
  }
  throw new Error("content_type_duplicate_name_unavailable");
};

export async function createContentType(input: CreateContentTypeInput) {
  assertContentSchema(input.schema);
  const name = normalizeContentTypeName(input.name);
  const slug = normalizeContentTypeSlug(input.slug);
  const status = normalizeContentTypeStatus(input.status);

  await assertUniqueContentTypeName(name);
  await assertUniqueContentTypeSlug(slug);

  const [row] = await db
    .insert(contentTypes)
    .values({
      name,
      slug,
      schema: input.schema,
      status,
    })
    .returning();

  return row;
}

export async function updateContentType(
  id: string,
  input: UpdateContentTypeInput
): Promise<ContentTypeRecord | null> {
  const existing = await getContentType(id);
  if (!existing) return null;

  if (input.schema) {
    assertContentSchema(input.schema);
  }
  const name =
    input.name !== undefined ? normalizeContentTypeName(input.name) : undefined;
  const slug =
    input.slug !== undefined ? normalizeContentTypeSlug(input.slug) : undefined;
  const status =
    input.status !== undefined ? normalizeContentTypeStatus(input.status) : undefined;

  if (name !== undefined) await assertUniqueContentTypeName(name, id);
  if (slug !== undefined) await assertUniqueContentTypeSlug(slug, id);

  const [row] = await db
    .update(contentTypes)
    .set({
      name,
      slug,
      schema: input.schema,
      status,
      updatedAt: new Date(),
    })
    .where(eq(contentTypes.id, id))
    .returning();

  if (row && input.schema) invalidateValidator(id);
  return (row as ContentTypeRecord | undefined) ?? null;
}

export async function duplicateContentType(
  id: string,
  input: DuplicateContentTypeInput = {}
): Promise<ContentTypeRecord | null> {
  const source = await getContentType(id);
  if (!source) return null;

  const name =
    input.name !== undefined
      ? normalizeContentTypeName(input.name)
      : await findUniqueCopyName(source.name);
  const slug =
    input.slug !== undefined
      ? normalizeContentTypeSlug(input.slug)
      : await findUniqueCopySlug(source.slug);

  await assertUniqueContentTypeName(name);
  await assertUniqueContentTypeSlug(slug);

  return createContentType({
    name,
    slug,
    schema: source.schema as ContentSchema,
    status: "draft",
  });
}

export async function deleteContentType(id: string): Promise<ContentTypeRecord | null> {
  const existing = await getContentType(id);
  if (!existing) return null;
  await assertContentTypeDeleteAllowed(existing);

  const row = await db.transaction(async (tx) => {
    const [routeSetting] = await tx
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "site.contentRoutes"))
      .limit(1);
    const routes = routeSetting?.value;
    if (Array.isArray(routes)) {
      const nextRoutes = routes.filter(
        (entry) => !isRecord(entry) || entry.type !== existing.slug
      );
      if (nextRoutes.length !== routes.length) {
        await tx
          .update(settings)
          .set({ value: nextRoutes, updatedAt: new Date() })
          .where(eq(settings.key, "site.contentRoutes"));
      }
    }

    const [deleted] = await tx
      .delete(contentTypes)
      .where(eq(contentTypes.id, id))
      .returning();
    return deleted;
  });

  invalidateValidator(id);
  return (row as ContentTypeRecord | undefined) ?? null;
}
