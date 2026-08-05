# TASK-551-05-L02: Sanitized EXPLAIN Plan and Constraint Verification
# FileName: TASK-551-05-L02-Sanitized-Explain-Plan-And-Constraint-Verification.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-05
**Priority:** Critical
**Category:** Database / Performance / Test Integrity
**Estimated Effort:** Large
**Dependencies:** TASK-551-05-L01
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Create reproducible small/large EXPLAIN evidence and direct constraint race
tests for every L01 index/constraint. Evidence is sanitized before persistence,
uses synthetic fixtures, compares plans and rows rather than brittle total-cost
strings, and fails when a promised hot query regresses.

## Sub-Tasks

None; this is an executable leaf.

## File Ownership

**Allowlist:** `scripts/task-551-explain-plans.ts`,
`tests/perf/fixtures/task551QueryPlanContracts.ts`,
`tests/perf/database-explain-plans.test.ts`, and
`tests/integration/server/task551ConcurrencyConstraints.test.ts` only.

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

type TrigramSelectionReceipt = StrictReadonly<Record<
  "pages" | "entries" | "posts" | "media" | "users",
  null | { column: "search_trigram_text"; index: string; opclass: "gin_trgm_ops";
    normalizationDigest: string; largePlanPassed: true; writeCostPassed: true }
>>;

const EXPECTED_TASK551_CATALOG = strictReadonly({
  // Copy the complete literal L01 mandatory index/constraint/check names and
  // definitions; append only the selected (non-null) trigram column/index pairs.
  indexes: EXACT_L01_INDEX_ROWS,
  constraints: EXACT_L01_CONSTRAINT_ROWS,
  outboxColumns: EXACT_L01_OUTBOX_COLUMNS,
  migrationOperationColumns: EXACT_L01_MIGRATION_OPERATION_COLUMNS,
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
  assertExactGeneratedExpressions(actual, expected.vectorExpressions);
  await assertGeneratedExpressionVolatility(db, expected.immutableProcSignatures);
  await assertBookingExclusionCustomSeam(db, expected.bookingExclusion);
  await assertOnlineIndexManifestParity(db, expected.onlineIndexManifest);
  assertNoUnexpectedTask551Object(actual, expected);
}

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

async function raceRevisionInsert(parentId: string, attempts: number): Promise<RaceOutcome> {
  // Unique synthetic parent, synchronized starts, allSettled, scoped cleanup.
}
```

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
  role-leading traversal, five revision constraints,
  booking check/exclusion, every outbox column/check/index including
  `cache_outbox_unprocessed_age_idx`, and only selected
  trigram pairs; exact registry/catalog set equality rejects missing and extra
  objects.
- Verify all new snapshot indexes are exact members of the non-transactional
  manifest, absent from transactional index DDL, and ready/valid in the live
  catalog. Consume L01's crash-after-each-member, resume/rollback, threshold,
  exact group/order/barrier receipt, drain/activity-visibility receipt, rehearsal
  50-way revision-race receipt, and 16-controlled-writer read-performance receipt
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
- Race 50 synchronized raw synthetic inserts at the same parent/version for each
  page/entry/post/widget/detail-page constraint, plus 50 overlapping/non-
  overlapping booking inserts. This verifies database constraints only—service
  allocation is owned by TASK-551-06/09. Only invariant-compatible rows commit
  and cleanup deletes only fixture-owned rows.
- Snapshot sanitizer tests inject emails, tokens, SQL, bind values, and plan
  fields; zero forbidden values survive output.
- Mutation fixtures alter one vector weight/JSON cast, index direction/predicate,
  booking status/custom descriptor byte, outbox nullability/default/state
  branch, function volatility, and add one extra TASK-551-prefixed index; each
  exact-set verifier fails deterministically.
- Re-run each named failing perf file alone before classifying a failure.

## Security Contract

- Internal test/tooling only; no route, auth, RBAC, CSRF, rate-limit,
  nonce/HMAC, or CAPTCHA changes.
- Static allowlisted statements and synthetic fixture IDs only. Never accept
  arbitrary SQL, production binds, unredacted customer data, or credentials.
- Receipt validation accepts only the fixed task path and repository-relative
  artifact paths/digests; it never records database URLs, environment dumps,
  credentials, binds, or customer data.
- Persist statement family, catalog/index names, counters, timing, and sanitized
  plan shape only; raw EXPLAIN output stays ephemeral.
- Interval evidence persists query IDs/fingerprint/source class and numeric
  deltas only. It neither resets shared stats nor stores statement text, binds,
  application/role names, diagnostic patterns, host/database identity, or rows.

## Validation Commands

- `set -a && source .env && set +a && bun test tests/perf/database-explain-plans.test.ts`
- `set -a && source .env && set +a && bun test tests/perf/database-pg-stat-interval.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/server/task551ConcurrencyConstraints.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/server/task551OnlineIndexDeployment.test.ts`
- `set -a && source .env && set +a && TASK551_OFFLINE_SINGLE_ACK=all-coderso-processes-stopped bun scripts/task-551-online-indexes.ts rollout-forward --receipt .tmp/task551-migration-receipt.json --admission-mode offline-single`
- Repeat the exact `rollout-forward` command (mandatory zero-DDL/zero-transition catalog idempotence rerun)
- `set -a && source .env && set +a && bun scripts/task-551-online-indexes.ts status --receipt .tmp/task551-migration-receipt.json`
- `set -a && source .env && set +a && bun scripts/task-551-explain-plans.ts --scale small --check`
- `set -a && source .env && set +a && bun scripts/task-551-explain-plans.ts --scale large --check`
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
- Page/entry/typed-entry/post-author, reverse-role, post-tag, media-AND-tag, and
  webhook list/event large cases use their exact L01 indexes and matching
  production predicate bytes with bounded rows/buffers and measured write/
  storage cost.
- The large oldest-unprocessed outbox case uses its exact partial age index and
  observes claimed/backed-off rows; it never reports age from only claimable
  rows.
- Trigram selection receipt and live schema/catalog/fallback contract have 100%
  set and byte/expression identity for all five selected-or-null sources.
- Fifty-way races preserve all five revision uniqueness families and booking
  exclusion with zero duplicate/partial state; fixture cleanup is scope-local.
- Clean/prior/rollback/forward custom-exclusion paths pass, and the documented
  snapshot limitation has exact descriptor/migration/live-catalog parity with
  zero generated duplicate-add or drop operations.
- Pre-decision/before/after stats receipts use unchanged identities and no reset;
  only application traffic is eligible, while external-diagnostic/unknown rows
  (including the polluted five-family sample) remain separate and excluded.
