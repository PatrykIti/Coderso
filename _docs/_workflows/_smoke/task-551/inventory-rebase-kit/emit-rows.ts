/**
 * Transient TASK-551 fixture regen machinery (.tmp, never committed).
 *
 * Fail-closed: emitting CURRENT_ROWS for the CURRENT production tree requires
 * a classification table for every new call site (review-owned fields) and an
 * explicit authorization for every dropped pre-existing row. Without those the
 * driver refuses to produce fixture content, so no review field is ever
 * inferred here.
 */

/** Decoded, fully-spelled inventory row (fixture CurrentRow order). */
export type DecodedRow = readonly [
  file: string,
  symbol: string,
  line: number,
  column: number,
  family: string,
  operation: string,
  kind: string,
  statementRole: string,
  projection: string,
  filter: string,
  join: string,
  order: string,
  bound: number | "stream" | "missing",
  queryCountBudget: number | "x",
  cache: string,
  freshness: string,
  transaction: string,
  constraint: string,
  budgetId: string,
  plannedShapeId: null,
  fingerprintKey: string | null,
  owner: string,
  disposition: string,
];

const CODEBOOKS: Readonly<Record<number, Readonly<Record<string, string>>>> = {
  4: {
    D: "drizzle-executor",
    P: "postgres-client",
    S: "session-client",
    R: "tagged-raw-sql",
    T: "transaction-executor",
    I: "dynamic-db-import",
    C: "client-construction",
  },
  5: {
    s: "select",
    q: "query",
    e: "execute",
    i: "insert",
    u: "update",
    d: "delete",
    t: "transaction",
    b: "batch",
    g: "tag",
    m: "import",
    p: "postgres",
    r: "drizzle",
  },
  6: {
    p: "point",
    l: "list",
    s: "search",
    a: "aggregate",
    m: "mutation",
    n: "append",
    x: "maintenance",
  },
  7: { p: "page", f: "fixed-summary", a: "facet", l: "fixed-list", n: "not-applicable" },
  8: {
    n: "narrow",
    s: "summary",
    a: "aggregate",
    w: "wide-reviewed",
    m: "mutation-only",
    x: "external-unreviewed",
  },
  9: { n: "none", e: "exact-key", b: "bounded-filter", k: "keyset", x: "external-unreviewed" },
  10: { n: "none", b: "bounded", x: "external-unreviewed" },
  11: { n: "not-applicable", s: "stable", x: "external-unreviewed" },
  14: { e: "eligible", i: "ineligible", x: "external-unreviewed" },
  15: {
    r: "request",
    t: "ttl",
    e: "event-invalidated",
    n: "not-applicable",
    x: "external-unreviewed",
  },
  16: { n: "none", t: "transaction", s: "session-client", x: "external-unreviewed" },
  17: { n: "none", d: "database-existing", x: "external-unreviewed" },
  21: {
    A: "TASK-551-03-L02",
    B: "TASK-511",
    C: "TASK-517",
    D: "TASK-493",
    E: "TASK-518",
    F: "TASK-551-08-L02",
    G: "TASK-551-09-L01",
  },
  22: { o: "optimize", p: "preserve-bounded", x: "external-handoff" },
};

const LETTERS: Readonly<Record<number, Readonly<Record<string, string>>>> = Object.fromEntries(
  Object.entries(CODEBOOKS).map(([index, book]) => [
    index,
    Object.fromEntries(Object.entries(book).map(([letter, value]) => [value, letter])),
  ])
) as never;

function cell(value: unknown, index: number): string {
  if (value === null) return "null";
  if (typeof value === "number") return String(value);
  // The fixture spells an external-unreviewed query-count budget as "x".
  if (index === 13 && value === "external-unreviewed") return JSON.stringify("x");
  return JSON.stringify(value);
}

/** Serialize one CurrentRow exactly as the fixture spells it. */
export function serializeRow(row: DecodedRow): string {
  const lines = row.map((value, index) => {
    const letter = LETTERS[index]?.[String(value)];
    if (letter !== undefined && typeof value === "string") return `    ${JSON.stringify(letter)},`;
    return `    ${cell(value, index)},`;
  });
  return `  [\n${lines.join("\n")}\n  ],`;
}

/** Serialize the whole CURRENT_ROWS block (sorted by id, localeCompare). */
export function serializeCurrentRows(rows: readonly DecodedRow[]): string {
  const sorted = [...rows].sort((a, b) =>
    `${a[0]}#${a[1]}:L${a[2]}:C${a[3]}:${a[4]}:${a[5]}`.localeCompare(
      `${b[0]}#${b[1]}:L${b[2]}:C${b[3]}:${b[4]}:${b[5]}`
    )
  );
  return `const CURRENT_ROWS: readonly CurrentRow[] = [\n${sorted.map(serializeRow).join("\n")}\n];`;
}
