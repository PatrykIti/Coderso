/**
 * TASK-551-06-L01 vitest lane: bun-free search history write contract.
 *
 * Pure-lane coverage (no DB, no network, no environment): strict key set with
 * unknown/missing rejection, query normalization and 2..200 bounds, canonical
 * date-range enum membership without defaulting, finite integer limit bounds
 * without coercion, lowercase canonical UUID syntax, deep-frozen command
 * output, and import isolation of the production owner from DB/runtime.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  SEARCH_HISTORY_CONTRACT_ERROR_CODES,
  SEARCH_HISTORY_LIMIT_MAX,
  SEARCH_HISTORY_LIMIT_MIN,
  SEARCH_HISTORY_QUERY_MAX_LENGTH,
  SEARCH_HISTORY_QUERY_MIN_LENGTH,
  SearchHistoryContractError,
  parseSearchHistoryWriteRequest,
  type SearchHistoryWriteCommand,
  type SearchHistoryWriteRequest,
} from "../../../core/services/search/searchHistoryContract";
import {
  searchDateRanges,
  type SearchDateRange,
} from "../../../core/services/search/searchContract";

const UUID = "0f1ae2b3-4c5d-6e7f-8a9b-0c1d2e3f4a5b";

function request(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    query: "postgres retention",
    limit: 20,
    dateRange: "last-30-days",
    idempotencyKey: UUID,
    ...overrides,
  };
}

function parseOk(input: unknown): SearchHistoryWriteCommand {
  return parseSearchHistoryWriteRequest(input);
}

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }
  return "<no-error>";
}

describe("search history write contract constants and types", () => {
  it("pins the exported bounds and error codes", () => {
    expect(SEARCH_HISTORY_QUERY_MIN_LENGTH).toBe(2);
    expect(SEARCH_HISTORY_QUERY_MAX_LENGTH).toBe(200);
    expect(SEARCH_HISTORY_LIMIT_MIN).toBe(1);
    expect(SEARCH_HISTORY_LIMIT_MAX).toBe(50);
    expect(SEARCH_HISTORY_CONTRACT_ERROR_CODES).toEqual({
      invalid: "search_history_invalid",
      idempotencyRequired: "search_history_idempotency_required",
    });
  });

  it("pins the strict request and command payload types", () => {
    const request: SearchHistoryWriteRequest = {
      query: "postgres retention",
      limit: 20,
      dateRange: "last-30-days",
      idempotencyKey: UUID,
    };
    expectTypeOf(request.query).toEqualTypeOf<string>();
    expectTypeOf(request.limit).toEqualTypeOf<number>();
    expectTypeOf(request.dateRange).toEqualTypeOf<SearchDateRange>();
    expectTypeOf(request.idempotencyKey).toEqualTypeOf<string>();
    expectTypeOf<SearchHistoryWriteCommand["filters"]>().toEqualTypeOf<
      Readonly<{ limit: number; dateRange: SearchDateRange }>
    >();
    expectTypeOf(parseSearchHistoryWriteRequest(request).idempotencyKey).toEqualTypeOf<string>();
  });
});

describe("parseSearchHistoryWriteRequest accepts canonical requests", () => {
  it("normalizes the flat request into the grouped command shape", () => {
    const command = parseOk(request());
    expect(command).toEqual({
      query: "postgres retention",
      filters: { limit: 20, dateRange: "last-30-days" },
      idempotencyKey: UUID,
    });
    expect(Object.isFrozen(command)).toBe(true);
    expect(Object.isFrozen(command.filters)).toBe(true);
  });

  it("accepts any canonical key order and copies instead of aliasing input", () => {
    const input = request();
    const command = parseOk({
      idempotencyKey: input.idempotencyKey,
      dateRange: input.dateRange,
      limit: input.limit,
      query: input.query,
    });
    expect(command.filters.limit).toBe(20);
    input.query = "mutated after parse";
    input.limit = 51;
    expect(command.query).toBe("postgres retention");
    expect(command.filters.limit).toBe(20);
  });

  it("normalizes query text with trim plus whitespace collapse before bounds", () => {
    expect(parseOk(request({ query: "  hello   world " })).query).toBe("hello world");
    expect(parseOk(request({ query: "\ttabs\tand\nnewlines\r\nmix " })).query).toBe(
      "tabs and newlines mix"
    );
    // Normalization runs first, so padding a maximal query still fits.
    expect(
      parseOk(request({ query: `  ${"a".repeat(SEARCH_HISTORY_QUERY_MAX_LENGTH)}  ` })).query
    ).toBe("a".repeat(SEARCH_HISTORY_QUERY_MAX_LENGTH));
    expect(parseOk(request({ query: "ok" })).query).toBe("ok");
  });
});

describe("parseSearchHistoryWriteRequest rejects strict-key violations", () => {
  it("rejects unknown keys", () => {
    expect(codeOf(() => parseOk(request({ extra: 1 })))).toBe(
      SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
    );
    expect(codeOf(() => parseOk(request({ filters: { limit: 20 } })))).toBe(
      SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
    );
    expect(codeOf(() => parseOk(request({ userId: "actor" })))).toBe(
      SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
    );
  });

  it("reports a missing idempotency key as its own required code", () => {
    const { idempotencyKey: _dropped, ...withoutKey } = request();
    expect(codeOf(() => parseOk(withoutKey))).toBe(
      SEARCH_HISTORY_CONTRACT_ERROR_CODES.idempotencyRequired
    );
    expect(() => parseOk(withoutKey)).toThrowError(SearchHistoryContractError);
  });

  it("rejects every other missing member generically", () => {
    for (const key of ["query", "limit", "dateRange"] as const) {
      const partial = request();
      delete partial[key];
      expect(codeOf(() => parseOk(partial))).toBe(SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid);
    }
    expect(codeOf(() => parseOk({}))).toBe(SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid);
  });

  it("rejects non-object and array inputs", () => {
    for (const bad of [null, undefined, 42, "postgres", true, [], () => {}, Symbol("x")]) {
      expect(codeOf(() => parseOk(bad))).toBe(SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid);
    }
  });

  it("rejects coerced scalar types without converting them", () => {
    expect(codeOf(() => parseOk(request({ query: 42 })))).toBe(
      SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
    );
    expect(codeOf(() => parseOk(request({ limit: "20" })))).toBe(
      SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
    );
    expect(codeOf(() => parseOk(request({ limit: true })))).toBe(
      SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
    );
    expect(codeOf(() => parseOk(request({ limit: null })))).toBe(
      SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
    );
    expect(codeOf(() => parseOk(request({ idempotencyKey: 123 })))).toBe(
      SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
    );
  });
});

describe("query normalization bounds", () => {
  it("rejects normalized queries outside 2..200", () => {
    expect(codeOf(() => parseOk(request({ query: "" })))).toBe(
      SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
    );
    expect(codeOf(() => parseOk(request({ query: "   " })))).toBe(
      SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
    );
    expect(codeOf(() => parseOk(request({ query: "a" })))).toBe(
      SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
    );
    expect(codeOf(() => parseOk(request({ query: "a".repeat(201) })))).toBe(
      SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
    );
    // Bounds count UTF-16 code units, matching the canonical search helper.
    expect(parseOk(request({ query: "🦊".repeat(100) })).query).toBe("🦊".repeat(100));
    expect(codeOf(() => parseOk(request({ query: "🦊".repeat(101) })))).toBe(
      SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
    );
  });
});

describe("date-range enum membership", () => {
  it("accepts exactly the canonical enum values", () => {
    for (const dateRange of searchDateRanges) {
      expect(parseOk(request({ dateRange })).filters.dateRange).toBe(dateRange);
    }
  });

  it("rejects non-members instead of defaulting them", () => {
    for (const bad of [
      "last-90-days",
      "LAST-7-DAYS",
      "last-7-days ",
      " last-7-days",
      "all-time;",
      "",
      undefined,
      null,
      7,
      true,
      {},
    ]) {
      expect(codeOf(() => parseOk(request({ dateRange: bad })))).toBe(
        SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
      );
    }
  });
});

describe("finite integer limit bounds", () => {
  it("accepts the inclusive 1..50 boundaries", () => {
    expect(parseOk(request({ limit: SEARCH_HISTORY_LIMIT_MIN })).filters.limit).toBe(1);
    expect(parseOk(request({ limit: SEARCH_HISTORY_LIMIT_MAX })).filters.limit).toBe(50);
  });

  it("rejects out-of-bounds, fractional, and non-finite numbers", () => {
    for (const bad of [0, -1, 51, 1000, 1.5, 20.000001, Number.NaN, Infinity, -Infinity]) {
      expect(codeOf(() => parseOk(request({ limit: bad })))).toBe(
        SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
      );
    }
  });
});

describe("canonical UUID idempotency syntax", () => {
  it("accepts a lowercase canonical UUID", () => {
    expect(
      parseOk(request({ idempotencyKey: "00000000-0000-0000-0000-000000000000" })).idempotencyKey
    ).toBe("00000000-0000-0000-0000-000000000000");
  });

  it("rejects uppercase and malformed UUID forms", () => {
    for (const bad of [
      UUID.toUpperCase(),
      `{${UUID}}`,
      UUID.replaceAll("-", ""),
      `urn:uuid:${UUID}`,
      "0f1ae2b3-4c5d-6e7f-8a9b-0c1d2e3f4a5g",
      UUID.slice(1),
      `${UUID}0`,
      "",
      "not-a-uuid",
      "0f1ae2b34c5d6e7f8a9b0c1d2e3f4a5b",
    ]) {
      expect(codeOf(() => parseOk(request({ idempotencyKey: bad })))).toBe(
        SEARCH_HISTORY_CONTRACT_ERROR_CODES.invalid
      );
    }
  });
});

describe("import isolation from DB and runtime", () => {
  const source = readFileSync(
    fileURLToPath(
      new URL("../../../core/services/search/searchHistoryContract.ts", import.meta.url)
    ),
    "utf8"
  );

  it("imports nothing from the DB, schema, runtime, or Bun APIs", () => {
    for (const forbidden of [
      "db/client",
      "db/schema",
      "drizzle-orm",
      "process.env",
      "Bun.",
      "node:child_process",
      "await import(",
    ]) {
      expect(source.includes(forbidden), `unexpected token: ${forbidden}`).toBe(false);
    }
    for (const sql of ["insert into", "delete from", "select ", "update "]) {
      expect(source.toLowerCase().includes(sql), `unexpected SQL: ${sql}`).toBe(false);
    }
  });

  it("declares only the canonical date-range owner as a relative import", () => {
    const specifiers = [...source.matchAll(/^import\s+[^;]*?from\s+"([^"]+)";?$/gm)].map(
      (match) => match[1]
    );
    expect(specifiers).toEqual(["./searchContract"]);
  });
});
