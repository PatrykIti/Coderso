# TASK-551-01-L01: Production Query Inventory and Ownership Matrix
# FileName: TASK-551-01-L01-Production-Query-Inventory-And-Ownership-Matrix.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-01
**Priority:** High
**Category:** Database / Performance / Tooling
**Estimated Effort:** Small
**Dependencies:** TASK-551 external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Create a deterministic scanner plus reviewed inventory that covers direct
Drizzle calls, transaction executors, raw SQL, and dynamic DB imports in
production `core/**`. Generated migrations and tests are inputs, not production
caller records. This leaf runs twice under the same single-writer ownership:
initially before TASK-551-02, then as a fresh final re-dispatch after TASK-551-09
and before TASK-551-10-L01.

## Sub-Tasks

None; this is an executable leaf with initial and final dispatch phases.

## File Ownership

**Allowlist:** `scripts/task-551-query-inventory.ts`,
`tests/perf/fixtures/task551QueryInventory.ts`, and
`tests/perf/database-query-inventory.test.ts`, plus the default-lane guard
`tests/integration/server/task551BunLaneMembership.test.ts` only.

**Forbidden:** every production module; all migration/meta files; TASK-511
`core/services/backups/**`; TASK-517 `entryService.ts`/`publicSite.tsx`;
TASK-493 SEO/GSC source; TASK-518 files; all task/changelog/workflow files.

## Inventory Contract

Each record contains stable `id`, file, symbol/line anchor, caller, query class,
projection sensitivity, filters/joins/order, maximum cardinality, query-count
budget, cache/freshness eligibility, transaction/constraint owner, assigned
TASK-551 leaf, and `optimize | preserve-bounded | external-handoff` disposition.
Every selected current/planned caller owns one `telemetryFingerprintKey`. The
sole production value registry is `core/db/queryFingerprintRegistry.ts`, owned
only by TASK-551-02-L02 and imported by telemetry; production never imports this
test fixture. Initial phase cannot import that absent future module, so it stores
one temporary reviewed `PLANNED_QUERY_FINGERPRINT_REGISTRY` handoff. Final phase
dynamically imports the landed registry, verifies exact key/value/set equality,
and removes the temporary mapping rather than creating a second registry. Raw
or normalized SQL is never a key or value.
The initial scan requires exact coverage of every currently discovered caller
and permits only explicit `plannedDelta` records for production callers that a
named TASK-551-02..09 leaf will add. A planned delta includes the future file,
symbol contract, query class, bound, and sole owner but is not counted as a
currently discovered caller. The final scan is run from the validated post-09
tree, rejects every remaining planned delta, and requires exact discovered/
fixture equality. Later leaves never edit these artifacts; orchestration
re-dispatches this same leaf as their sole writer.

The initial planned-delta set contains exactly 34 records. The following 32 are
owned solely by TASK-551-03-L02. `bound` is the maximum physical rows returned
by that statement, including lookahead; `budgetId` is also the exact key in
L02's numeric small/large budget map. Each symbol is a required named function,
not a prose placeholder, and each fingerprint key is globally unique:

| Planned ID | Future file and symbol | Class / bound | `budgetId` | Fingerprint key |
|---|---|---|---|---|
| `admin-pages-page` | `pageReadService.ts#selectPageListRows` | page / 101 | `admin-pages-page` | `admin_pages_page` |
| `admin-pages-fixed-summary` | `pageReadService.ts#selectPageListFixedSummary` | fixed-summary / 1 | `admin-pages-fixed-summary` | `admin_pages_fixed_summary` |
| `admin-pages-authors-facet` | `pageReadService.ts#selectPageAuthorFacetPage` | facet / 51 | `admin-pages-authors-facet` | `admin_pages_authors_facet` |
| `admin-entries-global-page` | `entryReadService.ts#selectGlobalEntryListRows` | page / 101 | `admin-entries-global-page` | `admin_entries_global_page` |
| `admin-entries-global-fixed-summary` | `entryReadService.ts#selectGlobalEntryFixedSummary` | fixed-summary / 1 | `admin-entries-global-fixed-summary` | `admin_entries_global_fixed_summary` |
| `admin-entries-global-facets` | `entryReadService.ts#selectGlobalEntryFacetBatch` | facet / 102 | `admin-entries-global-facets` | `admin_entries_global_facets` |
| `admin-entries-typed-page` | `entryReadService.ts#selectTypedEntryListRows` | page / 101 | `admin-entries-typed-page` | `admin_entries_typed_page` |
| `admin-entries-typed-fixed-summary` | `entryReadService.ts#selectTypedEntryFixedSummary` | fixed-summary / 1 | `admin-entries-typed-fixed-summary` | `admin_entries_typed_fixed_summary` |
| `admin-entries-typed-authors-facet` | `entryReadService.ts#selectTypedEntryAuthorFacetPage` | facet / 51 | `admin-entries-typed-authors-facet` | `admin_entries_typed_authors_facet` |
| `admin-posts-page` | `postReadService.ts#selectPostListRows` | page / 101 | `admin-posts-page` | `admin_posts_page` |
| `admin-posts-fixed-summary` | `postReadService.ts#selectPostListFixedSummary` | fixed-summary / 1 | `admin-posts-fixed-summary` | `admin_posts_fixed_summary` |
| `admin-posts-authors-facet` | `postReadService.ts#selectPostAuthorFacetPage` | facet / 51 | `admin-posts-authors-facet` | `admin_posts_authors_facet` |
| `admin-users-page` | `userReadService.ts#selectUserListRows` | page / 101 | `admin-users-page` | `admin_users_page` |
| `admin-users-fixed-summary` | `userReadService.ts#selectUserListFixedSummary` | fixed-summary / 1 | `admin-users-fixed-summary` | `admin_users_fixed_summary` |
| `admin-users-roles-facet` | `userReadService.ts#selectUserRoleFacetPage` | facet / 51 | `admin-users-roles-facet` | `admin_users_roles_facet` |
| `admin-forms-page` | `formReadService.ts#selectFormListRows` | page / 101 | `admin-forms-page` | `admin_forms_page` |
| `admin-forms-fixed-summary` | `formReadService.ts#selectFormListFixedSummary` | fixed-summary / 1 | `admin-forms-fixed-summary` | `admin_forms_fixed_summary` |
| `admin-form-submissions-page` | `submissionReadService.ts#selectSubmissionListRows` | page / 101 | `admin-form-submissions-page` | `admin_form_submissions_page` |
| `admin-form-submissions-fixed-summary` | `submissionReadService.ts#selectSubmissionListFixedSummary` | fixed-summary / 1 | `admin-form-submissions-fixed-summary` | `admin_form_submissions_fixed_summary` |
| `admin-media-page` | `mediaReadService.ts#selectMediaListRows` | page / 101 | `admin-media-page` | `admin_media_page` |
| `admin-media-fixed-summary` | `mediaReadService.ts#selectMediaListFixedSummary` | fixed-summary / 1 | `admin-media-fixed-summary` | `admin_media_fixed_summary` |
| `admin-media-facets` | `mediaReadService.ts#selectMediaFacetBatch` | facet / 102 | `admin-media-facets` | `admin_media_facets` |
| `admin-booking-reservations-page` | `bookingReadService.ts#selectReservationListRows` | page / 101 | `admin-booking-reservations-page` | `admin_booking_reservations_page` |
| `admin-booking-reservations-fixed-summary` | `bookingReadService.ts#selectReservationListFixedSummary` | fixed-summary / 1 | `admin-booking-reservations-fixed-summary` | `admin_booking_reservations_fixed_summary` |
| `admin-booking-resources-page` | `bookingReadService.ts#selectResourceListRows` | page / 101 | `admin-booking-resources-page` | `admin_booking_resources_page` |
| `admin-booking-resources-fixed-summary` | `bookingReadService.ts#selectResourceListFixedSummary` | fixed-summary / 1 | `admin-booking-resources-fixed-summary` | `admin_booking_resources_fixed_summary` |
| `admin-booking-services-page` | `bookingReadService.ts#selectServiceListRows` | page / 101 | `admin-booking-services-page` | `admin_booking_services_page` |
| `admin-booking-services-fixed-summary` | `bookingReadService.ts#selectServiceListFixedSummary` | fixed-summary / 1 | `admin-booking-services-fixed-summary` | `admin_booking_services_fixed_summary` |
| `admin-booking-blackouts-page` | `bookingReadService.ts#selectBlackoutListRows` | page / 101 | `admin-booking-blackouts-page` | `admin_booking_blackouts_page` |
| `admin-booking-blackouts-fixed-summary` | `bookingReadService.ts#selectBlackoutListFixedSummary` | fixed-summary / 1 | `admin-booking-blackouts-fixed-summary` | `admin_booking_blackouts_fixed_summary` |
| `admin-booking-service-resources-fixed-list` | `bookingReadService.ts#selectServiceResourceRows` | fixed-list / 101 | `admin-booking-service-resources-fixed-list` | `admin_booking_service_resources_fixed_list` |
| `admin-booking-schedules-fixed-list` | `bookingReadService.ts#selectScheduleRows` | fixed-list / 101 | `admin-booking-schedules-fixed-list` | `admin_booking_schedules_fixed_list` |

The remaining two records preserve the previously agreed contracts:

- `core/services/cache/cacheInvalidationOutbox.ts#readOldestUnprocessedAge`,
  ID/budget ID `cache-outbox-oldest-unprocessed`, owner `TASK-551-08-L02`,
  kind `point`, bound `1`, fingerprint key
  `cache_outbox_oldest_unprocessed`, predicate `processed_at IS NULL`, and order
  `created_at ASC,id ASC`. It explicitly includes claimed and backed-off rows;
  claimability/availability fields are absent from the predicate. Because the
  table is introduced later by TASK-551-05, its scale/EXPLAIN/write budget is
  owned by TASK-551-05-L01/L02 rather than the pre-schema L01-L02 baseline.
- `core/services/content/publicContentVisibilityGateRead.ts#validatePublicHtmlDependencies`,
  ID/budget ID `public-html-dependencies-128`, sole owner `TASK-551-09-L01`,
  kind `aggregate`, result bound `1`, input cap
  `128` dependency tuples, canonical-input cap `16,384` bytes, root-list bound
  `<= 100 + 1`, and fingerprint key `public_html_dependency_validation`. One
  parameterized `VALUES`/CTE statement validates root membership plus all nested
  page, post, and content-entry visibility projections. It selects no page/post/
  entry bodies, document/data JSON, or password hashes. L02 supplies its initial
  planned fixture/budget; the final refresh records the landed caller or removes
  this planned record when TASK-551-09-L01 proves that no new caller is needed.

Final inventory must discover each landed caller and remove both planned records;
if TASK-551-09-L01 removes its planned query after final source discovery, the
receipt records that evidence and removes only that no-longer-present delta.

`tests/perf/fixtures/task551QueryInventory.ts` exports both the reviewed records
and a `TASK551_QUERY_INVENTORY_RECEIPT` containing `phase`, sanitized source-tree
digest, discovered/owned/planned counts, and validation timestamp. The initial
receipt is the implementation handoff. The final receipt replaces it and is the
mandatory immutable input to TASK-551-10-L01. It contains no diff bodies, SQL,
binds, environment values, or customer data.

## Implementation Pseudocode

```ts
type QueryInventoryRecord = StrictReadonly<{
  id: string;
  source: { file: string; symbol: string };
  kind: "point" | "list" | "search" | "aggregate" | "mutation" | "append" | "maintenance";
  statementRole?: "page" | "fixed-summary" | "facet" | "fixed-list";
  bound: number | "stream" | "missing";
  budgetId: string;
  plannedShapeId?: string;
  telemetryFingerprintKey?: QueryFingerprintKey;
  owner: `TASK-551-${string}` | `TASK-${number}`;
  disposition: "optimize" | "preserve-bounded" | "external-handoff";
}>;

type QueryInventoryReceipt = StrictReadonly<{
  phase: "initial" | "final";
  sourceTreeDigest: string;
  discoveredCount: number;
  ownedCount: number;
  plannedDeltaCount: number;
  adminReadPlannedCount: number;
  legacyPlannedCount: number;
  validatedAt: string;
}>;

async function scanProductionDbCallers(root: string): Promise<DiscoveredCaller[]> {
  // Parse bounded core source set; detect db/tx executor calls and dynamic imports.
}

const phase = parseInventoryPhase(process.argv); // strict initial | final
const discovered = await scanProductionDbCallers("core");
assertExactCurrentCoverage(discovered, TASK551_QUERY_INVENTORY);
assertSingleWriterOwnership(TASK551_QUERY_INVENTORY);
if (phase === "initial") {
  assertExactPlannedSet(PLANNED_QUERY_DELTAS, {
    total: 34, adminRead: 32, legacy: 2,
  });
  assertAdminPlannedShapesExact(
    PLANNED_QUERY_DELTAS,
    TASK551_ADMIN_READ_STATEMENT_SHAPES,
  );
  assertEveryPlannedDeltaHasOneFutureOwner(PLANNED_QUERY_DELTAS);
  assertPlannedFingerprintRegistryExact(selectedTelemetryRecords(), PLANNED_QUERY_FINGERPRINT_REGISTRY);
} else {
  assertNoPlannedDeltasRemain(PLANNED_QUERY_DELTAS);
  assertTemporaryFingerprintRegistryAbsent();
  const canonical = await import("../core/db/queryFingerprintRegistry");
  assertCanonicalFingerprintRegistryExact(selectedTelemetryRecords(), canonical.TASK551_QUERY_FINGERPRINTS);
}
writeOrVerifySanitizedReceipt({ phase, discovered });

// The manifest contains every TASK-551 Bun-owned test path, including planned
// files. Initial phase checks that each path is under a root literally executed
// by package.json test:bun; final phase additionally requires every path to
// exist. A targeted-only path fails even when its leaf command would pass.
assertCanonicalBunLaneMembership(TASK551_PLANNED_BUN_TEST_PATHS, {
  script: readRootPackageScript("test:bun"),
  requireFiles: phase === "final",
});
```

Errors are stable (`query_inventory_invalid`, `query_inventory_unowned`,
`query_inventory_writer_conflict`, `query_inventory_phase_invalid`,
`query_inventory_planned_delta_unresolved`, and
`query_inventory_final_receipt_missing`) and print file/symbol only, never SQL
binds or environment values.

## Testing Requirements

- Initial fixture covers every currently discovered caller and all seven query
  classes while accepting only schema-valid, single-owner planned deltas.
- Current optimized callers and future planned deltas selected for telemetry
  each have one closed, globally unique key. Initial tests verify the temporary
  mapping without importing absent production; final tests require it gone and
  compare against the L02 production registry exactly.
- Simulate post-09 callers: an extra discovered caller fails until the same L01
  refreshes the reviewed record; final phase fails with any planned delta, stale
  digest, count mismatch, or absent final receipt.
- Add synthetic duplicate-owner, unknown-field, missing-bound, and missing-caller
  cases; each must fail deterministically.
- Pin handoffs for TASK-511, TASK-517, TASK-493, and TASK-518.
- Pin both planned records above. Mutating either owner, kind, bound, fingerprint,
  future symbol, or query shape fails initial inventory. The dependency record
  additionally rejects changes to tuple/root/byte caps, projection allowlist, or
  the one-statement `VALUES`/CTE shape; fixtures prove no bodies/data/password
  hashes are selected. Leaving a landed record planned, failing to discover its
  exact caller, or retaining the dependency delta without TASK-551-09-L01's
  reviewed final-removal evidence fails final inventory.
- Pin all 32 Admin planned IDs, symbols, owners, result bounds, budget IDs, and
  fingerprint keys from the table. Missing/extra/duplicate shape IDs, a
  statement merged into another inventory record, or initial counts other than
  exactly `34/32/2` fail. Final phase requires `0/0/0`.
- Assert no inventory string matches credential/URL/token/email patterns.
- Parse the shipped root `test:bun` command and prove every current or planned
  TASK-551 Bun suite is under an executed root (`tests/unit`,
  `tests/integration/routes`, `tests/integration/runtime`,
  `tests/integration/server`, `tests/integration/store`,
  `tests/integration/plugins`, `tests/integration/analytics`, `tests/perf`, or
  `tests/security`). A path under `tests/integration/database`,
  `tests/integration/assistant`, or any other targeted-only directory fails.
  Final phase also requires exact manifest/file equality. This test reads but
  never edits `package.json`.

## Security Contract

- No API route; internal tooling only.
- Auth, RBAC, CSRF, rate-limit, nonce/HMAC, and CAPTCHA contracts are unchanged.
- Strict reject-unknown inventory schema; bounded source roots; no arbitrary
  paths supplied by HTTP.
- Store statement families and source anchors only; never bind values or data.

## Validation Commands

- `bun test tests/perf/database-query-inventory.test.ts`
- `bun test tests/integration/server/task551BunLaneMembership.test.ts`
- Initial dispatch: `bun scripts/task-551-query-inventory.ts --check --phase initial`
- Final post-TASK-551-09 dispatch: `bun scripts/task-551-query-inventory.ts --check --phase final`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `git diff --check`

## Documentation Updates Required

No shared docs. TASK-551-10-L01 consumes the final receipt as a read-only gate;
TASK-551-10-L02 consumes its reviewed matrix summary.

## Quantified Acceptance

- Current scanner/inventory set equality is 100% in both phases; missing and
  extra current callers fail. Final phase also has zero planned deltas and a
  fresh exact-set receipt.
- Every record has exactly one writer and one terminal disposition.
- Final phase has exactly one fingerprint value source, zero production→test
  imports, and only caller-to-key associations in the inventory.
- Initial phase has exactly 34 planned deltas and 32/32 exact Admin
  statement-shape/budget mappings; final phase has none.
- Runtime is under 10 seconds on the repository source tree and produces zero
  secret/PII findings in its own redaction guard.
- Every Bun-owned TASK-551 test is included by the shipped default lane; final
  receipt has zero missing, extra, or targeted-only test paths.
