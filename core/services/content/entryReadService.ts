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

export type EntryRevisionAuthor = { id: string; name: string | null; email: string };

export type EntryRevision = {
  id: string;
  entryId: string;
  version: number;
  data: EntryData;
  createdAt: Date;
  createdBy: EntryRevisionAuthor | null;
};

/**
 * Author-joined, PII-redacted revision list for an entry. `createdBy` resolves the
 * author's email through `resolveEmailValue` (encrypted fields stay encrypted, plaintext
 * hash fields stay hashes) so raw or encrypted email never leaves the service. Existing
 * callers only read `.length`, so the array contract is preserved.
 */
export async function listEntryRevisions(entryId: string): Promise<EntryRevision[]> {
  const rows = await db
    .select({
      id: contentRevisions.id,
      entryId: contentRevisions.entryId,
      version: contentRevisions.version,
      data: contentRevisions.data,
      createdAt: contentRevisions.createdAt,
      createdById: users.id,
      createdByName: users.name,
      createdByEmail: users.email,
      createdByEmailEncrypted: users.emailEncrypted,
    })
    .from(contentRevisions)
    .leftJoin(users, eq(contentRevisions.createdBy, users.id))
    .where(eq(contentRevisions.entryId, entryId))
    .orderBy(desc(contentRevisions.version));

  return rows.map((row) => ({
    id: row.id,
    entryId: row.entryId,
    version: row.version,
    data: row.data as EntryData,
    createdAt: row.createdAt,
    createdBy:
      row.createdById && (row.createdByEmail || row.createdByEmailEncrypted)
        ? {
            id: row.createdById,
            name: row.createdByName ?? null,
            email:
              resolveEmailValue({
                emailEncrypted: row.createdByEmailEncrypted,
                email: row.createdByEmail,
              }) ?? "",
          }
        : null,
  }));
}

/**
 * SERVER-ONLY, NARROW. Returns the HASHED access_password for a single entry, or null.
 * Used EXCLUSIVELY by the public unlock-submit endpoint (TASK-517-02) to verify a
 * submitted password. NEVER call this from a render/list path — the hash must never enter
 * a projection that maps into rendered HTML.
 */
const entryUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getEntryAccessPasswordHash(entryId: string): Promise<string | null> {
  if (!entryId || !entryUuidPattern.test(entryId)) return null;
  const [row] = await db
    .select({ accessPassword: contentEntries.accessPassword })
    .from(contentEntries)
    .where(eq(contentEntries.id, entryId))
    .limit(1);
  return row?.accessPassword ?? null; // null when no entry OR no password set
}
