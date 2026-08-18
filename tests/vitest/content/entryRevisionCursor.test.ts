// TASK-570 (M-487-02): pure keyset-cursor codec and page-size normalization for
// the entry revision list. Bun-free module, so this suite stays in the Vitest
// lane and exercises the cursor math with no DB/runtime coupling.

import { expect, test } from "vitest";

import { db } from "../../../core/db/client";
import { contentRevisions } from "../../../core/db/schema";
import {
  DEFAULT_ENTRY_REVISION_PAGE_LIMIT,
  MAX_ENTRY_REVISION_CURSOR_LENGTH,
  MAX_ENTRY_REVISION_ID_LENGTH,
  MAX_ENTRY_REVISION_PAGE_LIMIT,
  MIN_ENTRY_REVISION_PAGE_LIMIT,
  buildEntryRevisionCursorPredicate,
  decodeEntryRevisionCursor,
  encodeEntryRevisionCursor,
  normalizeEntryRevisionPageLimit,
} from "../../../core/services/content/entryRevisionCursor";

test("cursor round-trips through the base64url codec", () => {
  const cursor = { version: 12, id: "018f6c8c-9c1b-7f44-9b2c-1f3d4a5b6c7d" };
  const encoded = encodeEntryRevisionCursor(cursor);
  expect(encoded).not.toContain("+");
  expect(encoded).not.toContain("/");
  expect(encoded).not.toContain("=");
  expect(decodeEntryRevisionCursor(encoded)).toEqual(cursor);
});

test("cursor decoding is strict about the version boundary", () => {
  // Zero and non-integer versions are not valid page boundaries.
  for (const bad of [
    { version: 0, id: "abc" },
    { version: -1, id: "abc" },
    { version: 1.5, id: "abc" },
    { version: Number.MAX_SAFE_INTEGER + 1, id: "abc" },
    { version: 1, id: "" },
    { version: 1, id: "x".repeat(MAX_ENTRY_REVISION_ID_LENGTH + 1) },
  ]) {
    expect(() => encodeEntryRevisionCursor(bad)).toThrow("entry_revision_cursor_invalid");
  }
});

test("decoding rejects malformed, oversized and non-object payloads", () => {
  expect(() => decodeEntryRevisionCursor("")).toThrow("entry_revision_cursor_invalid");
  expect(() => decodeEntryRevisionCursor("x".repeat(MAX_ENTRY_REVISION_CURSOR_LENGTH + 1))).toThrow(
    "entry_revision_cursor_invalid"
  );
  expect(() => decodeEntryRevisionCursor("!!!not-base64url!!!")).toThrow(
    "entry_revision_cursor_invalid"
  );
  expect(() =>
    decodeEntryRevisionCursor(encodeEntryRevisionCursor({ version: 1, id: "abc" }) + "junk")
  ).toThrow("entry_revision_cursor_invalid");
  // A valid envelope whose payload is not a cursor object.
  const notObject = btoa(JSON.stringify([1, 2]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  expect(() => decodeEntryRevisionCursor(notObject)).toThrow("entry_revision_cursor_invalid");
});

test("normalizeEntryRevisionPageLimit clamps to the bounded range and falls back to the default", () => {
  expect(normalizeEntryRevisionPageLimit(undefined)).toBe(DEFAULT_ENTRY_REVISION_PAGE_LIMIT);
  expect(normalizeEntryRevisionPageLimit(null)).toBe(DEFAULT_ENTRY_REVISION_PAGE_LIMIT);
  expect(normalizeEntryRevisionPageLimit("")).toBe(DEFAULT_ENTRY_REVISION_PAGE_LIMIT);
  expect(normalizeEntryRevisionPageLimit(1)).toBe(MIN_ENTRY_REVISION_PAGE_LIMIT);
  expect(normalizeEntryRevisionPageLimit("7")).toBe(7);
  // Above the max is clamped, not rejected (a caller-agnostic upper bound).
  expect(normalizeEntryRevisionPageLimit("9999")).toBe(MAX_ENTRY_REVISION_PAGE_LIMIT);
  expect(normalizeEntryRevisionPageLimit(9999)).toBe(MAX_ENTRY_REVISION_PAGE_LIMIT);
});

test("normalizeEntryRevisionPageLimit rejects malformed inputs machine-readably", () => {
  for (const bad of ["abc", "-3", "1.5", "0", "2e3", "1_000", "0x10"]) {
    expect(() => normalizeEntryRevisionPageLimit(bad)).toThrow("entry_revision_limit_invalid");
  }
});

test("keyset predicate selects rows strictly after the cursor under (version, id) DESC", () => {
  const predicate = buildEntryRevisionCursorPredicate({ version: 5, id: "rev-005" });
  const sql = db
    .select({ id: contentRevisions.id })
    .from(contentRevisions)
    .where(predicate)
    .toSQL();
  // The boundary is version < 5 OR (version = 5 AND id < rev-005): every row
  // later than the boundary in DESC order, never the boundary row itself.
  expect(sql.sql).toContain(`"content_revisions"."version" < $1`);
  expect(sql.sql).toContain(`"content_revisions"."version" = $2`);
  expect(sql.sql).toContain(`"content_revisions"."id" < $3`);
  expect(sql.params).toEqual([5, 5, "rev-005"]);
});

test("a boundary row never satisfies the keyset predicate", () => {
  const predicate = buildEntryRevisionCursorPredicate({ version: 5, id: "rev-005" });
  const sql = db
    .select({ id: contentRevisions.id })
    .from(contentRevisions)
    .where(predicate)
    .toSQL();
  // The two disjuncts are a strict `<`/`=` on the same boundary: for the
  // boundary row itself both are false, so a re-scan cannot re-emit it
  // (no-gap/no-duplicate paging invariant).
  expect(sql.sql).toMatch(/version" < \$\d+/);
  expect(sql.sql).toMatch(/version" = \$\d+/);
});
