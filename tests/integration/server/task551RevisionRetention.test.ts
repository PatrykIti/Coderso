// TASK-551-06-L02 — revision-family retention service coverage (bun lane), in
// two registers:
//
// 1. Airtight service coverage (doc L56-78, L137-143, L255-260): the leaf
//    normalizer's closed bound matrix (defaults 180/[30..2555] and 50/[1..500],
//    exact rejection reasons, idempotent round-trip), the strict five-prefix
//    env sweep (ENABLED/MAX_AGE_DAYS/KEEP_NEWEST_PER_PARENT only, unknown
//    suffixes fail closed), the disabled zero-SQL ledger, the dry-run shape
//    (exactly one LIMIT-bounded candidate read, no FOR UPDATE, deleted 0), the
//    SKIP LOCKED apply batch shape with `.returning()`-length delete counts,
//    the family->table map, the frozen ledger surface L03 consumes, and the
//    TASK-551-01-L02 frozen `2036-01-01` retention clock consumed verbatim from
//    tests/perf/fixtures/task551DatabaseScale.ts. These legs touch no database:
//    reads run through a recording proxy over the real drizzle builder
//    (statement text via `toSQL()`, never executed) and the suite is green
//    under the airtight form.
//
// 2. Real-database legs (doc L255-260, L306-308): the page and post families
//    drive their TASK-551-05-L01 retention-indexed tables through the frozen
//    clock — whole-family convergence at a small batch, dry-run zero-mutation,
//    per-parent scope isolation, publish-anchor and keep-newest-floor
//    preservation, the age-boundary row, and the family env enablement switch.
//    They register through `test.skipIf` on TASK-551-11's owner-injected
//    `task551-db-test` map and skip when it is absent: the airtight run
//    performs zero database contact, no `.env` is ever sourced, and no ambient
//    `DATABASE_URL` is probed.
//
// Shared-database discipline: every leg seeds marker-scoped parent rows and
// asserts only on those parents' revisions (per-parent version sets, never
// table-wide counts), with tiny hand-built batch policies so a leg can never
// exceed its own fixture. Every whole-family apply pass is preceded by the
// exact bounded candidate dry-run at the same anchors, so a polluted shared
// table fails the read-only count before any leg deletes. Cleanup is
// fixture-scoped: marker parent deletes whose cascades own the revision rows.
// The scheduler advisory lock (TASK-551-06-L03) is deliberately out of scope.

import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { asc, eq, getTableName, like } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentRevisions,
  detailPageRevisions,
  pageRevisions,
  pages,
  postRevisions,
  posts,
  widgetTemplateRevisions,
} from "../../../core/db/schema";
import {
  REVISION_RETENTION_BATCH_FAILED,
  REVISION_RETENTION_DEFAULT_KEEP_NEWEST_PER_PARENT,
  REVISION_RETENTION_DEFAULT_MAX_AGE_DAYS,
  REVISION_RETENTION_FAMILY_ORDER,
  REVISION_RETENTION_MAX_KEEP_NEWEST_PER_PARENT,
  REVISION_RETENTION_MAX_MAX_AGE_DAYS,
  REVISION_RETENTION_MIN_KEEP_NEWEST_PER_PARENT,
  REVISION_RETENTION_MIN_MAX_AGE_DAYS,
  isRevisionRetentionFamily,
  normalizeRevisionRetentionPolicy,
  pruneParentRevisions,
  runRevisionFamilyRetention,
  type RevisionRetentionExecutor,
  type RevisionRetentionLedger,
  type RevisionRetentionPolicyInput,
} from "../../../core/services/content/revisionRetentionService";
import type { RevisionFamily } from "../../../core/services/database/revisionAllocation";
import {
  RETENTION_BATCH_SIZE_MAX,
  RETENTION_BATCH_SIZE_MIN,
  RETENTION_DRY_RUN_ENV,
  RETENTION_MAX_BATCHES_PER_RUN_MAX,
  RETENTION_MAX_BATCHES_PER_RUN_MIN,
  RETENTION_POLICY_ERROR_CODE,
  RetentionPolicyError,
  computeRetentionCutoff,
  isEligibleForRetentionCutoff,
  type RuntimeEnv,
} from "../../../core/services/maintenance/retentionPolicy";
import {
  TASK551_RETENTION_CLOCK_MS,
  retentionTs,
} from "../../../tests/perf/fixtures/task551DatabaseScale";

/**
 * Presence-only gate for TASK-551-11's owner-injected `task551-db-test` map
 * (exact-own child fixture map `TASK551_FIXTURE_DATABASE_URL`/`_NAME`/
 * `_SENTINEL` plus fixed OS keys, with no inherited environment). The map is
 * injected only by the owner, so its presence -- never its values -- decides
 * whether the real database may be dialed. Canonical form of
 * tests/integration/server/task551AppendHeavyRetention.test.ts.
 */
const OWNER_DB_TEST_MAP_PRESENT = [
  process.env.TASK551_FIXTURE_DATABASE_URL,
  process.env.TASK551_FIXTURE_DATABASE_NAME,
  process.env.TASK551_FIXTURE_DATABASE_SENTINEL,
].every((value) => typeof value === "string" && value.length > 0);

// Named gate: exactly the real-database legs register through `test.skipIf`
// on the owner map above; every normalizer/shape proof is pure.
const testIfDb = test.skipIf(!OWNER_DB_TEST_MAP_PRESENT);

// --- Shared frozen-scenario vocabulary --------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
/** TASK-551-01-L02's frozen retention clock, consumed verbatim. */
const RETENTION_CLOCK = new Date(TASK551_RETENTION_CLOCK_MS);
/** `cutoff` means `column < now - age`: a row at exactly `cutoff` is retained. */
const CUTOFF_180 = computeRetentionCutoff(RETENTION_CLOCK, REVISION_RETENTION_DEFAULT_MAX_AGE_DAYS);
/** Seeded revision stamps, offset in whole days from the age cutoff. */
const aroundCutoff = (offsetDays: number): Date =>
  new Date(CUTOFF_180.getTime() + offsetDays * DAY_MS);

/** Injected environment for every service call: ambient keys never leak in. */
const CLEAN_ENV: RuntimeEnv = {};

/** Unique per-run marker prefixing every seeded parent slug of this suite. */
const RUN = `task551-06l02-${randomUUID()}`;
const marked = (slug: string): string => `${RUN}-${slug}`;

/** The contract's five revision families, in the global drain order. */
const FAMILIES = ["page", "widget_template", "detail_page", "entry", "post"] as const;

/** The closed five-family env prefixes, keyed per family. */
const FAMILY_ENV_PREFIXES: readonly (readonly [RevisionFamily, string])[] = [
  ["page", "RETENTION_PAGE_REVISIONS_"],
  ["widget_template", "RETENTION_WIDGET_TEMPLATE_REVISIONS_"],
  ["detail_page", "RETENTION_DETAIL_PAGE_REVISIONS_"],
  ["entry", "RETENTION_ENTRY_REVISIONS_"],
  ["post", "RETENTION_POST_REVISIONS_"],
];

/** Hand-built typed policy input frozen to the shared 2036 clock. */
const policyInput = (overrides: RevisionRetentionPolicyInput = {}) => ({
  dryRun: false,
  maxAgeDays: REVISION_RETENTION_DEFAULT_MAX_AGE_DAYS,
  keepNewestPerParent: 2,
  batchSize: 2,
  maxBatchesPerRun: 10,
  now: RETENTION_CLOCK,
  ...overrides,
});

/** The disabled policy: zero-work ledgers in both registers. */
const DISABLED_INPUT: RevisionRetentionPolicyInput = {
  enabled: false,
  dryRun: false,
  now: RETENTION_CLOCK,
};

// --- Shared doubles and assertion helpers ------------------------------------

type SpyRow = { id: string };
type ToSql = { toSQL: () => { sql: string; params: unknown[] } };

/** A postgres.js-flavoured RowList: `.length` is the truth, `count` is noise. */
const rowList = (ids: readonly string[], poisonedCount?: number): SpyRow[] =>
  Object.assign(
    ids.map((id) => ({ id })),
    { count: poisonedCount ?? ids.length, command: "DELETE" }
  );

type ReadSpy = {
  executor: RevisionRetentionExecutor;
  readonly reads: number;
  readonly deletes: number;
  readonly locks: number;
  readonly limits: number[];
  readonly statements: readonly string[];
  readonly bound: readonly unknown[];
  readonly deletedIds: readonly string[];
};

/**
 * Records the real drizzle read chain statement-by-statement (`toSQL()`, so the
 * pinned order/lock/probe text is the production text) while resolving every
 * await with the next scripted candidate batch; deletes are count-based RowList
 * stubs whose `count` field is deliberately poisoned, so a ledger number could
 * only have come from the `.returning()` row-list length.
 */
const spyExecutor = (
  readBatches: readonly (readonly SpyRow[])[],
  deletedIds: readonly string[] | null = null
): ReadSpy => {
  const state = {
    reads: 0,
    deletes: 0,
    locks: 0,
    limits: [] as number[],
    statements: [] as string[],
    bound: [] as unknown[],
    deletedIds: [] as string[],
  };
  const batchAt = (index: number): readonly SpyRow[] =>
    readBatches[Math.min(Math.max(index, 0), readBatches.length - 1)] ?? [];
  const instrument = (node: unknown): unknown =>
    new Proxy(node as Record<string, unknown>, {
      get(target, property) {
        if (property === "then") {
          const batch = batchAt(state.reads - 1);
          return (onFulfilled: unknown, onRejected: unknown) => {
            const described = (target as ToSql).toSQL();
            state.statements.push(described.sql);
            state.bound.push(...described.params);
            return Promise.resolve(batch).then(onFulfilled as never, onRejected as never);
          };
        }
        const value = Reflect.get(target, property, target);
        if (typeof value !== "function") return value;
        return (...args: unknown[]) => {
          if (property === "for") state.locks += 1;
          if (property === "limit") state.limits.push(Number(args[0]));
          return instrument(Reflect.apply(value as (...a: unknown[]) => unknown, target, args));
        };
      },
    });
  const executor = {
    select: (...args: unknown[]) => {
      state.reads += 1;
      return instrument(
        (db as unknown as { select: (...inner: unknown[]) => unknown }).select(...args)
      );
    },
    delete: () => {
      state.deletes += 1;
      const ids = (deletedIds ?? batchAt(state.reads - 1).map((row) => row.id)) as string[];
      state.deletedIds.push(...ids);
      return { where: () => ({ returning: () => Promise.resolve(rowList(ids, 999)) }) };
    },
    execute: (): never => {
      throw new Error("unexpected_family_retention_execute");
    },
  };
  // Live accessors: the counters above move while the service runs.
  return Object.defineProperties(Object.create(null), {
    executor: { value: executor as unknown as RevisionRetentionExecutor },
    reads: { get: () => state.reads },
    deletes: { get: () => state.deletes },
    locks: { get: () => state.locks },
    limits: { get: () => state.limits },
    statements: { get: () => state.statements },
    bound: { get: () => state.bound },
    deletedIds: { get: () => state.deletedIds },
  }) as ReadSpy;
};

/** A dead executor that counts every property touch: zero means zero SQL. */
const zeroSqlExecutor = (): { executor: RevisionRetentionExecutor; touches: () => number } => {
  let touches = 0;
  const executor = new Proxy({}, { get: () => ((touches += 1), () => undefined) });
  return { executor: executor as RevisionRetentionExecutor, touches: () => touches };
};

/** The exact closed ledger surface L03 consumes: `[enabled, dryRun, ...counts]`. */
const LEDGER_KEYS = ["family", "enabled", "dryRun", "batches", "matched", "deleted"];
type LedgerOutcome = readonly [boolean, boolean, number, number, number];

/** Asserts the frozen key order plus the exact ledger field values. */
const expectLedger = (
  ledger: RevisionRetentionLedger,
  family: RevisionFamily,
  [enabled, dryRun, batches, matched, deleted]: LedgerOutcome
): void => {
  expect(Object.isFrozen(ledger)).toBe(true);
  expect(Object.keys(ledger)).toEqual(LEDGER_KEYS);
  expect(ledger).toEqual({ family, enabled, dryRun, batches, matched, deleted });
};

/** Synchronous policy rejections: the stable code plus the exact reason. */
const policyReason = (run: () => unknown): string => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(RetentionPolicyError);
    expect((error as RetentionPolicyError).code).toBe(RETENTION_POLICY_ERROR_CODE);
    return (error as RetentionPolicyError).reason;
  }
  throw new Error("expected_retention_policy_rejection");
};

/** Asynchronous rejections (the async pruner rejects instead of throwing). */
const rejectionReason = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
  } catch (error) {
    return policyReason(() => {
      throw error;
    });
  }
  throw new Error("expected_retention_policy_rejection");
};

/** One family run over `executor` (the real client by default). */
const runFamily = (
  family: RevisionFamily,
  policy: RevisionRetentionPolicyInput,
  env: RuntimeEnv = CLEAN_ENV,
  executor: RevisionRetentionExecutor = db
): Promise<RevisionRetentionLedger> =>
  runRevisionFamilyRetention(family, executor, { policy, env });

/** One family run asserted against the exact closed ledger shape. */
const expectRun = async (
  family: RevisionFamily,
  policy: RevisionRetentionPolicyInput,
  outcome: LedgerOutcome,
  env: RuntimeEnv = CLEAN_ENV,
  executor: RevisionRetentionExecutor = db
): Promise<RevisionRetentionLedger> => {
  const ledger = await runFamily(family, policy, env, executor);
  expectLedger(ledger, family, outcome);
  return ledger;
};

/** A normalized typed policy, frozen to the shared clock. */
const dbPolicy = (family: RevisionFamily, overrides: RevisionRetentionPolicyInput = {}) =>
  normalizeRevisionRetentionPolicy(family, policyInput(overrides), CLEAN_ENV);

// --- Airtight register: the retention service contract ----------------------

describe("revision retention service (airtight, no database)", () => {
  test("exports the closed five-family surface frozen for TASK-551-06-L03", () => {
    expect([...REVISION_RETENTION_FAMILY_ORDER]).toEqual([...FAMILIES]);
    expect(FAMILY_ENV_PREFIXES.map(([family]) => family)).toEqual([
      ...REVISION_RETENTION_FAMILY_ORDER,
    ]);
    for (const family of REVISION_RETENTION_FAMILY_ORDER) {
      expect(isRevisionRetentionFamily(family)).toBe(true);
    }
    // The L01 families are a different namespace: none is a revision family.
    for (const stranger of ["access_logs", "audit_logs", "Page", "", "revisions"]) {
      expect(isRevisionRetentionFamily(stranger)).toBe(false);
    }
    expect(REVISION_RETENTION_BATCH_FAILED).toBe("retention_batch_failed");
  });

  test("normalizes the doc defaults for every family (L59-62)", () => {
    expect(REVISION_RETENTION_DEFAULT_MAX_AGE_DAYS).toBe(180);
    expect(REVISION_RETENTION_MIN_MAX_AGE_DAYS).toBe(30);
    expect(REVISION_RETENTION_MAX_MAX_AGE_DAYS).toBe(2_555);
    expect(REVISION_RETENTION_DEFAULT_KEEP_NEWEST_PER_PARENT).toBe(50);
    expect(REVISION_RETENTION_MIN_KEEP_NEWEST_PER_PARENT).toBe(1);
    expect(REVISION_RETENTION_MAX_KEEP_NEWEST_PER_PARENT).toBe(500);
    for (const [family] of FAMILY_ENV_PREFIXES) {
      const policy = normalizeRevisionRetentionPolicy(family, undefined, CLEAN_ENV);
      expect(Object.isFrozen(policy)).toBe(true);
      expect(policy.family).toBe(family);
      expect(policy.enabled).toBe(true);
      expect(policy.dryRun).toBe(false);
      expect(policy.maxAgeDays).toBe(180);
      expect(policy.keepNewestPerParent).toBe(50);
      // The batch shape is never family-owned: it is L01's parsed-once knobs.
      expect(policy.batchSize).toBe(500);
      expect(policy.maxBatchesPerRun).toBe(10);
      expect(policy.now).toBeInstanceOf(Date);
    }
  });

  test("family identity is rejected before any knob is read", () => {
    for (const stranger of ["access_logs", "Page", "", "revision", undefined, 7]) {
      expect(
        policyReason(() =>
          normalizeRevisionRetentionPolicy(stranger as RevisionFamily, undefined, CLEAN_ENV)
        )
      ).toBe("family_unknown");
    }
  });

  // `field|min|max|reason`: the closed typed edges and the no-clamp rejections.
  const TYPED_BOUNDS = [
    `maxAgeDays|${REVISION_RETENTION_MIN_MAX_AGE_DAYS}|${REVISION_RETENTION_MAX_MAX_AGE_DAYS}|policy_age_invalid`,
    `keepNewestPerParent|${REVISION_RETENTION_MIN_KEEP_NEWEST_PER_PARENT}|${REVISION_RETENTION_MAX_KEEP_NEWEST_PER_PARENT}|policy_keep_newest_invalid`,
    `batchSize|${RETENTION_BATCH_SIZE_MIN}|${RETENTION_BATCH_SIZE_MAX}|policy_batch_size_invalid`,
    `maxBatchesPerRun|${RETENTION_MAX_BATCHES_PER_RUN_MIN}|${RETENTION_MAX_BATCHES_PER_RUN_MAX}|policy_max_batches_invalid`,
  ].map((row) => {
    const [field, minimum, maximum, reason] = row.split("|");
    return { field, minimum: Number(minimum), maximum: Number(maximum), reason };
  });

  test.each(TYPED_BOUNDS)("$field accepts its closed edges and rejects outside them", (row) => {
    const { field, minimum, maximum, reason } = row;
    for (const edge of [minimum, maximum]) {
      const policy = normalizeRevisionRetentionPolicy("page", { [field]: edge }, CLEAN_ENV);
      expect((policy as unknown as Record<string, unknown>)[field]).toBe(edge);
    }
    for (const outside of [minimum - 1, maximum + 1, 1.5, Number.NaN]) {
      expect(
        policyReason(() =>
          normalizeRevisionRetentionPolicy("page", { [field]: outside }, CLEAN_ENV)
        )
      ).toBe(reason);
    }
  });

  test("an empty family integer falls back while an empty family boolean rejects", () => {
    const fallback = normalizeRevisionRetentionPolicy("page", undefined, {
      RETENTION_PAGE_REVISIONS_MAX_AGE_DAYS: "",
      RETENTION_PAGE_REVISIONS_KEEP_NEWEST_PER_PARENT: "",
    });
    expect(fallback.maxAgeDays).toBe(180);
    expect(fallback.keepNewestPerParent).toBe(50);
    const POST = "RETENTION_POST_REVISIONS_";
    const postReason = (key: string, value: string): string =>
      policyReason(() =>
        normalizeRevisionRetentionPolicy("post", undefined, { [`${POST}${key}`]: value })
      );
    expect(postReason("MAX_AGE_DAYS", "01")).toBe("family_age_invalid");
    expect(postReason("KEEP_NEWEST_PER_PARENT", "01")).toBe("family_keep_newest_invalid");
    expect(postReason("ENABLED", "")).toBe("family_enabled_invalid");
  });

  test("all five prefixes accept exactly the three documented keys", () => {
    for (const [family, prefix] of FAMILY_ENV_PREFIXES) {
      const policy = normalizeRevisionRetentionPolicy(family, undefined, {
        [`${prefix}ENABLED`]: "false",
        [`${prefix}MAX_AGE_DAYS`]: "90",
        [`${prefix}KEEP_NEWEST_PER_PARENT`]: "7",
      });
      expect(policy.family).toBe(family);
      expect(policy.enabled).toBe(false);
      expect(policy.maxAgeDays).toBe(90);
      expect(policy.keepNewestPerParent).toBe(7);
      // The global dry-run knob stays global; no family key can reach it.
      expect(
        normalizeRevisionRetentionPolicy(family, undefined, { [`${prefix}ENABLED`]: "true" }).dryRun
      ).toBe(false);
    }
  });

  // `family|key|value|reason`: the strict env grammar, never coerced, no clamp.
  const ENV_GRAMMAR_REJECTIONS = [
    "entry|ENABLED|TRUE|family_enabled_invalid",
    "entry|ENABLED|1|family_enabled_invalid",
    "entry|ENABLED|False|family_enabled_invalid",
    "widget_template|MAX_AGE_DAYS|29|family_age_invalid",
    "widget_template|MAX_AGE_DAYS|2556|family_age_invalid",
    "widget_template|MAX_AGE_DAYS|01|family_age_invalid",
    "widget_template|MAX_AGE_DAYS|1.0|family_age_invalid",
    "widget_template|MAX_AGE_DAYS| 30|family_age_invalid",
    "widget_template|MAX_AGE_DAYS|30 |family_age_invalid",
    "widget_template|MAX_AGE_DAYS|abc|family_age_invalid",
    "widget_template|MAX_AGE_DAYS|1e2|family_age_invalid",
    "detail_page|KEEP_NEWEST_PER_PARENT|0|family_keep_newest_invalid",
    "detail_page|KEEP_NEWEST_PER_PARENT|501|family_keep_newest_invalid",
    "detail_page|KEEP_NEWEST_PER_PARENT|007|family_keep_newest_invalid",
    "detail_page|KEEP_NEWEST_PER_PARENT|fifty|family_keep_newest_invalid",
  ].map((row) => {
    const [family, key, value, reason] = row.split("|");
    const prefix = FAMILY_ENV_PREFIXES.find(([name]) => name === family)![1];
    const label = `${family} ${key}=${JSON.stringify(value)}`;
    return { label, family: family as RevisionFamily, prefix, key, value, reason };
  });

  test.each(ENV_GRAMMAR_REJECTIONS)("$label rejects with $reason", (row) => {
    expect(
      policyReason(() =>
        normalizeRevisionRetentionPolicy(row.family, undefined, {
          [`${row.prefix}${row.key}`]: row.value,
        })
      )
    ).toBe(row.reason);
  });

  test("the strict sweep fails closed on every unknown suffix under every prefix", () => {
    for (const [family, prefix] of FAMILY_ENV_PREFIXES) {
      for (const suffix of ["DRY_RUN", "BATCH_SIZE", "MAX_BATCHES_PER_RUN", "MAX_AGE", ""]) {
        // The rejection is value-independent: presence alone fails.
        expect(
          policyReason(() =>
            normalizeRevisionRetentionPolicy(family, undefined, { [`${prefix}${suffix}`]: "" })
          )
        ).toBe("unsupported_retention_env_key");
      }
    }
  });

  test("a foreign family's junk key never poisons another family", () => {
    const policy = normalizeRevisionRetentionPolicy("page", undefined, {
      RETENTION_POST_REVISIONS_DRY_RUN: "true",
      RETENTION_WIDGET_TEMPLATE_REVISIONS_BATCH_SIZE: "500",
      RETENTION_DRY_RUN: "true",
    });
    // Only the supported global key crossed over: the family dry-run is the
    // global one, so the leaf stays observable here.
    expect(policy.dryRun).toBe(true);
    expect(policy.enabled).toBe(true);
  });

  test("typed input wins over the environment, but a set-and-invalid knob still rejects", () => {
    const PAGE = "RETENTION_PAGE_REVISIONS_";
    const pageWith = (input: RevisionRetentionPolicyInput, env: RuntimeEnv) =>
      normalizeRevisionRetentionPolicy("page", input, env);
    // Typed values win without muting the parse: the family env is read first.
    expect(
      pageWith(
        { maxAgeDays: 90, keepNewestPerParent: 5 },
        { [`${PAGE}MAX_AGE_DAYS`]: "30", [`${PAGE}KEEP_NEWEST_PER_PARENT`]: "1" }
      )
    ).toMatchObject({ maxAgeDays: 90, keepNewestPerParent: 5 });
    expect(policyReason(() => pageWith({ maxAgeDays: 90 }, { [`${PAGE}MAX_AGE_DAYS`]: "0" }))).toBe(
      "family_age_invalid"
    );
    // The typed dry-run beats the global key both ways; no family key exists.
    const postDry = (dryRun: boolean | undefined, envValue: string): boolean =>
      normalizeRevisionRetentionPolicy("post", dryRun === undefined ? undefined : { dryRun }, {
        [RETENTION_DRY_RUN_ENV]: envValue,
      }).dryRun;
    expect(postDry(false, "true")).toBe(false);
    expect(postDry(true, "false")).toBe(true);
    expect(postDry(undefined, "true")).toBe(true);
  });

  test("a normalized policy round-trips exactly and cannot change family", () => {
    const normalized = normalizeRevisionRetentionPolicy(
      "post",
      { now: RETENTION_CLOCK },
      CLEAN_ENV
    );
    const roundTrip = normalizeRevisionRetentionPolicy("post", normalized, CLEAN_ENV);
    expect(JSON.stringify(roundTrip)).toBe(JSON.stringify(normalized));
    // A family tag inside the input can never redirect the pass.
    expect(
      policyReason(() => normalizeRevisionRetentionPolicy("page", normalized, CLEAN_ENV))
    ).toBe("family_unknown");
    const pageReason = (input: RevisionRetentionPolicyInput): string =>
      policyReason(() => normalizeRevisionRetentionPolicy("page", input, CLEAN_ENV));
    expect(pageReason({ unknownField: true } as unknown as RevisionRetentionPolicyInput)).toBe(
      "policy_input_invalid"
    );
    expect(pageReason({ now: new Date("nope") })).toBe("policy_now_invalid");
    expect(pageReason({ enabled: "true" as unknown as boolean })).toBe("policy_enabled_invalid");
  });

  test("a disabled family resolves a frozen zero-work ledger without touching SQL", async () => {
    const { executor, touches } = zeroSqlExecutor();
    await expectRun("entry", DISABLED_INPUT, [false, false, 0, 0, 0], CLEAN_ENV, executor);
    expect(touches()).toBe(0);
    // Disablement never mutes the strict sweep: a junk family key still rejects.
    expect(
      policyReason(() =>
        normalizeRevisionRetentionPolicy(
          "entry",
          { enabled: false },
          {
            RETENTION_ENTRY_REVISIONS_DRY_RUN: "false",
          }
        )
      )
    ).toBe("unsupported_retention_env_key");
  });

  test("dry-run executes exactly one LIMIT-bounded read with no row lock", async () => {
    const candidates = [{ id: "candidate-1" }, { id: "candidate-2" }, { id: "candidate-3" }];
    const spy = spyExecutor([candidates]);
    await expectRun(
      "page",
      policyInput({ dryRun: true, keepNewestPerParent: 4, batchSize: 500 }),
      [true, true, 1, 3, 0],
      CLEAN_ENV,
      spy.executor
    );
    expect([spy.reads, spy.deletes, spy.locks]).toEqual([1, 0, 0]);
    expect(spy.limits).toEqual([500]);
    expect(spy.statements).toHaveLength(1);
    const statement = spy.statements[0] ?? "";
    expect(/for update/i.test(statement)).toBe(false);
    // The whole-family drain order is the retention-index order.
    expect(statement).toContain('"page_revisions"."created_at" asc');
    expect(statement).toContain('"page_revisions"."id" asc');
    expect(statement.indexOf('"page_revisions"."created_at" asc')).toBeLessThan(
      statement.indexOf('"page_revisions"."id" asc')
    );
    // The keep-newest floor is an in-SQL probe: keepNewest travels as both the
    // probe LIMIT and the compared count, never into JS arithmetic.
    expect(statement).toContain("newer_rows");
    expect(spy.bound.filter((param) => param === 4)).toHaveLength(2);
    // The page family carries the published anchor probe.
    expect(statement).toContain('"page_revisions"."kind" = \'publish\'');
    expect(statement).toContain("not exists");
  });

  test("apply batches lock SKIP LOCKED and count deletes by returning length", async () => {
    const spy = spyExecutor([[{ id: "old-1" }, { id: "old-2" }], []]);
    await expectRun(
      "page",
      policyInput({ keepNewestPerParent: 4 }),
      [true, false, 2, 2, 2],
      CLEAN_ENV,
      spy.executor
    );
    expect([spy.reads, spy.deletes, spy.locks]).toEqual([2, 1, 2]);
    expect(spy.limits).toEqual([2, 2]);
    expect(spy.deletedIds).toEqual(["old-1", "old-2"]);
    for (const statement of spy.statements) {
      expect(statement).toContain("for update skip locked");
    }
    // The driver-accurate count came from the row-list length: the poisoned
    // `count` field was never read.
    expect((rowList(["x"], 999) as unknown as { count: number }).count).toBe(999);
  });

  test("the drain stops on an empty batch, a zero-delete batch and the budget", async () => {
    // Budget of one: the second candidate batch is never read.
    const budgeted = spyExecutor([
      [{ id: "a" }, { id: "b" }],
      [{ id: "c" }, { id: "d" }],
    ]);
    await expectRun(
      "page",
      policyInput({ keepNewestPerParent: 4, maxBatchesPerRun: 1 }),
      [true, false, 1, 2, 2],
      CLEAN_ENV,
      budgeted.executor
    );
    expect(budgeted.reads).toBe(1);
    // A batch that deletes nothing (candidates locked away elsewhere) stops the
    // drain instead of spinning on the same candidates forever.
    const lockedAway = spyExecutor([[{ id: "a" }, { id: "b" }]], []);
    await expectRun(
      "detail_page",
      policyInput({ keepNewestPerParent: 4 }),
      [true, false, 1, 2, 0],
      CLEAN_ENV,
      lockedAway.executor
    );
    expect([lockedAway.deletes, lockedAway.reads]).toEqual([1, 1]);
  });

  test("the per-parent prune drains in the contract version order and fails closed on ids", async () => {
    const spy = spyExecutor([[{ id: "old-1" }]]);
    const result = await pruneParentRevisions(
      spy.executor,
      "page",
      "11111111-2222-4333-8444-555555555555",
      normalizeRevisionRetentionPolicy("page", { dryRun: true, now: RETENTION_CLOCK }, CLEAN_ENV)
    );
    expect(result).toEqual({ matched: 1, deleted: 0 });
    expect([spy.reads, spy.locks]).toEqual([1, 0]);
    const statement = spy.statements[0] ?? "";
    // The per-parent drain order is the per-parent version index order, scoped
    // to exactly the one parent.
    expect(statement).toContain('"page_revisions"."page_id" =');
    expect(statement).toContain('"page_revisions"."version" asc');
    expect(statement).toContain('"page_revisions"."id" asc');
    expect(statement.indexOf('"page_revisions"."version" asc')).toBeLessThan(
      statement.indexOf('"page_revisions"."id" asc')
    );
    expect(/for update/i.test(statement)).toBe(false);
    // A malformed parent id fails closed before any statement runs.
    const untouched = spyExecutor([[]]);
    expect(
      await rejectionReason(() =>
        pruneParentRevisions(
          untouched.executor,
          "page",
          "not-a-uuid",
          normalizeRevisionRetentionPolicy("page", { now: RETENTION_CLOCK }, CLEAN_ENV)
        )
      )
    ).toBe("parent_id_invalid");
    expect([untouched.reads, untouched.deletes]).toEqual([0, 0]);
  });

  test("pins the family->table map and the kind-bearing anchor probes", async () => {
    const MAPPING = [
      ["page", pageRevisions, "page_id", true],
      ["widget_template", widgetTemplateRevisions, "template_id", false],
      ["detail_page", detailPageRevisions, "detail_page_id", true],
      ["entry", contentRevisions, "entry_id", false],
      ["post", postRevisions, "post_id", false],
    ] as const;
    for (const [family, table, parentColumn, kindBearing] of MAPPING) {
      const name = getTableName(table);
      const spy = spyExecutor([[]]);
      await runFamily(
        family,
        policyInput({ dryRun: true, keepNewestPerParent: 1 }),
        CLEAN_ENV,
        spy.executor
      );
      const statement = spy.statements[0] ?? "";
      expect(statement).toContain(`from "${name}"`);
      expect(statement).toContain(parentColumn);
      for (const [, other] of MAPPING) {
        if (other !== table) expect(statement).not.toContain(`from "${getTableName(other)}"`);
      }
      // Only the page/detail_page tables carry the published anchor probe.
      expect(statement.includes("= 'publish'")).toBe(kindBearing);
      expect(statement.includes("not exists")).toBe(kindBearing);
    }
  });

  test("consumes the 01-L02 frozen 2036 clock and retains the boundary row", () => {
    expect(TASK551_RETENTION_CLOCK_MS).toBe(Date.parse("2036-01-01T00:00:00.000Z"));
    expect(RETENTION_CLOCK.toISOString()).toBe("2036-01-01T00:00:00.000Z");
    expect(retentionTs(0).getTime()).toBe(TASK551_RETENTION_CLOCK_MS - 1);
    expect(retentionTs(60).getTime()).toBe(TASK551_RETENTION_CLOCK_MS);
    expect(retentionTs(80).getTime()).toBe(TASK551_RETENTION_CLOCK_MS + 1);
    expect(CUTOFF_180.toISOString()).toBe("2035-07-05T00:00:00.000Z");
    expect(computeRetentionCutoff(RETENTION_CLOCK, 30).toISOString()).toBe(
      "2035-12-02T00:00:00.000Z"
    );
    expect(computeRetentionCutoff(RETENTION_CLOCK, 2_555).toISOString()).toBe(
      "2029-01-02T00:00:00.000Z"
    );
    // `column < now - age`: the row exactly at the cutoff is never eligible.
    expect(isEligibleForRetentionCutoff(CUTOFF_180, CUTOFF_180)).toBe(false);
    expect(isEligibleForRetentionCutoff(new Date(CUTOFF_180.getTime() - 1), CUTOFF_180)).toBe(true);
    expect(aroundCutoff(0).getTime()).toBe(CUTOFF_180.getTime());
  });
});

// --- Real-database register: page/post families over the 05-L01 tables ------

/** One seeded page revision row: [version, kind, offset in days from cutoff]. */
type RevisionSeed = readonly [version: number, kind: "publish" | "autosave", offsetDays: number];

const seedPageRevisions = async (pageId: string, seeds: readonly RevisionSeed[]): Promise<void> => {
  await db.insert(pageRevisions).values(
    seeds.map(([version, kind, offsetDays]) => ({
      pageId,
      version,
      kind,
      data: {},
      createdAt: aroundCutoff(offsetDays),
    }))
  );
};

const seedPostRevisions = async (postId: string, versions: readonly number[]): Promise<void> => {
  await db
    .insert(postRevisions)
    .values(
      versions.map((version) => ({ postId, version, data: {}, createdAt: aroundCutoff(-1) }))
    );
};

/** Marker-scoped survivors of one page, as deterministic `version:kind` tags. */
const pageSurvivors = async (pageId: string): Promise<string[]> => {
  const rows = await db
    .select({ version: pageRevisions.version, kind: pageRevisions.kind })
    .from(pageRevisions)
    .where(eq(pageRevisions.pageId, pageId))
    .orderBy(asc(pageRevisions.version));
  return rows.map((row) => `${row.version}:${row.kind}`);
};

const postSurvivors = async (postId: string): Promise<number[]> => {
  const rows = await db
    .select({ version: postRevisions.version })
    .from(postRevisions)
    .where(eq(postRevisions.postId, postId))
    .orderBy(asc(postRevisions.version));
  return rows.map((row) => row.version);
};

const createParent = async (table: typeof pages | typeof posts, slug: string): Promise<string> => {
  const base = { slug: marked(slug), title: marked(`${slug}-title`) };
  const values = table === pages ? { ...base, currentData: {} } : base;
  const inserted = await db
    .insert(table)
    .values(values as never)
    .returning({ id: pages.id });
  return inserted[0]!.id;
};

/** Transaction-scoped per-parent prune, asserted against the exact shape. */
const expectPrune = async (
  family: RevisionFamily,
  parentId: string,
  policy: ReturnType<typeof dbPolicy>,
  matched: number,
  deleted: number
): Promise<void> => {
  const result = await db.transaction((tx) => pruneParentRevisions(tx, family, parentId, policy));
  expect(result).toEqual({ matched, deleted });
};

describe("revision retention on the owner-injected fixture database", () => {
  testIfDb("page family: bounded batches converge on floor, anchor and boundary row", async () => {
    const pageId = await createParent(pages, "convergence");
    // Eight revisions: the newest two are the keep-newest floor, v6 sits
    // exactly on the cutoff, v2 is the newest publish (old, anchored), and
    // v1/v3/v4/v5 are aged history eligible for the drain.
    await seedPageRevisions(pageId, [
      [1, "autosave", -6],
      [2, "publish", -5],
      [3, "autosave", -4],
      [4, "autosave", -3],
      [5, "autosave", -2],
      [6, "autosave", 0],
      [7, "autosave", 1],
      [8, "autosave", 2],
    ]);
    expect(await pageSurvivors(pageId)).toHaveLength(8);
    // Read-only guard: this fixture's candidate set is the only eligible set
    // in the table, so a polluted shared table fails here before any delete.
    await expectRun("page", policyInput({ dryRun: true, batchSize: 500 }), [true, true, 1, 4, 0]);
    // Apply at batchSize 2: v1+v3, then v4+v5, then an empty batch stops it.
    const drainedOutcome: LedgerOutcome = [true, false, 3, 4, 4];
    const drained = await expectRun(
      "page",
      policyInput({ keepNewestPerParent: 2 }),
      drainedOutcome
    );
    expect(drained.batches).toBeLessThanOrEqual(10);
    const survivors = ["2:publish", "6:autosave", "7:autosave", "8:autosave"];
    expect(await pageSurvivors(pageId)).toEqual(survivors);
    // A completed rerun matches nothing: convergence is idempotent.
    await expectRun("page", policyInput({ keepNewestPerParent: 2 }), [true, false, 1, 0, 0]);
    expect(await pageSurvivors(pageId)).toEqual(survivors);
  });

  testIfDb("page family dry-run: exact match count, zero deletes, rows untouched", async () => {
    const pageId = await createParent(pages, "dry-run");
    // v1..v3 are aged and floored out; v4 sits on the cutoff and v5 is recent.
    await seedPageRevisions(pageId, [
      [1, "autosave", -3],
      [2, "autosave", -2],
      [3, "autosave", -1],
      [4, "autosave", 0],
      [5, "autosave", 1],
    ]);
    // Typed dry-run: exactly one bounded read, nothing deleted.
    await expectRun("page", policyInput({ dryRun: true, batchSize: 500 }), [true, true, 1, 3, 0]);
    expect(await pageSurvivors(pageId)).toHaveLength(5);
    // L01's global RETENTION_DRY_RUN drives the same read with no typed flag.
    await expectRun(
      "page",
      { maxAgeDays: 180, keepNewestPerParent: 2, batchSize: 500, now: RETENTION_CLOCK },
      [true, true, 1, 3, 0],
      { [RETENTION_DRY_RUN_ENV]: "true" }
    );
    expect((await pageSurvivors(pageId)).join()).toBe(
      "1:autosave,2:autosave,3:autosave,4:autosave,5:autosave"
    );
  });

  testIfDb("per-parent prune: only the scoped parent's eligible rows die", async () => {
    const inScope = await createParent(pages, "prune-in-scope");
    const outOfScope = await createParent(pages, "prune-out-of-scope");
    const seeds: readonly RevisionSeed[] = [
      [1, "autosave", -3],
      [2, "autosave", -2],
      [3, "autosave", -1],
    ];
    await seedPageRevisions(inScope, seeds);
    await seedPageRevisions(outOfScope, seeds);
    const dryRunPolicy = dbPolicy("page", { dryRun: true, keepNewestPerParent: 1, batchSize: 500 });
    const applyPolicy = dbPolicy("page", { keepNewestPerParent: 1, batchSize: 500 });
    // Dry-run inside the transaction: matched only, deleted 0.
    await expectPrune("page", inScope, dryRunPolicy, 2, 0);
    expect(await pageSurvivors(inScope)).toHaveLength(3);
    expect(await pageSurvivors(outOfScope)).toHaveLength(3);
    // The apply drains the scoped parent oldest-first down to its floor.
    await expectPrune("page", inScope, applyPolicy, 2, 2);
    expect(await pageSurvivors(inScope)).toEqual(["3:autosave"]);
    // The other parent is out of scope by construction and untouched.
    expect((await pageSurvivors(outOfScope)).join()).toBe("1:autosave,2:autosave,3:autosave");
    // A malformed parent id fails closed before any statement runs.
    expect(
      await rejectionReason(() =>
        db.transaction((tx) => pruneParentRevisions(tx, "page", "not-a-uuid", applyPolicy))
      )
    ).toBe("parent_id_invalid");
    expect(await pageSurvivors(inScope)).toEqual(["3:autosave"]);
    expect(await pageSurvivors(outOfScope)).toHaveLength(3);
  });

  testIfDb("anchors: the newest publish survives old, the floor keeps the newest row", async () => {
    const anchored = await createParent(pages, "anchor");
    // v1 is the newest publish and old: the anchor keeps it while the aged
    // autosave below it drains and the floor keeps v3.
    await seedPageRevisions(anchored, [
      [1, "publish", -10],
      [2, "autosave", -9],
      [3, "autosave", -8],
      [4, "autosave", 1],
    ]);
    await expectPrune("page", anchored, dbPolicy("page", { keepNewestPerParent: 2 }), 1, 1);
    expect(await pageSurvivors(anchored)).toEqual(["1:publish", "3:autosave", "4:autosave"]);

    const floored = await createParent(pages, "floor-one");
    // Every row is older than the cutoff: keep-newest 1 still keeps exactly the
    // newest row, because eligibility needs age AND floor.
    await seedPageRevisions(floored, [
      [1, "autosave", -5],
      [2, "autosave", -4],
      [3, "autosave", -3],
      [4, "autosave", -2],
      [5, "autosave", -1],
    ]);
    await expectPrune("page", floored, dbPolicy("page", { keepNewestPerParent: 1 }), 4, 4);
    expect(await pageSurvivors(floored)).toEqual(["5:autosave"]);
  });

  testIfDb("post family: the env enablement switch gates the whole family", async () => {
    const gated = await createParent(posts, "env-disabled");
    const floored = await createParent(posts, "env-floor");
    await seedPostRevisions(gated, [1, 2]);
    await seedPostRevisions(floored, [1]);
    const familyEnv = (enabled: "true" | "false"): RuntimeEnv => ({
      RETENTION_POST_REVISIONS_ENABLED: enabled,
    });
    const typed = { maxAgeDays: 180, keepNewestPerParent: 1, batchSize: 500, now: RETENTION_CLOCK };

    // Disabled through the family env key: zero work, zero SQL, rows intact.
    await expectRun("post", typed, [false, false, 0, 0, 0], familyEnv("false"));
    expect(await postSurvivors(gated)).toEqual([1, 2]);
    expect(await postSurvivors(floored)).toEqual([1]);

    // Enabled again, but dry: the same global drain reads its exact candidate.
    await expectRun("post", { ...typed, dryRun: true }, [true, true, 1, 1, 0], familyEnv("true"));
    expect(await postSurvivors(gated)).toEqual([1, 2]);
    expect(await postSurvivors(floored)).toEqual([1]);

    // The enabled apply reaches the post table through the same contract.
    await expectPrune("post", gated, dbPolicy("post", { keepNewestPerParent: 1 }), 1, 1);
    expect(await postSurvivors(gated)).toEqual([2]);
    expect(await postSurvivors(floored)).toEqual([1]);

    // A disabled rerun after convergence still performs zero work.
    await expectRun("post", typed, [false, false, 0, 0, 0], familyEnv("false"));
    expect(await postSurvivors(gated)).toEqual([2]);
  });

  testIfDb("widget/entry disabled ledgers resolve zero work on the live client", async () => {
    // The legacy-table and TASK-551-09 families are contract-pinned here
    // without seeding their parents: enablement stays env-gated and a disabled
    // ledger performs zero work end to end.
    for (const family of ["widget_template", "entry"] as const) {
      await expectRun(family, DISABLED_INPUT, [false, false, 0, 0, 0]);
    }
  });

  afterAll(async () => {
    if (!OWNER_DB_TEST_MAP_PRESENT) return;
    // Fixture-scoped cleanup only: marker parent deletes whose cascades own the
    // seeded revisions. No truncate, no global sweep.
    await db.delete(pages).where(like(pages.slug, `${RUN}-%`));
    await db.delete(posts).where(like(posts.slug, `${RUN}-%`));
  });
});
