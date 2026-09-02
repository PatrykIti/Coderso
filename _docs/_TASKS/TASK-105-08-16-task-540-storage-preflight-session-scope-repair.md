# TASK-105-08-16: TASK-540 Storage-Preflight Session Scope Repair
# FileName: TASK-105-08-16-task-540-storage-preflight-session-scope-repair.md

**Parent Task:** TASK-105-08  
**Priority:** High  
**Category:** Testing Infrastructure / Runtime Smoke  
**Estimated Effort:** Small  
**Dependencies:** TASK-105-08-04 static and targeted-suite receipt; TASK-105-08-14 focused request-shape repair; TASK-105-08-15 harness implementation receipt and its failed `r3` diagnostic  
**Status:** ✅ Done (2026-09-02)
**Started:** 2026-08-22

---

## Objective

Repair the TASK-540 storage-preflight session baseline so it observes only the four
nonce-bound TASK-540 User-Agents, exactly as its adjacent audit and access-log reads
already do. The first L15 `r3` attempt terminated naturally but failed before scenarios
started with `wf540_task_traffic_baseline_overflow`: the preflight selected a
foreign-inclusive session table above its intentional 4,096-row fail-closed cap.

This is a narrow loopback smoke-harness repair. It does not change a product route,
schema, persistence model, cleanup authority, browser flow, or the registered legacy
`task-traffic-complete-private-v2` terminal operation. A read-only native-plan inventory
proves that terminal operation is not dispatched by the current 496-action plan, so it is
outside this recovery's evidence and ownership.

The failed `task105-l04-fast-20260822-r3` evidence directory is read-only diagnostic
evidence. It must never be overwritten, retrofitted, deleted, or treated as L04/L05
acceptance.

## Scope and Single-Writer Ownership

This leaf is the sole current writer of exactly:

- `scripts/runtime-smoke/adapters/task-540/operations/handlers/platform.ts`;
- `scripts/runtime-smoke/adapters/task-540/suite/contract/actions/setup.mjs`;
- `tests/unit/runtime-smoke/task540-storage-preflight-session-scope.test.ts` (new);
- `tests/unit/runtime-smoke/task540-native-source-inventory.test.ts`;
- `tests/fixtures/runtime-smoke/task540-native-source-inventory.json`;
- `tests/bun-lane-manifest.json`, only as the deterministic generated update required by
  this new suite and L14's already-owned, currently untracked
  `tests/unit/runtime-smoke/task540-override-actions.test.ts`.

This is a path-specific supersession of two terminal TASK-552 leaves. It supersedes
TASK-552-04-L02 only for `handlePlatformStoragePreflight`'s session User-Agent predicate;
L16 must not change a handler ID, operation mapping, input/output validator, output shape,
pack, worker path, or any other L02 handler. It supersedes TASK-552-04-L01 only for the active
`set-001` wording and its inventory fixture/test receipt: L16 records one approved current
destination divergence while preserving immutable legacy source evidence and updates the live
canonical action-manifest hash. It does not re-open any other stable-contract destination or
historical source.

The manifest exception is path-specific and ends with this leaf: run
`bun scripts/bun-lane-classify.ts`; do not hand-edit the generated file. Its only expected row
additions are the named L14 and L16 suites, each with bucket `A`, empty `conflictKeys`, and
`cWriteGlobal:false`; the generator's one fresh `generatedAt` timestamp is expected to change.
No other row may change. It supersedes
TASK-105-08-11's earlier re-verify-only wording for this bounded generated update.

L16 may create only
`_docs/_workflows/_smoke/evidence/task-540/task105-l04-fast-20260822-r4/`, with the
shared runner's ignored `.tmp/runtime-smoke/task105-l04-fast-20260822-r4.diag.log` as
the expected ephemeral companion. A failed r4 directory remains diagnostic evidence.

Do not edit `resources.ts`, output validators, operation contracts/packs/parity fixtures,
L14's override-action paths, any L15-owned path, `core/**`, routes, schemas, workers,
browser code, lifecycle code, or existing historical evidence. In particular, this leaf
does not silently reinterpret the registered `completeSession` private output contract;
that dormant handler requires a separately audited compatibility decision if it is ever
scheduled into a native plan. The setup action's IDs, scenario count, executable partition,
fixtures, selectors, action ordering, and all behavior other than the corrected session
baseline scope are immutable.

## Implementation Pseudocode

1. Correct the active `set-001-storage-preflight` action wording in `setup.mjs` from
   “complete bounded session-row baselines” to an exact task-User-Agent bounded session
   baseline. Preserve every action ID, scenario, executable type, order, selector, fixture,
   and visible-effect assertion. This changes only the plan's truthful description of the
   already-required caller read model.

2. Retain the immutable TASK-552 historical source evidence: its 169 legacy entries and
   aggregate `sourceManifestSha256` never change. Promote the fixture to a schema that records
   exactly one approved current-destination divergence for `suite/contract/actions/setup.mjs`.
   Use fixture schema version `2` with one `currentDestinationDivergences` record containing
   the destination path, the immutable historical SHA, the newly computed current SHA,
   `TASK-105-08-16` owner, and a concise task-User-Agent-scope rationale. Update the inventory
   test to reject any other current-destination divergence, retain no-doc/import-purity checks,
   and pin the new live canonical action-manifest SHA.

3. Keep the existing strict input guard: exactly four distinct non-secret task
   User-Agent values are already supplied by the typed `user-agents-input-v1` contract.
   Preserve the existing audit-log and access-log predicates, UUID-only projections,
   ordering, 4,097 query bound, and named overflow error.

4. Narrow only the session-baseline query with the same typed predicate. Do not select
   session tokens, CSRF values, IP addresses, or User-Agent values into the output.

   ```ts
   const sessionRows = await db
     .select({ id: sessions.id })
     .from(sessions)
     .where(inArray(sessions.userAgent, input.userAgents))
     .orderBy(sessions.id)
     .limit(4097);

   if (auditRows.length > 4096 || accessRows.length > 4096 || sessionRows.length > 4096) {
     throw new Error("wf540_task_traffic_baseline_overflow");
   }
   ```

5. Add an isolated Bun regression that parses only the handler, setup action-contract, and
   read-only terminal action-contract sources.
   It must reject a missing User-Agent predicate, a widened session projection, a changed
   order/limit, a weakened named overflow guard, a setup-row phrase that does not name the
   task-User-Agent-scoped session baseline, or an unexpected terminal task-traffic action.
   It must also pin the unchanged scoped audit/access predicates. The test reads no database
   rows or PII; the live r4 run against the populated shared database is the behavioral proof
   that foreign sessions are not counted.

6. Regenerate the Bun lane manifest, assert its exactly two pending TASK-540 rows
   (`task540-override-actions.test.ts` from L14 and the new L16 suite) have bucket `A`,
   empty conflict keys, and `cWriteGlobal:false`, and retain only that two-row/generatedAt
   update.

### Query Read Model and Plan Evidence

The caller is `set-001-storage-preflight`. It needs a fresh ascending UUID-only inventory of
sessions produced by exactly four nonce-bound task User-Agents, with expected cardinality zero
before task execution and a fail-closed maximum of 4,096 rows. The actual r4 preflight is the
representative large-table/small-result shape: a foreign-inclusive session table already exceeds
the cap while a fresh nonce has no matching task rows. A task-owned >4,096 case is deliberately
an error path, not a production read shape; do not seed or mutate the shared database merely to
manufacture it.

Before r4, capture two sanitized `EXPLAIN (ANALYZE, BUFFERS)` observations of the exact
parameterized predicate/order/limit in read-only transactions with one-second statement timeouts:
one against an existing clean small-session environment and one against the populated
foreign-session diagnostic environment. Record only plan-node names, actual/estimated row
counts, buffer totals, and elapsed time; redact connection strings, parameter values, and all row
data. Neither observation may seed or mutate the shared database. Each read must finish within
its bounded timeout and keep the 4,097 limit at the database boundary. `sessions.userAgent`
currently has no supporting index; no migration is authorized here. If either measured plan
cannot meet this bounded preflight budget, stop and author a separately audited query/index task
rather than adding an index opportunistically. Before launching r4, the orchestrator alone
records the two sanitized summaries in L16's bounded receipt: environment class, plan-node names,
estimated/actual rows, buffer totals, elapsed time, and timeout result only. It must not write a
separate evidence file or place SQL binds, connection data, or row data in the r4 evidence tree.

## Security Contract

This is loopback-only internal smoke infrastructure. Existing authenticated admin-session,
`content:write` RBAC, CSRF, rate-limit, strict reject-unknown, and cleanup contracts remain
unchanged. The change introduces no endpoint, public input, schema, mutation authority, or
credential surface. The four User-Agent values are used solely as a typed database predicate;
reports, test fixtures, and diagnostics must not contain cookies, CSRF values, tokens,
database URLs, raw database rows, or unredacted response bodies.

## Validation Gates

1. Run the exact new structural regression and the amended inventory receipt:

  ```bash
  bun test tests/unit/runtime-smoke/task540-storage-preflight-session-scope.test.ts
  bun test tests/unit/runtime-smoke/task540-native-source-inventory.test.ts
  ```

2. Regenerate and validate the lane inventory, then run the runtime-smoke Bun lane:

   ```bash
   bun scripts/bun-lane-classify.ts
   bun test tests/unit/toolchain/bunLaneManifest.test.ts
   bun test tests/unit/runtime-smoke
   ```

3. Run `bun --cwd core lint:types`, `bun --cwd core lint`, and the root static gates:

   ```bash
   ./node_modules/.bin/eslint --max-warnings=0 scripts/runtime-smoke/adapters/task-540/operations/handlers/platform.ts scripts/runtime-smoke/adapters/task-540/suite/contract/actions/setup.mjs tests/unit/runtime-smoke/task540-storage-preflight-session-scope.test.ts tests/unit/runtime-smoke/task540-native-source-inventory.test.ts
   ./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false
   ```

   Attribute every root TypeScript diagnostic to a named leaf and require zero L16-owned paths.
   Also run `git diff --check` and a physical line-count check over every changed production
   and test file; each must be at most 1,000 lines. The JSON fixture and generated manifest are
   exempt. Before r4, the orchestrator records the two sanitized query-plan summaries in L16's
   bounded receipt; this documentation exception grants no implementation-file ownership.

4. After a fresh read-only post-implementation audit and a quiescent-writer preflight,
   verify the exact r4 evidence directory is absent, record the 13 flat screenshot
   identities/hashes, and run exactly once:

   ```bash
   bun scripts/runtime-smoke.ts run --suite task-540 --profile fast --session task105-l04-fast-20260822-r4
   ```

   Require natural exit `0`, no live r4-session process, seven scenarios, 496 logical
   actions, zero console/page errors, successful cleanup, 13 session-archive screenshot
   paths with independently re-hashed 13/13 records, and guarded restoration of every
   flat screenshot baseline. Preserve a failed r4 directory and stop for a separately
   audited recovery; never rerun or overwrite the same session.

5. Run a fresh read-only post-r4 audit of L14, L15, L16, and L04 acceptance. It must
   verify the receipt against command output, report bytes, evidence-tree hashes, process
   state, and flat-output restoration before L05 may start.

## Acceptance Criteria

1. Storage preflight's audit, access, and session baselines are all bounded, ordered,
   exact-four-User-Agent inventories; unrelated sessions cannot consume the task cap.
2. More than 4,096 task-owned session rows still fail closed with the unchanged named
   overflow error, while a populated unrelated-session table no longer blocks r4.
3. The immutable historical source manifest is retained, while exactly one named setup
   destination divergence and its live plan hash are independently pinned. The new Bun suite
   and bounded two-row generated A-lane manifest update provide deterministic regression against
   widening, predicate removal, cap weakening, plan-text drift, or lane-inventory drift.
4. Before r4, the bounded L16 receipt contains both required sanitized query-plan summaries:
   environment class, nodes, estimated/actual rows, buffers, elapsed time, and timeout result
   only. It contains no SQL binds, connection data, or row data.
5. A successful r4 is the only runtime receipt that may satisfy L04's remaining smoke
   acceptance and permit L05 to begin. It supplies the full L15 archive/terminal proof;
   r3 remains diagnostic only.
6. Only the six implementation-owned persistent paths and the named r4 evidence directory
   change, apart from the explicitly authorized orchestrator-only L15/L16/L04 receipt updates.
   All touched production/test files satisfy the 1,000-line gate.

## Completion Policy

L16 remains `🚧 In Progress` until the family changelog permits terminal closure. The
orchestrator alone may append a bounded L16 receipt before r4 and bounded L15/L16/L04 receipts
after a successful r4. Before r4 it records the required sanitized query-plan summaries; after
independently verifying a successful r4 it adds command,
exit, process absence, report path, exact 13/13 archive hash result, flat-restoration result,
static gates, and audit verdict. This grants no
authority to change board status, changelog, product code, or any other task's files.

## Bounded Pre-r4 Query-Plan Receipt (2026-08-22)

Two independent parameterized `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` observations ran in
read-only transactions with a local 1,000 ms statement timeout. Each used the exact bounded
four-User-Agent preflight shape. No connection data, parameter values, rows, or raw plan output
were retained.

- `clean-small-session`: nodes `Limit → Sort → Seq Scan`; estimated/actual rows `8/0`;
  shared-buffer blocks `3`; elapsed `0.640 ms` (planning `0.602 ms`, execution `0.038 ms`);
  timeout `false`.
- `foreign-session-diagnostic`: nodes `Limit → Sort → Seq Scan`; estimated/actual rows `4/0`;
  shared-buffer blocks `149`; elapsed `1.915 ms` (planning `0.735 ms`, execution `1.180 ms`);
  timeout `false`.

## Bounded Post-r4 Receipt (2026-08-22)

The sole authorized r4 command completed naturally with exit `0`:

```bash
bun scripts/runtime-smoke.ts run --suite task-540 --profile fast --session task105-l04-fast-20260822-r4
```

- `report.json` at
  `_docs/_workflows/_smoke/evidence/task-540/task105-l04-fast-20260822-r4/report.json` records
  `pass:true`, `serverUp:true`, cleanup pass, all seven required scenarios passing in order, and
  zero console/page errors or failures. No r4-session or Playwright process remains.
- Independent verification re-hashed every ordered archive record (`13/13`), proved the exact
  report-plus-screenshots evidence tree and safe file identities, and compared all 13 flat PNGs
  with the orchestrator's pre-run baseline: bytes and modes were restored exactly.
- The active native-plan contract separately pins `496` logical actions and validates its
  420-browser/76-runtime receipt requirements; `report.json` intentionally has no logical-action
  counter, so this receipt does not misattribute that static invariant to its `snapshots` field.
- The full runtime-smoke Bun lane passed `321/321`; L16 focused tests, lane-manifest test,
  scoped lint/format, diff, and line gates passed. Root TypeScript attribution found no
  L16-owned diagnostic after the public parser-API repair. Fresh evidence and contract audits
  found no HIGH or MEDIUM drift.

L04's delegated runtime acceptance is now satisfied and L05 may begin in the declared order.
L16 remains `🚧 In Progress` pending family closure; this receipt changes no board, changelog,
source, or test ownership.

## Closure (2026-09-02)

Closed on tree evidence: scripts/runtime-smoke/adapters/task-540/operations/handlers/platform.ts:316 scopes the storage-preflight session query with inArray over metadata->>'userAgent', and the exact-four-UA guard at platform.ts:226-229 bounds the session scope as contracted.
Delivered suites: tests/unit/runtime-smoke/task540-storage-preflight-session-scope.test.ts (272 lines) and task540-native-source-inventory.test.ts (414 lines), both committed and green in the canonical run; the 1434-line fixture JSON is exempt from the 1,000-line gate.
Landing commit: 699ab3b1 "test(task-105): freeze task-540 L14 L16 handoff".
Canonical artifact: TASK-105-08-12 Closure Evidence (2026-09-01) — canonical run 1186 files / 10444 tests / 0 failures, 99.26% lines / 291 uncovered across 87 files.
