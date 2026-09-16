/**
 * TASK-551-06-L02 vitest lane (`revision-allocation-test`): the family-aware
 * revision allocation contract of `core/services/database/revisionAllocation.ts`.
 *
 * PURE lane: zero database, zero network, zero owner-map legs. Every statement
 * path runs against stub transactions that count statement attempts, so the
 * suite needs neither the `task551-db-test` capability nor `.env`; the airtight
 * invocation pins a non-routable `DATABASE_URL` only to keep the module's
 * type-only client import inert (importing it dials nothing). Real-PostgreSQL
 * concurrency, autosave, and retention legs belong to the bun-test lane
 * (`task551RevisionConcurrency` / `task551RevisionRetention`) and are
 * deliberately not mirrored here.
 *
 * Pinned below: the closed five-family set, the shared deterministic advisory
 * key derivation, the exact `revision:<family>:v1:<sha256>` scope digest, the
 * `revision_conflict` identity, the fail-closed writer policy, the contractual
 * `(identity, tx, run)` / `(input, tx)` argument orders (including the
 * `@ts-expect-error` tx-first drift fixture), and the class-40-only bounded
 * retry. Entry/post are asserted through this module's own API only; their
 * services are never imported (an import scan pins that).
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import * as revisionAllocation from "../../../core/services/database/revisionAllocation";
import {
  MAX_REVISION_ALLOCATION_ATTEMPTS,
  REVISION_ALLOCATION_ERROR_CODES,
  RevisionConflictError,
  allocateRevision,
  retryRevisionAllocation,
  revisionScopeDigest,
  stableFamilyKey,
  stableParentKey,
  withRevisionParentLock,
  type Revision,
  type RevisionFamily,
  type RevisionFamilyIdentity,
  type RevisionInsert,
  type Tx,
} from "../../../core/services/database/revisionAllocation";

const SOURCE_URL = new URL(
  "../../../core/services/database/revisionAllocation.ts",
  import.meta.url
);

/**
 * The documented, never-renumbered family lock table. `Record<RevisionFamily,
 * number>` is the compile-time closed-set check: a sixth family literal breaks
 * this declaration, a removed one breaks every loop over `ALL_FAMILIES`.
 */
const FAMILY_LOCK_KEYS: Readonly<Record<RevisionFamily, number>> = Object.freeze({
  page: 551_001,
  widget_template: 551_002,
  detail_page: 551_003,
  entry: 551_004,
  post: 551_005,
});

const ALL_FAMILIES = Object.keys(FAMILY_LOCK_KEYS) as RevisionFamily[];
const INT4_MIN = -2_147_483_648;
const INT4_MAX = 2_147_483_647;

const PARENT_ID = "6f1ae2b3-4c5d-4e7f-8a9b-0c1d2e3f4a5b";
const ALT_PARENT_ID = "0f1ae2b3-4c5d-6e7f-8a9b-0c1d2e3f4a5b";
const CORPUS_SAMPLE = [
  PARENT_ID,
  ALT_PARENT_ID,
  "opaque-parent-with-Ünïcode",
  "0-0-0-0",
  "a".repeat(128),
];

type StubLog = {
  executeCalls: number;
  selectCalls: number;
  insertCalls: number;
  statements: unknown[];
  insertValues: unknown[];
};

/**
 * Statement-counting stub transaction. Builder methods return a thenable chain
 * resolving to `rows` (or rejecting with `insertError`), so `allocateRevision`
 * walks its real code path — advisory lock, next-version select, planned
 * insert — with zero database and zero network.
 */
function stubTx(options: { rows?: unknown[]; insertError?: unknown } = {}): {
  tx: Tx;
  log: StubLog;
} {
  const log: StubLog = {
    executeCalls: 0,
    selectCalls: 0,
    insertCalls: 0,
    statements: [],
    insertValues: [],
  };
  // `insertError` poisons the INSERT chain only: the next-version SELECT still
  // resolves to `rows`, so an injected unique violation surfaces where the
  // module's conflict mapping actually catches it.
  const pending = (forInsert: boolean) => {
    if (forInsert && options.insertError !== undefined) return Promise.reject(options.insertError);
    return Promise.resolve(options.rows ?? []);
  };
  const builder = (settled: Promise<unknown>) => {
    const chain: Record<string, unknown> = {
      from: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: () => chain,
      values: (value: unknown) => {
        log.insertValues.push(value);
        return chain;
      },
      returning: () => chain,
      then: settled.then.bind(settled),
      catch: settled.catch.bind(settled),
      finally: settled.finally.bind(settled),
    };
    return chain;
  };
  const tx = {
    execute: (statement: unknown) => {
      log.executeCalls += 1;
      log.statements.push(statement);
      return Promise.resolve({ rows: [] });
    },
    select: () => {
      log.selectCalls += 1;
      return builder(pending(false));
    },
    insert: () => {
      log.insertCalls += 1;
      return builder(pending(true));
    },
  };
  return { tx: tx as unknown as Tx, log };
}

/** Resolves to the rejection (or null when the promise fulfills). */
async function failureOf(run: Promise<unknown>): Promise<unknown> {
  return run.then(
    () => null,
    (error: unknown) => error
  );
}

/**
 * Reads drizzle's chunk list structurally (StringChunk[].value vs the raw
 * scalar values this drizzle version inlines between them) so the advisory
 * statement's rendered text and bound keys are pinned without importing
 * driver internals or touching a database.
 */
function advisoryShape(statement: unknown): { text: string; params: unknown[] } {
  const chunks = (statement as { queryChunks?: unknown }).queryChunks;
  expect(Array.isArray(chunks)).toBe(true);
  const text: string[] = [];
  const params: unknown[] = [];
  for (const chunk of chunks as Array<unknown>) {
    const value = (chunk as { value?: unknown }).value;
    if (Array.isArray(value) && value.every((part) => typeof part === "string")) {
      text.push((value as string[]).join(""));
    } else if (typeof chunk === "number") {
      params.push(chunk);
    } else {
      params.push(value);
    }
  }
  return { text: text.join(""), params };
}

/** Fixed-seed xorshift32 corpus: deterministic, no Math.random anywhere. */
function seededUuids(count: number, seed: number): string[] {
  let state = seed >>> 0;
  const next = () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state;
  };
  const hex8 = () => next().toString(16).padStart(8, "0");
  return Array.from({ length: count }, () => {
    return `${hex8()}-${hex8().slice(0, 4)}-4${hex8().slice(1, 4)}-8${hex8().slice(1, 4)}-${hex8()}${hex8().slice(0, 4)}`;
  });
}

type AttemptScript = { attempt: () => Promise<string>; state: { attempts: number } };

/** Attempt fn that throws each queued failure once, then succeeds. */
function attemptScript(failures: unknown[], label = "committed"): AttemptScript {
  const queue = [...failures];
  const state = { attempts: 0 };
  const attempt = async () => {
    state.attempts += 1;
    const failure = queue.shift();
    if (failure !== undefined) throw failure;
    return `${label}-${state.attempts}`;
  };
  return { attempt, state };
}

type Settled<T> =
  { ok: true; value: T; advancedMs: number } | { ok: false; error: unknown; advancedMs: number };

/**
 * Advances fake timers in bounded 20ms steps until `run` settles. The bound
 * (240ms) sits far above the module's whole 80ms backoff sequence, so a
 * runaway retry loop fails this assertion instead of hanging the lane.
 */
async function settleWithFakeTimers<T>(run: Promise<T>): Promise<Settled<T>> {
  let settled = false;
  const tracked = run.then(
    (value: T) => {
      settled = true;
      return { ok: true as const, value };
    },
    (error: unknown) => {
      settled = true;
      return { ok: false as const, error };
    }
  );
  let advancedMs = 0;
  for (let step = 0; step < 12 && !settled; step += 1) {
    await vi.advanceTimersByTimeAsync(20);
    advancedMs += 20;
  }
  expect(settled).toBe(true);
  const outcome = await tracked;
  return outcome.ok ? { ...outcome, advancedMs } : { ...outcome, advancedMs };
}

describe("the closed five-family set drives one shared lock table", () => {
  it("pins all five family literals to their distinct, never-renumbered lock keys", () => {
    for (const family of ALL_FAMILIES) {
      expect(stableFamilyKey(family)).toBe(FAMILY_LOCK_KEYS[family]);
      expect(Number.isInteger(stableFamilyKey(family))).toBe(true);
    }
    expect(stableFamilyKey("page")).toBe(551_001);
    expect(stableFamilyKey("widget_template")).toBe(551_002);
    expect(stableFamilyKey("detail_page")).toBe(551_003);
    expect(stableFamilyKey("entry")).toBe(551_004);
    expect(stableFamilyKey("post")).toBe(551_005);
    expect(new Set(Object.values(FAMILY_LOCK_KEYS)).size).toBe(5);
    expect(new Set(ALL_FAMILIES.map((family) => stableFamilyKey(family))).size).toBe(5);
  });

  it("fails closed on unknown, empty, case-mismatched, and non-string families", () => {
    const invalid = [
      "",
      "Page",
      "pages",
      "widget",
      "widget-template",
      "entry_post",
      "detailpage",
      0,
      null,
      undefined,
    ];
    for (const family of invalid) {
      expect(() => stableFamilyKey(family as string as RevisionFamily)).toThrowError(
        REVISION_ALLOCATION_ERROR_CODES.familyInvalid
      );
    }
  });

  it("types the family union as exactly the five contract literals", () => {
    expectTypeOf<RevisionFamily>().toEqualTypeOf<
      "page" | "widget_template" | "detail_page" | "entry" | "post"
    >();
  });

  it("exports only family-generic entry points, so no per-family branch can leak", () => {
    expect(Object.keys(revisionAllocation).sort()).toEqual([
      "MAX_REVISION_ALLOCATION_ATTEMPTS",
      "REVISION_ALLOCATION_ERROR_CODES",
      "RevisionConflictError",
      "allocateRevision",
      "retryRevisionAllocation",
      "revisionScopeDigest",
      "stableFamilyKey",
      "stableParentKey",
      "withRevisionParentLock",
    ]);
  });

  it("imports nothing beyond crypto, drizzle, and the type-only client/schema modules", () => {
    const source = readFileSync(SOURCE_URL, "utf8");
    const specifiers = [...source.matchAll(/from "([^"]+)"/g)].map((match) => match[1]).sort();
    expect(specifiers).toEqual([
      "../../db/client",
      "../../db/schema",
      "drizzle-orm",
      "node:crypto",
    ]);
    // So the entry and post services (and every other revision service) are
    // unreachable from here: their adoption resolves only through this module's
    // own family-generic API.
    expect(specifiers.some((specifier) => /services\/(content|pages)\//.test(specifier))).toBe(
      false
    );
  });
});

describe("shared advisory parent keys are deterministic, int4-safe, and collision-bounded", () => {
  it("derives the same key for the same parent id and matches the documented sha256 bias", () => {
    for (const parentId of CORPUS_SAMPLE) {
      const key = stableParentKey(parentId);
      expect(stableParentKey(parentId)).toBe(key);
      expect(Number.isInteger(key)).toBe(true);
      expect(key).toBeGreaterThanOrEqual(INT4_MIN);
      expect(key).toBeLessThanOrEqual(INT4_MAX);
      // Documented derivation: first four sha256 bytes re-biased into int4.
      expect(key).toBe(
        createHash("sha256").update(parentId, "utf8").digest().readUInt32BE(0) - 0x8000_0000
      );
    }
    // Input sensitivity: case-differing (hence byte-differing) ids never share
    // a key component.
    expect(stableParentKey(PARENT_ID.toUpperCase())).not.toBe(stableParentKey(PARENT_ID));
    expect(stableParentKey(ALT_PARENT_ID.toUpperCase())).not.toBe(stableParentKey(ALT_PARENT_ID));
  });

  it("bounds collisions across a fixed 20,000-id corpus to the documented birthday tail", () => {
    const ids = seededUuids(20_000, 0x5510_0601);
    // The corpus is deterministic: the fixed seed reproduces it byte for byte.
    expect(seededUuids(20_000, 0x5510_0601)).toEqual(ids);
    const keys = ids.map((parentId) => stableParentKey(parentId));
    expect(
      keys.every(
        (key) =>
          Number.isInteger(key) && key >= INT4_MIN && key <= INT4_MAX && typeof key === "number"
      )
    ).toBe(true);
    const buckets = new Map<number, string[]>();
    ids.forEach((parentId, index) => {
      const key = keys[index] as number;
      const bucket = buckets.get(key);
      if (bucket) bucket.push(parentId);
      else buckets.set(key, [parentId]);
    });
    const collisions = [...buckets.values()].filter((bucket) => bucket.length > 1);
    // 20,000 ids over 2^32 buckets expect ~0.05 collisions; three would already
    // be a ~60x birthday-tail outlier. A collision only queues two parents of
    // one family on each other's advisory lock — ordering, never correctness.
    expect(collisions.length).toBeLessThanOrEqual(3);
    expect(buckets.size).toBeGreaterThanOrEqual(ids.length - 3);
    for (const bucket of collisions) {
      expect(new Set(bucket).size).toBe(bucket.length);
      const shared = stableParentKey(bucket[0] as string);
      expect(bucket.every((parentId) => stableParentKey(parentId) === shared)).toBe(true);
    }
  });

  it("fails closed on empty, oversized, and non-string parent ids before hashing", () => {
    for (const parentId of ["", "x".repeat(129), "x".repeat(4096), 42, null, undefined]) {
      expect(() => stableParentKey(parentId as string)).toThrowError(
        REVISION_ALLOCATION_ERROR_CODES.parentInvalid
      );
    }
    expect(() => stableParentKey("x".repeat(128))).not.toThrow();
  });

  it("scopes every lock tuple by family so equal parent keys never share a cross-family lock", () => {
    const parentKey = stableParentKey(PARENT_ID);
    const tuples = ALL_FAMILIES.map((family) => [stableFamilyKey(family), parentKey] as const);
    expect(new Set(tuples.map((tuple) => tuple[0])).size).toBe(5);
    for (let i = 0; i < tuples.length; i += 1) {
      for (let j = i + 1; j < tuples.length; j += 1) {
        expect(tuples[i] as readonly [number, number]).not.toEqual(
          tuples[j] as readonly [number, number]
        );
      }
    }
  });
});

describe("revisionScopeDigest is the exact canonical v1 cursor scope", () => {
  it("matches revision:<family>:v1:<64 lowercase hex> for all five families, deterministically", () => {
    for (const family of ALL_FAMILIES) {
      const digest = revisionScopeDigest(family, PARENT_ID);
      expect(digest).toMatch(new RegExp(`^revision:${family}:v1:[0-9a-f]{64}$`));
      expect(revisionScopeDigest(family, PARENT_ID)).toBe(digest);
      // Single-key canonical payload with code-unit-sorted keys: exactly
      // JSON.stringify({ parentId }) hashed, nothing more to reorder.
      expect(digest.slice(`revision:${family}:v1:`.length)).toBe(
        createHash("sha256")
          .update(JSON.stringify({ parentId: PARENT_ID }), "utf8")
          .digest("hex")
      );
    }
  });

  it("changes when the family changes and when the parent changes (canonical form ignores nothing)", () => {
    const digests = new Set(ALL_FAMILIES.map((family) => revisionScopeDigest(family, PARENT_ID)));
    expect(digests.size).toBe(ALL_FAMILIES.length);
    const page = revisionScopeDigest("page", PARENT_ID);
    for (const family of ALL_FAMILIES) {
      const digest = revisionScopeDigest(family, PARENT_ID);
      const other = revisionScopeDigest(family, ALT_PARENT_ID);
      expect(other).toMatch(new RegExp(`^revision:${family}:v1:[0-9a-f]{64}$`));
      expect(other).not.toBe(digest);
      // The family segment is the ONLY per-family variation: one shared parent
      // digest tail, exactly what a family-checked cursor verifier consumes.
      expect(digest.slice(`revision:${family}:v1:`.length)).toBe(
        page.slice("revision:page:v1:".length)
      );
    }
  });

  it("never embeds the raw parent id, uppercase hex, whitespace, or SQL text", () => {
    for (const family of ALL_FAMILIES) {
      for (const parentId of [PARENT_ID, ALT_PARENT_ID, "opaque-parent-with-Ünïcode"]) {
        const digest = revisionScopeDigest(family, parentId);
        expect(digest.includes(parentId)).toBe(false);
        expect(digest.includes(parentId.toUpperCase())).toBe(false);
        expect(/[A-F]/.test(digest)).toBe(false);
        expect(/\s/.test(digest)).toBe(false);
        expect(/select|insert|constraint|advisory/i.test(digest)).toBe(false);
      }
    }
  });

  it("fails closed on unknown families and unbounded parent ids", () => {
    for (const family of ["widget", "", "Entry"] as string[]) {
      expect(() => revisionScopeDigest(family as RevisionFamily, PARENT_ID)).toThrowError(
        REVISION_ALLOCATION_ERROR_CODES.familyInvalid
      );
    }
    for (const parentId of ["", "x".repeat(129)]) {
      expect(() => revisionScopeDigest("page", parentId)).toThrowError(
        REVISION_ALLOCATION_ERROR_CODES.parentInvalid
      );
    }
    expect(() => revisionScopeDigest("post", "x".repeat(128))).not.toThrow();
  });
});

describe("RevisionConflictError and the error-code vocabulary", () => {
  it("carries the bounded code, typed family/parent, and no uuid or SQL text", () => {
    for (const family of ALL_FAMILIES) {
      const error = new RevisionConflictError({ family, parentId: PARENT_ID });
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RevisionConflictError);
      expect(error.code).toBe("revision_conflict");
      expect(error.code).toBe(REVISION_ALLOCATION_ERROR_CODES.conflict);
      expect(error.name).toBe("RevisionConflictError");
      expect(error.message).toBe(REVISION_ALLOCATION_ERROR_CODES.conflict);
      expect(error.family).toBe(family);
      expect(error.parentId).toBe(PARENT_ID);
      expect(error.message).not.toContain(PARENT_ID);
      // The message is the bounded code alone: no id, SQL, bind, or constraint.
      expect(error.message).toMatch(/^[a-z_]+$/);
    }
  });

  it("keeps identity in typed fields and out of String(error)", () => {
    const error = new RevisionConflictError({ family: "post", parentId: ALT_PARENT_ID });
    expect(String(error)).not.toContain(ALT_PARENT_ID);
    expect(String(error)).not.toMatch(/select|insert|constraint|advisory|23505|key /i);
    expect(JSON.parse(JSON.stringify(error))).toMatchObject({
      code: "revision_conflict",
      family: "post",
      parentId: ALT_PARENT_ID,
    });
  });

  it("pins the machine-readable code table as a closed set and the attempt cap at three", () => {
    expect(REVISION_ALLOCATION_ERROR_CODES).toEqual({
      conflict: "revision_conflict",
      familyInvalid: "revision_family_invalid",
      familyWriterUnavailable: "revision_family_writer_unavailable",
      parentInvalid: "revision_parent_invalid",
      kindInvalid: "revision_kind_invalid",
      scopeInvalid: "revision_scope_invalid",
      insertMissing: "revision_insert_missing",
    });
    expect(MAX_REVISION_ALLOCATION_ATTEMPTS).toBe(3);
  });
});

describe("allocateRevision fails closed where no writer exists and allocates where one does", () => {
  const CREATED_AT = new Date(0);
  const PAGE_ROW = {
    id: "rev_page_1",
    pageId: PARENT_ID,
    version: 4,
    kind: "autosave",
    data: { n: 1 },
    createdAt: CREATED_AT,
    createdBy: "user_7",
  };
  const DETAIL_ROW = {
    id: "rev_detail_1",
    detailPageId: PARENT_ID,
    version: 11,
    kind: "autosave",
    document: { doc: true },
    createdAt: CREATED_AT,
    createdBy: null,
  };
  const PAGE_INPUT: RevisionInsert<{ n: number }> = {
    family: "page",
    parentId: PARENT_ID,
    kind: "autosave",
    data: { n: 1 },
    createdBy: "user_7",
  };
  const DETAIL_INPUT: RevisionInsert<{ doc: boolean }> = {
    family: "detail_page",
    parentId: PARENT_ID,
    kind: "autosave",
    data: { doc: true },
  };

  it("rejects entry, post, and widget_template with familyWriterUnavailable and zero statements", async () => {
    for (const family of ["entry", "post", "widget_template"] as const) {
      const { tx, log } = stubTx({ rows: [PAGE_ROW] });
      const input: RevisionInsert<null> = {
        family,
        parentId: PARENT_ID,
        kind: "autosave",
        data: null,
      };
      const failure = await failureOf(allocateRevision(input, tx));
      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).toBe(
        REVISION_ALLOCATION_ERROR_CODES.familyWriterUnavailable
      );
      expect(failure).not.toBeInstanceOf(RevisionConflictError);
      // Fail-closed BEFORE any statement: no advisory lock, no read, no write.
      expect(log.executeCalls).toBe(0);
      expect(log.selectCalls).toBe(0);
      expect(log.insertCalls).toBe(0);
      expect(log.statements).toEqual([]);
      expect(log.insertValues).toEqual([]);
    }
  });

  it("fails closed on unbounded kind and unknown family before the writer table", async () => {
    const { tx, log } = stubTx({ rows: [PAGE_ROW] });
    const emptyKind = await failureOf(allocateRevision({ ...PAGE_INPUT, kind: "" }, tx));
    expect((emptyKind as Error).message).toBe(REVISION_ALLOCATION_ERROR_CODES.kindInvalid);
    const unknownFamily = await failureOf(
      allocateRevision({ ...PAGE_INPUT, family: "widget" as string as RevisionFamily }, tx)
    );
    expect((unknownFamily as Error).message).toBe(REVISION_ALLOCATION_ERROR_CODES.familyInvalid);
    expect(log.executeCalls).toBe(0);
    expect(log.selectCalls).toBe(0);
    expect(log.insertCalls).toBe(0);
  });

  it("allocates page revisions through one lock, one next-version read, and one insert", async () => {
    const { tx, log } = stubTx({ rows: [PAGE_ROW] });
    // Caller-supplied version exists only for row-shape parity and is ignored.
    const revision = await allocateRevision({ ...PAGE_INPUT, version: 99 }, tx);
    expectTypeOf(revision).toEqualTypeOf<Revision<{ n: number }>>();
    expect(revision.family).toBe("page");
    expect(revision.parentId).toBe(PARENT_ID);
    expect(revision.kind).toBe("autosave");
    expect(revision.data).toEqual({ n: 1 });
    expect(revision.createdBy).toBe("user_7");
    expect(revision.createdAt).toBeInstanceOf(Date);
    expect(revision.id).toBe(PAGE_ROW.id);
    // Exactly the documented allocation budget: one advisory-lock execute plus
    // one indexed next-version read plus one insert — independent of history.
    expect(log.executeCalls).toBe(1);
    expect(log.selectCalls).toBe(1);
    expect(log.insertCalls).toBe(1);
    // The planned insert carries the parent-derived max+1, never the caller's 99.
    const planned = log.insertValues[0] as {
      pageId: string;
      version: number;
      kind: string;
      data: unknown;
      createdBy: string | null;
    };
    expect(planned.version).toBe(PAGE_ROW.version + 1);
    expect(planned.pageId).toBe(PARENT_ID);
    expect(planned.kind).toBe("autosave");
    expect(planned.createdBy).toBe("user_7");
  });

  it("allocates detail_page revisions through the identical shape with document mapped to data", async () => {
    const { tx, log } = stubTx({ rows: [DETAIL_ROW] });
    const revision = await allocateRevision(DETAIL_INPUT, tx);
    expectTypeOf(revision).toEqualTypeOf<Revision<{ doc: boolean }>>();
    expect(revision.family).toBe("detail_page");
    expect(revision.parentId).toBe(PARENT_ID);
    expect(revision.kind).toBe("autosave");
    expect(revision.data).toEqual({ doc: true });
    expect(revision.createdBy).toBeNull();
    expect(revision.createdAt).toBeInstanceOf(Date);
    expect(log.executeCalls).toBe(1);
    expect(log.selectCalls).toBe(1);
    expect(log.insertCalls).toBe(1);
    const planned = log.insertValues[0] as { detailPageId: string; version: number };
    expect(planned.detailPageId).toBe(PARENT_ID);
    expect(planned.version).toBe(DETAIL_ROW.version + 1);
  });

  it("maps a cause-wrapped 23505 to the same RevisionConflictError for page and detail_page", async () => {
    const cause = Object.assign(
      new Error(
        'duplicate key value violates unique constraint "page_revisions_page_id_version_key"'
      ),
      { code: "23505", detail: `Key (page_id, version)=(${PARENT_ID}, 5) already exists.` }
    );
    const wrapped = Object.assign(
      new Error('Failed query: insert into "page_revisions" (...) values ($1, $2, $3)'),
      { code: "DRIZZLE_ERROR", cause }
    );
    const { tx } = stubTx({ rows: [PAGE_ROW], insertError: wrapped });
    const failure = await failureOf(allocateRevision(PAGE_INPUT, tx));
    expect(failure).toBeInstanceOf(RevisionConflictError);
    const conflict = failure as RevisionConflictError;
    expect(conflict.code).toBe(REVISION_ALLOCATION_ERROR_CODES.conflict);
    expect(conflict.family).toBe("page");
    expect(conflict.parentId).toBe(PARENT_ID);
    // The mapped message discards every scrap of driver SQL, constraint, and id.
    expect(conflict.message).toBe(REVISION_ALLOCATION_ERROR_CODES.conflict);
    expect(conflict.message).not.toContain(PARENT_ID);
    expect(conflict.message).not.toContain("page_revisions");
    expect(conflict.message).not.toContain("23505");

    const flat = Object.assign(new Error("duplicate key value violates unique constraint"), {
      code: "23505",
    });
    const detail = stubTx({ rows: [DETAIL_ROW], insertError: flat });
    const detailFailure = await failureOf(allocateRevision(DETAIL_INPUT, detail.tx));
    expect(detailFailure).toBeInstanceOf(RevisionConflictError);
    expect((detailFailure as RevisionConflictError).family).toBe("detail_page");
    expect((detailFailure as RevisionConflictError).parentId).toBe(PARENT_ID);
    expect((detailFailure as RevisionConflictError).message).toBe(
      REVISION_ALLOCATION_ERROR_CODES.conflict
    );
  });

  it("rethrows non-unique failures untouched instead of inventing a conflict", async () => {
    const check = Object.assign(new Error("new row violates check constraint"), { code: "23514" });
    const { tx } = stubTx({ rows: [PAGE_ROW], insertError: check });
    const checkFailure = await failureOf(allocateRevision(PAGE_INPUT, tx));
    expect(checkFailure).toBe(check);
    expect(checkFailure).not.toBeInstanceOf(RevisionConflictError);

    const plain = new Error("connect ECONNREFUSED 127.0.0.1:1");
    const noState = stubTx({ rows: [PAGE_ROW], insertError: plain });
    const plainFailure = await failureOf(allocateRevision(PAGE_INPUT, noState.tx));
    expect(plainFailure).toBe(plain);
    expect(plainFailure).not.toBeInstanceOf(RevisionConflictError);
  });
});

describe("entry and post resolve through the same allocator policy without their services", () => {
  it("shares one conflict identity shape across all five families", () => {
    const errors = ALL_FAMILIES.map(
      (family) => new RevisionConflictError({ family, parentId: PARENT_ID })
    );
    for (const error of errors) {
      expect(error.code).toBe(errors[0]!.code);
      expect(error.message).toBe(errors[0]!.message);
      expect(error.name).toBe(errors[0]!.name);
      expect(error.constructor).toBe(RevisionConflictError);
    }
    expect(new Set(errors.map((error) => error.family)).size).toBe(5);
  });

  it("shares one parent-key derivation and one digest tail across all five families", () => {
    const parentKey = stableParentKey(PARENT_ID);
    const tail = revisionScopeDigest("page", PARENT_ID).slice("revision:page:v1:".length);
    for (const family of ALL_FAMILIES) {
      expect(stableParentKey(PARENT_ID)).toBe(parentKey);
      expect(revisionScopeDigest(family, PARENT_ID).slice(`revision:${family}:v1:`.length)).toBe(
        tail
      );
    }
  });

  it("applies the identical fail-closed writer policy to the three writerless families", async () => {
    const codes = new Set<string>();
    for (const family of ["widget_template", "entry", "post"] as const) {
      const { tx, log } = stubTx({ rows: [] });
      const failure = await failureOf(
        allocateRevision({ family, parentId: PARENT_ID, kind: "autosave", data: null }, tx)
      );
      codes.add((failure as Error).message);
      expect(failure).not.toBeInstanceOf(RevisionConflictError);
      expect(log.executeCalls + log.selectCalls + log.insertCalls).toBe(0);
    }
    expect([...codes]).toEqual([REVISION_ALLOCATION_ERROR_CODES.familyWriterUnavailable]);
  });
});

describe("withRevisionParentLock argument order is contractual", () => {
  it("binds pg_advisory_xact_lock(familyKey, parentKey) once on the caller transaction", async () => {
    const { tx, log } = stubTx();
    const run = vi.fn(async () => "ran");
    const value = await withRevisionParentLock({ family: "entry", parentId: PARENT_ID }, tx, run);
    expect(value).toBe("ran");
    expect(run).toHaveBeenCalledTimes(1);
    expect(log.executeCalls).toBe(1);
    const { text, params } = advisoryShape(log.statements[0]);
    expect(text).toContain("pg_advisory_xact_lock");
    expect(params).toEqual([stableFamilyKey("entry"), stableParentKey(PARENT_ID)]);
    // Both binds are int4 numbers: no raw parent id travels as a lock parameter.
    expect(params.every((param) => typeof param === "number")).toBe(true);
    expect(
      params.every((param) => (param as number) >= INT4_MIN && (param as number) <= INT4_MAX)
    ).toBe(true);
  });

  it("fails closed with zero statements when the arguments are swapped (tx-first)", async () => {
    const { tx, log } = stubTx();
    const run = vi.fn(async () => "never");
    const failure = await failureOf(
      withRevisionParentLock(
        tx as unknown as RevisionFamilyIdentity,
        { family: "page", parentId: PARENT_ID } as unknown as Tx,
        run
      )
    );
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe(REVISION_ALLOCATION_ERROR_CODES.familyInvalid);
    expect(log.executeCalls).toBe(0);
    expect(log.statements).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });

  it("proves the tx-first consumer fixture is contract drift: untypeable and failing closed", async () => {
    const { tx, log } = stubTx();
    const run = vi.fn(async () => "never");
    const identity: RevisionFamilyIdentity = { family: "page", parentId: PARENT_ID };
    // @ts-expect-error — tx-first call is contract drift (contract L245-247)
    const drifted: Promise<string> = withRevisionParentLock(tx, identity, run);
    await expect(drifted).rejects.toThrowError(REVISION_ALLOCATION_ERROR_CODES.familyInvalid);
    expect(log.executeCalls).toBe(0);
    expect(run).not.toHaveBeenCalled();
  });

  it("pins the contractual parameter order and inferred return types", async () => {
    const { tx } = stubTx();
    expectTypeOf(withRevisionParentLock).parameter(0).toEqualTypeOf<RevisionFamilyIdentity>();
    expectTypeOf(withRevisionParentLock).parameter(1).toEqualTypeOf<Tx>();
    const locked = withRevisionParentLock(
      { family: "page", parentId: PARENT_ID },
      tx,
      async () => 42
    );
    expectTypeOf(locked).toEqualTypeOf<Promise<number>>();
    await expect(locked).resolves.toBe(42);
    const allocated = allocateRevision(
      {
        family: "page",
        parentId: PARENT_ID,
        kind: "autosave",
        data: { n: 1 },
      } satisfies RevisionInsert<{ n: number }>,
      tx
    );
    expectTypeOf(allocated).toEqualTypeOf<Promise<Revision<{ n: number }>>>();
    // The empty stub has no insert row, so the module fails closed instead of
    // returning a fabricated revision.
    await expect(allocated).rejects.toThrowError(REVISION_ALLOCATION_ERROR_CODES.insertMissing);
  });
});

describe("retryRevisionAllocation retries only PostgreSQL class-40 outcomes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("succeeds on the third attempt after two 40001 serialization failures", async () => {
    const { attempt, state } = attemptScript([{ code: "40001" }, { code: "40001" }]);
    const outcome = await settleWithFakeTimers(retryRevisionAllocation(attempt));
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.value).toBe("committed-3");
    expect(state.attempts).toBe(3);
    // Fixed bounded backoff 20ms + 60ms: deterministic, no jitter, no Math.random.
    expect(outcome.advancedMs).toBe(80);
  });

  it("rethrows the original deadlock error after the 40P01 attempt cap", async () => {
    const first = { code: "40P01" };
    const second = { code: "40P01" };
    const third = { code: "40P01" };
    const { attempt, state } = attemptScript([first, second, third]);
    const outcome = await settleWithFakeTimers(retryRevisionAllocation(attempt));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      // The ORIGINAL third error surfaces, never a copy of an earlier attempt.
      expect(outcome.error).toBe(third);
      expect(outcome.error).not.toBe(first);
      expect(outcome.error).not.toBe(second);
    }
    expect(state.attempts).toBe(MAX_REVISION_ALLOCATION_ATTEMPTS);
    expect(outcome.advancedMs).toBe(80);
  });

  it("never retries a RevisionConflictError", async () => {
    const conflict = new RevisionConflictError({ family: "entry", parentId: PARENT_ID });
    const { attempt, state } = attemptScript([conflict, conflict]);
    const outcome = await settleWithFakeTimers(retryRevisionAllocation(attempt));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toBe(conflict);
    expect(state.attempts).toBe(1);
  });

  it("never retries a raw 23505 unique violation", async () => {
    const unique = Object.assign(new Error("duplicate key value violates unique constraint"), {
      code: "23505",
    });
    const { attempt, state } = attemptScript([unique, unique]);
    const outcome = await settleWithFakeTimers(retryRevisionAllocation(attempt));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toBe(unique);
    expect(state.attempts).toBe(1);
  });

  it("rethrows non-class-40 SQLSTATE failures on the first attempt", async () => {
    const check = Object.assign(new Error("new row violates check constraint"), { code: "23514" });
    const { attempt, state } = attemptScript([check, check]);
    const outcome = await settleWithFakeTimers(retryRevisionAllocation(attempt));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toBe(check);
    expect(state.attempts).toBe(1);
  });

  it("rethrows failures with no SQLSTATE at all on the first attempt", async () => {
    const plain = new Error("connection terminated unexpectedly");
    const { attempt, state } = attemptScript([plain]);
    const outcome = await settleWithFakeTimers(retryRevisionAllocation(attempt));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toBe(plain);
    expect(state.attempts).toBe(1);
  });

  it("paces two independent single-failure recoveries with the identical fixed 20ms backoff", async () => {
    const timings: number[] = [];
    for (let round = 0; round < 2; round += 1) {
      const { attempt, state } = attemptScript([{ code: "40001" }]);
      const outcome = await settleWithFakeTimers(retryRevisionAllocation(attempt));
      expect(outcome.ok).toBe(true);
      if (outcome.ok) expect(outcome.value).toBe("committed-2");
      expect(state.attempts).toBe(2);
      timings.push(outcome.advancedMs);
    }
    // Same input, same backoff: deterministic pacing, no jitter, no Math.random.
    expect(timings).toEqual([20, 20]);
  });
});
