/**
 * TASK-551-06-L02: concurrency-safe page revisions and bounded retention.
 *
 * Allocation flows exclusively through the shared family-aware
 * `allocateRevision` helper inside a `withRevisionParentLock` parent-locked
 * transaction; the legacy max+1 `nextRevisionVersion` path is removed.
 * List reads return a bounded `RevisionPage<PageRevisionSummary>` envelope
 * (summaries only — full `data` is reserved for same-parent point reads and
 * restore), and request-path retention delegates to the bounded per-parent
 * `pruneParentRevisions` service (no request-path bulk prune).
 */
import { and, desc, eq, lt, ne, or, sql, type SQL } from "drizzle-orm";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { pageRevisions, pages, users } from "../../db/schema";
import { clearSiteCache } from "../../site/cache/siteCache";
import {
  normalizeRevisionRetentionPolicy,
  pruneParentRevisions,
} from "../content/revisionRetentionService";
import { areRevisionSnapshotsEqual } from "../content/revisionSnapshot";
import {
  allocateRevision,
  type Revision,
  revisionScopeDigest,
  withRevisionParentLock,
} from "../database/revisionAllocation";
import { resolveEmailValue } from "../security/piiEmail";
import { normalizeStoredPageDocumentV2ForRead } from "./pageDocumentV2";

export type RevisionData = Record<string, unknown>;
export type PageRevisionKind = "publish" | "autosave";

export type PageRevisionSnapshot = {
  title: string | null;
  slug: string | null;
  data: RevisionData;
};

export type PageRevisionAuthor = {
  id: string;
  name: string | null;
  email: string;
};

export type PageRevisionRecord = {
  id: string;
  pageId: string;
  version: number;
  kind: PageRevisionKind;
  title: string | null;
  slug: string | null;
  data: RevisionData;
  createdAt: Date;
  createdBy: PageRevisionAuthor | null;
};

export type PageRevisionRestoreResult = {
  restored: boolean;
  revision: PageRevisionRecord;
  page: typeof pages.$inferSelect;
};

export type PageAutosaveRevisionResult = {
  revision: PageRevisionRecord;
  reusedRevision: boolean;
};

/** Bounded list summary (TASK-551-06-L02): never carries the `data` snapshot. */
export type PageRevisionSummary = Readonly<{
  id: string;
  pageId: string;
  version: number;
  kind: PageRevisionKind;
  title: string | null;
  slug: string | null;
  createdAt: Date;
  createdBy: PageRevisionAuthor | null;
}>;

/** Keyset envelope shared by the page revision list (contract-pinned shape). */
export type RevisionPage<T> = Readonly<{
  items: readonly T[];
  nextCursor: string | null;
  hasMore: boolean;
}>;

/** Exact list input: `{ cursor?, limit? }`; unknown keys are rejected. */
export type PageRevisionListInput = {
  cursor?: string;
  limit?: number;
};

/** Result of the bounded request-path prune (count-accurate, dry-run aware). */
export type PageRevisionPruneResult = Readonly<{
  matched: number;
  deleted: number;
}>;

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type DbTransaction = Tx;

const DEFAULT_PAGE_REVISION_LIST_LIMIT = 50;
const MIN_PAGE_REVISION_LIST_LIMIT = 1;
// Contract-pinned for the page family (deliberately tighter than the entry
// revision list's 200): the service default is 50 and the hard cap is 100.
const MAX_PAGE_REVISION_LIST_LIMIT = 100;
const MAX_PAGE_REVISION_CURSOR_LENGTH = 500;
const MAX_PAGE_REVISION_ID_LENGTH = 128;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeScalarText = (value: unknown) =>
  typeof value === "string" ? normalizeText(value) : null;

const normalizeRevisionKind = (value: unknown): PageRevisionKind =>
  value === "autosave" ? "autosave" : "publish";

const normalizeRevisionData = (value: unknown): RevisionData =>
  normalizeStoredPageDocumentV2ForRead(value) as unknown as RevisionData;

export function normalizePageRevisionSnapshot(value: unknown): PageRevisionSnapshot {
  if (isRecord(value) && isRecord(value.data)) {
    return {
      title: normalizeText(value.title),
      slug: normalizeText(value.slug),
      data: normalizeRevisionData(value.data),
    };
  }

  return {
    title: null,
    slug: null,
    data: normalizeRevisionData(value),
  };
}

/**
 * Minimal structural view of a `page_revisions` row (optionally joined with
 * author columns) accepted by the record mapper.
 */
type RevisionRow = {
  id: string;
  pageId: string;
  version: number;
  kind?: string | null;
  data: unknown;
  createdAt: Date;
  createdBy?: string | null;
  authorName?: string | null;
  authorEmail?: string | null;
  authorEmailEncrypted?: unknown;
};

const mapRevisionRow = (row: RevisionRow): PageRevisionRecord => {
  const snapshot = normalizePageRevisionSnapshot(row.data);
  const email = row.createdBy
    ? resolveEmailValue({
        email: row.authorEmail ?? null,
        emailEncrypted: row.authorEmailEncrypted ?? null,
      })
    : null;

  return {
    id: row.id,
    pageId: row.pageId,
    version: row.version,
    kind: normalizeRevisionKind(row.kind),
    title: snapshot.title,
    slug: snapshot.slug,
    data: snapshot.data,
    createdAt: row.createdAt,
    createdBy:
      row.createdBy && email ? { id: row.createdBy, name: row.authorName ?? null, email } : null,
  };
};

const mapAllocatedRevisionRow = (created: Revision<unknown>): PageRevisionRecord =>
  mapRevisionRow({
    id: created.id,
    pageId: created.parentId,
    version: created.version,
    kind: created.kind,
    data: created.data,
    createdAt: created.createdAt,
    createdBy: created.createdBy,
  });

/**
 * Same-parent point read by revision ID. This is the only list-adjacent
 * operation that returns the full `data` snapshot.
 */
export async function getPageRevision(
  pageId: string,
  revisionId: string
): Promise<PageRevisionRecord | null> {
  const [row] = await db
    .select({
      id: pageRevisions.id,
      pageId: pageRevisions.pageId,
      version: pageRevisions.version,
      kind: pageRevisions.kind,
      data: pageRevisions.data,
      createdAt: pageRevisions.createdAt,
      createdBy: pageRevisions.createdBy,
      authorName: users.name,
      authorEmail: users.email,
      authorEmailEncrypted: users.emailEncrypted,
    })
    .from(pageRevisions)
    .leftJoin(users, eq(pageRevisions.createdBy, users.id))
    .where(and(eq(pageRevisions.pageId, pageId), eq(pageRevisions.id, revisionId)))
    .limit(1);

  if (!row) return null;
  return mapRevisionRow(row);
}

/* ------------------------------------------------------------------ *
 * Cursor codec (page family scope, entryRevisionCursor codec shape).
 * ------------------------------------------------------------------ */

type PageRevisionCursorPayload = Readonly<{
  scope: string;
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

const assertCursorPayload = (value: unknown): value is PageRevisionCursorPayload => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.scope === "string" &&
    payload.scope.length > 0 &&
    payload.scope.length <= 128 &&
    typeof payload.version === "number" &&
    Number.isSafeInteger(payload.version) &&
    (payload.version as number) >= 1 &&
    typeof payload.id === "string" &&
    payload.id.length > 0 &&
    payload.id.length <= MAX_PAGE_REVISION_ID_LENGTH
  );
};

const encodePageRevisionCursor = (payload: PageRevisionCursorPayload): string => {
  if (!assertCursorPayload(payload)) throw new Error("page_revision_cursor_invalid");
  return encodeBase64Url(
    JSON.stringify({ scope: payload.scope, version: payload.version, id: payload.id })
  );
};

/**
 * Decodes a cursor and fails closed on parent/scope mismatch: a cursor issued
 * for another page never yields a predicate for this one.
 */
const decodePageRevisionCursor = (
  value: string,
  expectedScope: string
): PageRevisionCursorPayload => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_PAGE_REVISION_CURSOR_LENGTH
  ) {
    throw new Error("page_revision_cursor_invalid");
  }
  try {
    const decoded: unknown = JSON.parse(decodeBase64Url(value));
    if (!assertCursorPayload(decoded)) throw new Error("page_revision_cursor_invalid");
    if (decoded.scope !== expectedScope) throw new Error("page_revision_cursor_invalid");
    return decoded;
  } catch {
    throw new Error("page_revision_cursor_invalid");
  }
};

type PageRevisionListQuery = Readonly<{
  cursor: string | null;
  limit: number;
}>;

const normalizePageRevisionListInput = (
  input: PageRevisionListInput | undefined
): PageRevisionListQuery => {
  if (input !== undefined && !isRecord(input)) {
    throw new Error("page_revision_list_input_invalid");
  }
  if (input) {
    for (const key of Object.keys(input)) {
      if (key !== "cursor" && key !== "limit") {
        throw new Error("page_revision_list_input_invalid");
      }
    }
  }

  const rawCursor = input?.cursor;
  if (rawCursor !== undefined && typeof rawCursor !== "string") {
    throw new Error("page_revision_list_input_invalid");
  }

  const rawLimit = input?.limit;
  if (rawLimit !== undefined) {
    if (typeof rawLimit !== "number" || !Number.isSafeInteger(rawLimit)) {
      throw new Error("page_revision_limit_invalid");
    }
    if (rawLimit < MIN_PAGE_REVISION_LIST_LIMIT) {
      throw new Error("page_revision_limit_invalid");
    }
  }

  return {
    cursor: rawCursor ?? null,
    limit:
      rawLimit === undefined
        ? DEFAULT_PAGE_REVISION_LIST_LIMIT
        : Math.min(rawLimit, MAX_PAGE_REVISION_LIST_LIMIT),
  };
};

/** Keyset predicate for `(version DESC, id DESC)` strictly after the boundary. */
const buildPageRevisionKeysetPredicate = (cursor: PageRevisionCursorPayload): SQL =>
  or(
    lt(pageRevisions.version, cursor.version),
    and(eq(pageRevisions.version, cursor.version), lt(pageRevisions.id, cursor.id))
  ) ?? sql`false`;

/**
 * Bounded page revision list: summaries only, `(version DESC, id DESC)` keyset,
 * default 50 / cap 100, `LIMIT + 1` (at most 101 DB rows, at most 100 items,
 * at most 2 SQL statements — one here). `title`/`slug` come from bounded JSON
 * scalar extraction of the stored snapshot; `data` never leaves the database.
 */
export async function listRevisions(
  pageId: string,
  input: PageRevisionListInput = {}
): Promise<RevisionPage<PageRevisionSummary>> {
  const query = normalizePageRevisionListInput(input);
  const scope = await revisionScopeDigest("page", pageId);
  const cursor = query.cursor ? decodePageRevisionCursor(query.cursor, scope) : null;

  const rows = await db
    .select({
      id: pageRevisions.id,
      pageId: pageRevisions.pageId,
      version: pageRevisions.version,
      kind: pageRevisions.kind,
      title: sql<string | null>`${pageRevisions.data} ->> 'title'`,
      slug: sql<string | null>`${pageRevisions.data} ->> 'slug'`,
      createdAt: pageRevisions.createdAt,
      createdById: pageRevisions.createdBy,
      authorId: users.id,
      authorName: users.name,
      authorEmail: users.email,
      authorEmailEncrypted: users.emailEncrypted,
    })
    .from(pageRevisions)
    .leftJoin(users, eq(pageRevisions.createdBy, users.id))
    .where(
      and(
        eq(pageRevisions.pageId, pageId),
        cursor ? buildPageRevisionKeysetPredicate(cursor) : undefined
      )
    )
    .orderBy(desc(pageRevisions.version), desc(pageRevisions.id))
    .limit(query.limit + 1);

  const hasMore = rows.length > query.limit;
  const items: PageRevisionSummary[] = rows.slice(0, query.limit).map((row) => {
    const email = row.createdById
      ? resolveEmailValue({ emailEncrypted: row.authorEmailEncrypted, email: row.authorEmail })
      : null;
    return {
      id: row.id,
      pageId: row.pageId,
      version: row.version,
      kind: normalizeRevisionKind(row.kind),
      title: normalizeScalarText(row.title),
      slug: normalizeScalarText(row.slug),
      createdAt: row.createdAt,
      createdBy:
        row.createdById && email
          ? { id: row.createdById, name: row.authorName ?? null, email }
          : null,
    };
  });

  const boundary = hasMore ? rows[query.limit - 1] : undefined;
  const nextCursor = boundary
    ? encodePageRevisionCursor({ scope, version: boundary.version, id: boundary.id })
    : null;

  return { items, nextCursor, hasMore };
}

/* ------------------------------------------------------------------ *
 * Allocation (shared family-aware helper; no max+1 path).
 * ------------------------------------------------------------------ */

export async function createRevision(
  pageId: string,
  snapshot: PageRevisionSnapshot | RevisionData,
  userId: string,
  kind: PageRevisionKind = "publish"
) {
  return db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [page] = await tx
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.id, pageId))
        .for("key share");
      if (!page) throw new Error("page_not_found");
      return createRevisionTx(tx, pageId, snapshot, userId, kind);
    },
    { isolationLevel: "read committed" }
  );
}

export async function createRevisionTx(
  tx: DbTransaction,
  pageId: string,
  snapshot: PageRevisionSnapshot | RevisionData,
  userId: string,
  kind: PageRevisionKind = "publish"
) {
  const normalizedSnapshot = normalizePageRevisionSnapshot(snapshot);

  const created = await allocateRevision(
    {
      family: "page",
      parentId: pageId,
      kind,
      data: normalizedSnapshot,
      createdBy: userId,
    },
    tx
  );

  return mapAllocatedRevisionRow(created);
}

export async function createOrReplaceAutosaveRevision(
  pageId: string,
  snapshot: PageRevisionSnapshot | RevisionData,
  userId: string
) {
  return db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [page] = await tx
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.id, pageId))
        .for("key share");
      if (!page) throw new Error("page_not_found");
      return createOrReplaceAutosaveRevisionTx(tx, pageId, snapshot, userId);
    },
    { isolationLevel: "read committed" }
  );
}

/**
 * Autosave replace inside one parent-locked transaction: reads ONLY the latest
 * autosave (one explicitly projected row, `version DESC, id DESC LIMIT 1`),
 * reuses it when the normalized snapshot is identical (zero insert, zero
 * delete), otherwise allocates through the shared helper and deletes only the
 * exact previously selected ID (`id AND page_id AND kind='autosave' AND
 * id <> created`). Statement budget: <=2 on reuse, <=6 on replacement,
 * independent of history size. Older autosaves are retired only by scheduled
 * bounded retention — never here.
 */
export async function createOrReplaceAutosaveRevisionTx(
  tx: DbTransaction,
  pageId: string,
  snapshot: PageRevisionSnapshot | RevisionData,
  userId: string
): Promise<PageAutosaveRevisionResult> {
  return withRevisionParentLock({ family: "page", parentId: pageId }, tx, async () => {
    const [latest] = await tx
      .select({
        id: pageRevisions.id,
        pageId: pageRevisions.pageId,
        version: pageRevisions.version,
        kind: pageRevisions.kind,
        data: pageRevisions.data,
        createdAt: pageRevisions.createdAt,
        createdBy: pageRevisions.createdBy,
      })
      .from(pageRevisions)
      .where(and(eq(pageRevisions.pageId, pageId), eq(pageRevisions.kind, "autosave")))
      .orderBy(desc(pageRevisions.version), desc(pageRevisions.id))
      .limit(1);

    const normalized = normalizePageRevisionSnapshot(snapshot);
    if (
      latest &&
      areRevisionSnapshotsEqual(normalizePageRevisionSnapshot(latest.data), normalized)
    ) {
      return { revision: mapRevisionRow(latest), reusedRevision: true };
    }

    const created = await allocateRevision(
      {
        family: "page",
        parentId: pageId,
        kind: "autosave",
        data: normalized,
        createdBy: userId,
      },
      tx
    );
    const createdId = created.id;

    if (latest) {
      await tx
        .delete(pageRevisions)
        .where(
          and(
            eq(pageRevisions.id, latest.id),
            eq(pageRevisions.pageId, pageId),
            eq(pageRevisions.kind, "autosave"),
            ne(pageRevisions.id, createdId)
          )
        );
    }

    return { revision: mapAllocatedRevisionRow(created), reusedRevision: false };
  });
}

/* ------------------------------------------------------------------ *
 * Retention (bounded per-parent prune via the shared service).
 * ------------------------------------------------------------------ */

export async function pruneRevisions(pageId: string, keep: number) {
  if (!Number.isFinite(keep) || keep < 1) return { matched: 0, deleted: 0 };
  return db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [page] = await tx
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.id, pageId))
        .for("key share");
      if (!page) throw new Error("page_not_found");
      return pruneRevisionsTx(tx, pageId, keep);
    },
    { isolationLevel: "read committed" }
  );
}

/**
 * Same positional signature pageService calls with the per-page settings
 * value. The numeric retention (newest-N floor) is normalized into the shared
 * strict page policy and the prune itself is delegated to the bounded
 * SKIP LOCKED per-parent service: count-accurate, dry-run aware, and it never
 * removes protected/published anchors, the newest floor, or other parents.
 */
export async function pruneRevisionsTx(
  tx: DbTransaction,
  pageId: string,
  retention: number
): Promise<PageRevisionPruneResult> {
  if (!Number.isFinite(retention) || retention < 1) {
    return { matched: 0, deleted: 0 };
  }

  const policy = normalizeRevisionRetentionPolicy("page", {
    keepNewestPerParent: Math.floor(retention),
  });

  return pruneParentRevisions(tx, "page", pageId, policy);
}

/* ------------------------------------------------------------------ *
 * Point-read mutations (autosave discard, restore).
 * ------------------------------------------------------------------ */

export async function discardAutosaveRevision(pageId: string, revisionId: string) {
  const revision = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [page] = await tx
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.id, pageId))
        .for("key share");
      if (!page) throw new Error("page_not_found");
      const [current] = await tx
        .select()
        .from(pageRevisions)
        .where(and(eq(pageRevisions.pageId, pageId), eq(pageRevisions.id, revisionId)))
        .for("update");
      if (!current) throw new Error("revision_not_found");
      if (normalizeRevisionKind(current.kind) !== "autosave") {
        throw new Error("revision_delete_forbidden");
      }
      await tx.delete(pageRevisions).where(eq(pageRevisions.id, revisionId));
      return current;
    },
    { isolationLevel: "read committed" }
  );
  return mapRevisionRow({
    ...revision,
    authorName: null,
    authorEmail: null,
    authorEmailEncrypted: null,
  });
}

export async function restoreRevision(
  pageId: string,
  revisionId: string
): Promise<PageRevisionRestoreResult> {
  const result = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [page] = await tx.select().from(pages).where(eq(pages.id, pageId)).for("update");
      if (!page) throw new Error("page_not_found");
      const [revision] = await tx
        .select()
        .from(pageRevisions)
        .where(and(eq(pageRevisions.pageId, pageId), eq(pageRevisions.id, revisionId)))
        .for("update");
      if (!revision) throw new Error("revision_not_found");
      const [author] = revision.createdBy
        ? await tx.select().from(users).where(eq(users.id, revision.createdBy))
        : [undefined];
      const normalizedRevision = mapRevisionRow({
        ...revision,
        authorName: author?.name ?? null,
        authorEmail: author?.email ?? null,
        authorEmailEncrypted: author?.emailEncrypted ?? null,
      });
      const currentSnapshot = normalizePageRevisionSnapshot({
        title: page.title,
        slug: page.slug,
        data: page.currentData,
      });
      const targetSnapshot = normalizePageRevisionSnapshot({
        title: normalizedRevision.title,
        slug: normalizedRevision.slug,
        data: normalizedRevision.data,
      });
      if (areRevisionSnapshotsEqual(currentSnapshot, targetSnapshot)) {
        return { restored: false, revision: normalizedRevision, page };
      }
      const [updated] = await tx
        .update(pages)
        .set({
          title: targetSnapshot.title ?? page.title,
          slug: targetSnapshot.slug ?? page.slug,
          currentData: targetSnapshot.data,
          status: "draft",
          updatedAt: new Date(),
        })
        .where(eq(pages.id, pageId))
        .returning();
      if (!updated) throw new Error("page_not_found");
      return { restored: true, revision: normalizedRevision, page: updated };
    },
    { isolationLevel: "read committed" }
  );
  if (result.restored) clearSiteCache();
  return result;
}
