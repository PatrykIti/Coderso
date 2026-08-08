import { desc, eq } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { contentTypes, listingQueries } from "../../db/schema";
import { invalidateLinkedDetailPageRouteCaches } from "../../site/cache/siteCache";
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
  const rows = await db.select().from(listingQueries).orderBy(desc(listingQueries.updatedAt));

  return rows.map(mapRow);
}

export async function getListingQuery(id: string) {
  const [row] = await db.select().from(listingQueries).where(eq(listingQueries.id, id));
  if (!row) return null;
  return mapRow(row);
}

export async function createListingQuery(input: unknown) {
  const parsed = parseListingQueryCreateInput(input);
  const desired = normalizeNativeDesired(parsed);
  const row = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      await lockListingQueryContentType(tx, desired);
      const now = new Date();
      const [created] = await tx
        .insert(listingQueries)
        .values({ ...desired, createdAt: now, updatedAt: now })
        .returning();
      return created;
    },
    { isolationLevel: "read committed" }
  );

  if (!row) {
    throw new Error("listing_query_invalid");
  }
  return mapRow(row);
}

export async function updateListingQuery(id: string, input: unknown) {
  const parsed = parseListingQueryUpdateInput(input);
  const row = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [currentRow] = await tx
        .select()
        .from(listingQueries)
        .where(eq(listingQueries.id, id))
        .for("update");
      if (!currentRow) return null;
      const current = rowToNativeSnapshot(currentRow).desired;
      const desired = normalizeNativeDesired({
        name: parsed.name ?? current.name,
        description: parsed.description !== undefined ? parsed.description : current.description,
        query: parsed.query ?? current.query,
      });
      await lockListingQueryContentType(tx, desired);
      const [updated] = await tx
        .update(listingQueries)
        .set({ ...desired, updatedAt: new Date() })
        .where(eq(listingQueries.id, id))
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

export async function deleteListingQuery(id: string) {
  const row = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [current] = await tx
        .select({ id: listingQueries.id })
        .from(listingQueries)
        .where(eq(listingQueries.id, id))
        .for("update");
      if (!current) return null;
      const [deleted] = await tx
        .delete(listingQueries)
        .where(eq(listingQueries.id, id))
        .returning({ id: listingQueries.id });
      return deleted ?? null;
    },
    { isolationLevel: "read committed" }
  );

  if (row) {
    await invalidateLinkedDetailPageRouteCaches();
  }

  if (!row) return null;
  return row;
}

export async function previewListingQuery(payload: unknown): Promise<ListingExecutionResult> {
  return executeListingQuery(payload);
}

export type ListingQueryNativeDesired = Readonly<{
  name: string;
  description: string | null;
  query: ListingQuery;
}>;

export type ListingQueryNativeSnapshot = Readonly<{
  id: string;
  desired: ListingQueryNativeDesired;
}>;

export type ListingQueryAtomicMutation =
  | Readonly<{
      operation: "create";
      id: string;
      desired: ListingQueryNativeDesired;
      actorId: string;
    }>
  | Readonly<{
      operation: "replace";
      id: string;
      desired: ListingQueryNativeDesired;
      expectedCurrent: ListingQueryNativeSnapshot;
      actorId: string;
    }>
  | Readonly<{
      operation: "delete";
      id: string;
      expectedCurrent: ListingQueryNativeSnapshot;
      actorId: string;
    }>;

export type ListingQueryAtomicMutationResult = Readonly<{
  id: string;
  snapshot: ListingQueryNativeSnapshot | null;
}>;

type ListingQueryTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const rowToNativeSnapshot = (
  row: typeof listingQueries.$inferSelect
): ListingQueryNativeSnapshot => ({
  id: row.id,
  desired: {
    name: row.name,
    description: row.description ?? null,
    query: parseListingQuery(row.query),
  },
});

const lockListingQueryContentType = async (
  tx: ListingQueryTransaction,
  desired: ListingQueryNativeDesired
): Promise<void> => {
  const contentTypeId = desired.query.sourceConfig.contentTypeId;
  if (!contentTypeId) return;
  const [row] = await tx
    .select({ id: contentTypes.id })
    .from(contentTypes)
    .where(eq(contentTypes.id, contentTypeId))
    .for("key share");
  if (!row) throw new Error("listing_query_invalid_source_config");
};

const normalizeNativeDesired = (value: unknown): ListingQueryNativeDesired => {
  const parsed = parseListingQueryCreateInput(value);
  return {
    name: parsed.name,
    description: parsed.description,
    query: parsed.query,
  };
};

export const captureListingQueryNativeSnapshot = async (
  id: string
): Promise<ListingQueryNativeSnapshot | null> =>
  db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    const [row] = await tx.select().from(listingQueries).where(eq(listingQueries.id, id));
    return row ? rowToNativeSnapshot(row) : null;
  });

export async function mutateListingQueryAtomic(
  input: ListingQueryAtomicMutation
): Promise<ListingQueryAtomicMutationResult> {
  let invalidatesLinkedRoutes = false;
  const result = await db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    if (input.operation === "create") {
      const desired = normalizeNativeDesired(input.desired);
      await lockListingQueryContentType(tx, desired);
      const [row] = await tx
        .insert(listingQueries)
        .values({
          id: input.id,
          name: desired.name,
          description: desired.description,
          query: desired.query,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      if (!row) throw new Error("listing_query_invalid");
      return { id: row.id, snapshot: rowToNativeSnapshot(row) };
    }

    const [currentRow] = await tx
      .select()
      .from(listingQueries)
      .where(eq(listingQueries.id, input.id))
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
        .delete(listingQueries)
        .where(eq(listingQueries.id, input.id))
        .returning({ id: listingQueries.id });
      if (!deleted) throw new Error("site_package_state_changed");
      return { id: input.id, snapshot: null };
    }

    const desired = normalizeNativeDesired(input.desired);
    await lockListingQueryContentType(tx, desired);
    const [row] = await tx
      .update(listingQueries)
      .set({
        name: desired.name,
        description: desired.description,
        query: desired.query,
        updatedAt: new Date(),
      })
      .where(eq(listingQueries.id, input.id))
      .returning();
    if (!row) throw new Error("site_package_state_changed");
    return { id: row.id, snapshot: rowToNativeSnapshot(row) };
  });
  if (invalidatesLinkedRoutes) await invalidateLinkedDetailPageRouteCaches();
  return result;
}
