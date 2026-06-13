import type { ListingFilter, ListingFilterOperator, ListingQuery } from "./queryBuilderService";

/**
 * TASK-459-04 SQL pushdown planner (pure, Bun-free, DB-free).
 *
 * The in-memory listing matcher in `queryBuilderService` is the SEMANTICS
 * ORACLE for visitor-facing filters: it compares strings with ICU collation
 * (`localeCompare` with `sensitivity: "base"`, `numeric: true`), lets arrays
 * match scalar `eq` filters, and lets missing fields match `gt`-style
 * comparisons through string coercion. Those semantics cannot be reproduced
 * exactly in SQL for arbitrary mixed-type jsonb data, so this planner NEVER
 * produces an exact replacement for the matcher. Instead it produces
 * GUARANTEED-SUPERSET predicates: every predicate may only exclude rows the
 * JS matcher would also exclude. The execution path applies the predicates in
 * SQL to shrink the fetched row set and then ALWAYS re-runs the JS matcher,
 * so results stay byte-identical to the in-memory path by construction.
 *
 * Supported (pushed) shapes — the hot catalog shapes:
 * - `data.*` numeric comparisons where the filter value is a JS number
 *   (`eq`/`neq`/`in`/`nin`/`gt`/`gte`/`lt`/`lte`/`between`): SQL evaluates the
 *   comparison only for rows whose stored value is a JSON number; all other
 *   rows (strings, booleans, arrays, objects, null, missing) stay in the
 *   superset for the JS matcher to decide.
 * - `data.*` boolean equality (`eq`/`neq` with a boolean value): evaluated
 *   only for JSON boolean rows.
 * - `data.* exists`: exact (present and not JSON null) — matches the JS
 *   matcher for every value shape.
 * - `data.* eq null` / `neq null`: missing/null evaluated in SQL; arrays stay
 *   in the superset because the JS matcher lets arrays containing null match
 *   `eq null`.
 *
 * Everything else (string comparisons, `contains`/`startsWith`, non-`data.*`
 * fields, mixed-type value lists) is intentionally NOT pushed — correctness
 * over speed — and recorded in `skippedFilters` for observability.
 */

export type ListingPushdownPredicate =
  | {
      kind: "numeric-compare";
      segments: string[];
      op: "gt" | "gte" | "lt" | "lte";
      value: number;
      exact: false;
    }
  | { kind: "numeric-eq"; segments: string[]; negate: boolean; values: number[]; exact: false }
  | { kind: "numeric-between"; segments: string[]; min: number; max: number; exact: false }
  | { kind: "boolean-eq"; segments: string[]; negate: boolean; value: boolean; exact: false }
  | { kind: "exists"; segments: string[]; exact: true }
  | { kind: "null-eq"; segments: string[]; negate: boolean; exact: false };

export type ListingPushdownSkippedFilter = {
  field: string;
  op: ListingFilterOperator;
  reason:
    | "unsupported-field"
    | "unsupported-op"
    | "unsupported-value"
    | "unsupported-field-charset";
};

export type ListingPushdownPlan = {
  source: ListingQuery["source"];
  predicates: ListingPushdownPredicate[];
  skippedFilters: ListingPushdownSkippedFilter[];
  /**
   * True when every filter of the query has an EXACT SQL translation. The
   * execution path still re-runs the JS matcher (oracle) either way; the flag
   * exists for observability and for future slices that may skip the
   * re-filter once sorting can be pushed exactly.
   */
  fullyPushed: boolean;
  /**
   * Sorting is never pushed in this slice: the JS comparator uses ICU
   * collation (including for the `id` tiebreaker), which does not match
   * Postgres uuid/text ordering. Kept as an explicit contract field.
   */
  sortPushed: false;
};

export type ListingPushdownSummary = {
  pushedFilterCount: number;
  skippedFilters: ListingPushdownSkippedFilter[];
  fullyPushed: boolean;
};

/**
 * Segments are inlined into index-compatible SQL expressions as quoted
 * literals (parameter placeholders would defeat expression-index matching for
 * generic plans), so only a strict identifier charset is ever accepted.
 * Anything else falls back to the JS path.
 */
const safeSegmentPattern = /^[A-Za-z0-9_-]{1,64}$/;

export const isSafeListingPushdownSegment = (segment: string) => safeSegmentPattern.test(segment);

const resolveDataSegments = (field: string): string[] | null => {
  const segments = field.split(".");
  if (segments.length < 2 || segments[0] !== "data") return null;
  return segments.slice(1);
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const skip = (
  filter: ListingFilter,
  reason: ListingPushdownSkippedFilter["reason"]
): ListingPushdownSkippedFilter => ({ field: filter.field, op: filter.op, reason });

const planFilter = (
  filter: ListingFilter
): { predicate: ListingPushdownPredicate } | { skipped: ListingPushdownSkippedFilter } => {
  const segments = resolveDataSegments(filter.field);
  if (!segments) return { skipped: skip(filter, "unsupported-field") };
  if (!segments.every(isSafeListingPushdownSegment)) {
    return { skipped: skip(filter, "unsupported-field-charset") };
  }

  if (filter.op === "exists") {
    return { predicate: { kind: "exists", segments, exact: true } };
  }

  if (filter.op === "eq" || filter.op === "neq") {
    const negate = filter.op === "neq";
    if (filter.value === null) {
      return { predicate: { kind: "null-eq", segments, negate, exact: false } };
    }
    if (isFiniteNumber(filter.value)) {
      return {
        predicate: { kind: "numeric-eq", segments, negate, values: [filter.value], exact: false },
      };
    }
    if (typeof filter.value === "boolean") {
      return {
        predicate: { kind: "boolean-eq", segments, negate, value: filter.value, exact: false },
      };
    }
    return { skipped: skip(filter, "unsupported-value") };
  }

  if (filter.op === "in" || filter.op === "nin") {
    const values = Array.isArray(filter.value) ? filter.value : [];
    if (values.length === 0 || !values.every(isFiniteNumber)) {
      return { skipped: skip(filter, "unsupported-value") };
    }
    return {
      predicate: {
        kind: "numeric-eq",
        segments,
        negate: filter.op === "nin",
        values: [...values],
        exact: false,
      },
    };
  }

  if (filter.op === "gt" || filter.op === "gte" || filter.op === "lt" || filter.op === "lte") {
    if (!isFiniteNumber(filter.value)) return { skipped: skip(filter, "unsupported-value") };
    return {
      predicate: {
        kind: "numeric-compare",
        segments,
        op: filter.op,
        value: filter.value,
        exact: false,
      },
    };
  }

  if (filter.op === "between") {
    const range = Array.isArray(filter.value) ? filter.value : [];
    const [min, max] = range;
    if (range.length !== 2 || !isFiniteNumber(min) || !isFiniteNumber(max)) {
      return { skipped: skip(filter, "unsupported-value") };
    }
    return { predicate: { kind: "numeric-between", segments, min, max, exact: false } };
  }

  return { skipped: skip(filter, "unsupported-op") };
};

/**
 * Builds the superset pushdown plan for a normalized listing query. Returns
 * `null` for sources without SQL pushdown support (only the `entries` source
 * reads `content_entries` rows; posts/users/taxonomies keep their dedicated
 * fetch paths).
 */
export function buildListingPushdownPlan(query: ListingQuery): ListingPushdownPlan | null {
  if (query.source !== "entries") return null;

  const predicates: ListingPushdownPredicate[] = [];
  const skippedFilters: ListingPushdownSkippedFilter[] = [];

  for (const filter of query.filters) {
    const result = planFilter(filter);
    if ("predicate" in result) {
      predicates.push(result.predicate);
    } else {
      skippedFilters.push(result.skipped);
    }
  }

  return {
    source: query.source,
    predicates,
    skippedFilters,
    fullyPushed: skippedFilters.length === 0 && predicates.every((predicate) => predicate.exact),
    sortPushed: false,
  };
}

export function summarizeListingPushdown(
  plan: ListingPushdownPlan | null
): ListingPushdownSummary | null {
  if (!plan) return null;
  return {
    pushedFilterCount: plan.predicates.length,
    skippedFilters: plan.skippedFilters,
    fullyPushed: plan.fullyPushed,
  };
}
