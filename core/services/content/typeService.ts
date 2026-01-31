import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { contentEntries, contentTypes } from "../../db/schema";
import {
  assertContentSchema,
  invalidateValidator,
  type ContentSchema,
} from "./validation";

export type CreateContentTypeInput = {
  name: string;
  slug: string;
  schema: ContentSchema;
};

export type UpdateContentTypeInput = {
  name?: string;
  slug?: string;
  schema?: ContentSchema;
};

export async function listContentTypes() {
  return db
    .select({
      id: contentTypes.id,
      name: contentTypes.name,
      slug: contentTypes.slug,
      schema: contentTypes.schema,
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
      contentTypes.createdAt,
      contentTypes.updatedAt
    )
    .orderBy(contentTypes.createdAt);
}

export async function getContentType(id: string) {
  const [row] = await db.select().from(contentTypes).where(eq(contentTypes.id, id));
  return row ?? null;
}

export async function getContentTypeBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(contentTypes)
    .where(eq(contentTypes.slug, slug));
  return row ?? null;
}

export async function createContentType(input: CreateContentTypeInput) {
  assertContentSchema(input.schema);

  const [row] = await db
    .insert(contentTypes)
    .values({
      name: input.name,
      slug: input.slug,
      schema: input.schema,
    })
    .returning();

  return row;
}

export async function updateContentType(
  id: string,
  input: UpdateContentTypeInput
) {
  if (input.schema) {
    assertContentSchema(input.schema);
    invalidateValidator(id);
  }

  const [row] = await db
    .update(contentTypes)
    .set({
      name: input.name,
      slug: input.slug,
      schema: input.schema,
      updatedAt: new Date(),
    })
    .where(eq(contentTypes.id, id))
    .returning();

  return row ?? null;
}

export async function deleteContentType(id: string) {
  const [row] = await db
    .delete(contentTypes)
    .where(eq(contentTypes.id, id))
    .returning();

  invalidateValidator(id);
  return row ?? null;
}
