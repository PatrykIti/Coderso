/**
 * Bun-free strict bounded-read and keyset predicate contracts
 * (TASK-551-03-L01).
 *
 * Pure production module: no Bun APIs, no DB client import, no import-time
 * environment access. SQL fragments interpolate zero cursor-supplied
 * identifiers: every column fragment is code-owned by the `KeysetSpec`, and
 * all cursor values are bound parameters.
 */

import {
  PaginationCursorError,
  type CursorFieldType,
  type CursorPayload,
  type KeysetSpec,
} from "./keysetCursor";

export const BOUNDED_READ_ERROR_CODES = {
  pageLimitInvalid: "page_limit_invalid",
  windowOverflow: "bounded_read_window_overflow",
} as const;

/** Branded page limit validated by `parsePageLimit`. */
declare const pageLimitBrand: unique symbol;
export type PageLimit = number & { readonly [pageLimitBrand]: true };

export type SqlFragment = Readonly<{
  /** PostgreSQL text with numbered `$N` placeholders; params align by N. */
  text: string;
  params: readonly unknown[];
}>;

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;

function fail(code: string): never {
  throw new PaginationCursorError(code);
}

/**
 * Parses a bounded page limit. Rejects non-integer, negative, zero,
 * non-finite, overflow, and unknown option fields. Defaults to 50 with a hard
 * ceiling of 100 that cannot be bypassed through coercion.
 */
export function parsePageLimit(
  value: unknown,
  options: Readonly<{ default?: number; max?: number }> = {}
): PageLimit {
  if (typeof options !== "object" || options === null)
    fail(BOUNDED_READ_ERROR_CODES.pageLimitInvalid);
  const allowed = new Set(["default", "max"]);
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) fail(BOUNDED_READ_ERROR_CODES.pageLimitInvalid);
  }
  const defaultValue = options.default ?? DEFAULT_PAGE_LIMIT;
  const maxValue = options.max ?? MAX_PAGE_LIMIT;
  if (
    !Number.isSafeInteger(defaultValue) ||
    defaultValue < 1 ||
    defaultValue > MAX_PAGE_LIMIT ||
    !Number.isSafeInteger(maxValue) ||
    maxValue < 1 ||
    maxValue > MAX_PAGE_LIMIT ||
    defaultValue > maxValue
  ) {
    fail(BOUNDED_READ_ERROR_CODES.pageLimitInvalid);
  }
  let limit: number;
  if (value === undefined || value === null) {
    limit = defaultValue;
  } else if (typeof value === "number") {
    limit = value;
  } else if (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)) {
    limit = Number(value);
  } else {
    fail(BOUNDED_READ_ERROR_CODES.pageLimitInvalid);
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > maxValue) {
    fail(BOUNDED_READ_ERROR_CODES.pageLimitInvalid);
  }
  return limit as PageLimit;
}

/** Converts one validated wire value into its SQL bind parameter. */
function sqlParam(type: CursorFieldType, value: string | boolean): unknown {
  if (typeof value === "boolean") return value;
  if (type !== "integer") return value;
  const asBigInt = BigInt(value);
  // Keep full int64 precision; drivers serialize BigInt losslessly.
  return asBigInt >= BigInt(Number.MIN_SAFE_INTEGER) && asBigInt <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(asBigInt)
    : asBigInt;
}

interface ComparisonTerm {
  readonly sql: string;
}

const FALSE_TERM: ComparisonTerm = { sql: "FALSE" };

/**
 * Frozen comparator table row lookup for one tuple position.
 * `after` means the logical next-page relation; `before` means previous-page.
 * Prefix equality is always `c IS NOT DISTINCT FROM v`.
 */
function strictComparison(
  order: "asc" | "desc",
  nulls: "first" | "last",
  valueIsNull: boolean,
  relation: "after" | "before",
  column: string,
  param: string
): ComparisonTerm {
  const gt = `(${column} > ${param})`;
  const lt = `(${column} < ${param})`;
  const isNull = `${column} IS NULL`;
  const isNotNull = `${column} IS NOT NULL`;
  if (nulls === "last") {
    if (!valueIsNull) {
      if (relation === "after") {
        return order === "asc" ? { sql: `(${gt} OR ${isNull})` } : { sql: `(${lt} OR ${isNull})` };
      }
      return order === "asc" ? { sql: lt } : { sql: gt };
    }
    if (relation === "after") return FALSE_TERM;
    return { sql: isNotNull };
  }
  // nulls first
  if (valueIsNull) {
    if (relation === "after") return { sql: isNotNull };
    return FALSE_TERM;
  }
  if (relation === "after") return order === "asc" ? { sql: gt } : { sql: lt };
  return order === "asc" ? { sql: `(${lt} OR ${isNull})` } : { sql: `(${gt} OR ${isNull})` };
}

/**
 * Builds the lexicographic OR-of-prefixes keyset predicate from code-owned
 * column fragments. Never interpolates a payload name or value: columns come
 * only from the spec and values become numbered bind parameters. The final
 * UUID `id` field makes the relation unique.
 */
export function buildKeysetPredicate(
  spec: KeysetSpec,
  cursor: CursorPayload,
  relation: "after" | "before"
): SqlFragment {
  if (cursor.fields.length !== spec.fields.length) {
    fail("cursor_spec_mismatch");
  }
  return assemblePredicate(spec, cursor, relation);
}

/**
 * Single-pass predicate assembly kept separate for clarity: for each tuple
 * position i it emits `(p0 = v0 AND ... AND p{i-1} = v{i-1} AND strict_i)`,
 * then ORs all positions together. `FALSE` terms collapse away naturally
 * because their conjunction can never match.
 */
function assemblePredicate(
  spec: KeysetSpec,
  cursor: CursorPayload,
  relation: "after" | "before"
): SqlFragment {
  const params: unknown[] = [];
  const disjuncts: string[] = [];
  for (let i = 0; i < spec.fields.length; i += 1) {
    const conjuncts: string[] = [];
    for (let j = 0; j < i; j += 1) {
      const specField = spec.fields[j]!;
      const payloadField = cursor.fields[j]!;
      if (payloadField.type === "null") {
        conjuncts.push(`${specField.column} IS NOT DISTINCT FROM NULL`);
        continue;
      }
      params.push(sqlParam(specField.type, payloadField.value as string | boolean));
      conjuncts.push(`${specField.column} IS NOT DISTINCT FROM $${params.length}`);
    }
    const specField = spec.fields[i]!;
    const payloadField = cursor.fields[i]!;
    const valueIsNull = payloadField.type === "null";
    if (!valueIsNull) {
      params.push(sqlParam(specField.type, payloadField.value as string | boolean));
    }
    const term = strictComparison(
      specField.order,
      specField.nulls,
      valueIsNull,
      relation,
      specField.column,
      `$${params.length}`
    );
    // An impossible strict comparison makes the entire disjunct unsatisfiable.
    if (term.sql === "FALSE") continue;
    conjuncts.push(term.sql);
    disjuncts.push(conjuncts.length > 1 ? `(${conjuncts.join(" AND ")})` : conjuncts[0]!);
  }
  if (disjuncts.length === 0) {
    return Object.freeze({ text: "FALSE", params: Object.freeze([]) });
  }
  return Object.freeze({ text: disjuncts.join(" OR "), params: Object.freeze(params) });
}

/**
 * Declared ORDER BY for `next`; fully reversed (directions and null
 * placement) for the bounded `previous` fetch, which reverses rows in memory
 * afterwards and never uses OFFSET.
 */
export function buildKeysetOrderBy(spec: KeysetSpec, direction: "next" | "previous"): string {
  const parts = spec.fields.map((field) => {
    const order = direction === "next" ? field.order : field.order === "asc" ? "desc" : "asc";
    const nulls = direction === "next" ? field.nulls : field.nulls === "first" ? "last" : "first";
    return `${field.column} ${order.toUpperCase()} NULLS ${nulls.toUpperCase()}`;
  });
  return parts.join(", ");
}

export type BoundedPage<T> = Readonly<{
  items: readonly T[];
  nextCursor: string | null;
  hasMore: boolean;
}>;

type BoundedPageInput<T> = Readonly<{
  rows: readonly T[];
  limit: PageLimit;
  direction: "next" | "previous";
  encodeBoundary: (boundaryRow: T) => string;
}>;

/**
 * Emits a bounded page from at most `limit + 1` fetched rows. The boundary
 * cursor derives only from the last returned row for `next` and the first
 * returned row for `previous`.
 */
export function toBoundedPage<T>(input: BoundedPageInput<T>): BoundedPage<T> {
  if (
    typeof input !== "object" ||
    input === null ||
    !Array.isArray(input.rows) ||
    (input.direction !== "next" && input.direction !== "previous") ||
    typeof input.encodeBoundary !== "function"
  ) {
    fail(BOUNDED_READ_ERROR_CODES.windowOverflow);
  }
  if (!Number.isSafeInteger(input.limit) || input.limit < 1) {
    fail(BOUNDED_READ_ERROR_CODES.pageLimitInvalid);
  }
  if (input.rows.length > input.limit + 1) {
    fail(BOUNDED_READ_ERROR_CODES.windowOverflow);
  }
  const hasMore = input.rows.length > input.limit;
  const items = hasMore ? input.rows.slice(0, input.limit) : input.rows.slice();
  let nextCursor: string | null = null;
  if (hasMore) {
    const boundaryRow = input.direction === "next" ? items[items.length - 1]! : items[0]!;
    nextCursor = input.encodeBoundary(boundaryRow);
  }
  return Object.freeze({
    items: Object.freeze(items),
    nextCursor,
    hasMore,
  });
}
