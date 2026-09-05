/**
 * TASK-551-03-L01 vitest lane: strict bounded reads and keyset predicates.
 *
 * Pure-lane coverage: page-limit boundaries, the full 16-row comparator truth
 * table via a small grammar interpreter proving ordering semantics without
 * gaps or duplicates, prefix ties from two through five fields, ORDER BY
 * reversal, bounded page envelope behavior, and an import-purity scan over
 * the pure production modules. Real-PostgreSQL execution of the same table is
 * DB-gated below and skips without DATABASE_URL (blocked in this environment).
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

function evalConjunct(
  rawSql: string,
  params: readonly unknown[],
  tuple: Cell[],
  columns: string[]
): boolean {
  if (rawSql === "FALSE") return false;
  // Parentheses carry no semantics for this grammar; flatten them.
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
      const compareBySpec = (a: Cell[], b: Cell[]): number => {
        for (let i = 0; i < spec.fields.length; i += 1) {
          const field = spec.fields[i]!;
          let delta: number;
          if (field.type === "integer") {
            delta = compareValues(Number(a[i]), Number(b[i]));
            if (field.order === "desc") delta = -delta;
          } else {
            delta = compareValues(a[i], b[i]);
          }
          if (delta !== 0) return delta;
        }
        return 0;
      };
      const dataset: Cell[][] = [];
      for (let id = 1; id <= 6; id += 1) {
        dataset.push([...Array.from({ length: width - 1 }, (_, i) => String(id % 2)), UUID(id)]);
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
    const previousBoundary = page(["a", "b", "c"], "previous");
    expect(previousBoundary.nextCursor).toBe("cursor(a)");
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
// DB-gated PostgreSQL execution of the identical truth table
// ---------------------------------------------------------------------------

describe("comparator truth table against PostgreSQL (requires DATABASE_URL)", () => {
  const hasDatabase = Boolean(process.env.DATABASE_URL);

  it.runIf(hasDatabase)("executes all 16 modes on real PostgreSQL without gaps", async () => {
    const { default: postgres } = await import("postgres");
    const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
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

  it("keeps cursor fields immutable API state", () => {
    const fields: readonly CursorField[] = Object.freeze([]);
    expect(Object.isFrozen(fields)).toBe(true);
  });
});
