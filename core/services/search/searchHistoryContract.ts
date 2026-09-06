/**
 * Bun-free search-history write contract (TASK-551-06-L01).
 *
 * Pure production module: no Bun APIs, no DB client or schema import, no
 * service or runtime-environment import, no dynamic import, and no
 * import-time environment access. It owns the strict shape every recorded
 * search-history write must arrive in, so the TASK-551-04 route and browser
 * client import this one owner instead of duplicating a payload type. The
 * only relative import is the canonical `SearchDateRange` enum owner
 * (`./searchContract`), which is itself dependency-free.
 *
 * The parser rejects unknown keys, missing keys, and type coercion; it never
 * defaults or clamps an out-of-contract value. Query text is normalized with
 * the canonical search normalization (trim plus whitespace collapse) before
 * the 2..200 bound is enforced. The idempotency key is accepted only as a
 * lowercase canonical UUID and is validated again at the service boundary.
 */

import { isSearchDateRange, type SearchDateRange } from "./searchContract";

/** Normalized query length bounds, enforced after normalization. */
export const SEARCH_HISTORY_QUERY_MIN_LENGTH = 2;
export const SEARCH_HISTORY_QUERY_MAX_LENGTH = 200;
/** Inclusive recorded-limit bounds; integers only. */
export const SEARCH_HISTORY_LIMIT_MIN = 1;
export const SEARCH_HISTORY_LIMIT_MAX = 50;

/** Machine-readable search-history command failures carrying only a code. */
export const SEARCH_HISTORY_CONTRACT_ERROR_CODES = {
  invalid: "search_history_invalid",
  idempotencyRequired: "search_history_idempotency_required",
} as const;

export class SearchHistoryContractError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "SearchHistoryContractError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new SearchHistoryContractError(code);
}

/** Strict request shape as accepted from a route or browser client. */
export type SearchHistoryWriteRequest = Readonly<{
  query: string;
  limit: number;
  dateRange: SearchDateRange;
  idempotencyKey: string;
}>;

/** Normalized command shape persisted by the search-history write service. */
export type SearchHistoryWriteCommand = Readonly<{
  query: string;
  filters: Readonly<{ limit: number; dateRange: SearchDateRange }>;
  idempotencyKey: string; // canonical UUID, validated again at service boundary
}>;

const REQUEST_KEYS = Object.freeze(["query", "limit", "dateRange", "idempotencyKey"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Parses one recorded search-history write request into its normalized
 * command. Every violation fails closed with a bounded
 * `SearchHistoryContractError` code; no branch ever defaults a field.
 */
export function parseSearchHistoryWriteRequest(input: unknown): SearchHistoryWriteCommand {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    fail(SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid);
  }
  const record = input as Record<string, unknown>;
  const present = new Set<string>();
  for (const key of Object.keys(record)) {
    if (!REQUEST_KEYS.includes(key)) fail(SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid);
    present.add(key);
  }
  for (const key of REQUEST_KEYS) {
    if (present.has(key)) continue;
    // Only an absent idempotency key is its own terminal code; every other
    // missing member is a generic invalid request.
    if (key === "idempotencyKey") {
      fail(SEARCH_HISTORY_CONTRACT_ERROR_CODES.idempotencyRequired);
    }
    fail(SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid);
  }

  const rawQuery: unknown = record.query;
  if (typeof rawQuery !== "string") fail(SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid);
  // Canonical search normalization: trim plus whitespace collapse.
  const query = rawQuery.trim().replace(/\s+/g, " ");
  if (
    query.length < SEARCH_HISTORY_QUERY_MIN_LENGTH ||
    query.length > SEARCH_HISTORY_QUERY_MAX_LENGTH
  ) {
    fail(SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid);
  }

  const rawLimit: unknown = record.limit;
  if (typeof rawLimit !== "number" || !Number.isSafeInteger(rawLimit)) {
    fail(SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid);
  }
  if (rawLimit < SEARCH_HISTORY_LIMIT_MIN || rawLimit > SEARCH_HISTORY_LIMIT_MAX) {
    fail(SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid);
  }

  // Exact canonical enum membership; never defaulted to the range fallback.
  const rawDateRange: unknown = record.dateRange;
  if (!isSearchDateRange(rawDateRange)) fail(SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid);

  const rawIdempotencyKey: unknown = record.idempotencyKey;
  if (typeof rawIdempotencyKey !== "string" || !UUID_PATTERN.test(rawIdempotencyKey)) {
    fail(SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid);
  }

  return Object.freeze({
    query,
    filters: Object.freeze({ limit: rawLimit, dateRange: rawDateRange }),
    idempotencyKey: rawIdempotencyKey,
  });
}
