# TASK-551-05-L02: Sanitized EXPLAIN Plan and Constraint Verification
# FileName: TASK-551-05-L02-Sanitized-Explain-Plan-And-Constraint-Verification.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-05
**Priority:** Critical
**Category:** Database / Performance / Test Integrity
**Estimated Effort:** Large
**Dependencies:** TASK-551-01-L02 (read-only fixture target, canonical static
registry/digests, and reviewed freeze receipt); TASK-551-05-L01; TASK-551-05-L03
(parent land order L01 → L03 → L02; this leaf verifies the L03-defined authority
surfaces after L01 lands them)
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Create reproducible small/large EXPLAIN evidence for every L01 index/constraint.
It consumes, but never creates or reruns, L01's redacted concurrency receipt;
evidence is sanitized before persistence, uses synthetic fixtures, compares plans
and rows rather than brittle total-cost strings, and fails on a hot-query regression.

## Sub-Tasks

None; this is an executable leaf.

## File Ownership

**Allowlist:** `scripts/task-551-explain-plans.ts`,
`tests/perf/fixtures/task551QueryPlanContracts.ts`,
`tests/perf/database-explain-plans.test.ts`, and
`tests/perf/task489-solution-kit-run-predecessor-plans.test.ts` only.

**Sole generated output:** `.tmp/task-551/task489-predecessor-v1.json` only.
It is ephemeral, local generated evidence, not a source file, shared contract,
or workflow sidecar. `tests/perf/task489-solution-kit-run-predecessor-plans.test.ts`
is its sole writer: it may create exactly one canonical file at that fixed path,
rejects a duplicate writer/file, and never writes another output path.
Only after all four L11-dispatched 05-L02 child results pass its transient
all-four post-cleanup-target-proof gate may TASK-551-11 read that temporary file:
it validates the original bytes through the L02 parser, hashes those exact bytes,
and promotes the unchanged bytes to
`_docs/_workflows/_smoke/task-551/audit-evidence/task489-predecessor-v1.json`.
L05 never writes durable evidence, and L10/TASK-489 never read the temporary
path; they consume only L11's durable bytes/hash through the same L02 parser.

**Handoff data flow:** L05 writes and verifies the one temporary artifact → four
05-L02 child results carry their post-cleanup proofs → L11's transient all-four
gate immediately precedes its temporary read/parser/hash/promotion → L11 writes identical bytes to the one
durable audit-evidence path → L10/TASK-489 consume only that durable bytes/hash
handoff through the L02 parser.

**Forbidden:** all production/schema/migration files; L01 tests; TASK-493,
TASK-511, TASK-517, TASK-518 paths; cache, task/changelog/workflow files.

## Implementation Pseudocode

```ts
type PlanContract = StrictReadonly<{
  inventoryId: string;
  statementFamily: string;
  statement: StaticPlanStatement; // compile-time registry member; never CLI SQL
  syntheticBinds: readonly SafeScalar[];
  projectionKeys: readonly string[];
  predicateShape: string;
  orderShape: string;
  resultBound: 1 | 51 | 101 | 102;
  budgetId: string;
  cases: readonly PlanCase[];
  expectedIndex?: string;
  forbiddenLargeNodes: readonly string[];
}>;

type NumericPlanReceipt = StrictReadonly<{
  rowsRead: number; rowsReturned: number;
  sharedHitBuffers: number; sharedReadBuffers: number;
  normalizedP95Ms: number; planSha256: string;
}>;

type PlanScaleReceipt = StrictReadonly<{
  small: NumericPlanReceipt;
  large: NumericPlanReceipt;
}>;

// This is the test-side import from the sole L02 owner. L05 declares no
// companion receipt/map shape, case tuple, fixture-count literal, serializer,
// or parser of its own.
import {
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS,
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS,
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES,
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_RECEIPT_SCHEMA,
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS,
  createTask489PredecessorReceiptV1,
  parseTask489PredecessorReceiptV1,
  serializeTask489PredecessorReceiptV1,
  type Task489PredecessorFixtureCountsV1,
  type Task489PredecessorLogicalCaseV1,
  type Task489PredecessorReceiptV1,
  type Task489PredecessorStatementReceiptV1,
} from "./fixtures/task489SolutionKitRunPredecessor";

// From tests/perf/*, this is the sole import-safe target guard. L05 imports no
// runner, wrapper, local target parser/proof, dotenv helper, or generic URL
// fallback.
import {
  assertTask551FixtureTarget,
  assertTask551FixtureTargetChildKeys,
  assertTask551FixtureTargetPostCleanup,
  parseTask551FixtureTarget,
  type Task551FixtureTarget,
  type Task551FixtureTargetClient,
} from "../../scripts/task551DatabaseBaseline/fixtureTarget";

type TrigramSelectionReceipt = StrictReadonly<Record<
  "pages" | "entries" | "posts" | "media" | "users",
  null | { column: "search_trigram_text"; index: string; opclass: "gin_trgm_ops";
    normalizationDigest: string; largePlanPassed: true; writeCostPassed: true }
>>;

const EXPECTED_TASK551_CATALOG = strictReadonly({
  // Copy the complete literal L01 mandatory index/constraint/check names and
  // definitions; append only the selected (non-null) trigram column/index pairs.
  // Preserved revision members (content_revisions_entry_version_idx,
  // post_revisions_post_version_idx,
  // detail_page_revisions_detail_page_version_idx) are asserted as committed
  // pre-task objects, never manifest builds; only the two new page/widget
  // revision unique indexes are built by the revision-integrity group.
  indexes: EXACT_L01_INDEX_ROWS,
  constraints: EXACT_L01_CONSTRAINT_ROWS,
  outboxColumns: EXACT_L01_OUTBOX_COLUMNS,
  migrationOperationColumns: EXACT_L01_MIGRATION_OPERATION_COLUMNS,
  solutionKitRollbackAuthority: EXACT_L01_SOLUTION_KIT_ROLLBACK_AUTHORITY,
  vectorExpressions: SEARCH_VECTOR_SQL,
  immutableProcSignatures: GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES,
  bookingExclusion: BOOKING_RESERVATION_EXCLUSION_SQL,
  onlineIndexManifest: EXACT_L01_ONLINE_INDEX_MANIFEST,
});

async function assertExactTask551Catalog(db: Db, expected = EXPECTED_TASK551_CATALOG) {
  const actual = await readPgCatalogDefinitions(db, expected.ownedTables);
  assertExactSet(actual.task551Indexes, expected.indexes);
  assertExactSet(actual.task551Constraints, expected.constraints);
  assertExactOrderedColumnsAndPredicates(actual, expected);
  assertExactOutboxColumnsDefaultsNullabilityAndChecks(actual, expected);
  assertExactMigrationOperationColumnsAndChecks(actual, expected);
  assertExactSolutionKitRollbackAuthority(actual, expected.solutionKitRollbackAuthority);
  assertExactGeneratedExpressions(actual, expected.vectorExpressions);
  await assertGeneratedExpressionVolatility(db, expected.immutableProcSignatures);
  await assertBookingExclusionCustomSeam(db, expected.bookingExclusion);
  await assertOnlineIndexManifestParity(db, expected.onlineIndexManifest);
  assertNoUnexpectedTask551Object(actual, expected);
}

`EXACT_L01_SOLUTION_KIT_ROLLBACK_AUTHORITY` includes every column type/default/
nullability, FK target/action, and the full SQL definitions of
`solution_kit_starter_apply_owners_state_chk`,
`solution_kit_legacy_template_evidence_state_chk`, and
`solution_kit_legacy_progress_state_chk`. The verifier rejects a nullable owner
package/actor, omitted grammar/state arm, weakened event/digest bound, or any
extra authority constraint just as it rejects a missing named member.

async function assertGeneratedExpressionVolatility(db: Db, signatures: readonly string[]) {
  // Resolve every exact to_regprocedure signature and each ->>, text/tsvector
  // ||, and jsonb::text implementation; require one pg_proc row whose
  // provolatile is exactly "i". Missing or differently resolved OIDs fail.
}

async function assertBookingExclusionCustomSeam(db: Db, expected: typeof BOOKING_RESERVATION_EXCLUSION_SQL) {
  // Descriptor is deeply frozen/exported; migration contains extensionSql and
  // addSql once; snapshot intentionally contains no fake exclusion object.
  // Live pg_constraint must be contype "x" with exact name, table, predicate,
  // GiST method, equality/overlap operators. Generated drift contains no dropSql.
}

async function captureSanitizedPlan(contract: PlanContract, db: Db): Promise<SafePlanEvidence> {
  const raw = await db.execute(sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${contract.statement}`);
  return sanitizePlan(raw, { removeSql: true, removeBinds: true, allowCatalogNames: true });
}

function requireL01ConcurrencyReceipt(receipt: Task551L05ConcurrencyReceiptV1): void {
  // Strict redacted receipt only: five revision families, booking, transferred authority
  // probe, counts/booleans/digest; no fixture/client/target/raw rows or new 05-L02 context.
}

async function withTask489PredecessorFixture<T>(
  profile: "small" | "large",
  fixtureTargetChildSource: Readonly<Record<string, unknown>>,
  targetProofClient: Task551FixtureTargetClient,
  run: (fixture: Task489DynamicFixture) => Promise<T>,
): Promise<T> {
  // Each exact L11 05-L02 broker context consumes once before source access and
  // creates only this fresh direct three-key fixtureValues submap. Its logical
  // argv begins exactly ["bun", "--env-file=/dev/null", …]; a separate exact-own
  // childEnv adds only closed OS keys and never inherits keys. This function never
  // receives a whole child/parent environment, reads process.env, or derives keys.
  const directChildValues = assertTask551FixtureTargetChildKeys(
    fixtureTargetChildSource,
  );
  const target = parseTask551FixtureTarget(directChildValues);
  // The imported preflight uses only this injected read-only client and rolls
  // its transaction back before L05 opens a seed, plan, inspection, VACUUM, or
  // cleanup connection. L05 has no runner or CLI/environment authority.
  await assertTask551FixtureTarget(target, targetProofClient);
  // Read the sole L02 static registry, canonical template/digests, and reviewed
  // freeze receipt. Reject a stale/unreviewed/digest-mismatched input; never
  // fork its registry, freeze, budgets, or target/sentinel provisioning.
  const fixture = buildMinimalTask489DynamicFixture(profile, target);
  let result!: T;
  let completed = false;
  let primaryFailure: Task551SafeFixtureFailure | undefined;
  let teardownFailures: readonly Task551SafeFixtureFailure[] = [];
  try {
    try {
      await seedTask489DynamicClosure(fixture);
      await assertTask489DynamicClosure(fixture);
      result = await run(fixture);
      completed = true;
    } catch (error) {
      primaryFailure = toSafeTask551FixtureFailure(error);
    }
  } finally {
    teardownFailures = await cleanupAndReproveTask489FixtureTarget(
      fixture,
      target,
      targetProofClient,
    );
  }
  if (primaryFailure || teardownFailures.length > 0) {
    throw createRedactedTask551FixtureFailure({ primaryFailure, teardownFailures });
  }
  assertStrictEqual(completed, true);
  return result;
}

async function cleanupAndReproveTask489FixtureTarget(
  fixture: Task489DynamicFixture,
  target: Task551FixtureTarget,
  targetProofClient: Task551FixtureTargetClient,
): Promise<readonly Task551SafeFixtureFailure[]> {
  const failures: Task551SafeFixtureFailure[] = [];
  try {
    try {
      await cleanupTask489DynamicClosureChildFirst(fixture);
    } catch (error) {
      failures.push(toSafeTask551FixtureFailure(error));
    } finally {
      // This zero-residue assertion runs even if child-first cleanup failed.
      try {
        await assertTask489DynamicClosureHasZeroResidue(fixture);
      } catch (error) {
        failures.push(toSafeTask551FixtureFailure(error));
      }
    }
  } finally {
    // This outer nested finally runs after every success, seed/assertion/run
    // failure, cleanup failure, or zero-residue failure. It performs a new
    // rolled-back proof against the already bound L02 fixture target—never a generic
    // URL—of current_database equality, exactly one marker, and exact sentinel
    // bytes. No target name, marker, sentinel, or raw database error is returned.
    try {
      await assertTask551FixtureTargetPostCleanup(target, targetProofClient);
    } catch (error) {
      failures.push(toSafeTask551FixtureFailure(error));
    }
  }
  return failures;
}

async function writeCanonicalTask489PredecessorArtifact(
  statementReceipts: readonly Task489PredecessorStatementReceiptV1[],
): Promise<Readonly<{ bytes: Uint8Array; receipt: Task489PredecessorReceiptV1 }>> {
  // Test setup may remove only this fixed, owned temporary path before dynamic
  // work begins, rejects a symlink/second matching artifact, and never accepts
  // a prior file as a receipt input. Both profiles and all cases must finish
  // first; the success path below is its only write.
  await prepareOnlyOwnedTask489PredecessorArtifactPath({
    path: ".tmp/task-551/task489-predecessor-v1.json",
  });
  // The imported L02 factory is the only place that constructs the top-level
  // array-shaped receipt. It rejects unknown fields and requires the exact
  // five companion IDs, fourteen ordered logical cases, fifteen ordered
  // statement entries, and [small, large] profile-result tuple per statement.
  const receipt = createTask489PredecessorReceiptV1(statementReceipts);
  const fixtureCounts: Task489PredecessorFixtureCountsV1 =
    TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS;
  const logicalCases: readonly Task489PredecessorLogicalCaseV1[] =
    TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES;
  assertStrictEqual(receipt.schema, TASK489_SOLUTION_KIT_RUN_PREDECESSOR_RECEIPT_SCHEMA);
  assertDeepStrictEqual(receipt.fixtureCounts, fixtureCounts);
  assertTupleBytesEqual(receipt.companionIds,
    TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.companionIds);
  assertTupleBytesEqual(receipt.logicalCases, logicalCases);
  assertExactStatementReceiptOrder(receipt.statementReceipts,
    TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS);
  assertExactTask489ReceiptCardinality(receipt, {
    companionIds: 5,
    logicalCases: 14,
    statementReceipts: 15,
    profileResults: 30,
    fixtureCounts,
  });

  // L02's serializer emits the single RFC 8785 canonical UTF-8 JSON document
  // followed by one LF. L05 never JSON.stringify's this data, creates a keyed
  // statement map, or substitutes a local schema/fixture-count representation.
  const bytes = serializeTask489PredecessorReceiptV1(receipt);
  const parsed = parseTask489PredecessorReceiptV1(bytes);
  assertBytesEqual(serializeTask489PredecessorReceiptV1(parsed), bytes);
  await writeOnlyTask489PredecessorArtifactOnce({
    path: ".tmp/task-551/task489-predecessor-v1.json",
    bytes,
    requireAbsentBeforeWrite: true,
    requireSingleFileAfterWrite: true,
  });
  assertBytesEqual(await readFile(".tmp/task-551/task489-predecessor-v1.json"), bytes);
  // This in-phase readback completes before L05 success. After the successful
  // all-four transient post-cleanup-proof gate, only L11 may re-read the
  // temporary file, parse/hash its original bytes, and promote them unchanged.
  return { bytes, receipt: parsed };
}
```

The post-cleanup proof is a required success condition, not a best-effort
teardown diagnostic. It runs in the nested `finally` after both successful and
failing dynamic work, carries only the already-bound target in private memory,
and proves in a rolled-back transaction that `current_database()` is the bound
fixture database, the bound marker count is exactly one, and its marker/sentinel
bytes exactly equal the bound sentinel. Cleanup/zero-residue/post-proof
failures are collected as fixed, machine-readable redacted failure codes and
propagated; none may be swallowed by an earlier seed/assertion/run failure.

Each of the four exact 05-L02 child results is L11's strict redacted
`Task55105L02ChildOutcomeV1`: expected table context/command, passed
`Task551CommandReceiptV1` (digest/context/bounded result/discovery only), and
`postCleanupTargetProof: { rolledBack:true, currentDatabaseMatched:true,
exactSingleMarkerMatched:true, boundSentinelByteMatched:true }`. Immediately
before temporary read/parser/hash/promotion, L11 validates all four table-order
outcomes and rejects a missing, false, unknown, malformed, duplicate, or extra outcome with
`task551_05_l02_post_cleanup_target_proof_invalid`. It then drops proofs/results:
they are not durable evidence, an eleven-row descriptor/value, row 10/11 field,
projection, log, or L10/TASK-489 input; no target/marker/sentinel/hash/URL/env/raw error leaks.

For all L05 fixture operations, the only target seam is the import-safe L02
module `scripts/task551DatabaseBaseline/fixtureTarget.ts`. Each direct three-key
map comes only from that operation's current exact L11 `05-l02` broker context,
not an L03/L02 map, source, environment, or launch. The dynamic test passes it to
`assertTask551FixtureTargetChildKeys` and `parseTask551FixtureTarget`, then
passes its own injected `Task551FixtureTargetClient` to
`assertTask551FixtureTarget` before mutation and
`assertTask551FixtureTargetPostCleanup` after cleanup. It must not import
`scripts/task-551-database-baseline.ts`, a runner wrapper, `db/client`, a
driver/environment/dotenv adapter, or a second target parser/proof/type; it has
no generic URL, parent-environment, or fallback path.

`StaticPlanStatement` is a closed discriminated union exported by the fixture
registry; CLI input selects only its stable ID and cannot supply SQL text. The
script supports `--scale small|large --check`, permits only that static
statement registry, and refuses arbitrary SQL/paths. Plan comparison tolerates
planner-node differences on small data but requires expected indexes and bounded
row ratios on large fixtures. Errors are `plan_contract_invalid`,
`plan_regression`, and `constraint_contract_failed`.

The closed registry has exactly **37 IDs**, **38 named cases**, and **76 numeric
scale receipts** (one small and one large per case). Thirty-two IDs are the
future TASK-551-03-L02 statements below. Their `StaticPlanStatement` builders
are imported read-only from L01-L02's test-only shape registry, so L05 can
capture plans before production code lands. `auth` always means the exact
authorized tenant/parent predicate and never a post-query filter; `keyset`
means the declared two-column strict cursor predicate. Every page uses
`LIMIT :limitPlusOne <=101`; summary SQL omits normalized row filters and
returns one row; facets omit row filters and cap each arm at 51.

The TASK-489 predecessor handoff is an explicit companion receipt outside those
closed counts. TASK-551-01-L02 is the sole owner of the read-only static registry
at `tests/perf/fixtures/task489SolutionKitRunPredecessor.ts`: types
`Task489CompanionId` and `Task489StaticPlanStatement`, plus
`TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS` and
`TASK489_SOLUTION_KIT_RUN_PREDECESSOR_CASES`. It also owns the complete
array-only receipt model: exact schema constant
`TASK489_SOLUTION_KIT_RUN_PREDECESSOR_RECEIPT_SCHEMA`, fixture-count/case/ID
constants, `Task489PredecessorFixtureCountsV1`,
`Task489PredecessorLogicalCaseV1`, `Task489PredecessorStatementReceiptV1`, and
`Task489PredecessorReceiptV1`, plus its `create`, `serialize`, and `parse`
helpers. L05 imports those exports read-only and must not define a parallel
receipt type, keyed statement-result record/map, companion tuple, local
fixture-count literal, parser, serializer, or schema string. Before
TASK-551-05-L01/L03, L02 tests only the arithmetic plus parameterized canonical
template/digest registry; it neither seeds nor executes normalized owner,
template-evidence, or rollback-progress rows. This leaf may begin its later
dynamic phase only after L01's single migration has landed the L03-defined
authority surfaces and their catalog contract passes.

This leaf consumes the L02 canonical template/digest and reviewed freeze receipt
read-only; it does not rebaseline, alter, or create a second static registry,
budget/freeze receipt, target guard, sentinel provisioner, or workflow evidence.
It executes the registry's exact five IDs, fourteen logical cases, fifteen
statement cases, and thirty numeric small/large statement receipts. Every
receipt and assertion records all three distinct run cardinalities: bulk history
is exactly 10,000 small / 1,000,000 large; bounded support is exactly 109,890
runs in each profile; the full dynamic scenario is therefore exactly 119,890
small / 1,109,890 large runs. A logical case may be a fixed two-statement
bundle, but every statement gets its own sanitized plan digest and finite budget:

| Companion ID | Bound and required large-plan authority |
|---|---|
| `task489-runs-all-keyset` | cases `default` and `relation-heavy-101`; `created_at DESC,id DESC LIMIT <=101`; `solution_kit_runs_history_idx`; default visits <=404 base rows; relation-heavy evaluates exactly 101 returned candidates, each with up to 513 newer applies and indexed rollback-relation probes, bounded by 404 base + 51,813 newer-apply + 51,813 point-probe rows; p95 <=75/200 ms default and <=250/750 ms relation-heavy |
| `task489-runs-package-keyset` | cases `default` and `relation-heavy-101`; exact `kit_id` plus the same keyset/bound; `solution_kit_runs_anchor_idx`; the same default/relation-heavy row and p95 bounds as the all-history ID |
| `task489-effective-supersession` | eight cases `newer-0`, `newer-1`, `newer-511`, `newer-512`, `newer-513-all-rolled`, and `newer-513-unrolled-first|middle|last`; one source, at most 513 newer successful applies plus 513 indexed relation probes and one `active|clear|overflow` row; both successful relation indexes; p95 <=75/200 ms |
| `task489-active-starter-owner` | normalized package/actor predicate, `released_at IS NULL`, `LIMIT 2`; active-owner partial index; <=2 rows; safe projection is only `package_key,source_run_id,released_at`; p95 <=25 ms at both scales |
| `task489-safe-detail` | one logical `point-plus-items` case containing statement `run-point` (one safe run row through PK, p95 <=25/50 ms) and statement `items-page` (ordered `LIMIT 513` explicit safe item columns through run-position index, p95 <=75/200 ms); separate receipts plus combined p95 <=100/250 ms |

The minimal normalized dynamic support closure is exact and fixture-scoped: the
full owned run set above; exactly 100 synthetic actor users needed by those runs;
513 `solution_kit_install_items` for the safe-detail sentinel; one active
`solution_kit_starter_apply_owners` row keyed by `source_run_id` (never
`owner_run_id`); one successful `solution_kit_legacy_template_evidence` row for
that owned source; and one
`solution_kit_legacy_rollback_progress` row linked to the owned rollback, source,
and evidence. It seeds no other user, item, owner, evidence, progress, or
unrelated family. It deletes, in order, progress, evidence, owner, items,
rollback runs, remaining apply runs, then the 100 actor users. The `finally`
proof queries each physical table by its scope-derived run/user/evidence keys and
requires zero residue before a subsequent scenario. Its enclosing nested
`finally` then reruns the rolled-back exact bound-L02-fixture-target/one-marker/bound-sentinel
proof after cleanup. Any cleanup, residue, or post-proof error fails the run
through redacted machine codes.

The large plans permit no growing-table sequential scan and select/transfer zero
actor fields, raw user identity, options, summary payload, snapshots, rollback
actions, envelope, or raw error bytes. An actor ID may be a bound predicate for
the active-owner lookup, but cannot occur in a projection, returned row, plan
digest input, receipt, or error. The companion emits sanitized plan digests plus
finite numeric small/large receipts under `task489Predecessor`, without changing
`TASK551_QUERY_PLAN_RECEIPTS` or its 37/38/76 cardinality. Exact-set guards
reject a sixth ID, missing/extra logical or statement case, a safe-detail bundle
without both receipts, a history plan without the relation-heavy page, an
`owner_run_id` field, or any prohibited projection. TASK-551 closure must record
all five IDs/fourteen cases/thirty statement-scale receipts as passed; TASK-489
later consumes only the L11-promoted durable bytes/hash through the L02 parser,
then byte-matches its landed builders and may tighten but not rebaseline them.
Only `tests/perf/task489-solution-kit-run-predecessor-plans.test.ts` writes the
single strict reject-unknown temporary artifact
`.tmp/task-551/task489-predecessor-v1.json`, and only after every dynamic case
passes. It constructs the value through L02's
`createTask489PredecessorReceiptV1`, writes L02's RFC 8785 canonical
`serializeTask489PredecessorReceiptV1` bytes once, reads those exact bytes back,
and accepts them only through L02's parser. The artifact byte-for-byte matches
the L02 model: schema `coderso.task551.task489-predecessor@v1`; exactly five
ordered IDs, fourteen ordered logical cases, fifteen ordered array statement
receipts, and exactly thirty profile results in the fixed `[small, large]`
order; plus the full imported fixture-count object (bulk history,
bounded-support, total runs, 100 actors, 513 items, and one each owner/evidence/
progress), never a partial/count-only projection. A failed, stale, extra, map-
shaped, unknown-field, noncanonical, or byte-mismatched result fails and leaves
no valid artifact. This repository-local test artifact is not workflow evidence:
this leaf never writes `_docs/_workflows/**` or another workflow sidecar. After
the L05 phase proof succeeds, only L11 may read the temporary file. L11 validates
the exact original bytes with the L02 parser, computes their hash, and promotes
those unchanged bytes to
`_docs/_workflows/_smoke/task-551/audit-evidence/task489-predecessor-v1.json`.
TASK-551-10-L01 and TASK-489 must never read `.tmp/task-551/`; each consumes only
the L11 durable bytes/hash and validates those bytes with the same L02 parser,
without local reserialization, rebuilding, normalization, projection, or schema
alteration. Missing, stale, extra, failed, digest-mismatched, or non-byte-identical
promotion blocks downstream aggregation and handoff.

| ID | Exact SQL projection | Exact predicate, order, and bound |
|---|---|---|
| `admin-pages-page` | `id,title,slug,status,updatedAt,authorId,authorName,authorEmail,authorEmailEncrypted` | auth + `q,status,authorId` + keyset; `updated_at DESC,id DESC`; 101 |
| `admin-pages-fixed-summary` | `total,published,draft,scheduled,archived` | auth only; one `COUNT(*)` plus filtered counts; 1 |
| `admin-pages-authors-facet` | `id,label` | auth + author owns scoped page; `label ASC,id ASC`; 51 |
| `admin-entries-global-page` | `id,typeId,title,slug,status,visibility,hasPassword,tags,scheduledAt,createdAt,updatedAt,publishedAt,authorId,authorName,authorEmail,authorEmailEncrypted,contentTypeId,contentTypeSlug,contentTypeName,contentTypeStatus` | auth + `q,status,typeId,authorId,updatedFrom,updatedTo` + keyset; `updated_at DESC,id DESC`; 101; no body/data/hash |
| `admin-entries-global-fixed-summary` | `total,published,draft,scheduled,archived` | auth only; filtered aggregates; 1 |
| `admin-entries-global-facets` | discriminated `author{id,label}` or `contentType{id,slug,name,entryCount}` | two `UNION ALL` arms, auth only, each ordered label/name then id and independently `LIMIT 51`; 102 |
| `admin-entries-typed-page` | `id,typeId,title,slug,status,visibility,hasPassword,tags,scheduledAt,createdAt,updatedAt,publishedAt,authorId,authorName,authorEmail,authorEmailEncrypted` | auth + resolved `type_id` + `q,status,authorId,updatedFrom,updatedTo` + keyset; `updated_at DESC,id DESC`; 101 |
| `admin-entries-typed-fixed-summary` | `total,published,draft,scheduled,archived` | auth + resolved `type_id`, no row filters; 1 |
| `admin-entries-typed-authors-facet` | `id,label` | auth + resolved `type_id` + author owns scoped entry; `label ASC,id ASC`; 51 |
| `admin-posts-page` | `id,typeId,title,slug,status,tags,scheduledAt,createdAt,updatedAt,publishedAt,authorId,authorName,authorEmail,authorEmailEncrypted` | auth + `q,status,authorId,tag` + keyset; `updated_at DESC,id DESC`; 101; no data/metadata/SEO |
| `admin-posts-fixed-summary` | `total,published,draft,scheduled` | auth only; filtered aggregates; 1 |
| `admin-posts-authors-facet` | `id,label` | auth + author owns scoped post; `label ASC,id ASC`; 51 |
| `admin-users-page` | `id,name,email,status,roleIds,createdAt,updatedAt,lastLoginAt` | auth + `q,status,roleId` + keyset; role-leading set join; `created_at DESC,id DESC`; 101; no hashes/encrypted output |
| `admin-users-fixed-summary` | `total,active,inactive,pending,members,invitations,administratorCount,soleAdministratorId` | auth only; set aggregates; 1 |
| `admin-users-roles-facet` | `id,name,usageCount` | auth + `roles:read`; role-leading aggregate; `name ASC,id ASC`; 51 |
| `admin-forms-page` | `id,name,slug,status,description,submissionAccess,updatedAt` | auth + `q,status,submissionAccess` + keyset; `updated_at DESC,id DESC`; 101 |
| `admin-forms-fixed-summary` | `total,active,drafts` | auth only; filtered aggregates; 1 |
| `admin-form-submissions-page` | `id,formId,status,createdAt` | auth + resolved `form_id` + `status,from,to` + keyset; `created_at DESC,id DESC`; 101; no payload/IP/user-agent |
| `admin-form-submissions-fixed-summary` | `total,rollingSevenDays,spam` | auth + resolved `form_id`, frozen `asOf`, no row filters; 1 |
| `admin-media-page` | `id,key,url,originalName,type,mimeType,size,width,height,alt,title,folderId,tags,createdAt` | auth + `q,types,folderIds,tags,alt,from,to` + keyset; `created_at DESC,id DESC`; 101; `key` is internal only to derive `name` and is removed before DTO/cache/response |
| `admin-media-fixed-summary` | `totalAssets,totalBytes,image,file` | auth only; filtered aggregates/SUM; 1 |
| `admin-media-facets` | discriminated `folder{id,name,recursiveItemCount}` or `tag{value,usageCount}` | two `UNION ALL` arms, auth only, each ordered label/value then id and independently `LIMIT 51`; 102 |
| `admin-booking-reservations-page` | `id,serviceId,resourceId,formSubmissionId,status,customerName,startsAt,endsAt,timezone,createdAt,updatedAt` | auth + `resourceId,serviceId,status,from,to` + keyset; `starts_at DESC,id DESC`; 101 |
| `admin-booking-reservations-fixed-summary` | `total,today,upcoming,resourceCount` | auth + frozen per-row timezone `asOf`, no row filters; 1 |
| `admin-booking-resources-page` | `id,name,slug,type,status,timezone,capacity,createdAt,updatedAt` | auth + `q,type,status` + keyset; `name ASC,id ASC`; 101 |
| `admin-booking-resources-fixed-summary` | `total` | auth only; 1 |
| `admin-booking-services-page` | `id,name,slug,status,durationMinutes,bufferBeforeMinutes,bufferAfterMinutes,priceCents,currency,submissionAccess,createdAt,updatedAt` | auth + `q,status` + keyset; `name ASC,id ASC`; 101 |
| `admin-booking-services-fixed-summary` | `total` | auth only; 1 |
| `admin-booking-blackouts-page` | `id,resourceId,startsAt,endsAt,reason,createdAt` | auth + `resourceId,from,to` + keyset; `starts_at DESC,id DESC`; 101 |
| `admin-booking-blackouts-fixed-summary` | `total` | auth only; 1 |
| `admin-booking-service-resources-fixed-list` | `serviceId,resourceId,isRequired,createdAt` | auth + resolved `service_id`; `resource_id ASC`; `LIMIT 101`, fail if 101 |
| `admin-booking-schedules-fixed-list` | `id,resourceId,dayOfWeek,startMinute,endMinute,timezone,isAvailable,createdAt,updatedAt` | auth + resolved `resource_id`; `day_of_week ASC,start_minute ASC,id ASC`; `LIMIT 101`, fail if 101 |

Six Admin page IDs preserve the seven earlier evidence cases without double-
counting IDs: `admin-pages-page` has `author-keyset`;
`admin-entries-global-page` has `author-keyset`;
`admin-entries-typed-page` has `type-author-keyset`;
`admin-posts-page` has both `author-keyset` and `tag-keyset`;
`admin-users-page` has `role-keyset`; and `admin-media-page` has
`tags-and-keyset`. They require respectively the exact author composites,
`user_roles_role_user_idx`, `posts_tags_gin_idx`, and `media_tags_gin_idx`
already named by L01. The other 26 Admin IDs each have one `default` case.

The five preserved non-Admin IDs complete the 37-member registry:

| Static ID | Predicate/order | Expected large-plan index |
|---|---|---|
| `webhooks-created-keyset` | no filter; `created_at DESC,id DESC`; lateral latest-delivery lookup | `webhooks_list_created_id_idx` plus the delivery parent index |
| `webhook-deliveries-parent-keyset` | `webhook_id=:webhookId`; `created_at DESC,id DESC` | `webhook_deliveries_webhook_list_idx` |
| `webhooks-event-batch` | `enabled=true AND events @> :normalizedOneEventArray::jsonb`; `id ASC`; batch limit | `webhooks_events_gin_idx` |
| `page-latest-autosave` | `page_id=:pageId AND kind='autosave'`; `version DESC,id DESC`; `LIMIT 1`; explicit autosave projection | `page_revisions_page_kind_version_id_idx` |
| `cache-outbox-oldest-unprocessed` | `processed_at IS NULL`; `created_at ASC,id ASC`; `LIMIT 1` | `cache_outbox_unprocessed_age_idx` |

`TASK551_QUERY_PLAN_RECEIPTS` has exact registry-key equality. Each of its 38
case values contains literal finite `small` and `large` numbers for rows read/
returned, hit/read buffers, normalized p95, and a sanitized plan SHA-256, and is
checked against the same ID's frozen TASK-551-01 budget. Missing, zero-sentinel,
`NaN`, infinite, string, derived-at-check-time, or extra values fail. Thus the
closed count is 37 plan IDs, 38 cases, and 76 numeric scale receipts.

The phase order is deliberately non-circular: TASK-551-01 freezes the 32
test-only statement shapes and budgets; L05-L01 captures the clean pre-decision
traffic interval and applies selected schema; this leaf executes those static
shapes against disposable immediately-prior (`task551-index-before`) and landed
(`task551-index-after`) catalogs; only then may TASK-551-03-L02 land production
builders. Its perf test renders every production case with the same synthetic
bind types and requires byte identity with the pre-land `StaticPlanStatement`
digest. A mismatch returns to the owning contract; neither test normalization
nor a new post-hoc plan baseline is allowed.

The before/after interval receipts are generated by L02's exact non-resetting
commands around the same fixture/workload digest. They require unchanged
server/database/reset identity and retain per-query-ID calls/rows/plan/exec-time
deltas by source class. Only application-class deltas participate in the
comparison. Migration/maintenance remain separate; external-diagnostic and
unknown rows are reported and excluded. The known whole-row and `access_logs`
regex diagnostic families can never select or retain an index, even if they
dominate cumulative time.

The three JSON binds remain sanitized but their fixture builders assert exact
one-element post/webhook arrays and deduplicated/sorted media AND arrays before capture.
No alternate `?`/text/unnest predicate passes. Small fixtures may legitimately
choose a sequential scan by cost; large fixtures must prove the named filter
index, bounded heap rows/buffers, stable keyset order, and the frozen p95 budget.
The outbox case uses its L01-owned 1,000/100,000-row fixture and deliberately
makes the oldest unprocessed event claimed and the next oldest backed off.
Neither `claim_token`, `claim_until`, nor `available_at` may narrow this health
statement; it measures all unfinished durable work, not currently claimable work.
`tests/perf/fixtures/task551QueryPlanContracts.ts` exports the sanitized
`TASK551_TRIGRAM_SELECTION_RECEIPT`; its five selected-or-null members must equal
L01's production `TRIGRAM_INDEXED_SOURCE_CONTRACT` and the live catalog.
Exact-set comparison uses `pg_class`, `pg_index`, `pg_attribute`,
`pg_constraint`, `pg_get_indexdef`, `pg_get_constraintdef`, and `pg_get_expr`;
it normalizes only insignificant PostgreSQL whitespace/outer parentheses, never
identifiers, casts, coalesces, weights, column order/direction, opclass, or
predicate bytes. The expected set is the complete mandatory L01 catalog plus
only non-null trigram receipt members. Missing, changed, or extra TASK-551-owned
objects fail `constraint_contract_failed`; no glob/count-only assertion passes.
Before database parsing, each schema render, generated-column migration literal,
snapshot expression, and trigram query-normalizer render is compared against
the owning L01 constant with byte identity (no whitespace or cast rewriting).
Catalog comparison is a second semantic check after PostgreSQL canonicalizes
expressions. Source guards require the exact `coalesce(...) || ' ' || ...`
concatenations and reject the stable variadic helper that generated columns
cannot use.

L02 consumes L01's immutable online-index manifest and exact
`.tmp/task551-migration-receipt.json` read-only. It validates the strict
version-2 receipt's operation/generation/digest chain, resolved journal tag/index,
repository-relative SQL/snapshot/online artifact hashes, preflight digest,
admission/quiescence acknowledgements, ordered forward/reverse member receipts,
compatible-binary resume authorization, and final state before trusting evidence.
It requires one-to-one equality between
every new snapshot-owned index, manifest member, receipt member, and live
definition; zero matching new index statement may remain in transactional SQL.
Every live member must have
`indisready = true` and `indisvalid = true`, and its receipt must record the
locked numeric classification/budgets, completed top-level concurrent build,
idempotent resume state, and exact two-group order. It requires an unbroken drain
through the revision-integrity group; external resume additionally requires that
barrier plus compatible TASK-551 binary evidence, while offline-single remains
drained through final catalog. It invokes L01's one
`rollout-forward` path on disposable fixtures rather than inventing a second
deployment path; L02 does not edit L01's deployment test/tool.

The exclusion constraint is the one explicit Drizzle snapshot limitation. L02
imports the immutable descriptor rather than copying SQL, verifies its
`extensionSql` and `addSql` occur exactly once in L01's migration, proves the
snapshot has no misleading index/check representation, and verifies the live
`pg_constraint` object. On disposable clean and immediately-prior fixtures it
also exercises forward apply, `.dropSql` rollback without removing the shared
extension, and forward reapply. A fresh generation must be zero-drift and may
emit neither a duplicate add nor the descriptor's `.dropSql`.

## Testing Requirements

- Cover every literal L01 catalog member, including all seven generated-vector
  GIN indexes, all three containment GIN indexes, every list/reverse-FK/cutoff
  index including page/entry/post-author, typed-entry-author, webhook, and
  role-leading traversal, the five revision unique indexes (two new page/widget
  builds plus the preserved entry/post/detail-page members),
  booking check/exclusion, every outbox column/check/index including
  `cache_outbox_unprocessed_age_idx`, and only selected
  trigram pairs; exact registry/catalog set equality rejects missing and extra
  objects.
- Verify all new snapshot indexes are exact members of the non-transactional
  manifest, absent from transactional index DDL, and ready/valid in the live
  catalog. Consume L01's crash-after-each-member, resume/rollback, threshold,
  exact group/order/barrier receipt, drain/activity-visibility receipt, strict
  revision/booking/transferred-authority concurrency receipt, and 16-controlled-writer read-performance receipt
  as mandatory evidence. No external resume may precede the revision barrier and
  compatible-binary authorization; no offline resume authorization may precede
  final catalog. Clean and immediately-prior disposable
  databases execute `rollout-forward` twice; the first applies before catalog
  checks and the second emits zero DDL/adapter action while proving final-state
  idempotence. Crash injection covers every version-2 state/CAS/file/DB boundary.
- Validate L01's real-PostgreSQL reserved-adapter evidence against postgres.js
  3.4.9/Drizzle 0.45.2. Only `drizzle(adaptedReserved)` is accepted; direct
  `drizzle(reserved)` and `poolClient.begin`/post-reservation pool dispatch fail.
  The callable adapter exposes the identical non-reassignable pool `.options`
  reference with parser/serializer round-trip parity and provides only the
  empty-option same-reserved `.begin` overloads. Operation/receipt/SHA are
  exactly three custom GUCs; their set, migration `application_name`, first
  guard, representative DDL, receipt insert and journal insert record one PID.
  Clean/prior/replay/reverse and injected-after-DDL/receipt failures prove one
  atomic DDL/receipt/journal outcome. Verify successful/known-rollback RESET,
  same-PID cleanup, one release/normal end, and unknown begin/commit/rollback/
  reset/PID poisoning with no release/later SQL and one hard end. Adapter parity
  failure is a rollout block requiring the single custom reserved transaction
  runner contract, never a runtime fallback or second selectable path.
- For all five trigram candidates, pin the normalized column/index/opclass and
  normalization digest. Select only candidates whose large plan uses that exact
  index with bounded rows/buffers and whose write-cost gate passes; rejected
  members are `null` and are absent from schema/catalog/fallback behavior.
- Resolve the closed generated-expression dependency set through `pg_proc` and
  operator implementation OIDs; every function must exist and have
  `provolatile = 'i'`. Mutations to stable/volatile/missing signatures fail.
- Pin exact schema/migration/snapshot/query-normalizer bytes for all seven
  vector and five trigram source contracts; mutate one separator or replace the
  immutable concatenation and prove the byte guard fails.
- Prove `BOOKING_RESERVATION_EXCLUSION_SQL` name, predicate, definition,
  add/drop SQL, deep immutability, migration occurrence count, intentional
  snapshot omission, live `pg_constraint` identity, and clean/prior/rollback/
  forward behavior. A generated drop or duplicate add fails deterministically.
- Large plans assert index names, predicates, absence of forbidden full scans/
  external sorts, rows-read ratio, buffer budget, and p95 over repeated warm and
  cold-declared runs. Do not set `enable_seqscan = off`.
- Assert exact set/count equality for 37 plan IDs, 38 named cases and 76 finite
  numeric scale receipts. Execute every case against both L01 fixture scales.
  All 32 Admin IDs match planned inventory, fingerprint, shape and budget IDs;
  the five non-Admin IDs remain exactly the table above. Missing/extra/duplicate
  members, placeholder numerics, or a seventh Admin ID for an already embedded
  variant fail.
  Author fixtures assert page `5/10`, entry `20/10`, typed entry `1/1`, and post
  `10/10`; their large plans use the three author composites and contain no
  external sort. Webhook fixtures pin parent/event selectivity and one lateral
  latest-delivery row. Mutate a leading column, `jsonb_path_ops`,
  bound array shape, `@>` operator, or stable tiebreaker and prove plan/catalog
  verification fails. Report per-index storage and write p95 delta, each at or
  below L01's 20% representative-write ceiling.
- Admin filter fixtures return bounded items/lookahead and exact `hasMore`, but
  the envelope expectation is always `matchingTotal:null`. Instrument the 32
  shapes and require zero filtered-count SQL; first/middle/last and filtered
  requests have byte-identical fixed-summary/facet rows. Render the later
  production builders for all 38 cases and require byte identity with the
  pre-land statement digests before accepting TASK-551-03-L02.
- Validate named pre-decision/before/after interval receipts without resetting
  shared statistics: unchanged reset/server/database identity, equal workload
  digest for before/after, exact calls/rows/time deltas, and source-class
  separation. Only application rows enter prioritization/comparison. The five
  polluted diagnostic families and all unknowns are excluded and propose no
  index; a clean interval after diagnostics is mandatory.
- Execute `cache-outbox-oldest-unprocessed` at both scales and require the large
  plan to use `cache_outbox_unprocessed_age_idx` with bounded rows/buffers and
  return the deliberately oldest claimed row. Predicate mutations adding
  `claim_token IS NULL`, availability, or expiry filtering and index mutations
  changing `created_at,id`, direction, or `processed_at IS NULL` fail. Report
  insert/claim/retry/complete write p95 and storage delta within the 20% ceiling.
- Execute all five TASK-489 companion IDs, fourteen logical cases, and fifteen
  statement cases after the L01 → L03 schema surfaces are present. Assert and
  record separately the exact 10,000/1,000,000 bulk-history runs, 109,890
  bounded-support runs, and 119,890/1,109,890 full dynamic totals; no assertion
  or receipt may label the bulk number as the scenario total. The normalized
  closure is exactly 100 synthetic actors, 513 safe-detail items, one active
  owner keyed by `source_run_id`, one template-evidence row, and one rollback-
  progress row. Pin both relation-heavy 101-row history pages, all eight
  0/1/511/512/513 supersession cases, the active owner, and separate run-point/
  item-page detail plans plus combined latency. Mutating one predicate to JSON,
  one relation index, the 513 sentinel, either detail statement or its
  independent p95 budget, a support link, `source_run_id`, or a prohibited
  projection fails without altering L02's closed static registry or reviewed
  freeze receipt.
- The dynamic fixture imports only `assertTask551FixtureTargetChildKeys`,
  `parseTask551FixtureTarget`, `Task551FixtureTarget`,
  `Task551FixtureTargetClient`, `assertTask551FixtureTarget`, and
  `assertTask551FixtureTargetPostCleanup` from L02's import-safe
  `scripts/task551DatabaseBaseline/fixtureTarget.ts`. Each of the four exact
  L11 contexts—`05-l02-explain-plans-test`, `05-l02-predecessor-test`,
  `05-l02-explain-small`, and `05-l02-explain-large`—independently calls
  `consumeOnce(expected)` before supplier/source access, creates its own exact
  three-value `fixtureValues` (`URL`, `NAME`, `SENTINEL`), then a fresh exact-own
  `childEnv` with only `PATH`, `TMPDIR`, `LANG`, `LC_ALL`, and `TZ`, and launches
  its logical array argv beginning `"bun", "--env-file=/dev/null"`. It never
  receives/enumerates a parent/whole child environment, reads ambient
  `process.env`, or imports a runner, wrapper, local parser/proof, generic
  runtime URL, or dotenv fallback. Tests reject every L03/L02/nonmatching-05-L02
  source, map, environment, context, or launch before supplier access. Force
  source-map validation, injected-client/preflight, spawn, seed, plan, assertion,
  and cleanup failures in turn; each must leave zero scope-owned rows in progress,
  evidence, owners, items, rollback/apply runs, and actor users. Child-first
  cleanup is mandatory even when an assertion or EXPLAIN capture fails. After
  every success and injected failure, prove in nested `finally` that the bound
  target still has the exact current database, exactly one marker, and bound
  sentinel bytes; cleanup/post-proof failure is redacted and propagated.
- Add cross-leaf source-contract tests that resolve every L05 fixture-guard
  import to `scripts/task551DatabaseBaseline/fixtureTarget.ts`, reject imports
  of `scripts/task-551-database-baseline.ts`/a runner wrapper, and reject local
  target type/parser/proof declarations. They must also reject
  `process.env`/`Bun.env`, `.env`, `DATABASE_URL`, `DATABASE_DIRECT_URL`,
  `requireFixtureTarget`, or any generic fallback in the L05 fixture paths.
  Run the imported guard with a fake injected `Task551FixtureTargetClient` to
  prove strict three-key rejection, preflight rollback, and the post-cleanup
  proof after a cleanup failure without opening a real connection.
- Require L11 to collect exactly four table-order `Task55105L02ChildOutcomeV1`
  values and, immediately before temporary read/parser/hash/promotion, accept only
  expected context/command, passed redacted receipt, and own-data
  `postCleanupTargetProof:{ rolledBack:true, currentDatabaseMatched:true,
  exactSingleMarkerMatched:true, boundSentinelByteMatched:true }`. Mutate/omit
  one literal, context/command, receipt field, add an unknown/extra outcome, or inject
  target/URL/marker/sentinel/hash/raw error and require fixed failure before any read,
  parser/hash call, evidence write, or promotion. Prove outcomes are dropped
  and never become a descriptor, exact-eleven row, row 10/11 field, projection, log, or L10/TASK-489 input.
- Verify imported canonical statement/digest equality and reviewed freeze
  identity before the dynamic run, but do not write/review/rebaseline that input.
  The dynamic receipt has no local shape: use the L02 factory and strict parser
  to require its complete imported fixture counts, exact ID/case/statement
  tuples, and exactly 30 finite ordered array results. Assert that only one
  `.tmp/task-551/task489-predecessor-v1.json` exists after a successful run; it
  byte-equals the L02 canonical serializer output and one failed/mutated/no-op
  path leaves no valid artifact. After the all-four transient L11 proof gate, test
  the L11-only handoff: L11 alone re-reads the temporary artifact, validates it with
  the L02 parser, hashes its original bytes, and writes those exact bytes once to
  `_docs/_workflows/_smoke/task-551/audit-evidence/task489-predecessor-v1.json`.
  Assert L10 and TASK-489 never open `.tmp/task-551/`; they receive only the L11
  durable bytes/hash and validate them through the L02 parser, without local
  reserialization, object-map conversion, or schema/type duplicate. This leaf
  never writes workflow evidence or `_docs/_workflows/**`.
- Consume and reject-malform L01's strict redacted 50-way revision/booking/
  transferred-authority concurrency receipt; require five revision-family,
  booking, and authority-probe success/count/digest fields without accepting a
  fixture/client/target/raw row. L02 does not start races or cleanup, add a test
  path, command, or broker context; L01 alone owns that raw fixture.
- Snapshot sanitizer tests inject emails, tokens, SQL, bind values, and plan
  fields; zero forbidden values survive output.
- Mutation fixtures alter one vector weight/JSON cast, index direction/predicate,
  booking status/custom descriptor byte, outbox nullability/default/state
  branch, function volatility, and add one extra TASK-551-prefixed index; each
  exact-set verifier fails deterministically.
- Consume only L01's transferred authority-race receipt; L03 separately owns its
  focused catalog/authority-contract state-matrix suite (owner/source/package/
  actor, active state, envelope/digest, relation, proof/status, and restrict
  assertions). L02 owns neither raw authority fixture nor that suite.
- Re-run each named failing perf file alone before classifying a failure.

## Security Contract

- Internal test/tooling only; no route, auth, RBAC, CSRF, rate-limit,
  nonce/HMAC, or CAPTCHA changes.
- Static allowlisted statements and synthetic fixture IDs only. Never accept
  arbitrary SQL, production binds, unredacted customer data, or credentials.
- TASK-489 dynamic execution imports L02's exact target seam only from
  `scripts/task551DatabaseBaseline/fixtureTarget.ts`:
  `assertTask551FixtureTargetChildKeys`, `parseTask551FixtureTarget`,
  `Task551FixtureTarget`, `Task551FixtureTargetClient`,
  `assertTask551FixtureTarget`, and `assertTask551FixtureTargetPostCleanup`.
  L11 alone consumes one current exact 05-L02 broker context after immutable
  predecessor attestations, maps only that context to three
  `TASK551_FIXTURE_DATABASE_*` `fixtureValues`, then builds a separate exact-own
  `childEnv` with only `PATH`, `TMPDIR`, `LANG`, `LC_ALL`, and `TZ`. L05 receives
  only its explicit direct three-value map plus injected proof client—not an
  ambient environment or an L03/L02 source/map. It never imports the baseline
  runner/wrapper, defines a target parser/proof/type, loads `.env`, falls back to
  `DATABASE_URL`/`DATABASE_DIRECT_URL`, or provisions, logs, or serializes target
  identity or sentinel.
- This leaf authorizes database work only through that exact current 05-L02 L11
  child boundary: array argv, immediate `--env-file=/dev/null`, and exact-own
  `childEnv` with no inherited key. It authorizes neither an ambient shell,
  `.env`, generic database variable, migration/DDL command, nor any other task's
  controller/source/target authority.
- The post-cleanup target proof calls imported
  `assertTask551FixtureTargetPostCleanup` with the same private bound target and
  injected client after every dynamic attempt.
  Its four literal-true fields are transient all-four-result gate inputs only:
  L11 must not persist them in any evidence row, row 10/11, projection, log, or
  consumer handoff. Target identity, marker/sentinel values or hashes,
  connection/SQL data, and raw exception text remain private; cleanup or
  post-proof errors are fixed redacted codes and fail before promotion.
- Receipt validation accepts only the fixed task path and repository-relative
  artifact paths/digests; it never records database URLs, environment dumps,
  credentials, binds, or customer data.
- Persist statement family, catalog/index names, counters, timing, and sanitized
  plan shape only; raw EXPLAIN output stays ephemeral.
- TASK-489 safe projections exclude actor/user identity in every returned field
  and digest input. The active-owner statement may bind the authenticated
  synthetic actor to its normalized predicate, but emits only
  `package_key,source_run_id,released_at`; it never exposes `actor_id` or an
  `owner_run_id` alias.
- Interval evidence persists query IDs/fingerprint/source class and numeric
  deltas only. It neither resets shared stats nor stores statement text, binds,
  application/role names, diagnostic patterns, host/database identity, or rows.
- This leaf never writes a workflow receipt, smoke sidecar, or
  `_docs/_workflows/**` file. Its fixed `.tmp/task-551/` test artifact remains
  private to L05 until a successful phase proof. Only L11 may then read it,
  validate it through the L02 parser, hash the original bytes, and promote those
  unchanged bytes to its one durable audit-evidence path. L10 and TASK-489 must
  never read `.tmp/task-551/`; they consume only L11's durable bytes/hash through
  the L02 parser. No consumer writes a second receipt, keyed map, or locally
  serialized variant.

## Validation Commands

- Through one distinct exact L11 `05-l02` context per command only: immutable
  predecessor attestations, `consumeOnce(expected)` before source access, a new
  three-key `TASK551_FIXTURE_DATABASE_*` `fixtureValues` map, a separate
  exact-own `childEnv` with fixed `PATH`/`TMPDIR`/`LANG`/`LC_ALL`/`TZ`, and logical
  array argv with immediate `--env-file=/dev/null`. These commands never source
  `.env`, read `DATABASE_URL`/`DATABASE_DIRECT_URL`, or receive an ambient target:
  `bun --env-file=/dev/null test tests/perf/database-explain-plans.test.ts`
- Through that same exact L11 child boundary:
  `bun --env-file=/dev/null test tests/perf/task489-solution-kit-run-predecessor-plans.test.ts`
- `tests/perf/database-pg-stat-interval.test.ts` is owned by TASK-551-02-L02,
  not this leaf. This leaf supplies no command, source, child environment, or
  database authority for it.
- `tests/integration/server/task551OnlineIndexDeployment.test.ts` and
  `scripts/task-551-online-indexes.ts` rollout/status are TASK-551-05-L01
  schema/migration-owner operations, not L05-L02 validation commands. They are
  unauthorized here, including `rollout-forward`, its idempotence rerun, and
  `status`; no L11 05-L02 fixture map or authority may substitute for them.
- `tests/integration/server/task551ConcurrencyConstraints.test.ts` is exclusively
  TASK-551-05-L01: L05-L02 neither commands nor imports it and accepts only its
  strict redacted receipt, without a fifth 05-L02 broker context.
- Through that same exact L11 child boundary:
  `bun --env-file=/dev/null scripts/task-551-explain-plans.ts --scale small --check`
- Through that same exact L11 child boundary:
  `bun --env-file=/dev/null scripts/task-551-explain-plans.ts --scale large --check`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso:perf`

## Documentation Updates Required

No shared docs. Pass the sanitized before/after table, trigram selection receipt,
write/storage tradeoffs, constraint outcomes, and rollback commands to
TASK-551-10-L02.

## Quantified Acceptance

- Evidence registry covers 100% of L01 additions and contains zero raw SQL bind,
  credential, token, email, or customer-content leakage.
- Live catalog and the complete L01 declared catalog have exact set and
  definition equality, including the custom exclusion constraint and zero
  unexpected TASK-551-owned objects; every generated-expression dependency is
  catalog-proven immutable.
- Transactional SQL contains zero new index creation; the same-number companion,
  snapshot, final ready/valid catalog, and resumable deployment receipt have
  exact one-to-one equality within every L01 deployment ceiling.
- The receipt proves an unbroken admission/worker drain through the integrity
  group, compatible-binary-only external resume before the concurrent read group,
  and offline drain through final catalog; no crash branch contains an old/early-
  binary resume event.
- Every large-fixture hot plan uses its intended index, stays within its declared
  rows/buffer/p95 budget, and has no forbidden growing-table sequential scan.
- The plan registry is exactly 37 IDs/38 cases/76 numeric small-large receipts:
  all 32 future Admin statements plus five preserved non-Admin statements.
  Post-land production SQL is byte-identical for every case; filtered Admin
  fixtures keep `matchingTotal:null`, bounded items/`hasMore`, byte-identical
  global summary/facets, and zero filtered count.
- The separate TASK-489 predecessor receipt has exactly five IDs, fourteen
  logical cases, fifteen statement cases, and thirty numeric scale receipts; it
  separately proves 10,000/1,000,000 bulk-history, 109,890 bounded-support, and
  119,890/1,109,890 total-run cardinalities, then passes its named
  index/projection/row/p95 contracts. Its dynamic normalized closure has only
  the declared actors/items/owner/evidence/progress rows, deletes child-first
  with zero residue, and is not counted in or written into the 37-ID registry.
  After L11's transient all-four post-cleanup-proof gate, the L11 facade alone validates, hashes, and promotes
  the exact temporary bytes to its durable audit-evidence path; L10/TASK-489 use
  only that durable bytes/hash handoff through the L02 parser.
- Every completed or failing TASK-489 dynamic attempt performs the post-cleanup
  rolled-back bound-fixture-target proof. Immediately before temporary
  read/parser/hash/promotion, L11 requires all four results' literal-true
  `postCleanupTargetProof` objects; an omitted/false/unknown/malformed proof
  blocks before any evidence write or promotion. The transient proof/result is
  never durable evidence or an L10/TASK-489 input; only promoted predecessor bytes/hash hand off.
- Page/entry/typed-entry/post-author, reverse-role, post-tag, media-AND-tag, and
  webhook list/event large cases use their exact L01 indexes and matching
  production predicate bytes with bounded rows/buffers and measured write/
  storage cost.
- The large oldest-unprocessed outbox case uses its exact partial age index and
  observes claimed/backed-off rows; it never reports age from only claimable
  rows.
- Trigram selection receipt and live schema/catalog/fallback contract have 100%
  set and byte/expression identity for all five selected-or-null sources.
- The required L01 receipt proves fifty-way revision/booking and transferred
  authority-race invariants; L02 rejects its absence or malformed/redacted-field
  drift and performs no fixture cleanup.
- Clean/prior/rollback/forward custom-exclusion paths pass, and the documented
  snapshot limitation has exact descriptor/migration/live-catalog parity with
  zero generated duplicate-add or drop operations.
- Pre-decision/before/after stats receipts use unchanged identities and no reset;
  only application traffic is eligible, while external-diagnostic/unknown rows
  (including the polluted five-family sample) remain separate and excluded.

## Workflow Dispatch Envelope

The temporary predecessor receipt is the one exceptional allowlisted output:
it remains ephemeral, has one test-owned writer, and may be consumed only by
the L11 parser/promotion flow already specified above. Each database command has
one independent exact L11 `05-l02` context and no other source authority:

| Command | Required logical context | Action/profile |
|---|---|---|
| `database-explain-plans-test` | `05-l02-explain-plans-test` | `database-explain-plans-test` / `null` |
| `task489-predecessor-plans-test` | `05-l02-predecessor-test` | `task489-predecessor-plans-test` / `null` |
| `explain-plan-small-check` | `05-l02-explain-small` | `explain-plan-check` / `small` |
| `explain-plan-large-check` | `05-l02-explain-large` | `explain-plan-check` / `large` |

For each row L11 consumes only that broker once before source access, derives a
new three-value map then exact-own childEnv, and launches/captures/disposes once.
The envelope has no dotenv, ambient database alias, caller-selected target, or
L03/L02 source/map/environment/launch reuse.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-05-L02",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-05"
  },
  "allowlist": [
    "scripts/task-551-explain-plans.ts",
    "tests/perf/fixtures/task551QueryPlanContracts.ts",
    "tests/perf/database-explain-plans.test.ts",
    "tests/perf/task489-solution-kit-run-predecessor-plans.test.ts",
    ".tmp/task-551/task489-predecessor-v1.json"
  ],
  "forbiddenPaths": [
    "core/db/schema.ts",
    "core/db/migrations/meta/_journal.json",
    "scripts/task-551-online-indexes.ts",
    "tests/integration/server/task551IndexAndConstraintCatalog.test.ts",
    "tests/integration/server/task551ConcurrencyConstraints.test.ts",
    "tests/integration/server/task551OnlineIndexDeployment.test.ts",
    "tests/perf/database-pg-stat-interval.test.ts"
  ],
  "dependencies": ["TASK-551-05-L03:single"],
  "commands": [
    {
      "id": "database-explain-plans-test",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/perf/database-explain-plans.test.ts"],
      "environmentProfile": "task551-phase-05-l02",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/database-explain-plans.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "task489-predecessor-plans-test",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/perf/task489-solution-kit-run-predecessor-plans.test.ts"],
      "environmentProfile": "task551-phase-05-l02",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/task489-solution-kit-run-predecessor-plans.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "explain-plan-small-check",
      "lane": "cli",
      "argv": ["bun", "--env-file=/dev/null", "scripts/task-551-explain-plans.ts", "--scale", "small", "--check"],
      "environmentProfile": "task551-phase-05-l02",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "explain-plan-large-check",
      "lane": "cli",
      "argv": ["bun", "--env-file=/dev/null", "scripts/task-551-explain-plans.ts", "--scale", "large", "--check"],
      "environmentProfile": "task551-phase-05-l02",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint-types",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "performance-gate",
      "lane": "tooling",
      "argv": ["bun", "run", "gates:coderso:perf"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "single",
      "dependsOn": ["TASK-551-05-L03:single"],
      "commandIds": [
        "database-explain-plans-test",
        "task489-predecessor-plans-test",
        "explain-plan-small-check",
        "explain-plan-large-check",
        "core-lint-types",
        "core-lint",
        "performance-gate"
      ]
    }
  ]
}
```
