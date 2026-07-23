# TASK-537-01-L02: Transaction-Aware SEO Mutations

# FileName: TASK-537-01-L02-Transaction-Aware-Seo-Mutations.md

**Parent Task:** TASK-537
**Parent Subtask:** TASK-537-01
**Priority:** High
**Category:** SEO Domain / Transactions / Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-537-01-L01
**Status:** ✅ Done
**Started:** 2026-07-12
**Completed:** 2026-07-12
**Changelog:** 1249

---

## Scope

Extract executor-aware SEO preparation from application so the entry coordinator can
complete every rejectable read/normalization before its first write. The apply seam never
opens a transaction, renormalizes input, or clears site cache. Keep upsertSeoDocument as
the standalone prepare→apply→cache-after-success wrapper.

## Source ownership

This leaf is the sole TASK-537 writer of core/services/seo/seoService.ts and owns the
compatibility/changed-behavior updates required before its gate in
`tests/unit/seo/seoService.test.ts`. It must not edit entryService.ts,
taxonomyService.ts, cache modules, other tests, routes, docs, task indexes, or changelog
files.

## Implementation Pseudocode

~~~ts
type SeoExecutor = Pick<typeof db, "select" | "insert" | "update">;

const SEO_DOCUMENT_FIELDS = {
  id: seoDocuments.id,
  targetType: seoDocuments.targetType,
  targetId: seoDocuments.targetId,
  slug: seoDocuments.slug,
  title: seoDocuments.title,
  description: seoDocuments.description,
  canonicalUrl: seoDocuments.canonicalUrl,
  robots: seoDocuments.robots,
  score: seoDocuments.score,
  status: seoDocuments.status,
  issues: seoDocuments.issues,
  lastAuditAt: seoDocuments.lastAuditAt,
  createdAt: seoDocuments.createdAt,
  updatedAt: seoDocuments.updatedAt,
} as const;

type MutableSeoAnalysis = ReturnType<typeof analyzeSeoDocument>;
export type SeoAnalysis = Readonly<
  Omit<MutableSeoAnalysis, "issues"> & {
    readonly issues: readonly SeoIssue[];
  }
>;

export type PreparedSeoMutation = Readonly<{
  targetType: SeoTargetType;
  targetId: string;
  existingId: string | null;
  slug: string | null;
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  analysis: SeoAnalysis;
}>;

function freezeSeoAnalysis(input: MutableSeoAnalysis): SeoAnalysis {
  return Object.freeze({
    ...input,
    issues: Object.freeze(
      input.issues.map(issue => Object.freeze({ ...issue }))
    ),
  });
}

export function prepareSeoMutation(
  input: SeoUpsertInput,
  existing: SeoDocument | null
): PreparedSeoMutation {
  // Existing-row compatibility is deliberately field-specific.
  const slug = existing ? (input.slug ?? existing.slug) : (input.slug ?? null);
  const title =
    existing && input.title === undefined
      ? existing.title
      : normalizeNullableText(input.title); // trim; blank -> null; no new length policy
  const description =
    existing && input.description === undefined
      ? existing.description
      : normalizeNullableText(input.description); // trim; blank -> null; no new length policy
  const canonicalUrl =
    existing && input.canonicalUrl === undefined
      ? existing.canonicalUrl // preserve exact stored bytes; do not revalidate an omitted value
      : normalizeCanonicalForStorage(input.canonicalUrl);
  const robots =
    existing && input.robots === undefined
      ? existing.robots // preserve exact stored bytes; do not revalidate an omitted value
      : normalizeRobotsForStorage(input.robots);
  const analysis = freezeSeoAnalysis(
    analyzeSeoDocument({ title, description, canonicalUrl, robots })
  );

  return Object.freeze({
    targetType: input.targetType,
    targetId: input.targetId,
    existingId: existing?.id ?? null,
    slug,
    title,
    description,
    canonicalUrl,
    robots,
    analysis,
  });
}

export async function getSeoDocumentByTargetWithExecutor(
  executor: SeoExecutor,
  targetType: SeoTargetType,
  targetId: string
): Promise<SeoDocument | null> {
  row = await executor.select(SEO_DOCUMENT_FIELDS)...;
  return row ? mapDocument(row) : null;
}

export async function prepareSeoMutationWithExecutor(
  executor: SeoExecutor,
  input: SeoUpsertInput
): Promise<PreparedSeoMutation> {
  existing = await get...WithExecutor(executor, ...);
  return prepareSeoMutation(input, existing); // every normalization/error occurs here
}

export async function applyPreparedSeoMutationWithExecutor(
  executor: SeoExecutor,
  plan: PreparedSeoMutation
): Promise<SeoDocument | null> {
  update by plan.existingId or insert already-prepared values through executor;
  use returning(SEO_DOCUMENT_FIELDS), then mapDocument(row);
  // no input normalization, validation, lookup, nested tx, or cache effect
}

export async function upsertSeoDocumentWithExecutor(
  executor: SeoExecutor,
  input: SeoUpsertInput
): Promise<SeoDocument | null> {
  plan = await prepareSeoMutationWithExecutor(executor, input);
  return applyPreparedSeoMutationWithExecutor(executor, plan);
}

export async function upsertSeoDocument(
  input: SeoUpsertInput
): Promise<SeoDocument | null> {
  plan = await prepareSeoMutationWithExecutor(db, input);
  result = await applyPreparedSeoMutationWithExecutor(db, plan);
  if result: clearSiteCache exactly once, synchronously, after awaited DB success;
  return result;
}
~~~

`SeoExecutor` is local to this service and intentionally exposes only the three Drizzle
operations needed by this seam. Both the global `db` client and its transaction callback
must satisfy it structurally. Neither internal helper receives `transaction`, a cache
callback, or another escape hatch.

`SEO_DOCUMENT_FIELDS` is one named projection reused by the executor-aware read and both
update/insert `returning` paths. It contains exactly the fourteen `SeoDocument` fields
shown above; do not fall back to `select()` or `returning()` without a projection. Update
preserves `createdAt` and `lastAuditAt`, refreshes `updatedAt`, and returns the same mapped
shape as before. Insert continues to receive DB-owned timestamps/defaults. A missing
update row returns `null` and produces no cache effect.

The frozen contract is runtime-enforced, not documentation-only: the outer plan, its
analysis object, copied `issues` array, and every copied issue object are all frozen. Apply consumes that exact
plan and must not clone in unvalidated author input, normalize again, or mutate it.

The exact coordinator seam exported from `../seo/seoService` is
`SeoAnalysis`, `PreparedSeoMutation`, `prepareSeoMutationWithExecutor`, and
`applyPreparedSeoMutationWithExecutor`. The pure `prepareSeoMutation`, executor-aware
read helper, and standalone executor wrapper are exported for direct service regression
proof, but `entryService.ts` imports only the plan type and the two coordinator helpers.
Do not introduce aliases or duplicate the plan in the entry service.

The composed entry transaction calls `prepareSeoMutationWithExecutor` before any
entry/taxonomy write and later calls only `applyPreparedSeoMutationWithExecutor` through
the same tx. Cache invalidation is absent from both internal helpers and must not be
supplied as an optional callback that could fire early. The exported executor wrapper is
also cache-silent. Only the existing standalone `upsertSeoDocument(input)` wrapper clears
the site cache, once after a non-null awaited result; a thrown DB error or `null` result
clears it zero times. Do not add a public dependency argument or test-only production API
solely to spy on cache behavior.

## Errors and compatibility

Title and description keep their current trim/blank-to-null behavior and gain no length
bound or new error. For an existing row, `undefined` preserves either field while an
explicit `null` or blank string clears it. Existing-row slug preserves the current
`input.slug ?? existing.slug` rule, so both `undefined` and `null` preserve it; insert
still maps an absent/null slug to `null`.

For canonical URL and robots, an omitted (`undefined`) existing-row field is copied
byte-for-byte and is not revalidated. An explicit `null` or blank string clears it; an
explicit invalid nonblank value still throws `seo_canonical_invalid` or
`seo_robots_invalid` during preparation. Insert uses the same explicit-value rules and
maps absence to `null`. Those two stable validation errors happen before composed writes.
DB errors reject the caller transaction. Existing public service signature and complete
mapped return shape remain compatible.

## Regression-test shape

This leaf updates `tests/unit/seo/seoService.test.ts` before its source gate. Import the
exact `SeoAnalysis`/plan types, pure preparation, executor
read/preparation/application, and executor wrapper names directly so a missing or renamed
export fails compilation.

The test implementation is concrete:

- Use unconditional `test(...)` cases (not `testIfDb`) for the pure preparation matrix:
  insert vs existing row; every field omitted; slug `undefined`/`null`; title/description
  `undefined`/`null`/blank/trimmed; canonical/robots `undefined` preserving deliberately
  non-canonical stored bytes, explicit `null`/blank clearing, valid trimming, and explicit
  invalid values throwing the stable errors. Keep the pure helper focused on returned
  plans/errors; use a recording executor around `prepareSeoMutationWithExecutor` to prove
  invalid preparation reaches no write builder. Do not invent title/description max-length expectations.
- Assert `Object.isFrozen` for the plan, analysis, and copied issues array; attempted
  mutation must not alter the values later applied.
- For DB cases, allocate a unique UUID target per case and clean up only rows that case
  owns in `finally`; never truncate or delete another fixture's rows. Insert a target row
  through `tx`, then prepare it before commit. Seeing that transaction-local row proves
  the supplied executor, rather than global `db`, owns the pre-write read. Apply through
  the same `tx`, deliberately reject the transaction, and assert the row/update rolled
  back.
- Use an instrumented executor/query-builder double whose `returning()` is held by a
  deferred promise. While it is unresolved, assert the executor wrapper is unresolved
  and a seeded site-cache sentinel remains. Resolve it and assert the mapped result while
  the sentinel still remains; reject it and assert propagation plus the same zero-cache
  behavior. This proves internal read/write awaiting without adding a production seam.
- Exercise real insert and update branches with `SEO_DOCUMENT_FIELDS`: assert the exact
  fourteen-key result, `createdAt`/`updatedAt` Date values, preservation of an authored
  `lastAuditAt` on update, refreshed `updatedAt`, and `null` for a missing update row in
  `applyPreparedSeoMutationWithExecutor`/`upsertSeoDocumentWithExecutor`.
  Apply receives only a frozen prepared plan and performs no normalization lookup/error.
- Seed a real site-cache sentinel before standalone success and failure. Success clears it
  only after the DB result and DB rejection leaves it intact. Prove the standalone
  null-result guard and exact single `clearSiteCache()` call, plus zero internal calls,
  with one narrow structural TypeScript-AST assertion over the named function bodies;
  do not attempt an ambiguous live-export spy or expose a production dependency solely
  for the test. Runtime null-result behavior belongs to the executor wrapper above.
- Fault the SEO apply operation inside a real outer transaction and prove the owned SEO
  row returns to its pre-transaction state. Re-run this named DB case in isolation if it
  fails under load.

DB-backed cases remain `testIfDb`; the pure matrix remains unconditional once the command
has loaded the repo environment required by this DB-coupled module.

TASK-537-03-L01 may add composed cross-domain rollback/cache cases after this gate but
cannot re-baseline these helper and standalone-wrapper assertions.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 tests/unit/seo/seoService.test.ts
~~~

Re-run the file alone before declaring a failure.

## Acceptance criteria

- Entry metadata can apply SEO inside its transaction without early cache effects.
- All rejectable SEO normalization is available before the first composed write.
- Standalone callers retain their current API and cache-after-success semantics.
