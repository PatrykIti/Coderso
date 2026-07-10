# TASK-537-01-L02: Transaction-Aware SEO Mutations

# FileName: TASK-537-01-L02-Transaction-Aware-Seo-Mutations.md

**Parent Task:** TASK-537
**Parent Subtask:** TASK-537-01
**Priority:** High
**Category:** SEO Domain / Transactions / Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-537-01-L01
**Status:** ⏳ To Do
**Changelog:** 1249 (pinned; create only at implementation closure)

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
export type SeoAnalysis = ReturnType<typeof analyzeSeoDocument>;

export type PreparedSeoMutation = {
  targetType: SeoTargetType;
  targetId: string;
  existingId: string | null;
  slug: string | null;
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  analysis: SeoAnalysis;
};

export function prepareSeoMutation(input: SeoUpsertInput, existing: SeoDocument | null) {
  normalize bounded nullable text;
  normalize/validate canonical URL and robots;
  merge absent keys from existing without injecting write defaults;
  compute analysis deterministically;
  return immutable plan;
}

export async function getSeoDocumentByTargetWithExecutor(executor, targetType, targetId) {
  select explicit SEO columns only;
}

export async function prepareSeoMutationWithExecutor(
  executor,
  input: SeoUpsertInput
): Promise<PreparedSeoMutation> {
  existing = await get...WithExecutor(executor, ...);
  return prepareSeoMutation(input, existing); // every normalization/error occurs here
}

export async function applyPreparedSeoMutationWithExecutor(
  executor,
  plan: PreparedSeoMutation
) {
  update by plan.existingId or insert the already-prepared values through executor;
  return mapped SEO document;
  // no input normalization, validation, lookup, nested tx, or cache effect
}

export async function upsertSeoDocumentWithExecutor(executor, input) {
  plan = await prepareSeoMutationWithExecutor(executor, input);
  return applyPreparedSeoMutationWithExecutor(executor, plan);
}

async function upsertSeoDocument(input) {
  plan = await prepareSeoMutationWithExecutor(db, input);
  result = await applyPreparedSeoMutationWithExecutor(db, plan);
  if result: clearSiteCache exactly once after successful DB operation;
  return result;
}
~~~

The exact coordinator seam exported from `../seo/seoService` is
`SeoAnalysis`, `PreparedSeoMutation`, `prepareSeoMutationWithExecutor`, and
`applyPreparedSeoMutationWithExecutor`. The pure `prepareSeoMutation`, executor-aware
read helper, and standalone executor wrapper are exported for direct service regression
proof, but `entryService.ts` imports only the plan type and the two coordinator helpers.
Do not introduce aliases or duplicate the plan in the entry service.

The composed entry transaction calls `prepareSeoMutationWithExecutor` before any
entry/taxonomy write and later calls only `applyPreparedSeoMutationWithExecutor` through
the same tx. Cache invalidation is absent from both internal helpers and must not be
supplied as an optional callback that could fire early.

## Errors and compatibility

Canonical/robots/text validation errors are stable and happen before composed writes.
DB errors reject the transaction. Existing public service signature and mapped return
shape remain. Standalone cache behavior stays once-after-success; null/no-op does not
emit a false invalidation.

## Regression-test shape

This leaf updates `tests/unit/seo/seoService.test.ts` before its source gate. Prove pure
preparation normalization, executor use for the
pre-write read and later write, that apply accepts only a prepared plan and cannot throw a
normalization error, zero clearSiteCache calls in internal helpers, exactly one call in
the standalone wrapper after success, none on failure, and outer rollback after a DB
fault at the SEO apply seam. Import the exact `SeoAnalysis`/plan types, pure preparation,
executor read/preparation/application, and executor wrapper names directly in
`tests/unit/seo/seoService.test.ts` so missing/renamed exports fail the targeted gate.

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
