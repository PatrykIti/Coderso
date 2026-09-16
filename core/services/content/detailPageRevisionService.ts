import { and, desc, eq, lt, or, sql, type SQL } from "drizzle-orm";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { contentTypes, detailPageDocuments, detailPageRevisions } from "../../db/schema";
import { revisionScopeDigest } from "../database/revisionAllocation";
import { clearSiteCache } from "../../site/cache/siteCache";
import { areRevisionSnapshotsEqual } from "./revisionSnapshot";
import { normalizeDetailPageDocument } from "./detailPageSchema";
import type { DetailPageDocument, DetailPageRevisionKind } from "./detailPageTypes";

export type DetailPageRevisionRecord = {
  id: string;
  detailPageId: string;
  version: number;
  kind: DetailPageRevisionKind;
  document: DetailPageDocument;
  createdAt: Date;
  createdBy: string | null;
};

export type DetailPageRevisionSummaryRecord = {
  id: string;
  detailPageId: string;
  version: number;
  kind: DetailPageRevisionKind;
  createdAt: Date;
  createdBy: string | null;
};

/**
 * The family-specific summary contract (TASK-551-06-L02): six declared columns
 * only — the stored `document` never crosses this boundary.
 */
export type DetailPageRevisionSummary = Readonly<{
  id: string;
  detailPageId: string;
  version: number;
  kind: DetailPageRevisionKind;
  createdAt: Date;
  createdBy: string | null;
}>;

export type RevisionPage<T> = Readonly<{
  items: readonly T[];
  nextCursor: string | null;
  hasMore: boolean;
}>;

/**
 * The exact list input contract: `cursor` and `limit` and nothing else.
 * Unknown keys are rejected; the page size defaults to 50 and caps at 100.
 */
export type DetailPageRevisionListInput = {
  cursor?: string;
  limit?: number;
};

export const summarizeDetailPageRevisionRecord = (
  record: DetailPageRevisionSummaryRecord | DetailPageRevisionRecord
): DetailPageRevisionSummaryRecord => ({
  id: record.id,
  detailPageId: record.detailPageId,
  version: record.version,
  kind: record.kind,
  createdAt: record.createdAt,
  createdBy: record.createdBy,
});

export type DetailPageRevisionRestoreResult = {
  restored: boolean;
  revision: DetailPageRevisionRecord;
  detailPage: typeof detailPageDocuments.$inferSelect;
};

const mapDetailPageRevisionRow = (
  row: typeof detailPageRevisions.$inferSelect
): DetailPageRevisionRecord => ({
  id: row.id,
  detailPageId: row.detailPageId,
  version: row.version,
  kind: (row.kind === "autosave" ? "autosave" : "publish") as DetailPageRevisionKind,
  document: normalizeDetailPageDocument(row.document),
  createdAt: row.createdAt,
  createdBy: row.createdBy ?? null,
});

const mapDetailPageRevisionSummaryRow = (
  row: Pick<
    typeof detailPageRevisions.$inferSelect,
    "id" | "detailPageId" | "version" | "kind" | "createdAt" | "createdBy"
  >
): DetailPageRevisionSummary => ({
  id: row.id,
  detailPageId: row.detailPageId,
  version: row.version,
  kind: (row.kind === "autosave" ? "autosave" : "publish") as DetailPageRevisionKind,
  createdAt: row.createdAt,
  createdBy: row.createdBy ?? null,
});

const normalizeRestoredDocumentForLifecycle = (
  existing: typeof detailPageDocuments.$inferSelect,
  revisionDocument: DetailPageDocument
) =>
  normalizeDetailPageDocument({
    ...revisionDocument,
    status: existing.status === "published" ? "published" : "draft",
    contentTypeSlug: normalizeDetailPageDocument(existing.currentDocument).contentTypeSlug,
  });

// ---------------------------------------------------------------------------
// Bounded keyset read (TASK-551-06-L02)
//
// Opaque cursor codec mirrored from `entryRevisionCursor.ts`, with two
// detail-page differences pinned by the TASK-551-06-L02 contract: the page
// limit is contract-capped at 100 (never the entry family's 200), and every
// payload embeds the family-scoped cursor scope
// `revision:detail_page:v1:<digest>` derived by the shared
// `revisionScopeDigest`, so a cursor minted for another parent fails closed
// before any query runs.
// ---------------------------------------------------------------------------

const DEFAULT_DETAIL_PAGE_REVISION_PAGE_LIMIT = 50;
const MIN_DETAIL_PAGE_REVISION_PAGE_LIMIT = 1;
const MAX_DETAIL_PAGE_REVISION_PAGE_LIMIT = 100;
const MAX_DETAIL_PAGE_REVISION_CURSOR_LENGTH = 500;
const MAX_DETAIL_PAGE_REVISION_ID_LENGTH = 128;

type DetailPageRevisionCursor = Readonly<{
  version: number;
  id: string;
}>;

const encodeBase64Url = (value: string) =>
  btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const decodeBase64Url = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return atob(`${padded}${padding}`);
};

/** The family/parent-digest cursor scope; no raw parent id ever hits the wire. */
const detailPageRevisionCursorScope = (detailPageId: string): string =>
  revisionScopeDigest("detail_page", detailPageId);

const assertCursorPayload = (
  value: unknown
): value is DetailPageRevisionCursor & { scope: string } => {
  if (!value || typeof value !== "object") return false;
  const cursor = value as Record<string, unknown>;
  return (
    Object.keys(cursor).sort().join(",") === "id,scope,version" &&
    typeof cursor.scope === "string" &&
    cursor.scope.length > 0 &&
    typeof cursor.version === "number" &&
    Number.isSafeInteger(cursor.version) &&
    (cursor.version as number) >= 1 &&
    typeof cursor.id === "string" &&
    cursor.id.length > 0 &&
    cursor.id.length <= MAX_DETAIL_PAGE_REVISION_ID_LENGTH
  );
};

const encodeDetailPageRevisionCursor = (cursor: DetailPageRevisionCursor, scope: string): string =>
  encodeBase64Url(JSON.stringify({ scope, version: cursor.version, id: cursor.id }));

function decodeDetailPageRevisionCursor(value: string, scope: string): DetailPageRevisionCursor {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_DETAIL_PAGE_REVISION_CURSOR_LENGTH
  ) {
    throw new Error("detail_page_revision_cursor_invalid");
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(decodeBase64Url(value));
  } catch {
    throw new Error("detail_page_revision_cursor_invalid");
  }
  if (!assertCursorPayload(decoded)) throw new Error("detail_page_revision_cursor_invalid");
  if (decoded.scope !== scope) throw new Error("detail_page_revision_cursor_scope_mismatch");
  return { version: decoded.version, id: decoded.id };
}

/**
 * The SQL predicate selecting every row strictly AFTER the cursor under
 * `(version DESC, id DESC)` ordering; composite keyset predicates are
 * gap/duplicate free across pages.
 */
function buildDetailPageRevisionCursorPredicate(cursor: DetailPageRevisionCursor): SQL {
  // Both disjuncts are always present, so `or` never yields undefined here; the
  // fallback only satisfies the SQL<unknown> | undefined union in the type.
  return (
    or(
      lt(detailPageRevisions.version, cursor.version),
      and(eq(detailPageRevisions.version, cursor.version), lt(detailPageRevisions.id, cursor.id))
    ) ?? sql`false`
  );
}

/**
 * Strict input normalization: exactly `{ cursor?, limit? }`, no unknown keys.
 * Absent limit falls back to 50; out-of-domain values fail closed. The cap is
 * the contract-pinned 100.
 */
function normalizeDetailPageRevisionListInput(input: DetailPageRevisionListInput): {
  cursor?: string;
  limit: number;
} {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("detail_page_revision_input_invalid");
  }
  for (const key of Object.keys(input)) {
    if (key !== "cursor" && key !== "limit") {
      throw new Error("detail_page_revision_input_invalid");
    }
  }
  const { cursor, limit } = input;
  let normalizedLimit = DEFAULT_DETAIL_PAGE_REVISION_PAGE_LIMIT;
  if (limit !== undefined) {
    if (
      typeof limit !== "number" ||
      !Number.isSafeInteger(limit) ||
      limit < MIN_DETAIL_PAGE_REVISION_PAGE_LIMIT
    ) {
      throw new Error("detail_page_revision_limit_invalid");
    }
    normalizedLimit = Math.min(limit, MAX_DETAIL_PAGE_REVISION_PAGE_LIMIT);
  }
  if (cursor !== undefined && (typeof cursor !== "string" || cursor.length === 0)) {
    throw new Error("detail_page_revision_cursor_invalid");
  }
  return cursor === undefined ? { limit: normalizedLimit } : { cursor, limit: normalizedLimit };
}

/**
 * Bounded same-parent summary page. One statement, `LIMIT + 1` rows at most
 * (never more than 101), `(version DESC, id DESC)` keyset order, six-column
 * projection — the stored `document` is never selected or transferred.
 */
export async function listDetailPageRevisions(
  detailPageId: string,
  input: DetailPageRevisionListInput = {}
): Promise<RevisionPage<DetailPageRevisionSummary>> {
  const { cursor, limit } = normalizeDetailPageRevisionListInput(input);
  const scope = detailPageRevisionCursorScope(detailPageId);
  const boundary = cursor === undefined ? null : decodeDetailPageRevisionCursor(cursor, scope);
  const conditions: SQL[] = [eq(detailPageRevisions.detailPageId, detailPageId)];
  if (boundary) conditions.push(buildDetailPageRevisionCursorPredicate(boundary));
  const rows = await db
    .select({
      id: detailPageRevisions.id,
      detailPageId: detailPageRevisions.detailPageId,
      version: detailPageRevisions.version,
      kind: detailPageRevisions.kind,
      createdAt: detailPageRevisions.createdAt,
      createdBy: detailPageRevisions.createdBy,
    })
    .from(detailPageRevisions)
    .where(and(...conditions))
    .orderBy(desc(detailPageRevisions.version), desc(detailPageRevisions.id))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);
  return {
    items: page.map(mapDetailPageRevisionSummaryRow),
    nextCursor:
      hasMore && last
        ? encodeDetailPageRevisionCursor({ version: last.version, id: last.id }, scope)
        : null,
    hasMore,
  };
}

/**
 * The same-parent point read by revision id — the only read operation on this
 * service that returns the full stored `document` (the list projection never
 * selects it; the discard/restore writers return the record they wrote).
 * Exactly one statement.
 */
export async function getDetailPageRevision(
  detailPageId: string,
  revisionId: string
): Promise<DetailPageRevisionRecord> {
  const [row] = await db
    .select()
    .from(detailPageRevisions)
    .where(
      and(
        eq(detailPageRevisions.detailPageId, detailPageId),
        eq(detailPageRevisions.id, revisionId)
      )
    )
    .limit(1);
  if (!row) throw new Error("detail_page_revision_not_found");
  return mapDetailPageRevisionRow(row);
}

export async function discardDetailPageAutosaveRevision(
  detailPageId: string,
  revisionId: string
): Promise<DetailPageRevisionRecord> {
  const revision = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [detailPage] = await tx
        .select({ id: detailPageDocuments.id })
        .from(detailPageDocuments)
        .where(eq(detailPageDocuments.id, detailPageId))
        .for("key share");
      if (!detailPage) throw new Error("detail_page_not_found");
      const [current] = await tx
        .select()
        .from(detailPageRevisions)
        .where(
          and(
            eq(detailPageRevisions.detailPageId, detailPageId),
            eq(detailPageRevisions.id, revisionId)
          )
        )
        .for("update");
      if (!current) throw new Error("detail_page_revision_not_found");
      if ((current.kind ?? "publish") !== "autosave") {
        throw new Error("detail_page_revision_delete_forbidden");
      }
      await tx.delete(detailPageRevisions).where(eq(detailPageRevisions.id, revisionId));
      return current;
    },
    { isolationLevel: "read committed" }
  );
  return mapDetailPageRevisionRow(revision);
}

export async function restoreDetailPageRevision(
  detailPageId: string,
  revisionId: string
): Promise<DetailPageRevisionRestoreResult> {
  const result = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [detailPage] = await tx
        .select()
        .from(detailPageDocuments)
        .where(eq(detailPageDocuments.id, detailPageId))
        .for("update");
      if (!detailPage) throw new Error("detail_page_not_found");
      const [revision] = await tx
        .select()
        .from(detailPageRevisions)
        .where(
          and(
            eq(detailPageRevisions.detailPageId, detailPageId),
            eq(detailPageRevisions.id, revisionId)
          )
        )
        .for("update");
      if (!revision) throw new Error("detail_page_revision_not_found");
      const [contentType] = await tx
        .select({ slug: contentTypes.slug })
        .from(contentTypes)
        .where(eq(contentTypes.id, detailPage.contentTypeId))
        .for("key share");
      if (!contentType) throw new Error("detail_page_invalid");
      const currentDocument = normalizeDetailPageDocument(detailPage.currentDocument);
      const restoredDocument = normalizeRestoredDocumentForLifecycle(
        detailPage,
        normalizeDetailPageDocument(revision.document)
      );
      const restored = !areRevisionSnapshotsEqual(currentDocument, restoredDocument);
      if (!restored) {
        return {
          restored: false,
          revision: mapDetailPageRevisionRow(revision),
          detailPage,
        };
      }
      const [updated] = await tx
        .update(detailPageDocuments)
        .set({
          name: restoredDocument.name,
          currentDocument: { ...restoredDocument, contentTypeSlug: contentType.slug },
          updatedAt: new Date(),
        })
        .where(eq(detailPageDocuments.id, detailPageId))
        .returning();
      if (!updated) throw new Error("detail_page_not_found");
      return {
        restored: true,
        revision: mapDetailPageRevisionRow(revision),
        detailPage: updated,
      };
    },
    { isolationLevel: "read committed" }
  );
  if (result.restored) clearSiteCache();
  return result;
}
