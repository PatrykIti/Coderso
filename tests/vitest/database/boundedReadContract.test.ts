/**
 * TASK-551-03-L01 vitest lane: strict bounded reads and keyset predicates.
 *
 * Pure-lane coverage: page-limit boundaries, the full 16-row comparator truth
 * table via a small grammar interpreter proving ordering semantics without
 * gaps or duplicates, prefix ties from two through five fields, ORDER BY
 * reversal, bounded page envelope behavior, the index-seekable first-field
 * bound (K6), DESC/DESC two-way traversal over tied timestamps (K3), the
 * previous-direction page boundary (K7), and an import-purity scan over
 * the pure production modules. Real-PostgreSQL execution of the same table is
 * gated below on TASK-551-11's owner-injected `task551-db-test` map and skips
 * without it, mirroring tests/perf/database-pool-telemetry.test.ts.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildKeysetOrderBy,
  buildKeysetPredicate,
  parsePageLimit,
  toBoundedPage,
  BOUNDED_READ_ERROR_CODES,
  type SqlFragment,
} from "../../../core/services/database/boundedReadContract";
import {
  decodeKeysetCursor,
  encodeKeysetCursor,
  loadPaginationCursorKeyring,
  normalizeKeysetSpec,
  type CursorField,
  type CursorPayload,
  type KeysetSpec,
} from "../../../core/services/database/keysetCursor";

const SECRET = "s".repeat(48);
const KEYS = loadPaginationCursorKeyring({
  PAGINATION_CURSOR_SECRET: SECRET,
} as unknown as NodeJS.ProcessEnv);
const SCOPE = "eval";
const NOW = 1_700_000_000;
const UUID = (n: number): string => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

// ---------------------------------------------------------------------------
// Page limits
// ---------------------------------------------------------------------------

describe("parsePageLimit", () => {
  it("pins defaults 50 and maximum 100", () => {
    expect(parsePageLimit(undefined)).toBe(50);
    expect(parsePageLimit("50")).toBe(50);
    expect(parsePageLimit(100)).toBe(100);
  });

  it("rejects non-integer, zero, negative, overflow, and coercion bypasses", () => {
    for (const bad of [
      0,
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      NaN,
      Infinity,
      "101",
      "-3",
      "1e2",
      "",
      "01",
      true,
    ]) {
      expect(() => parsePageLimit(bad as unknown)).toThrowError(
        BOUNDED_READ_ERROR_CODES.pageLimitInvalid
      );
    }
    expect(parsePageLimit(null)).toBe(50); // nullish falls back to the default
  });

  it("honors explicit options and rejects unknown option fields", () => {
    expect(parsePageLimit(undefined, { default: 10, max: 20 })).toBe(10);
    expect(() => parsePageLimit(25, { default: 10, max: 20 })).toThrowError(
      BOUNDED_READ_ERROR_CODES.pageLimitInvalid
    );
    expect(() =>
      parsePageLimit(undefined, { default: 10, max: 20, unknown: 1 } as never)
    ).toThrowError(BOUNDED_READ_ERROR_CODES.pageLimitInvalid);
  });
});

// ---------------------------------------------------------------------------
// Comparator truth table (16 rows) via a tiny SQL grammar interpreter
// ---------------------------------------------------------------------------

type Cell = string | null;

/** Interprets exactly the SQL grammar this contract emits, over row tuples. */
function evalFragment(fragment: SqlFragment, tuple: Cell[], columns: string[]): boolean {
  if (fragment.text === "FALSE") return false;
  const orParts = splitTopLevel(fragment.text, " OR ");
  return orParts.some((disjunct) =>
    splitTopLevel(stripOuterParens(disjunct), " AND ").every((conjunct) =>
      evalConjunct(conjunct.trim(), fragment.params, tuple, columns)
    )
  );
}

function stripOuterParens(text: string): string {
  if (!text.startsWith("(") || !text.endsWith(")")) return text;
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0 && i < text.length - 1) return text; // closes early
    }
  }
  return text.slice(1, -1);
}

function splitTopLevel(text: string, separator: " OR " | " AND "): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (depth === 0 && text.startsWith(separator, i)) {
      parts.push(current.trim());
      current = "";
      i += separator.length - 1;
      continue;
    }
    current += char;
  }
  parts.push(current.trim());
  return parts.filter((part) => part.length > 0);
}

function paramIndex(sql: string): number {
  const match = /\$(\d+)/.exec(sql);
  return match ? Number(match[1]) : -1;
}

function compareValues(a: string | number | boolean | null, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a < b ? -1 : a > b ? 1 : 0;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

/**
 * Display-order comparator honoring `order` for every field type. Datasets
 * sorted by it are non-null; null placement is covered by `sortedDataset`.
 */
function compareRowsBySpec(spec: KeysetSpec, a: Cell[], b: Cell[]): number {
  for (let i = 0; i < spec.fields.length; i += 1) {
    const field = spec.fields[i]!;
    let delta =
      field.type === "integer"
        ? compareValues(Number(a[i]), Number(b[i]))
        : compareValues(a[i]!, b[i]);
    if (field.order === "desc") delta = -delta;
    if (delta !== 0) return delta;
  }
  return 0;
}

/** Strips every enclosing parenthesis pair that wraps the whole text. */
function stripAllOuterParens(text: string): string {
  let current = text.trim();
  for (;;) {
    const next = stripOuterParens(current).trim();
    if (next === current) return current;
    current = next;
  }
}

function evalConjunct(
  rawSql: string,
  params: readonly unknown[],
  tuple: Cell[],
  columns: string[]
): boolean {
  if (rawSql === "FALSE") return false;
  // A parenthesized OR/AND group (for example the K6 bound's body) is a
  // nested fragment: recurse before any paren flattening.
  const inner = stripAllOuterParens(rawSql);
  if (splitTopLevel(inner, " OR ").length > 1 || splitTopLevel(inner, " AND ").length > 1) {
    return evalFragment({ text: inner, params }, tuple, columns);
  }
  // Atomic terms: remaining parentheses carry no semantics; flatten them.
  const sql = rawSql.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  const columnMatch = /^([a-z0-9_]+)/.exec(sql);
  const columnIndex = columnMatch ? columns.indexOf(columnMatch[1]!) : -1;
  const value = columnIndex >= 0 ? tuple[columnIndex]! : null;
  if (sql.includes("IS NOT DISTINCT FROM NULL")) return value === null;
  if (sql.includes("IS NOT DISTINCT FROM")) {
    const bound = params[paramIndex(sql) - 1];
    return value !== null && compareValues(value, bound) === 0;
  }
  // Composite strict-or-null forms: `c > $n OR c IS NULL` and mirror.
  const composite = /^([a-z0-9_]+) ([<>]) \$(\d+) OR [a-z0-9_]+ IS NULL$/.exec(sql);
  if (composite) {
    const bound = params[Number(composite[3]) - 1];
    if (value === null) return true;
    return composite[2] === ">" ? compareValues(value, bound) > 0 : compareValues(value, bound) < 0;
  }
  if (/^[a-z0-9_]+ IS NULL$/.test(sql)) return value === null;
  if (/^[a-z0-9_]+ IS NOT NULL$/.test(sql)) return value !== null;
  const gtMatch = /^([a-z0-9_]+) > \$(\d+)$/.exec(sql);
  if (gtMatch) {
    const bound = params[Number(gtMatch[2]) - 1];
    return value !== null && compareValues(value, bound) > 0;
  }
  const ltMatch = /^([a-z0-9_]+) < \$(\d+)$/.exec(sql);
  if (ltMatch) {
    const bound = params[Number(ltMatch[2]) - 1];
    return value !== null && compareValues(value, bound) < 0;
  }
  const geMatch = /^([a-z0-9_]+) >= \$(\d+)$/.exec(sql);
  if (geMatch) {
    const bound = params[Number(geMatch[2]) - 1];
    return value !== null && compareValues(value, bound) >= 0;
  }
  const leMatch = /^([a-z0-9_]+) <= \$(\d+)$/.exec(sql);
  if (leMatch) {
    const bound = params[Number(leMatch[2]) - 1];
    return value !== null && compareValues(value, bound) <= 0;
  }
  throw new Error(`unhandled conjunct grammar: ${rawSql}`);
}

/** Nullable integer sort field plus the mandatory uuid tie-breaker. */
function twoFieldSpec(order: "asc" | "desc", nulls: "first" | "last"): KeysetSpec {
  return normalizeKeysetSpec({
    scope: SCOPE,
    fields: [
      { name: "score", type: "integer", column: "score", order, nulls, nullable: true },
      { name: "id", type: "uuid", column: "id", order: "asc", nulls: "last", nullable: false },
    ],
  });
}

function cursorFor(spec: KeysetSpec, row: Cell[]): CursorPayload {
  const values = row.map((v) => v);
  const encoded = encodeKeysetCursor(
    { scope: SCOPE, direction: "next", values, nowUnixSeconds: NOW },
    spec,
    KEYS
  );
  return decodeKeysetCursor(encoded, spec, KEYS, { nowUnixSeconds: NOW });
}

const COLUMNS = ["score", "id"];

describe("comparator truth table (16 rows)", () => {
  function sortedDataset(order: "asc" | "desc", nulls: "first" | "last"): Cell[][] {
    const rows: Cell[][] = [
      ["10", UUID(1)],
      ["20", UUID(2)],
      [null, UUID(3)],
    ];
    rows.sort((a, b) => {
      if (a[0] === null && b[0] === null) return compareValues(a[1]!, b[1]!);
      if (a[0] === null) return nulls === "last" ? 1 : -1;
      if (b[0] === null) return nulls === "last" ? -1 : 1;
      const primary =
        order === "asc"
          ? compareValues(Number(a[0]), Number(b[0]))
          : compareValues(Number(b[0]), Number(a[0]));
      return primary !== 0 ? primary : compareValues(a[1]!, b[1]!);
    });
    return rows;
  }

  for (const order of ["asc", "desc"] as const) {
    for (const nulls of ["first", "last"] as const) {
      for (const relation of ["after", "before"] as const) {
        it(`${order.toUpperCase()} NULLS ${nulls} ${relation}`, () => {
          const spec = twoFieldSpec(order, nulls);
          const dataset = sortedDataset(order, nulls);
          for (let boundaryIndex = 0; boundaryIndex < dataset.length; boundaryIndex += 1) {
            const cursor = cursorFor(spec, dataset[boundaryIndex]!);
            const predicate = buildKeysetPredicate(spec, cursor, relation);
            expect(predicate.text).toMatch(/score|id/);
            // Strict relations exclude the boundary row itself.
            const expectedSide =
              relation === "after"
                ? dataset.slice(boundaryIndex + 1)
                : dataset.slice(0, boundaryIndex);
            const matched = dataset.filter((row) => evalFragment(predicate, row, COLUMNS));
            expect(matched).toEqual(expectedSide);
          }
        });
      }
    }
  }

  it("never interpolates cursor-supplied identifiers into SQL text", () => {
    const spec = twoFieldSpec("asc", "last");
    const cursor = cursorFor(spec, ["10", UUID(1)]);
    const predicate = buildKeysetPredicate(spec, cursor, "after");
    expect(predicate.text).not.toContain('"');
    expect(predicate.text).not.toContain("--");
    expect(predicate.text).not.toContain(";");
    // Values travel as bind parameters, never inside the SQL text.
    expect(predicate.text).not.toContain(UUID(1));
    expect(predicate.text).not.toContain("10");
  });

  it("collapses impossible comparator positions without matching the boundary", () => {
    const lastSpec = twoFieldSpec("asc", "last");
    const nullTail = cursorFor(lastSpec, [null, UUID(3)]);
    // ASC NULLS LAST, null value, after -> FALSE at the leading position.
    expect(
      evalFragment(buildKeysetPredicate(lastSpec, nullTail, "after"), [null, UUID(3)], COLUMNS)
    ).toBe(false);
    const firstSpec = twoFieldSpec("desc", "first");
    const nullHead = cursorFor(firstSpec, [null, UUID(3)]);
    // DESC NULLS FIRST, null value, before -> FALSE at the leading position.
    expect(
      evalFragment(buildKeysetPredicate(firstSpec, nullHead, "before"), [null, UUID(3)], COLUMNS)
    ).toBe(false);
  });
});

describe("prefix ties across two through five fields", () => {
  it("navigates ties without gaps or duplicates using the uuid tie-breaker", () => {
    for (let width = 2; width <= 5; width += 1) {
      const spec = normalizeKeysetSpec({
        scope: SCOPE,
        fields: [
          ...Array.from({ length: width - 1 }, (_, i) => ({
            name: `k${i}`,
            type: "integer" as const,
            column: `k${i}`,
            order: i % 2 === 0 ? ("asc" as const) : ("desc" as const),
            nulls: "last" as const,
            nullable: false,
          })),
          { name: "id", type: "uuid", column: "id", order: "asc", nulls: "last", nullable: false },
        ],
      });
      const columns = spec.fields.map((f) => f.column);
      const compareBySpec = (a: Cell[], b: Cell[]): number => compareRowsBySpec(spec, a, b);
      const dataset: Cell[][] = [];
      for (let id = 1; id <= 6; id += 1) {
        dataset.push([...Array.from({ length: width - 1 }, () => String(id % 2)), UUID(id)]);
      }
      dataset.sort(compareBySpec);
      const visited: string[] = [];
      let payload: CursorPayload | null = null;
      for (let step = 0; step < 12; step += 1) {
        const remaining = (
          payload
            ? dataset.filter((row) =>
                evalFragment(buildKeysetPredicate(spec, payload!, "after"), row, columns)
              )
            : [...dataset]
        ).sort(compareBySpec);
        if (remaining.length === 0) break;
        visited.push(remaining[0]![width - 1]!);
        payload = decodeKeysetCursor(
          encodeKeysetCursor(
            { scope: SCOPE, direction: "next", values: remaining[0]!, nowUnixSeconds: NOW },
            spec,
            KEYS
          ),
          spec,
          KEYS,
          { nowUnixSeconds: NOW }
        );
      }
      expect([...visited].sort()).toEqual([UUID(1), UUID(2), UUID(3), UUID(4), UUID(5), UUID(6)]);
      expect(new Set(visited).size).toBe(6);
    }
  });
});

describe("order-by reversal and bounded pages", () => {
  const spec = normalizeKeysetSpec({
    scope: SCOPE,
    fields: [
      {
        name: "title",
        type: "text",
        column: "posts.title",
        order: "desc",
        nulls: "first",
        nullable: true,
      },
      { name: "id", type: "uuid", column: "id", order: "asc", nulls: "last", nullable: false },
    ],
  });

  it("reverses directions and null placement only for previous fetches", () => {
    expect(buildKeysetOrderBy(spec, "next")).toBe(
      "posts.title DESC NULLS FIRST, id ASC NULLS LAST"
    );
    expect(buildKeysetOrderBy(spec, "previous")).toBe(
      "posts.title ASC NULLS LAST, id DESC NULLS FIRST"
    );
  });

  function page(rows: string[], direction: "next" | "previous") {
    return toBoundedPage<string>({
      rows,
      limit: parsePageLimit(2),
      direction,
      encodeBoundary: (row) => `cursor(${row})`,
    });
  }

  it("emits items, nextCursor, and hasMore with exact limit+1 lookahead", () => {
    const more = page(["a", "b", "c"], "next");
    expect(more.items).toEqual(["a", "b"]);
    expect(more.hasMore).toBe(true);
    // The boundary derives only from the last RETURNED row.
    expect(more.nextCursor).toBe("cursor(b)");
    const exhausted = page(["a", "b"], "next");
    expect(exhausted.hasMore).toBe(false);
    expect(exhausted.nextCursor).toBeNull();
    // Previous rows arrive in fetch order (nearest the cursor first); the page
    // is reversed into display order and continues backward from items[0].
    const previousRows = ["a", "b", "c"];
    const previousBoundary = page(previousRows, "previous");
    expect(previousBoundary.items).toEqual(["b", "a"]);
    expect(previousBoundary.hasMore).toBe(true);
    expect(previousBoundary.nextCursor).toBe("cursor(b)");
    expect(previousRows).toEqual(["a", "b", "c"]);
    const previousRowsExhausted = ["b", "a"];
    const previousExhausted = page(previousRowsExhausted, "previous");
    expect(previousExhausted.items).toEqual(["a", "b"]);
    expect(previousExhausted.hasMore).toBe(false);
    expect(previousExhausted.nextCursor).toBeNull();
    // The caller's input array is never mutated by the in-page reversal.
    expect(previousRowsExhausted).toEqual(["b", "a"]);
  });

  it("rejects window overflow and invalid limits fail closed", () => {
    expect(() => page(["a", "b", "c", "d"], "next")).toThrowError(
      BOUNDED_READ_ERROR_CODES.windowOverflow
    );
    expect(() =>
      toBoundedPage<string>({
        rows: ["a"],
        limit: 0 as never,
        direction: "next",
        encodeBoundary: () => "",
      })
    ).toThrowError(BOUNDED_READ_ERROR_CODES.pageLimitInvalid);
  });
});

// ---------------------------------------------------------------------------
// Timestamp specs: K6 bound, K3 DESC/DESC traversal, K7 previous boundary
// ---------------------------------------------------------------------------

/** Non-null `updated_at` plus the `id` tie-breaker, each with native null placement. */
function timestampSpec(tsOrder: "asc" | "desc", idOrder: "asc" | "desc"): KeysetSpec {
  const nullsFor = (order: "asc" | "desc"): "first" | "last" =>
    order === "asc" ? "last" : "first";
  return normalizeKeysetSpec({
    scope: SCOPE,
    fields: [
      {
        name: "updated_at",
        type: "timestamp",
        column: "updated_at",
        order: tsOrder,
        nulls: nullsFor(tsOrder),
        nullable: false,
      },
      {
        name: "id",
        type: "uuid",
        column: "id",
        order: idOrder,
        nulls: nullsFor(idOrder),
        nullable: false,
      },
    ],
  });
}

/** DD = (updated_at DESC NULLS FIRST nullable:false, id DESC NULLS FIRST). */
const DD = timestampSpec("desc", "desc");
const G_COLUMNS = ["updated_at", "id"];
/** Dataset G: six non-null rows with a tied `updated_at` group, all `.000Z`. */
const G: readonly Cell[][] = [
  ["2026-01-03T00:00:00.000Z", UUID(1)],
  ["2026-01-02T00:00:00.000Z", UUID(2)],
  ["2026-01-02T00:00:00.000Z", UUID(3)],
  ["2026-01-02T00:00:00.000Z", UUID(4)],
  ["2026-01-01T00:00:00.000Z", UUID(5)],
  ["2026-01-01T00:00:00.000Z", UUID(6)],
];
const GD_DISPLAY_IDS = [1, 4, 3, 2, 6, 5].map(UUID);

function encodeRow(spec: KeysetSpec, row: Cell[], direction: "next" | "previous"): string {
  return encodeKeysetCursor(
    { scope: SCOPE, direction, values: [...row], nowUnixSeconds: NOW },
    spec,
    KEYS
  );
}

function decodeToken(spec: KeysetSpec, token: string): CursorPayload {
  return decodeKeysetCursor(token, spec, KEYS, { nowUnixSeconds: NOW });
}

function displayOrder(spec: KeysetSpec): Cell[][] {
  return [...G].sort((a, b) => compareRowsBySpec(spec, a, b));
}

describe("index-seekable first-field bound (K6)", () => {
  const TS = "2026-01-02T00:00:00.000Z";
  const ID = UUID(3);

  it("pins the DESC/DESC order and bounded predicate text with fresh placeholders", () => {
    expect(buildKeysetOrderBy(DD, "next")).toBe("updated_at DESC NULLS FIRST, id DESC NULLS FIRST");
    expect(buildKeysetOrderBy(DD, "previous")).toBe("updated_at ASC NULLS LAST, id ASC NULLS LAST");
    const after = buildKeysetPredicate(
      DD,
      decodeToken(DD, encodeRow(DD, [TS, ID], "next")),
      "after"
    );
    expect(after.text).toBe(
      "updated_at <= $1 AND ((updated_at < $2) OR (updated_at IS NOT DISTINCT FROM $3 AND (id < $4)))"
    );
    expect(after.params).toEqual([TS, TS, TS, ID]);
    const before = buildKeysetPredicate(
      DD,
      decodeToken(DD, encodeRow(DD, [TS, ID], "previous")),
      "before"
    );
    expect(before.text).toBe(
      "updated_at >= $1 AND (((updated_at > $2) OR updated_at IS NULL) OR (updated_at IS NOT DISTINCT FROM $3 AND ((id > $4) OR id IS NULL)))"
    );
    expect(before.params).toEqual([TS, TS, TS, ID]);
  });

  it("bounds a single-field spec and leaves a nullable first field unbounded", () => {
    const idOnly = normalizeKeysetSpec({
      scope: SCOPE,
      fields: [
        { name: "id", type: "uuid", column: "id", order: "desc", nulls: "first", nullable: false },
      ],
    });
    const single = buildKeysetPredicate(idOnly, cursorFor(idOnly, [ID]), "after");
    expect(single.text).toBe("id <= $1 AND ((id < $2))");
    expect(single.params).toEqual([ID, ID]);
    const spec = twoFieldSpec("desc", "first");
    const unbounded = buildKeysetPredicate(spec, cursorFor(spec, ["10", UUID(1)]), "after");
    expect(unbounded.text).toBe(
      "(score < $1) OR (score IS NOT DISTINCT FROM $2 AND ((id > $3) OR id IS NULL))"
    );
    expect(unbounded.params).toEqual([10, 10, UUID(1)]);
  });

  /** K6 table: the bound operator keys on (relation, first-field order) only. */
  const K6_BOUND_OPERATOR = {
    after: { desc: "<=", asc: ">=" },
    before: { desc: ">=", asc: "<=" },
  } as const;

  /** (updated_at DESC NULLS LAST nullable:false, id DESC NULLS FIRST): non-native nulls. */
  const DESC_NULLS_LAST_SPEC = normalizeKeysetSpec({
    scope: SCOPE,
    fields: [
      {
        name: "updated_at",
        type: "timestamp",
        column: "updated_at",
        order: "desc",
        nulls: "last",
        nullable: false,
      },
      { name: "id", type: "uuid", column: "id", order: "desc", nulls: "first", nullable: false },
    ],
  });

  it("keys the bound operator on order, not on non-native null placement", () => {
    const after = buildKeysetPredicate(
      DESC_NULLS_LAST_SPEC,
      decodeToken(DESC_NULLS_LAST_SPEC, encodeRow(DESC_NULLS_LAST_SPEC, [TS, ID], "next")),
      "after"
    );
    expect(after.text).toBe(
      "updated_at <= $1 AND (((updated_at < $2) OR updated_at IS NULL) OR (updated_at IS NOT DISTINCT FROM $3 AND (id < $4)))"
    );
    expect(after.params).toEqual([TS, TS, TS, ID]);
    const before = buildKeysetPredicate(
      DESC_NULLS_LAST_SPEC,
      decodeToken(DESC_NULLS_LAST_SPEC, encodeRow(DESC_NULLS_LAST_SPEC, [TS, ID], "previous")),
      "before"
    );
    expect(before.text).toBe(
      "updated_at >= $1 AND ((updated_at > $2) OR (updated_at IS NOT DISTINCT FROM $3 AND ((id > $4) OR id IS NULL)))"
    );
    expect(before.params).toEqual([TS, TS, TS, ID]);
  });

  it("binds a non-null integer first field as a Number in every position", () => {
    const scoreSpec = normalizeKeysetSpec({
      scope: SCOPE,
      fields: [
        {
          name: "score",
          type: "integer",
          column: "score",
          order: "asc",
          nulls: "last",
          nullable: false,
        },
        { name: "id", type: "uuid", column: "id", order: "asc", nulls: "last", nullable: false },
      ],
    });
    const predicate = buildKeysetPredicate(
      scoreSpec,
      cursorFor(scoreSpec, ["10", UUID(1)]),
      "after"
    );
    expect(predicate.text).toBe(
      "score >= $1 AND (((score > $2) OR score IS NULL) OR (score IS NOT DISTINCT FROM $3 AND ((id > $4) OR id IS NULL)))"
    );
    expect(predicate.params).toEqual([10, 10, 10, UUID(1)]);
    expect(predicate.params.slice(0, -1).every((param) => typeof param === "number")).toBe(true);
  });

  const equivalenceSpecs: readonly [string, KeysetSpec][] = [
    ["S1 DD", DD],
    ["S2 (updated_at ASC, id ASC)", timestampSpec("asc", "asc")],
    ["S3 (updated_at DESC, id ASC)", timestampSpec("desc", "asc")],
    ["S4 (updated_at DESC NULLS LAST, id DESC)", DESC_NULLS_LAST_SPEC],
  ];
  for (const [label, spec] of equivalenceSpecs) {
    it(`matches the same rows with and without the bound for ${label}`, () => {
      const display = displayOrder(spec);
      for (let boundaryIndex = 0; boundaryIndex < display.length; boundaryIndex += 1) {
        for (const relation of ["after", "before"] as const) {
          const direction = relation === "after" ? "next" : "previous";
          const cursor = decodeToken(spec, encodeRow(spec, display[boundaryIndex]!, direction));
          const bounded = buildKeysetPredicate(spec, cursor, relation);
          const expectedOp = K6_BOUND_OPERATOR[relation][spec.fields[0].order];
          const match = /^updated_at (<=|>=) \$1 AND \((.*)\)$/s.exec(bounded.text);
          expect(match).not.toBeNull();
          expect(match![1]).toBe(expectedOp);
          const unbounded: SqlFragment = { text: match![2]!, params: bounded.params };
          const expectedSide =
            relation === "after"
              ? display.slice(boundaryIndex + 1)
              : display.slice(0, boundaryIndex);
          const withBound = display.filter((row) => evalFragment(bounded, row, G_COLUMNS));
          const withoutBound = display.filter((row) => evalFragment(unbounded, row, G_COLUMNS));
          expect(withBound).toEqual(expectedSide);
          expect(withoutBound).toEqual(expectedSide);
        }
      }
    });
  }
});

describe("DESC/DESC two-way traversal over tied timestamps (K3 g)", () => {
  it("pins the display order of dataset G", () => {
    expect(displayOrder(DD).map((row) => row[1])).toEqual(GD_DISPLAY_IDS);
  });

  it("walks forward and backward visiting every row exactly once in order", () => {
    const display = displayOrder(DD);
    const walks = [
      { direction: "next", relation: "after", start: display[0]!, expected: display },
      {
        direction: "previous",
        relation: "before",
        start: display[5]!,
        expected: [...display].reverse(),
      },
    ] as const;
    for (const walk of walks) {
      const visited: Cell[][] = [walk.start];
      for (let step = 0; step < 12; step += 1) {
        const boundaryRow = visited[visited.length - 1]!;
        const cursor = decodeToken(DD, encodeRow(DD, boundaryRow, walk.direction));
        const predicate = buildKeysetPredicate(DD, cursor, walk.relation);
        // The boundary row is never matched by its own predicate.
        expect(evalFragment(predicate, boundaryRow, G_COLUMNS)).toBe(false);
        const remaining = G.filter((row) => evalFragment(predicate, row, G_COLUMNS)).sort((a, b) =>
          compareRowsBySpec(DD, a, b)
        );
        if (remaining.length === 0) break;
        visited.push(walk.direction === "next" ? remaining[0]! : remaining[remaining.length - 1]!);
      }
      expect(visited).toEqual(walk.expected);
      expect(new Set(visited.map((row) => row[1])).size).toBe(6);
    }
  });
});

describe("previous-direction page boundary over G (K7)", () => {
  const limit = parsePageLimit(2);

  function fetchPage(token: string | null, direction: "next" | "previous") {
    const payload = token === null ? null : decodeToken(DD, token);
    const relation = direction === "next" ? "after" : "before";
    const matched =
      payload === null
        ? [...G]
        : G.filter((row) =>
            evalFragment(buildKeysetPredicate(DD, payload, relation), row, G_COLUMNS)
          );
    // Negated comparator = non-null equivalent of buildKeysetOrderBy(DD, "previous").
    const sign = direction === "next" ? 1 : -1;
    matched.sort((a, b) => sign * compareRowsBySpec(DD, a, b));
    return toBoundedPage<Cell[]>({
      rows: matched.slice(0, limit + 1),
      limit,
      direction,
      encodeBoundary: (row) => encodeRow(DD, row, direction),
    });
  }

  const ids = (items: readonly Cell[][]): Cell[] => items.map((row) => row[1]!);

  it("walks forward then backward without gaps or duplicates", () => {
    const forward: Cell[][] = [];
    let current = fetchPage(null, "next");
    forward.push(ids(current.items));
    for (let step = 0; step < 10 && current.nextCursor !== null; step += 1) {
      current = fetchPage(current.nextCursor, "next");
      forward.push(ids(current.items));
    }
    expect(current.hasMore).toBe(false);
    expect(forward).toEqual([
      [UUID(1), UUID(4)],
      [UUID(3), UUID(2)],
      [UUID(6), UUID(5)],
    ]);
    expect(forward.flat()).toEqual(GD_DISPLAY_IDS);

    const finalForward = current.items;
    const backward: Cell[][] = [];
    let previous = fetchPage(encodeRow(DD, finalForward[0]!, "previous"), "previous");
    backward.push(ids(previous.items));
    for (let step = 0; step < 10 && previous.nextCursor !== null; step += 1) {
      previous = fetchPage(previous.nextCursor, "previous");
      backward.push(ids(previous.items));
    }
    expect(previous.hasMore).toBe(false);
    expect(backward).toEqual([
      [UUID(3), UUID(2)],
      [UUID(1), UUID(4)],
    ]);
    expect([...[...backward].reverse().flat(), ...ids(finalForward)]).toEqual(GD_DISPLAY_IDS);
  });
});

// ---------------------------------------------------------------------------
// DB-gated PostgreSQL execution of the identical truth table
// ---------------------------------------------------------------------------

/**
 * Presence-only gate for TASK-551-11's owner-injected `task551-db-test` map
 * (`TASK551_FIXTURE_DATABASE_URL`, `_NAME`, `_SENTINEL`), mirroring the
 * restored gate of tests/perf/database-pool-telemetry.test.ts. The map is
 * injected only by the owner, so its presence -- never its values -- decides
 * whether the real database may be dialed. Under the airtight local form no
 * key is set, so the real-PostgreSQL arm skips by name instead of dialing an
 * ambient URL.
 */
const OWNER_DB_TEST_MAP_PRESENT = [
  process.env.TASK551_FIXTURE_DATABASE_URL,
  process.env.TASK551_FIXTURE_DATABASE_NAME,
  process.env.TASK551_FIXTURE_DATABASE_SENTINEL,
].every((value) => typeof value === "string" && value.length > 0);

describe("comparator truth table against PostgreSQL (requires the owner-injected task551-db-test map)", () => {
  // Named gate: the single real-PostgreSQL arm registers through `it.skipIf`
  // on the owner map above and skips when it is absent.
  const ownerMapTest = it.skipIf(!OWNER_DB_TEST_MAP_PRESENT);

  ownerMapTest("executes all 16 modes on real PostgreSQL without gaps", async () => {
    const { default: postgres } = await import("postgres");
    const sql = postgres(process.env.TASK551_FIXTURE_DATABASE_URL!, { max: 1 });
    try {
      await sql`CREATE TEMP TABLE keyset_truth(score int, id uuid)`;
      for (const [score, id] of [
        [10, UUID(1)],
        [10, UUID(2)],
        [20, UUID(3)],
        [null, UUID(4)],
      ] as const) {
        await sql`INSERT INTO keyset_truth(score, id) VALUES (${score}, ${id}::uuid)`;
      }
      for (const order of ["asc", "desc"] as const) {
        for (const nulls of ["first", "last"] as const) {
          const spec = twoFieldSpec(order, nulls);
          const selectOrdered = `SELECT score::text AS score_text, id::text AS id_text
						FROM keyset_truth
						ORDER BY score ${order.toUpperCase()} NULLS ${nulls.toUpperCase()}, id ASC NULLS LAST`;
          const ordered = await sql.unsafe(selectOrdered);
          const sorted: Cell[][] = (
            ordered as unknown as { score_text: string | null; id_text: string }[]
          ).map((row) => [row.score_text, row.id_text]);
          expect(sorted).toHaveLength(4);
          for (let boundaryIndex = 0; boundaryIndex < sorted.length; boundaryIndex += 1) {
            for (const relation of ["after", "before"] as const) {
              const payload = cursorFor(spec, sorted[boundaryIndex]!);
              const fragment = buildKeysetPredicate(spec, payload, relation);
              const matched = await sql.unsafe(
                `SELECT score::text AS score_text, id::text AS id_text
									FROM keyset_truth
									WHERE ${fragment.text}
									ORDER BY score ${order.toUpperCase()} NULLS ${nulls.toUpperCase()}, id ASC NULLS LAST`,
                [...fragment.params] as never
              );
              const matchedRows: Cell[][] = (
                matched as unknown as { score_text: string | null; id_text: string }[]
              ).map((row) => [row.score_text, row.id_text]);
              const expectedSide =
                relation === "after"
                  ? sorted.slice(boundaryIndex + 1)
                  : sorted.slice(0, boundaryIndex);
              expect(matchedRows).toEqual(expectedSide);
            }
          }
        }
      }
    } finally {
      await sql.end({ timeout: 5 });
    }
  });
});

// ---------------------------------------------------------------------------
// Import purity
// ---------------------------------------------------------------------------

describe("import purity of the Bun-free modules", () => {
  const sources = [
    readFileSync(
      new URL("../../../core/services/database/keysetCursor.ts", import.meta.url),
      "utf8"
    ),
    readFileSync(
      new URL("../../../core/services/database/boundedReadContract.ts", import.meta.url),
      "utf8"
    ),
  ];
  it("imports no Bun APIs, runtime kernel, or DB client modules", () => {
    for (const source of sources) {
      expect(source).not.toMatch(/\bBun\./);
      expect(source).not.toMatch(/from\s+"[^"]*db\/client"/);
      expect(source).not.toMatch(/from\s+"bun"/);
    }
  });

  it("freezes the decoded cursor fields array and every field object", () => {
    const payload = decodeToken(DD, encodeRow(DD, [...G[0]!], "next"));
    const fields: readonly CursorField[] = payload.fields;
    expect(fields).toHaveLength(2);
    expect(Object.isFrozen(payload)).toBe(true);
    expect(Object.isFrozen(fields)).toBe(true);
    for (const field of fields) expect(Object.isFrozen(field)).toBe(true);
    expect(() => (fields as CursorField[]).push(fields[0]!)).toThrow(TypeError);
  });
});
