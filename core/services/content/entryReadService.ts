import { and, desc, eq, isNotNull, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/client";
import { contentEntries, contentRevisions, contentTypes, users } from "../../db/schema";
import { resolveEmailValue } from "../security/piiEmail";
import { getSeoDocumentByTarget } from "../seo/seoService";
import type { ListingPushdownPredicate } from "./listingPushdown";
import { buildEntryDataPredicateSql } from "./listingPushdownSql";
import { getEntryTaxonomies } from "./taxonomyService";
import type {
  EntryData,
  EntryDetail,
  EntryListItem,
  EntryStatus,
  EntryVisibility,
} from "./entryTypes";

const entryListSelection = {
  id: contentEntries.id,
  typeId: contentEntries.typeId,
  authorId: contentEntries.authorId,
  title: contentEntries.title,
  slug: contentEntries.slug,
  status: contentEntries.status,
  visibility: contentEntries.visibility,
  hasPassword: sql<boolean>`${contentEntries.accessPassword} is not null`,
  tags: contentEntries.tags,
  data: contentEntries.data,
  publishedAt: contentEntries.publishedAt,
  scheduledAt: contentEntries.scheduledAt,
  createdAt: contentEntries.createdAt,
  updatedAt: contentEntries.updatedAt,
  authorName: users.name,
  authorEmail: users.email,
  authorEmailEncrypted: users.emailEncrypted,
};

type EntryListSelectionRow = {
  id: string;
  typeId: string;
  authorId: string | null;
  title: string;
  slug: string;
  status: string;
  visibility: string;
  hasPassword: boolean;
  tags: unknown;
  data: unknown;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authorName: string | null;
  authorEmail: string | null;
  authorEmailEncrypted: unknown;
};

const mapEntryListSelectionRow = (row: EntryListSelectionRow) => ({
  id: row.id,
  typeId: row.typeId,
  title: row.title,
  slug: row.slug,
  status: row.status as EntryStatus,
  visibility: row.visibility as EntryVisibility,
  hasPassword: row.hasPassword,
  tags: (row.tags ?? []) as string[],
  data: row.data as EntryData,
  publishedAt: row.publishedAt,
  scheduledAt: row.scheduledAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  author: row.authorId
    ? {
        id: row.authorId,
        name: row.authorName ?? null,
        email:
          resolveEmailValue({
            emailEncrypted: row.authorEmailEncrypted,
            email: row.authorEmail,
          }) ?? "",
      }
    : null,
});

export async function listEntries(typeId: string) {
  const rows = await db
    .select(entryListSelection)
    .from(contentEntries)
    .leftJoin(users, eq(contentEntries.authorId, users.id))
    .where(eq(contentEntries.typeId, typeId))
    .orderBy(desc(contentEntries.updatedAt));
  return rows.map(mapEntryListSelectionRow);
}

/**
 * Published listing query with allowlisted JSON predicates pushed down to SQL.
 * The caller still applies the in-memory matcher to this bounded superset.
 */
export async function listEntriesForListing(
  typeId: string,
  options: { publishedOnly: boolean; dataPredicates?: ListingPushdownPredicate[] }
) {
  const conditions: SQL[] = [];
  for (const predicate of options.dataPredicates ?? []) {
    conditions.push(buildEntryDataPredicateSql(predicate));
  }

  const rows = await db
    .select(entryListSelection)
    .from(contentEntries)
    .leftJoin(users, eq(contentEntries.authorId, users.id))
    .where(
      and(
        eq(contentEntries.typeId, typeId),
        ...(options.publishedOnly
          ? [eq(contentEntries.status, "published"), isNotNull(contentEntries.publishedAt)]
          : []),
        ...conditions
      )
    )
    .orderBy(desc(contentEntries.updatedAt));
  return rows.map(mapEntryListSelectionRow);
}

export async function listEntriesWithContentTypes(): Promise<EntryListItem[]> {
  const rows = await db
    .select({
      ...entryListSelection,
      contentTypeId: contentTypes.id,
      contentTypeSlug: contentTypes.slug,
      contentTypeName: contentTypes.name,
      contentTypeStatus: contentTypes.status,
    })
    .from(contentEntries)
    .innerJoin(contentTypes, eq(contentEntries.typeId, contentTypes.id))
    .leftJoin(users, eq(contentEntries.authorId, users.id))
    .orderBy(desc(contentEntries.updatedAt));

  return rows.map((row) => ({
    ...mapEntryListSelectionRow(row),
    contentType: {
      id: row.contentTypeId,
      slug: row.contentTypeSlug,
      name: row.contentTypeName,
      status: row.contentTypeStatus,
    },
  }));
}

export async function getEntry(id: string): Promise<EntryDetail | null> {
  const [row] = await db
    .select(entryListSelection)
    .from(contentEntries)
    .leftJoin(users, eq(contentEntries.authorId, users.id))
    .where(eq(contentEntries.id, id));
  if (!row) return null;

  const seo = await getSeoDocumentByTarget("entry", row.id);
  const taxonomy = await getEntryTaxonomies(row.id);
  return {
    ...mapEntryListSelectionRow(row),
    seo: seo
      ? {
          title: seo.title ?? null,
          description: seo.description ?? null,
          canonicalUrl: seo.canonicalUrl ?? null,
          robots: seo.robots ?? null,
        }
      : null,
    taxonomy,
  };
}

export async function getEntryBySlug(typeId: string, slug: string) {
  const [row] = await db
    .select({
      id: contentEntries.id,
      typeId: contentEntries.typeId,
      authorId: contentEntries.authorId,
      slug: contentEntries.slug,
      title: contentEntries.title,
      status: contentEntries.status,
      visibility: contentEntries.visibility,
      hasPassword: sql<boolean>`${contentEntries.accessPassword} is not null`,
      tags: contentEntries.tags,
      data: contentEntries.data,
      publishedAt: contentEntries.publishedAt,
      scheduledAt: contentEntries.scheduledAt,
      createdAt: contentEntries.createdAt,
      updatedAt: contentEntries.updatedAt,
    })
    .from(contentEntries)
    .where(and(eq(contentEntries.typeId, typeId), eq(contentEntries.slug, slug)));
  return row ?? null;
}

export async function listEntryRevisions(entryId: string) {
  return db
    .select()
    .from(contentRevisions)
    .where(eq(contentRevisions.entryId, entryId))
    .orderBy(desc(contentRevisions.version));
}
