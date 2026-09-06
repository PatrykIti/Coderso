import { createHash } from "node:crypto";

import { desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { searchHistory } from "../../db/schema";
import { isSearchDateRange } from "./searchContract";
import {
  SEARCH_HISTORY_LIMIT_MAX,
  SEARCH_HISTORY_LIMIT_MIN,
  SEARCH_HISTORY_QUERY_MAX_LENGTH,
  SEARCH_HISTORY_QUERY_MIN_LENGTH,
} from "./searchHistoryContract";
import type { SearchHistoryWriteCommand } from "./searchHistoryContract";

export type SearchHistoryItem = {
  query: string;
  createdAt: Date;
};

const DEFAULT_LIMIT = 10;
const FETCH_WINDOW = 50;

/** Machine-readable failure codes emitted by this service (TASK-551-06-L01). */
export const SEARCH_HISTORY_SERVICE_ERROR_CODES = {
  invalid: "search_history_invalid",
  idempotencyRequired: "search_history_idempotency_required",
  idempotencyConflict: "search_history_idempotency_conflict",
} as const;

/** Canonical (lowercase, hyphenated) UUID syntax gate for actor and key input. */
const CANONICAL_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Query/limit bounds are owned by the contract module and re-validated here.
const QUERY_MIN_LENGTH = SEARCH_HISTORY_QUERY_MIN_LENGTH;
const QUERY_MAX_LENGTH = SEARCH_HISTORY_QUERY_MAX_LENGTH;
const LIMIT_MIN = SEARCH_HISTORY_LIMIT_MIN;
const LIMIT_MAX = SEARCH_HISTORY_LIMIT_MAX;

const SEARCH_HISTORY_COMMAND_KEYS = ["filters", "idempotencyKey", "query"] as const;
const SEARCH_HISTORY_FILTER_KEYS = ["dateRange", "limit"] as const;

/**
 * RFC 4122 §4.3 name-based UUID (SHA-1, version 5). Derives the deterministic
 * idempotency primary key; the raw key is never stored or logged.
 */
function uuidV5(namespace: string, name: string): string {
  const namespaceHex = namespace.replace(/-/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(namespaceHex)) {
    throw new Error("search_history_idempotency_namespace_invalid");
  }
  const digest = createHash("sha1")
    .update(Buffer.from(namespaceHex, "hex"))
    .update(name, "utf8")
    .digest();
  digest[6] = (digest[6] & 0x0f) | 0x50; // version 5
  digest[8] = (digest[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = digest.subarray(0, 16).toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/**
 * Fixed code-owned idempotency namespace: the RFC 4122 DNS namespace blended
 * once with a literal owned by this module, so the derived value is stable
 * across processes without configuration.
 */
const SEARCH_HISTORY_IDEMPOTENCY_NAMESPACE = uuidV5(
  "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "coderso:search-history:idempotency@v1"
);

/**
 * Canonical JSON: recursively sorts object keys by Unicode code point and
 * preserves array order, so semantically equal inputs compare equal.
 */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const members = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`);
  return `{${members.join(",")}}`;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && keys.every((key, index) => actual[index] === key);
}

function hasOnlyKnownKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.every((key) => keys.includes(key));
}

function requireCanonicalActor(userId: string): void {
  if (!CANONICAL_UUID_PATTERN.test(userId)) {
    throw new Error(SEARCH_HISTORY_SERVICE_ERROR_CODES.invalid);
  }
}

/**
 * Canonical search normalization, byte-identical to the contract owner
 * (`parseSearchHistoryWriteRequest`): trim plus whitespace collapse.
 */
function normalizeQueryText(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Re-validates the contract command at the service boundary: exact closed key
 * set, canonical query text, integer limit, canonical date-range enum, and a
 * canonical lowercase UUID idempotency key. The raw query is normalized before
 * the 2..200 bound is enforced, so a command that arrives without the
 * contract's normalization (any caller that hands this service a hand-built
 * command) is stored and idempotency-compared as the same canonical text the
 * route-parsed command produces. Runs before any SQL is issued.
 */
function parseCommandAtBoundary(command: unknown): SearchHistoryWriteCommand {
  if (typeof command !== "object" || command === null || Array.isArray(command)) {
    throw new Error(SEARCH_HISTORY_SERVICE_ERROR_CODES.invalid);
  }
  const candidate = command as Record<string, unknown>;
  if (!hasOnlyKnownKeys(candidate, SEARCH_HISTORY_COMMAND_KEYS)) {
    throw new Error(SEARCH_HISTORY_SERVICE_ERROR_CODES.invalid);
  }
  // A missing key carries its own code; unknown keys never reach it.
  if (!Object.hasOwn(candidate, "idempotencyKey")) {
    throw new Error(SEARCH_HISTORY_SERVICE_ERROR_CODES.idempotencyRequired);
  }
  if (!hasExactKeys(candidate, SEARCH_HISTORY_COMMAND_KEYS)) {
    throw new Error(SEARCH_HISTORY_SERVICE_ERROR_CODES.invalid);
  }
  const { query: rawQuery, filters, idempotencyKey } = candidate;
  if (typeof rawQuery !== "string") {
    throw new Error(SEARCH_HISTORY_SERVICE_ERROR_CODES.invalid);
  }
  // Normalize-and-validate: the bound applies to the canonical text, never to
  // the raw payload, so padded input stores canonical text and a raw >200
  // that normalizes to <=200 behaves identically through both entry points.
  const query = normalizeQueryText(rawQuery);
  if (query.length < QUERY_MIN_LENGTH || query.length > QUERY_MAX_LENGTH) {
    throw new Error(SEARCH_HISTORY_SERVICE_ERROR_CODES.invalid);
  }
  if (typeof filters !== "object" || filters === null || Array.isArray(filters)) {
    throw new Error(SEARCH_HISTORY_SERVICE_ERROR_CODES.invalid);
  }
  const filterShape = filters as Record<string, unknown>;
  if (!hasExactKeys(filterShape, SEARCH_HISTORY_FILTER_KEYS)) {
    throw new Error(SEARCH_HISTORY_SERVICE_ERROR_CODES.invalid);
  }
  const { limit, dateRange } = filterShape;
  if (
    typeof limit !== "number" ||
    !Number.isInteger(limit) ||
    limit < LIMIT_MIN ||
    limit > LIMIT_MAX
  ) {
    throw new Error(SEARCH_HISTORY_SERVICE_ERROR_CODES.invalid);
  }
  if (!isSearchDateRange(dateRange)) {
    throw new Error(SEARCH_HISTORY_SERVICE_ERROR_CODES.invalid);
  }
  if (typeof idempotencyKey !== "string" || idempotencyKey.length === 0) {
    throw new Error(SEARCH_HISTORY_SERVICE_ERROR_CODES.idempotencyRequired);
  }
  if (!CANONICAL_UUID_PATTERN.test(idempotencyKey)) {
    throw new Error(SEARCH_HISTORY_SERVICE_ERROR_CODES.invalid);
  }
  return { query, filters: { limit, dateRange }, idempotencyKey };
}

export async function recordSearch(
  userId: string,
  command: SearchHistoryWriteCommand | string,
  _legacyFilters?: Record<string, unknown>
): Promise<{ recorded: boolean }> {
  // Transitional compatibility for the pre-L04 safe GET caller: zero query,
  // insert, delete, prune, or side effect. L04 removes that caller entirely.
  if (typeof command === "string") {
    return { recorded: false };
  }

  requireCanonicalActor(userId);
  const normalized = parseCommandAtBoundary(command);

  // Deterministic UUIDv5 primary key derived from the code-owned namespace
  // plus the actor/key pair, so exact replays collide on insert instead of
  // appending duplicate history rows.
  const id = uuidV5(
    SEARCH_HISTORY_IDEMPOTENCY_NAMESPACE,
    canonicalJson([userId, normalized.idempotencyKey])
  );

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(searchHistory)
      .values({
        id,
        userId,
        query: normalized.query,
        filters: normalized.filters,
      })
      .onConflictDoNothing({ target: searchHistory.id })
      .returning({ id: searchHistory.id });
    if (inserted.length > 0) return { recorded: true };

    const [existing] = await tx
      .select({
        userId: searchHistory.userId,
        query: searchHistory.query,
        filters: searchHistory.filters,
      })
      .from(searchHistory)
      .where(eq(searchHistory.id, id))
      .limit(1);

    // Exact replay: identical actor/query/filters collapses to a no-op.
    if (
      existing &&
      existing.userId === userId &&
      existing.query === normalized.query &&
      canonicalJson(existing.filters ?? null) === canonicalJson(normalized.filters)
    ) {
      return { recorded: false };
    }

    // Same actor/key reused with a different canonical payload (or a row that
    // vanished mid-replay) is an unreconcilable idempotency conflict.
    throw new Error(SEARCH_HISTORY_SERVICE_ERROR_CODES.idempotencyConflict);
  });
}

export async function listRecentSearches(userId: string, limit = DEFAULT_LIMIT) {
  const rows = await db
    .select({ query: searchHistory.query, createdAt: searchHistory.createdAt })
    .from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .orderBy(desc(searchHistory.createdAt))
    .limit(FETCH_WINDOW);

  const seen = new Set<string>();
  const items: SearchHistoryItem[] = [];
  for (const row of rows) {
    if (seen.has(row.query)) continue;
    seen.add(row.query);
    items.push({ query: row.query, createdAt: row.createdAt });
    if (items.length >= limit) break;
  }

  return items;
}
