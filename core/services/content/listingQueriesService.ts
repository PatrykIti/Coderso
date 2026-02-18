import { desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { listingQueries } from "../../db/schema";
import {
  executeListingQuery,
  parseListingQuery,
  parseListingQueryCreateInput,
  parseListingQueryUpdateInput,
  type ListingExecutionResult,
  type ListingQuery,
} from "./queryBuilderService";

export type ListingQueryRecord = {
  id: string;
  name: string;
  description: string | null;
  query: ListingQuery;
  createdAt: Date;
  updatedAt: Date;
};

const mapRow = (row: typeof listingQueries.$inferSelect): ListingQueryRecord => ({
  id: row.id,
  name: row.name,
  description: row.description ?? null,
  query: parseListingQuery(row.query),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export async function listListingQueries(): Promise<ListingQueryRecord[]> {
  const rows = await db
    .select()
    .from(listingQueries)
    .orderBy(desc(listingQueries.updatedAt));

  return rows.map(mapRow);
}

export async function getListingQuery(id: string) {
  const [row] = await db
    .select()
    .from(listingQueries)
    .where(eq(listingQueries.id, id));
  if (!row) return null;
  return mapRow(row);
}

export async function createListingQuery(input: unknown) {
  const parsed = parseListingQueryCreateInput(input);
  const now = new Date();
  const [row] = await db
    .insert(listingQueries)
    .values({
      name: parsed.name,
      description: parsed.description,
      query: parsed.query,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) {
    throw new Error("listing_query_invalid");
  }
  return mapRow(row);
}

export async function updateListingQuery(id: string, input: unknown) {
  const parsed = parseListingQueryUpdateInput(input);
  const update: Partial<typeof listingQueries.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parsed.name !== undefined) update.name = parsed.name;
  if (parsed.description !== undefined) update.description = parsed.description;
  if (parsed.query !== undefined) update.query = parsed.query;

  const [row] = await db
    .update(listingQueries)
    .set(update)
    .where(eq(listingQueries.id, id))
    .returning();

  if (!row) return null;
  return mapRow(row);
}

export async function deleteListingQuery(id: string) {
  const [row] = await db
    .delete(listingQueries)
    .where(eq(listingQueries.id, id))
    .returning({ id: listingQueries.id });

  if (!row) return null;
  return row;
}

export async function previewListingQuery(payload: unknown): Promise<ListingExecutionResult> {
  return executeListingQuery(payload);
}
