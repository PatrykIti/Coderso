import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PgDialect } from "drizzle-orm/pg-core";

import {
  GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES,
  normalizeTask551TrigramSql,
  SEARCH_VECTOR_COLUMN,
  SEARCH_VECTOR_MEMBERS,
  SEARCH_VECTOR_SQL,
  task551TrigramNormalizedSql,
  TRIGRAM_COLUMN,
  TRIGRAM_INDEXED_SOURCE_CONTRACT,
  TRIGRAM_SOURCE_SQL,
  assertExactSearchVectorBytes,
} from "../../../core/db/searchVectorDefinitions";
import {
  assistantDocChunks,
  assistantDocs,
  contentEntries,
  media,
  pages,
  posts,
  users,
} from "../../../core/db/schema";

/**
 * Byte contracts of the TASK-551-05-L01 local-search definitions.
 *
 * Everything asserted here is pure source: no database, no environment, no
 * filesystem beyond this repo. The same literals are re-asserted against the
 * generated migration SQL and the live catalog by
 * `task551SearchVectorMigration.test.ts`; the split is deliberate — this file
 * proves the DEFINITIONS are what the contract spells, so a drift in the
 * migration is attributable to the generator rather than to a moved definition.
 *
 * The volatile-dependency guard lives at the bottom: any variadic
 * "stable concatenation" helper, or a vector source not built from the literal
 * `coalesce(...) || ' ' || ...` bytes, is rejected before PostgreSQL ever
 * parses an expression that could not be stored.
 */

const VECTOR_TABLES = [
  "pages",
  "entries",
  "posts",
  "media",
  "users",
  "assistantDocs",
  "assistantDocChunks",
] as const;

const TRIGRAM_TABLES = ["pages", "entries", "posts", "media", "users"] as const;

/** The built columns the tsvector surface is read from. */
const TABLE_COLUMNS = {
  pages,
  entries: contentEntries,
  posts,
  media,
  users,
  assistantDocs: assistantDocs,
  assistantDocChunks: assistantDocChunks,
} as const;

describe("SEARCH_VECTOR_SQL", () => {
  it("pins all seven vector sources byte-for-byte", () => {
    expect(SEARCH_VECTOR_SQL.pages).toBe(
      "setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(slug, '')), 'B')"
    );
    expect(SEARCH_VECTOR_SQL.entries).toBe(
      "setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(data ->> 'title', '') || ' ' || coalesce(slug, '') || ' ' || coalesce(tags::text, '')), 'B')"
    );
    expect(SEARCH_VECTOR_SQL.posts).toBe(
      "setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(slug, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(data ->> 'title', '')), 'B')"
    );
    expect(SEARCH_VECTOR_SQL.media).toBe(
      "setweight(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(alt, '')), 'A') || setweight(to_tsvector('simple', coalesce(caption, '') || ' ' || coalesce(key, '')), 'B')"
    );
    expect(SEARCH_VECTOR_SQL.users).toBe(
      "setweight(to_tsvector('simple', coalesce(name, '')), 'A')"
    );
    expect(SEARCH_VECTOR_SQL.assistantDocs).toBe(
      "setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(keywords_json::text, '')), 'B')"
    );
    expect(SEARCH_VECTOR_SQL.assistantDocChunks).toBe(
      "setweight(to_tsvector('simple', coalesce(heading, '')), 'A') || setweight(to_tsvector('simple', coalesce(content, '')), 'B')"
    );
  });

  it("exposes exactly the seven sources and nothing else", () => {
    expect(Object.keys(SEARCH_VECTOR_SQL).sort()).toEqual([...VECTOR_TABLES].sort());
  });

  it("builds every source from the literal coalesce/concatenate bytes only", () => {
    for (const source of VECTOR_TABLES) {
      const expression = SEARCH_VECTOR_SQL[source];
      expect(expression).toContain("coalesce(");
      expect(expression).toContain("'simple'");
      expect(expression).not.toMatch(/\bnow\(|\brandom\(|\bconcat\(/i);
    }
  });

  it("keeps each source inside its own table's columns", () => {
    const ownColumns: Record<(typeof VECTOR_TABLES)[number], readonly string[]> = {
      pages: ["title", "slug"],
      entries: ["title", "slug", "tags"],
      posts: ["title", "slug", "excerpt", "data"],
      media: ["title", "alt", "caption", "key"],
      users: ["name"],
      assistantDocs: ["title", "keywords_json"],
      assistantDocChunks: ["heading", "content"],
    };
    for (const source of VECTOR_TABLES) {
      const referenced = new Set(
        [...SEARCH_VECTOR_SQL[source].matchAll(/([a-z_]+)[,)]/g)].map((match) => match[1])
      );
      for (const column of referenced) {
        // `data` is the jsonb column behind `->>`, `text`/`char` are cast targets.
        if (
          ["setweight", "to_tsvector", "simple", "coalesce", "data", "text", "char"].includes(
            column
          )
        )
          continue;
        expect(ownColumns[source]).toContain(column);
      }
    }
  });
});

describe("SEARCH_VECTOR_MEMBERS and the column name", () => {
  it("lands every vector under search_vector with the contract index name", () => {
    expect(SEARCH_VECTOR_COLUMN).toBe("search_vector");
    expect(SEARCH_VECTOR_MEMBERS.pages).toEqual({
      table: "pages",
      index: "pages_search_vector_idx",
    });
    expect(SEARCH_VECTOR_MEMBERS.entries).toEqual({
      table: "content_entries",
      index: "content_entries_search_vector_idx",
    });
    expect(SEARCH_VECTOR_MEMBERS.posts).toEqual({
      table: "posts",
      index: "posts_search_vector_idx",
    });
    expect(SEARCH_VECTOR_MEMBERS.media).toEqual({
      table: "media",
      index: "media_search_vector_idx",
    });
    expect(SEARCH_VECTOR_MEMBERS.users).toEqual({
      table: "users",
      index: "users_search_vector_idx",
    });
    expect(SEARCH_VECTOR_MEMBERS.assistantDocs).toEqual({
      table: "assistant_docs",
      index: "assistant_docs_search_vector_idx",
    });
    expect(SEARCH_VECTOR_MEMBERS.assistantDocChunks).toEqual({
      table: "assistant_doc_chunks",
      index: "assistant_doc_chunks_search_vector_idx",
    });
  });
});

describe("TRIGRAM_INDEXED_SOURCE_CONTRACT", () => {
  it("pins all five source concatenations byte-for-byte", () => {
    expect(TRIGRAM_SOURCE_SQL.pages).toBe("coalesce(title, '') || ' ' || coalesce(slug, '')");
    expect(TRIGRAM_SOURCE_SQL.entries).toBe(
      "coalesce(title, '') || ' ' || coalesce(data ->> 'title', '') || ' ' || coalesce(slug, '') || ' ' || coalesce(tags::text, '')"
    );
    expect(TRIGRAM_SOURCE_SQL.posts).toBe(
      "coalesce(title, '') || ' ' || coalesce(slug, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(data ->> 'title', '')"
    );
    expect(TRIGRAM_SOURCE_SQL.media).toBe(
      "coalesce(title, '') || ' ' || coalesce(alt, '') || ' ' || coalesce(caption, '') || ' ' || coalesce(key, '')"
    );
    expect(TRIGRAM_SOURCE_SQL.users).toBe("coalesce(name, '')");
  });

  it("selects every member or none, as one atomic unit, with no unindexed fallback", () => {
    for (const source of TRIGRAM_TABLES) {
      const member = TRIGRAM_INDEXED_SOURCE_CONTRACT[source];
      if (member === null) {
        expect(Object.hasOwn(TRIGRAM_SOURCE_SQL, source)).toBe(false);
        continue;
      }
      expect(member.column).toBe(TRIGRAM_COLUMN);
      expect(member.table).toBe(SEARCH_VECTOR_MEMBERS[source].table);
      expect(member.index).toBe(`${member.table}_search_trigram_idx`);
      expect(member.sourceSql).toBe(TRIGRAM_SOURCE_SQL[source as keyof typeof TRIGRAM_SOURCE_SQL]);
      expect(member.normalizedSql).toBe(task551TrigramNormalizedSql(member.sourceSql));
    }
  });

  it("keeps email and the email hash out of the users source", () => {
    expect(TRIGRAM_SOURCE_SQL.users).not.toContain("email");
    expect(SEARCH_VECTOR_SQL.users).not.toContain("email");
  });

  it("normalizes with one byte-exact literal shared by the query needle", () => {
    expect(task551TrigramNormalizedSql("<source>")).toBe(
      "lower(regexp_replace(btrim(coalesce(<source>, '')), '[[:space:]]+', ' ', 'g'))"
    );
    expect(task551TrigramNormalizedSql(TRIGRAM_SOURCE_SQL.pages)).toBe(
      TRIGRAM_INDEXED_SOURCE_CONTRACT.pages?.normalizedSql ?? "unselected"
    );
    // The Drizzle fragment and the text literal spell the SAME normalization:
    // the generated column's fragment is rendered through the installed pg
    // dialect and compared byte-for-byte against the text literal over the same
    // operand, so a fragment that drifted from the stored expression (or an
    // unrenderable one) fails here instead of at migration time.
    const rendered = new PgDialect().sqlToQuery(
      normalizeTask551TrigramSql(TABLE_COLUMNS.pages.title)
    ).sql;
    expect(rendered).toBe(task551TrigramNormalizedSql('"pages"."title"'));
    for (const [column, operand] of [
      [TABLE_COLUMNS.entries.title, '"content_entries"."title"'],
      [TABLE_COLUMNS.posts.title, '"posts"."title"'],
      [TABLE_COLUMNS.media.title, '"media"."title"'],
      [TABLE_COLUMNS.users.name, '"users"."name"'],
    ] as const) {
      expect(new PgDialect().sqlToQuery(normalizeTask551TrigramSql(column)).sql).toBe(
        task551TrigramNormalizedSql(operand)
      );
    }
  });
});

describe("immutable dependency contract", () => {
  it("is the closed function/operator list the volatility test resolves", () => {
    expect([...GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES]).toEqual([
      "to_tsvector(regconfig,text)",
      'setweight(tsvector,"char")',
      "lower(text)",
      "regexp_replace(text,text,text,text)",
      "btrim(text)",
      "jsonb_object_field_text(jsonb,text)",
      "jsonb_out(jsonb)",
      "textcat(text,text)",
      "tsvector_concat(tsvector,tsvector)",
    ]);
  });
});

describe("assertExactSearchVectorBytes", () => {
  it("accepts the contract bytes and rejects any drift", () => {
    expect(() => assertExactSearchVectorBytes("users", SEARCH_VECTOR_SQL.users)).not.toThrow();
    expect(() =>
      assertExactSearchVectorBytes("users", `${SEARCH_VECTOR_SQL.users} || 'x'`)
    ).toThrow(/drifted from the contract bytes/);
  });
});

describe("column types", () => {
  it("lands every vector column as a tsvector custom column", () => {
    for (const source of VECTOR_TABLES) {
      const column = TABLE_COLUMNS[source].searchVector as unknown as {
        name: string;
        getSQLType: () => string;
      };
      expect(column.name).toBe(SEARCH_VECTOR_COLUMN);
      expect(column.getSQLType()).toBe("tsvector");
    }
  });
});

describe("source guard", () => {
  const source = readFileSync(
    join(
      fileURLToPath(new URL("../../../core/db/", import.meta.url)),
      "searchVectorDefinitions.ts"
    ),
    "utf8"
  );

  it("declares no variadic concatenation helper", () => {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\n)\s*\/\/[^\n]*/g, "$1");
    expect(code).not.toMatch(/\.\.\.\w+\s*\)|\barguments\b/i);
  });

  it("builds every vector from a spelled-out literal, not a runtime builder", () => {
    const vectorBlock = source.slice(
      source.indexOf("export const SEARCH_VECTOR_SQL"),
      source.indexOf("export type SearchVectorSource")
    );
    const occurrences = (token: string): number =>
      VECTOR_TABLES.reduce(
        (sum, entry) => sum + (SEARCH_VECTOR_SQL[entry].match(new RegExp(token, "g")) ?? []).length,
        0
      );
    for (const [token, _unusedTokenCount] of [
      ["setweight\\(", null],
      ["coalesce\\(", null],
      ["to_tsvector\\(", null],
    ] as const) {
      expect((vectorBlock.match(new RegExp(token, "g")) ?? []).length).toBe(occurrences(token));
    }
    expect(vectorBlock).toContain("'A'");
    expect(vectorBlock).toContain("'B'");
  });
});
