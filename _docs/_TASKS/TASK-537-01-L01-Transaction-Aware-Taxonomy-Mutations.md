# TASK-537-01-L01: Transaction-Aware Taxonomy Mutations

# FileName: TASK-537-01-L01-Transaction-Aware-Taxonomy-Mutations.md

**Parent Task:** TASK-537
**Parent Subtask:** TASK-537-01
**Priority:** High
**Category:** Taxonomy Domain / Transactions
**Estimated Effort:** Medium
**Dependencies:** TASK-514, TASK-541
**Status:** ⏳ To Do
**Changelog:** 1249 (pinned; create only at implementation closure)

---

## Scope

Split taxonomy replacement into validation/preparation and application helpers that use
the caller-provided executor for every read and write. Preserve the existing public
replaceEntryTaxonomies wrapper for standalone callers.

## Source ownership

This leaf is the sole TASK-537 writer of
core/services/content/taxonomyService.ts and owns the compatibility/changed-behavior
updates required before its gate in
`tests/unit/content/taxonomyService.test.ts`. It must not edit entryService.ts,
seoService.ts, other tests, routes, docs, tasks, or changelog indexes.

## Implementation Pseudocode

~~~ts
export type EntryTaxonomyPlan = {
  entryId: string;
  typeId: string;
  taxonomyIdsToClear: string[];
  category: ContentTerm | null;
  tags: ContentTerm[];
  assignmentTermIds: string[];
  resolvedTagNames: string[];
};

export async function prepareEntryTaxonomyMutation(executor, entryId, typeId, input) {
  taxonomies = await listTaxonomiesWithExecutor(executor, typeId);
  validate category/tag taxonomy availability;
  normalize/dedupe requested IDs;
  termRows = await executor.select explicit fields for all requested IDs;
  reject missing or wrong-taxonomy terms before any write;
  resolve taxonomy IDs to clear and stable tag-name order;
  return immutable EntryTaxonomyPlan;
}

export async function applyEntryTaxonomyMutation(executor, plan: EntryTaxonomyPlan) {
  query current term IDs in plan.taxonomyIdsToClear through executor;
  delete only this entry's assignments for those taxonomies;
  insert plan.assignmentTermIds with deterministic dedupe;
  return category/tags/resolvedTagNames from the validated plan;
}

async function replaceEntryTaxonomies(entryId, typeId, input) {
  return db.transaction(async tx => {
    plan = await prepareEntryTaxonomyMutation(tx, ...);
    return applyEntryTaxonomyMutation(tx, plan);
  });
}
~~~

`ContentTerm` is the existing exported taxonomy term type in this owner; do not add an
`EntryTaxonomyTerm` alias. These three names are the exact public service seam consumed by `entryService.ts`:
`EntryTaxonomyPlan`, `prepareEntryTaxonomyMutation`, and
`applyEntryTaxonomyMutation`. Export them directly from `./taxonomyService`; do not
hide them behind a default export, rename them in the coordinator, or create a second
plan shape. The existing standalone wrapper remains exported under its current name.

All helpers use explicit projections. The preparation plan contains public taxonomy
fields only and is not a cache object. If concurrency requires revalidation, perform it
through the same executor before the first write; do not reopen a nested transaction.

## Errors and compatibility

Preserve taxonomy_category_disabled, taxonomy_tag_disabled, taxonomy_term_missing, and
taxonomy_term_invalid. A preparation error writes nothing. Assignment insert/delete
failure rejects the caller transaction. Standalone behavior and return shape remain.
No global-table cleanup is permitted in tests.

## Regression-test shape

This leaf updates `tests/unit/content/taxonomyService.test.ts` before its source gate.
Add executor spies proving every validation read and
write uses the supplied transaction, no nested db.transaction runs, invalid input writes
nothing, and the public wrapper still commits category/tags. A composed rollback test
must fault after taxonomy application and prove assignments revert. The taxonomy test
imports `ContentTerm`, the exact exported plan type, and both helper names directly from
`core/services/content/taxonomyService.ts`; this compile-time import is part of the
contract proof.

TASK-537-03-L01 may add composed cross-domain rollback cases after this gate but cannot
re-baseline these executor/helper assertions.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/content/taxonomyService.test.ts
~~~

Re-run the file once alone before declaring a failure.

## Acceptance criteria

- Entry metadata can prepare and apply taxonomy state inside its one transaction.
- No helper reads from global db while writing through a caller transaction.
- Known taxonomy validation errors occur before the first composed write.
