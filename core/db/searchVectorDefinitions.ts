/**
 * Canonical local search-vector and trigram definitions (TASK-551-05-L01).
 *
 * Everything in this file is a pure, Bun-free, driver-free definition: no
 * client, no process environment, no filesystem. The seven `SEARCH_VECTOR_SQL`
 * entries and the five trigram sources below are the ONE source used by the
 * Drizzle generated columns declared in `core/db/tables/*`, the migration DDL,
 * the snapshot assertions, and the TASK-551-04 query services.
 *
 * The literal bytes are contractual. `coalesce`, JSON `->>`/`::text`, the exact
 * `|| ' ' ||` separators, the `'simple'` regconfig and the A/B weights are read
 * back byte-for-byte by `tests/vitest/db/searchVectorDefinitions.test.ts`, the
 * migration-parity suite and the catalog suite. There is deliberately NO
 * generic expression builder here: a variadic concatenation helper would render
 * a PostgreSQL expression whose volatility is not provably `immutable`, so each
 * source stays a spelled-out literal that a test can compare against the DDL,
 * the snapshot and `pg_get_expr` output.
 *
 * Every generated expression references only its own table's columns — no
 * expression reaches across tables.
 */

import { sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

/**
 * PostgreSQL `tsvector` column type. Drizzle ships no built-in tsvector
 * builder, so the seven generated search-vector columns (and nothing else)
 * declare themselves through this custom type. `driverData` is the verbatim
 * `tsvector` text postgres.js hands back, which is also what the query side
 * ranks against.
 */
export const tsvector = customType<{ data: string; driverData: string }>({
  dataType: () => "tsvector",
});

/**
 * The seven canonical search-vector expressions, keyed by the domain name the
 * owning table module uses. The object is frozen so an accidental mutation at
 * import time is a hard error instead of a silent schema change.
 *
 *   pages               title (A) + slug (B)
 *   entries             title (A) + data->>'title', slug, tags::text (B)
 *   posts               title (A) + slug, excerpt, data->>'title' (B)
 *   media               title + alt (A) + caption, key (B)
 *   users               name (A)
 *   assistantDocs       title (A) + keywords_json::text (B)
 *   assistantDocChunks  heading (A) + content (B)
 */
export const SEARCH_VECTOR_SQL = Object.freeze({
  pages: `setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(slug, '')), 'B')`,
  entries: `setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(data ->> 'title', '') || ' ' || coalesce(slug, '') || ' ' || coalesce(tags::text, '')), 'B')`,
  posts: `setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(slug, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(data ->> 'title', '')), 'B')`,
  media: `setweight(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(alt, '')), 'A') || setweight(to_tsvector('simple', coalesce(caption, '') || ' ' || coalesce(key, '')), 'B')`,
  users: `setweight(to_tsvector('simple', coalesce(name, '')), 'A')`,
  assistantDocs: `setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(keywords_json::text, '')), 'B')`,
  assistantDocChunks: `setweight(to_tsvector('simple', coalesce(heading, '')), 'A') || setweight(to_tsvector('simple', coalesce(content, '')), 'B')`,
});

export type SearchVectorSource = keyof typeof SEARCH_VECTOR_SQL;

/**
 * The table, column and GIN index name each vector lands under. Every column
 * is named `search_vector`; the index names are the exact catalog names the
 * migration and the online-index manifest carry.
 */
export const SEARCH_VECTOR_MEMBERS = Object.freeze({
  pages: { table: "pages", index: "pages_search_vector_idx" },
  entries: { table: "content_entries", index: "content_entries_search_vector_idx" },
  posts: { table: "posts", index: "posts_search_vector_idx" },
  media: { table: "media", index: "media_search_vector_idx" },
  users: { table: "users", index: "users_search_vector_idx" },
  assistantDocs: { table: "assistant_docs", index: "assistant_docs_search_vector_idx" },
  assistantDocChunks: {
    table: "assistant_doc_chunks",
    index: "assistant_doc_chunks_search_vector_idx",
  },
} as const);

/**
 * The shared `search_vector` column name, exported so the owning modules and
 * the tests pin one spelling of it.
 */
export const SEARCH_VECTOR_COLUMN = "search_vector";

/**
 * Byte-exact normalization literal shared by the stored trigram columns and
 * the query needle. The whitespace class is `[[:space:]]+` collapsed to one
 * space; leading/trailing whitespace is removed by `btrim`; `coalesce` keeps
 * NULL sources indexable as the empty string.
 *
 * Rendered as text by {@link task551TrigramNormalizedSql} (for the migration,
 * the snapshot assertions and the catalog checks) and as a Drizzle fragment by
 * {@link normalizeTask551TrigramSql} (for the generated column and the query
 * side). Both spell the same bytes; the vitest suite pins that agreement.
 */
export const task551TrigramNormalizedSql = (sourceSql: string): string =>
  `lower(regexp_replace(btrim(coalesce(${sourceSql}, '')), '[[:space:]]+', ' ', 'g'))`;

export const normalizeTask551TrigramSql = (value: SQLWrapper): SQL =>
  sql`lower(regexp_replace(btrim(coalesce(${value}, '')), '[[:space:]]+', ' ', 'g'))`;

/**
 * The five trigram candidates, byte-exact. `users` deliberately concatenates
 * `name` only: neither `email` nor `email_hash` may enter a trigram source.
 */
const TRIGRAM_CANDIDATES = Object.freeze({
  pages: {
    table: "pages",
    sourceSql: "coalesce(title, '') || ' ' || coalesce(slug, '')",
    column: "search_trigram_text",
    index: "pages_search_trigram_idx",
  },
  entries: {
    table: "content_entries",
    sourceSql:
      "coalesce(title, '') || ' ' || coalesce(data ->> 'title', '') || ' ' || coalesce(slug, '') || ' ' || coalesce(tags::text, '')",
    column: "search_trigram_text",
    index: "content_entries_search_trigram_idx",
  },
  posts: {
    table: "posts",
    sourceSql:
      "coalesce(title, '') || ' ' || coalesce(slug, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(data ->> 'title', '')",
    column: "search_trigram_text",
    index: "posts_search_trigram_idx",
  },
  media: {
    table: "media",
    sourceSql:
      "coalesce(title, '') || ' ' || coalesce(alt, '') || ' ' || coalesce(caption, '') || ' ' || coalesce(key, '')",
    column: "search_trigram_text",
    index: "media_search_trigram_idx",
  },
  users: {
    table: "users",
    sourceSql: "coalesce(name, '')",
    column: "search_trigram_text",
    index: "users_search_trigram_idx",
  },
} as const);

/** One selected trigram member: the exact column/index pair plus its bytes. */
export type Task551TrigramMember = Readonly<{
  table: string;
  sourceSql: string;
  column: string;
  index: string;
  /** The byte-exact stored generated expression rendered from `sourceSql`. */
  normalizedSql: string;
}>;

/**
 * The frozen selection receipt. Each of the five sources is selected or `null`
 * as ONE atomic unit: a selected member lands both its stored generated
 * `search_trigram_text` column and its `USING GIN (search_trigram_text
 * gin_trgm_ops)` index; a rejected member lands neither and exports `null`.
 * There is no unindexed trigram fallback.
 *
 * The pre-DDL evidence gates this receipt: a member that misses its read or
 * write-cost gate blocks and amends the TASK-551-05-L01 contract rather than
 * disappearing from a landed migration, so the landed set below is the closed,
 * selected set.
 */
export const TRIGRAM_INDEXED_SOURCE_CONTRACT: Readonly<{
  pages: Task551TrigramMember | null;
  entries: Task551TrigramMember | null;
  posts: Task551TrigramMember | null;
  media: Task551TrigramMember | null;
  users: Task551TrigramMember | null;
}> = Object.freeze({
  pages: selected(TRIGRAM_CANDIDATES.pages),
  entries: selected(TRIGRAM_CANDIDATES.entries),
  posts: selected(TRIGRAM_CANDIDATES.posts),
  media: selected(TRIGRAM_CANDIDATES.media),
  users: selected(TRIGRAM_CANDIDATES.users),
});

function selected(candidate: {
  table: string;
  sourceSql: string;
  column: string;
  index: string;
}): Task551TrigramMember | null {
  return Object.freeze({
    table: candidate.table,
    sourceSql: candidate.sourceSql,
    column: candidate.column,
    index: candidate.index,
    normalizedSql: task551TrigramNormalizedSql(candidate.sourceSql),
  });
}

/**
 * The five selected trigram source bytes as a non-null record, for the owning
 * table modules. Reading it fails closed at import time: an unselected member
 * has no source to store, so a consumer of one is a hard error, not a silent
 * `null` column definition.
 */
const trigramSource = (member: Task551TrigramMember | null): string => {
  if (member === null) throw new Error("unselected trigram member has no source");
  return member.sourceSql;
};

export const TRIGRAM_SOURCE_SQL = Object.freeze({
  pages: trigramSource(TRIGRAM_INDEXED_SOURCE_CONTRACT.pages),
  entries: trigramSource(TRIGRAM_INDEXED_SOURCE_CONTRACT.entries),
  posts: trigramSource(TRIGRAM_INDEXED_SOURCE_CONTRACT.posts),
  media: trigramSource(TRIGRAM_INDEXED_SOURCE_CONTRACT.media),
  users: trigramSource(TRIGRAM_INDEXED_SOURCE_CONTRACT.users),
});

/** The shared `search_trigram_text` column name. */
export const TRIGRAM_COLUMN = "search_trigram_text";

/**
 * The closed immutable dependency set of every generated expression above.
 *
 * `searchVectorMigration.test.ts` resolves each exact signature with
 * `to_regprocedure`, joins `pg_proc`, and requires exactly one row with
 * `provolatile = 'i'`. The `->>`, `||` and `::text` implementations used by the
 * literals are proven to land in this same set through `pg_operator.oprcode`
 * and the JSONB-to-text output dependency. `coalesce` is a parser construct,
 * not a `pg_proc` member, and is pinned by the exact-expression guard instead.
 */
export const GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES = Object.freeze([
  "to_tsvector(regconfig,text)",
  'setweight(tsvector,"char")',
  "lower(text)",
  "regexp_replace(text,text,text,text)",
  "btrim(text)",
  "jsonb_object_field_text(jsonb,text)",
  "jsonb_out(jsonb)",
  "textcat(text,text)",
  "tsvector_concat(tsvector,tsvector)",
] as const);

/**
 * Source guard: rejects any variadic "stable concatenation" helper or any
 * generated expression that is not built from the literal
 * `coalesce(...) || ' ' || ...` bytes above. A stable (non-immutable)
 * concatenation helper would make the generated columns unbuildable, so the
 * vector sources are checked against their own literal text rather than
 * reconstructed.
 */
export function assertExactSearchVectorBytes(source: SearchVectorSource, rendered: string): void {
  if (SEARCH_VECTOR_SQL[source] !== rendered) {
    throw new Error(`search vector expression for ${source} drifted from the contract bytes`);
  }
}
