import { sql, type SQL } from "drizzle-orm";

import { contentEntries } from "../../db/schema";
import { isSafeListingPushdownSegment, type ListingPushdownPredicate } from "./listingPushdown";

/**
 * TASK-459-04: translates pushdown predicate descriptors into parameterized
 * drizzle SQL over `content_entries.data`. Every predicate is a
 * GUARANTEED SUPERSET of the in-memory matcher (see `listingPushdown.ts`):
 * rows whose stored value shape cannot be evaluated confidently in SQL stay
 * included and the JS matcher decides.
 *
 * Field path segments are inlined as quoted literals (after strict charset
 * validation) instead of bind parameters so the expressions stay structurally
 * identical to the expression-index recipe documented in
 * `_docs/DATA_MODEL.md` — parameter placeholders inside the expression would
 * prevent expression-index matching for cached generic plans. Comparison
 * VALUES always stay bind parameters.
 */

const quoteSegmentLiteral = (segment: string): SQL => {
  if (!isSafeListingPushdownSegment(segment)) {
    throw new Error(`listing_pushdown_invalid_segment: ${segment}`);
  }
  // Charset is [A-Za-z0-9_-]; no quote/backslash characters can appear.
  return sql.raw(`'${segment}'`);
};

/** `data -> 'a' -> 'b'` jsonb value at the path (NULL when missing). */
const jsonbValueAt = (segments: string[]): SQL =>
  segments.reduce<SQL>(
    (acc, segment) => sql`(${acc} -> ${quoteSegmentLiteral(segment)})`,
    sql`${contentEntries.data}`
  );

/**
 * Typed numeric projection: a JSON number cast to float8 (IEEE-754 double —
 * the exact arithmetic the JS matcher uses), NULL for every other shape.
 * NOTE: no explicit ELSE branch — the expression must stay structurally
 * identical to the documented expression-index recipe.
 */
const numericValueAt = (segments: string[]): SQL => {
  const value = jsonbValueAt(segments);
  return sql`(CASE WHEN jsonb_typeof(${value}) = 'number' THEN (${value} #>> '{}')::double precision END)`;
};

/** Typed boolean projection: JSON boolean, NULL for every other shape. */
const booleanValueAt = (segments: string[]): SQL => {
  const value = jsonbValueAt(segments);
  return sql`(CASE WHEN jsonb_typeof(${value}) = 'boolean' THEN (${value} #>> '{}')::boolean END)`;
};

const numericComparison = (expr: SQL, op: "gt" | "gte" | "lt" | "lte", value: number): SQL => {
  if (op === "gt") return sql`${expr} > ${value}`;
  if (op === "gte") return sql`${expr} >= ${value}`;
  if (op === "lt") return sql`${expr} < ${value}`;
  return sql`${expr} <= ${value}`;
};

export function buildEntryDataPredicateSql(predicate: ListingPushdownPredicate): SQL {
  if (predicate.kind === "exists") {
    const value = jsonbValueAt(predicate.segments);
    return sql`(${value} IS NOT NULL AND ${value} <> 'null'::jsonb)`;
  }

  if (predicate.kind === "null-eq") {
    const value = jsonbValueAt(predicate.segments);
    if (predicate.negate) {
      // JS `neq null` certainly rejects missing/null rows; arrays containing
      // null stay included for the JS matcher.
      return sql`(${value} IS NOT NULL AND ${value} <> 'null'::jsonb)`;
    }
    // JS `eq null` matches missing/null AND arrays containing null.
    return sql`(${value} IS NULL OR ${value} = 'null'::jsonb OR jsonb_typeof(${value}) = 'array')`;
  }

  if (predicate.kind === "numeric-compare") {
    const expr = numericValueAt(predicate.segments);
    return sql`(${numericComparison(expr, predicate.op, predicate.value)} OR ${expr} IS NULL)`;
  }

  if (predicate.kind === "numeric-between") {
    const expr = numericValueAt(predicate.segments);
    return sql`((${expr} >= ${predicate.min} AND ${expr} <= ${predicate.max}) OR ${expr} IS NULL)`;
  }

  if (predicate.kind === "numeric-eq") {
    const expr = numericValueAt(predicate.segments);
    const matches =
      predicate.values.length === 1
        ? sql`${expr} = ${predicate.values[0]}`
        : sql.join(
            predicate.values.map((value) => sql`${expr} = ${value}`),
            sql` OR `
          );
    if (predicate.negate) {
      return sql`(NOT (${matches}) OR ${expr} IS NULL)`;
    }
    return sql`((${matches}) OR ${expr} IS NULL)`;
  }

  // boolean-eq
  const expr = booleanValueAt(predicate.segments);
  if (predicate.negate) {
    return sql`(${expr} <> ${predicate.value} OR ${expr} IS NULL)`;
  }
  return sql`(${expr} = ${predicate.value} OR ${expr} IS NULL)`;
}
