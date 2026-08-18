import { and, eq, lt, or, sql, type SQL } from "drizzle-orm";
import { contentRevisions } from "../../db/tables/content";

/**
 * Pure keyset-cursor codec and page-size normalization for the entry revision
 * list (TASK-570, M-487-02). Bun-free: it imports only drizzle's SQL builder
 * and the pure `content_revisions` table definition, so Vitest can exercise the
 * cursor math without any DB/runtime coupling.
 *
 * The list is ordered by `(version DESC, id DESC)`: `version` is the business
 * sort (each entry's revision counter), `id` the deterministic unique
 * tiebreaker. A cursor encodes the boundary `{ version, id }`, and the next page
 * is every row strictly AFTER that boundary under the same ordering.
 */

export type EntryRevisionCursor = Readonly<{
  version: number;
  id: string;
}>;

export const DEFAULT_ENTRY_REVISION_PAGE_LIMIT = 50;
export const MIN_ENTRY_REVISION_PAGE_LIMIT = 1;
export const MAX_ENTRY_REVISION_PAGE_LIMIT = 200;
export const MAX_ENTRY_REVISION_CURSOR_LENGTH = 500;
export const MAX_ENTRY_REVISION_ID_LENGTH = 128;

const encodeBase64Url = (value: string) =>
  btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const decodeBase64Url = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return atob(`${padded}${padding}`);
};

const assertCursorPayload = (value: unknown): value is EntryRevisionCursor => {
  if (!value || typeof value !== "object") return false;
  const cursor = value as Record<string, unknown>;
  return (
    typeof cursor.version === "number" &&
    Number.isSafeInteger(cursor.version) &&
    (cursor.version as number) >= 1 &&
    typeof cursor.id === "string" &&
    cursor.id.length > 0 &&
    cursor.id.length <= MAX_ENTRY_REVISION_ID_LENGTH
  );
};

export function encodeEntryRevisionCursor(cursor: EntryRevisionCursor): string {
  if (!assertCursorPayload(cursor)) throw new Error("entry_revision_cursor_invalid");
  return encodeBase64Url(JSON.stringify({ version: cursor.version, id: cursor.id }));
}

export function decodeEntryRevisionCursor(value: string): EntryRevisionCursor {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_ENTRY_REVISION_CURSOR_LENGTH
  ) {
    throw new Error("entry_revision_cursor_invalid");
  }
  try {
    const decoded: unknown = JSON.parse(decodeBase64Url(value));
    if (!assertCursorPayload(decoded)) throw new Error("entry_revision_cursor_invalid");
    return decoded;
  } catch {
    throw new Error("entry_revision_cursor_invalid");
  }
}

/**
 * Normalizes a page-size input to the bounded [1, 200] range. Absent/empty
 * values fall back to the default 50; malformed or out-of-range values throw a
 * machine-readable `entry_revision_limit_invalid`.
 */
export function normalizeEntryRevisionPageLimit(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return DEFAULT_ENTRY_REVISION_PAGE_LIMIT;
  }
  const text = String(value).trim();
  if (!/^[0-9]+$/.test(text)) throw new Error("entry_revision_limit_invalid");
  const numeric = Number(text);
  if (!Number.isSafeInteger(numeric) || numeric < MIN_ENTRY_REVISION_PAGE_LIMIT) {
    throw new Error("entry_revision_limit_invalid");
  }
  return Math.min(numeric, MAX_ENTRY_REVISION_PAGE_LIMIT);
}

/**
 * The SQL predicate selecting every row strictly AFTER the cursor under
 * `(version DESC, id DESC)` ordering. Composite keyset predicates are
 * gap/duplicate free across pages: each row belongs to exactly one page.
 */
export function buildEntryRevisionCursorPredicate(cursor: EntryRevisionCursor): SQL {
  // Both disjuncts are always present, so `or` never yields undefined here; the
  // fallback only satisfies the SQL<unknown> | undefined union in the type.
  return (
    or(
      lt(contentRevisions.version, cursor.version),
      and(eq(contentRevisions.version, cursor.version), lt(contentRevisions.id, cursor.id))
    ) ?? sql`false`
  );
}
