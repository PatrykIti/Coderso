# TASK-570-01: Split entryService.test.ts Modularity

**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-18
**Changelog:** 1292 (inherits parent TASK-570 pin)
**Priority:** High
**Size:** Medium

# FileName: TASK-570-01-Split-Entry-Service-Test-Modularity.md

**Parent Task:** TASK-570
**Source Findings:** Gate failure found during TASK-570 closure review: TASK-570
touched `tests/unit/content/entryService.test.ts` (+1/-1, adapting the publish
flow assertion to the new `{items, nextCursor}` revision-list shape) but the
file is 2084 physical lines. AGENTS.md ("File Size and Modularity") requires any
touched test file above 1,000 lines to be split by cohesive responsibility as
part of the same substantive change. TASK-570 must not close until this split
lands.

## Purpose

`tests/unit/content/entryService.test.ts` is a 2084-line DB-backed Bun test
suite (baseline `1e9f271d` = 2084 lines; the working tree has daisy's +1/-1
adaptation). It contains:

- Shared DB fixtures and source-audit helpers (~lines 65-294)
- 2 pure source-audit tests (295-393)
- ~12 DB mutation/CRUD tests (394-926)
- ~18 DB visibility/metadata/concurrency tests (927-2084)

The split keeps the module path `tests/unit/content/entryService.test.ts` as the
entry that the parent TASK-570 validation and historical task docs reference,
but reduces every file below 1000 lines. No test behavior may change: all tests
must keep their exact names, bodies, and assertions (only module relocation and
shared-fixture extraction).

## Public Contract (MUST stay byte-stable for test behavior)

- Every existing `test(...)` / `testIfDb(...)` / `testIfDbWithOptions(...)` in
  the file keeps its exact name and body. The only permitted body edit is the
  already-applied working-tree change (`revisions.length` → `revisions.items.length`
  at line 427) which must remain.
- The shared fixture/helper block must be extracted to a clearly named support
  module, NOT duplicated across files (AGENTS.md: extract fixtures/builders into
  clearly named files; no generic dumping-ground helpers).
- The main file `tests/unit/content/entryService.test.ts` must stay importable
  and runnable in the Bun lane (DB-backed, `bun test`), and must keep the
  `testIfDb`/`testIfDbWithOptions` gating behavior (skip when `DATABASE_URL`
  unreachable).

## Target Module Map

All line ranges refer to the CURRENT working-tree file (2084 lines, daisy's +1/-1
applied). The function/test-name lists are the AUTHORITATIVE map; ranges are
approximate guidance. The implementer MUST read the actual file and move content
by NAME.

1. **`tests/unit/content/support/entryServiceTestSupport.ts`** (new, support
   module, ~230-280 lines, Bun lane) — every shared fixture/helper currently at
   lines 65-294 and 927-931:
   - `canConnect`, `schema`, `uniqueName`, `cleanup`
   - the shared module-level mutable state: `contentTypeId`, `entryId`,
     `userId` (current lines 85-87) exposed as an exported mutable state object
     `entryServiceTestState = { contentTypeId, entryId, userId }` so every test
     file shares one instance per Bun test process (each test file gets its own
     process + module instance, matching the original single-file semantics)
   - `testIfDb`, `testIfDbWithOptions` setup (the `hasDb` gate)
   - ts-morph source-audit helpers: `entryServiceSource` +
     `entryServiceAst` (current lines 107-118, read from
     `core/services/content/entryService.ts`), `findFunction`, `collectCalls`,
     `methodCallsNamed`, `readProjectionKeys` (readProjectionKeys uses
     entryServiceAst at line 157; the source-audit tests use both at 343-377)
   - `createDeferred`, `EntryMutationFixture`, `withEntryMutationFixture`
   - `createCacheRecordingDeps`, `createMutationTag`,
     `readStoredEntryMutationState`, `readEntryMutationDomainSnapshot`
   - `hasSecretKey`
   Export them all. This module imports `bun:test` (`test`, `test.skip`),
   `node:crypto`, `node:fs`, `drizzle-orm`, `typescript`, `core/db/client`,
   `core/db/schema`, and the entryService surface exactly as the current file
   does. It must be `db`-lazy: the `hasDb` gate runs at import time as today.
   NOTE: `afterAll(() => cleanup())` (current line 103) stays in the MAIN test
   file only; the support module exports `cleanup` and the state object, and
   each test file that uses module-level state registers its own
   `afterAll(() => cleanup())` locally (a 2-line import + registration).

2. **`tests/unit/content/entryServiceSourceAudit.test.ts`** (new, ~130-160
   lines) — the 2 pure source-audit tests (current lines 295-393):
   - `entry mutation source pins secret-minimal projections and write query shapes`
   - `entry mutation dependency factory clones and freezes production seams`
   Imports the source-audit helpers from the support module (NOT
   `createCacheRecordingDeps` — the two source-audit tests never use it; only
   `createEntryMutationDepsForTest` via `entryServiceSource` tests. An unused
   import would fail lint). These two are NOT DB-gated today (they run unconditionally);
   keep them unconditional.

3. **`tests/unit/content/entryService.test.ts`** (main, stays, must end < 1000
   lines, target ~700-850) — imports, shared imports re-exported/imported from
   the support module, and the DB mutation/CRUD tests (current lines 394-926)
   plus the final `deleteEntry returns only the assistant consumer id and title`
   test (2078-2084). Tests:
   - `publish flow creates revisions and preview` (394)
   - `enforces slug uniqueness per type` (454)
   - `listEntriesWithContentTypes returns cross-type rows with owner metadata` (482)
   - `updateEntry preserves author metadata` (540)
   - `updateEntryMetadata stores taxonomy tags, schedule, and SEO` (576)
   - `duplicateEntry creates a draft copy with unique slug and metadata` (630)
   - `validates relation entry IDs` (702)
   - `validates media asset IDs and types` (789)
   - `updateEntryMetadata requires scheduledAt for scheduled status` (900)
   - `deleteEntry returns only the assistant consumer id and title` (2078)
   This file must remain < 1000 lines; if it lands ≥ 950 after relocation, move
   `duplicateEntry creates a draft copy...` and `updateEntryMetadata stores
   taxonomy...` into the source-audit file (no — into a separate
   `entryServiceDuplicateAndMetadata.test.ts`) per the contingency below.
   NOTE: this file's tests 454, 540, 789, 900 use the shared module-level state
   (`contentTypeId`/`entryId`/`userId`). Rewrite those assignments to the
   exported `entryServiceTestState` object and keep `afterAll(() => cleanup())`
   here (the original line 103). No other body change.

4. **`tests/unit/content/entryServiceVisibility.test.ts`** (new, ~250-320
   lines) — visibility/password round-trip tests (current lines 927-1178):
   - `entry visibility round-trips and never echoes the access password` (932)
   - `visibility password with no password and no existing hash is rejected` (1024)
   - `combined {status:published, visibility:password} without password rejects before any write` (1048)
   - `duplicateEntry copies visibility, downgrades password to private, never copies the hash` (1105)
   - `all three read projections expose visibility + hasPassword` (1142)
   Imports fixtures from the support module. DB-gated via `testIfDb*`.
   NOTE: this file's tests 1024 and 1142 use the shared module-level state
   (`contentTypeId`, `entryId`). Rewrite those two tests' state assignments to
   the exported `entryServiceTestState` object (e.g.
   `entryServiceTestState.contentTypeId = type.id`) and register
   `afterAll(() => cleanup())` locally. No other body change.

5. **`tests/unit/content/entryServiceMetadataWrites.test.ts`** (new, ~350-420
   lines) — metadata write-plan/cache/rollback tests (current lines 1179-1524):
   - `entry metadata write plans follow the exact status and accumulated metadata matrix` (1179)
   - `taxonomy and SEO preparation reject before every metadata write and cache effect` (1301)
   - `entry metadata cache matrix is global for SEO, targeted otherwise, and no-op silent` (1363)
   - `post-commit cache and reporter failures preserve durable metadata success` (1402)
   - `a failure after every metadata write seam rolls the entire outer transaction back` (1435)
   Imports fixtures from the support module. DB-gated.

6. **`tests/unit/content/entryServiceConcurrency.test.ts`** (new, ~500-560
   lines) — deferred applies, locks, and concurrency tests (current lines
   1525-2077):
   - `deferred taxonomy and SEO applies are awaited and stay cache-silent until commit` (1525)
   - `locked route authorization runs before preparation for every mutation` (1630)
   - `row-locked route mutation waits for the lock and a denial leaves every domain un...` (1799)
   - `accessPassword is ignored when visibility is omitted for every stored visibility...` (1923)
   - `concurrent password keep and clear mutations cannot leave password visibility w...` (1963)
   - `concurrent standalone publishes serialize distinct revision versions` (2009)
   - `route metadata wrapper preserves direct SEO null values as omitted fields` (2030)
   Imports fixtures from the support module. DB-gated. If this file lands ≥ 950,
   split `row-locked route mutation...` (1799) into the metadata-writes file or
   a dedicated `entryServiceLocks.test.ts` per the contingency below.

### Contingency (only if a listed file lands ≥ 950 lines)

- If main (module 3) ≥ 950: extract `duplicateEntry creates a draft copy with
  unique slug and metadata` (630-701) + `updateEntryMetadata stores taxonomy
  tags, schedule, and SEO` (576-629) into
  `tests/unit/content/entryServiceDuplicateAndMetadata.test.ts`.
- If concurrency (module 6) ≥ 950: extract `row-locked route mutation waits for
  the lock...` (1799-1922) + `locked route authorization runs before
  preparation...` (1630-1798) into `tests/unit/content/entryServiceLocks.test.ts`.
Both extracted files import fixtures from the support module and stay DB-gated.

## Implementation Pseudocode

1. **Read the current working-tree file fully** (2084 lines, includes daisy's
   +1/-1). Use `sed -n`/`Read` (this file is NOT rg-misdetected, but read it in
   chunks to be safe).
2. **Create `tests/unit/content/support/entryServiceTestSupport.ts`**: move the
   shared helpers (65-294 + `hasSecretKey` 927-931) verbatim. Keep the import
   block identical (the support module needs the same imports as today's file).
   Export every helper EXCEPT `hasDb` (module-internal gate implementation
   detail; only `testIfDb`/`testIfDbWithOptions` are exported). Keep the
   `hasDb` gate + `testIfDb`/`testIfDbWithOptions`
   definitions here and export them so every DB test file reuses the same gate.
3. **Create the 4 new test files** (sourceAudit, visibility, metadataWrites,
   concurrency): copy each test's exact body from the current file, replace
   local helper references with imports from the support module, and keep the
   `testIfDb`/`testIfDbWithOptions` gating. Each file has its own minimal import
   block (what its tests actually use; the support module re-exports nothing
   beyond helpers — import `db`/`schema`/service functions directly in each
   test file as needed).
4. **Rewrite `entryService.test.ts`**: keep imports, the DB CRUD tests (394-926
   + 2078-2084), and import fixtures from the support module. Target ~700-850
   lines.
5. **Do NOT change** any test name, assertion, timeout, or fixture value.
6. **Run gates** (see below). Fix only type/lint issues introduced by the
   relocation (unused imports must be removed, not `any`'d).
7. **Regenerate the Bun-lane manifest**: after creating the 4 new test files
   (and before running the lane tests), run `bun scripts/bun-lane-classify.ts`
   from the repo root. The committed `tests/bun-lane-manifest.json` is pinned by
   `tests/unit/toolchain/bunLaneManifest.test.ts` ("committed manifest equals a
   fresh classification run"); new/renamed test files MUST be reflected in the
   regenerated manifest or that test fails. The support module is not a
   `*.test.ts` file and needs no manifest row.

## Error Handling / Invariants

- Behavior is byte-identical: this is pure test-file relocation + shared-fixture
  extraction. No assertion changes, no new tests, no removed tests, no fixture
  value changes.
- The `hasDb` gate must behave identically: DB tests skip (not fail) when
  `DATABASE_URL` is unreachable, exactly as today.
- No circular imports: support module imports only external libs + core
  services; test files import support + core; no test file imports another test
  file.
- Every extracted test file must be independently runnable via
  `bun test tests/unit/content/<file>` in the Bun lane.

## Gates (mandatory before closure)

Run from repo root with `set -a && source .env && set +a` and `export TMPDIR=/tmp`:

- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun test tests/unit/content/entryService.test.ts tests/unit/content/entryServiceSourceAudit.test.ts tests/unit/content/entryServiceVisibility.test.ts tests/unit/content/entryServiceMetadataWrites.test.ts tests/unit/content/entryServiceConcurrency.test.ts` (all 5 files; DB suites need `export TMPDIR=/tmp`)
- `bun scripts/bun-lane-classify.ts` (regenerate `tests/bun-lane-manifest.json`; then `bun test tests/unit/toolchain/bunLaneManifest.test.ts` must pass)
- `bun test tests/unit/toolchain/bunLaneManifest.test.ts`
- `bun test tests/unit/content/` (entire content unit lane, including daisy's
  entryRevisionRestore + facade fence suites) — run with A/B BUCKET ISOLATION:
  `bun test` on the explicit list of ALL `tests/unit/content/*.test.ts` EXCEPT
  `detailPageRuntimeResolver.test.ts`, then `bun test
  tests/unit/content/detailPageRuntimeResolver.test.ts` separately (4 tests).
  Do NOT run the bare directory. PRE-EXISTING REPO DEFECT (unrelated to this
  split): bun 1.3.14 runs every test file in ONE process for a directory run,
  and the pre-existing A-bucket `detailPageRuntimeResolver.test.ts` registers a
  module-scope mock of `core/db/client` (select-only stub) that leaks to every
  later file in the process, breaking DB-gated suites with `db.transaction is
  not a function`. The repo's real bun-lane surface
  (`scripts/run-bun-parallel.ts --lane all`) isolates A from B/C onto separate
  worker processes, so the leak never occurs in the standard lane. Verified:
  content dir minus resolver = 141 pass / 0 fail; resolver alone = 4 pass.
- `bun test tests/unit/db/schemaTableFacade.test.ts` (explicit gate for the
  third TASK-570 regression suite, which lives outside `tests/unit/content/`)
- Root `tsc` via pre-commit (untracked new files must type-check)
- Line-count gate: `wc -l` on every new file + rewritten main; ALL < 1000.
- `git diff --check`

NOTE: `bun --cwd core test` is a NO-OP (`core/package.json` test script is
literally `echo core test`) — never use it as a gate. Use root `bun test <paths>`.

## Completion Notes

- Implemented by delegated agent (bat, ds/deepseek-v4-flash) and independently
  verified by the orchestrator: 6 files, all < 1000 lines (main 580, support
  281, sourceAudit 110, visibility 279, metadataWrites 369, concurrency 579);
  29/29 test names byte-identical (verified by name-set diff against HEAD's
  2084-line original; 0 missing / 0 extra); `revisions.items.length` adaptation
  preserved; probe files cleaned up.
- Pre-implementation audit (2nd round, ant, GLM 5.2) PASS after 2 MEDIUM
  test-name typos + 3 LOWs were corrected in the contract (never copies the
  hash / no-op silent / sourceAudit import list / schemaTableFacade gate /
  hasDb export note); every fix verified directly against the file.
- PRE-EXISTING REPO DEFECT documented in Gates: bun 1.3.14 runs all test
  files in ONE process for directory runs, and the unmodified A-bucket
  `detailPageRuntimeResolver.test.ts` registers a module-scope mock of
  `core/db/client` (select-only stub) that leaks to later files. The repo's
  real lane (`scripts/run-bun-parallel.ts --lane all`) isolates A from B/C by
  worker process, so the standard lane is unaffected. Gate 5 therefore uses
  A/B bucket isolation (24 B/C files = 141 pass; resolver alone = 4 pass).
  The split EXPOSED the leak (silent skips became loud failures) but did not
  cause it.
- Gates: lint:types ✓, lint ✓, 5-file suite 29 pass ✓, bun-lane-classify +
  manifest test ✓, content lane 141 pass ✓, schemaTableFacade ✓, wc -l ✓,
  diff-check ✓, root tsc ✓.

## Regression Tests

The 5 entryService test files are the regression contract. Additionally run
daisy's TASK-570 suites (`entryRevisionRestore.test.ts`,
`entryServiceFacadeFence.test.ts`, `tests/unit/db/schemaTableFacade.test.ts`)
to prove no cross-file regression from the relocation.

## Security Contract

Not applicable: internal test-only refactor. No route, schema, RBAC, or
anti-abuse surface changes. The `hasSecretKey` assertions (secret never leaks
from projections) stay byte-identical.

## Acceptance

- `entryService.test.ts` < 1000 lines; every new file < 1000 lines.
- All 5 files green in the Bun lane; entire `tests/unit/content/` lane green.
- All test names/bodies/assertions preserved (only the +1/-1 working-tree
  adaptation retained).
- Shared fixtures live in ONE clearly named support module, not duplicated.
