# TASK-537-02-L01: Narrow Update, Publish, and Delete Projections

# FileName: TASK-537-02-L01-Narrow-Update-Publish-And-Delete-Projections.md

**Parent Task:** TASK-537
**Parent Subtask:** TASK-537-02
**Priority:** High
**Category:** Entry Service / Transactions / Security
**Estimated Effort:** Large
**Dependencies:** TASK-537-01-L01, TASK-537-01-L02
**Status:** ⏳ To Do
**Changelog:** 1249 (pinned; create only at implementation closure)

---

## Scope

Implement the single outer metadata transaction and explicit minimal projections in
entryService.ts. Despite the historical leaf title, atomic coordination and projections
must land together because this is the sole entryService writer.

## Source ownership

This leaf is the only TASK-537 writer of
core/services/content/entryService.ts. It must not add a projection/preparation helper
module: named projections and orchestration stay in this sole owner under YAGNI. It must not edit taxonomyService.ts,
seoService.ts or route source. It owns compatibility/changed-behavior updates required
before its gate in `tests/unit/content/entryService.test.ts`,
`tests/integration/routes/contentEntriesRoutes.test.ts`, and
`tests/integration/runtime/detail-page-preview-cache.test.ts`; it must not edit other
tests, docs, task indexes, or changelog files.

## Projection contract

Define auditable named projection objects for each query shape:

- mutation lookup: only id, typeId, slug, title, status, data, publishedAt, scheduledAt,
  visibility, tags, timestamps, and a SQL-derived hasPassword boolean;
- publish result/cache: id, typeId, slug, status, publishedAt, scheduledAt, updatedAt;
- delete consumer: id and title only;
- updateEntry: no returning clause when its result is unused.

No projection includes contentEntries.accessPassword. Do not fetch a full row and strip
the secret afterward.

## Implementation Pseudocode

~~~ts
import {
  applyEntryTaxonomyMutation,
  prepareEntryTaxonomyMutation,
  type EntryTaxonomyPlan,
} from "./taxonomyService";
import {
  applyPreparedSeoMutationWithExecutor,
  prepareSeoMutationWithExecutor,
  type PreparedSeoMutation,
} from "../seo/seoService";

async function loadEntryMutationState(executor, entryId) {
  return executor.select({
    ...ENTRY_MUTATION_FIELDS,
    hasPassword: sql<boolean>(access_password IS NOT NULL),
  }).from(contentEntries).where(id).limit(1);
}

async function publishEntryTx(tx, entry, actorId) {
  validate schema/relation/media through tx using explicit entry state;
  create revision through tx;
  update status and return ENTRY_CACHE_FIELDS only;
  // no transaction nesting and no cache invalidation
}

async function updateEntryMetadata(entryId, input, actorId?) {
  committed = await db.transaction(async tx => {
    entry = await loadEntryMutationState(tx, entryId);
    require entry;

    validate schedule/status/actor/visibility/password requirement;
    preparedHash = input password ? await hashPassword(input password) : absent;
    taxonomyPlan: EntryTaxonomyPlan | null = input taxonomy
      ? await prepareEntryTaxonomyMutation(tx, ...)
      : null;
    seoPlan: PreparedSeoMutation | null = input seo
      ? await prepareSeoMutationWithExecutor(tx, normalized SEO input)
      : null;
    validate publish content/relation/media before first write;

    // only now begin writes
    if transition to published: await publishEntryTx(tx, entry, actorId);
    else apply status/schedule through tx;
    if taxonomyPlan: await applyEntryTaxonomyMutation(tx, taxonomyPlan);
    derive tags from plan or normalized direct tags without global DB read;
    update visibility/hash/tags/schedule with no broad returning;
    if seoPlan: await applyPreparedSeoMutationWithExecutor(tx, seoPlan);

    return ENTRY_CACHE_FIELDS plus public result identity;
  });

  if committed changed:
    invalidate entry/site/admin caches and broadcast only after commit;
  return getEntry(entryId);
}

updateEntry(...) {
  explicit lookup with no hash;
  validate;
  await update(...); // omit unused returning()
  preserve SEO behavior and final getEntry projection;
}

publishEntry(...) {
  use explicit mutation lookup and publishEntryTx;
  invalidate only after transaction commit;
}

deleteEntry(...) {
  delete...returning({id, title});
}
~~~

Use these exact named imports and relative module paths, merging them into the existing
taxonomy/SEO import declarations. Remove the superseded coordinator imports only after
all existing call sites are migrated; do not copy helper bodies or plan types into
`entryService.ts`.

All known rejectable values must be prepared before the first write. If hashing can
fail, it happens in that preparation phase. Reads inside the transaction do not violate
the rule; no status/revision/taxonomy write may precede taxonomy/SEO validation.

## Error, cache, and rollback contract

Preserve existing machine-readable entry/taxonomy/SEO errors. Any thrown validation,
hashing, DB, or injected seam error rolls back status, revision, assignments, tags,
visibility/hash, schedule, and SEO together. It emits no cache clear/broadcast. Successful
change emits the existing invalidation once after commit; a failed post-commit cache
operation must not pretend the DB rolled back.

## Compatibility

No endpoint, permission, DDL, public response, or schema-version change. Existing
hasPassword remains the only exposed password-state signal. Delete keeps id/title for
assistant/action consumers. Standalone publish/update/delete callers retain stable return
shapes where those shapes are documented.

## Regression-test shape

This leaf updates its three named entry/route/cache suites before the source gate.
Required cases:

- draft plus requested publish plus invalid taxonomy leaves status/revisions unchanged;
- valid taxonomy plus invalid SEO leaves every domain table unchanged;
- injected DB failure after each write seam rolls back earlier writes;
- deferred taxonomy and SEO apply promises keep the transaction unresolved and emit no
  cache event until awaited completion; rejection before resolution rolls back all state;
- successful metadata mutation commits every field and invalidates once afterward;
- query/projection spy proves accessPassword is absent from selected/returned columns;
- update has no returning, delete returns id/title, publish returns cache fields;
- password visibility preserve/replace/clear behavior remains correct;
- TASK-517’s future narrow hash loader remains the only permitted internal secret read.

The taxonomy and SEO suites are read-only inputs to this leaf's gate because their
owners updated them in TASK-537-01. TASK-537-03-L01 owns only additive cross-domain DB
fault/rollback cases and final reruns; it cannot re-baseline these source-owner proofs.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/content/entryService.test.ts \
  tests/unit/content/taxonomyService.test.ts \
  tests/unit/seo/seoService.test.ts \
  tests/integration/routes/contentEntriesRoutes.test.ts \
  tests/integration/runtime/detail-page-preview-cache.test.ts
~~~

Re-run a named failure alone before classifying it.

## Acceptance criteria

- updateEntryMetadata owns one transaction and one after-commit invalidation phase.
- No audited query materializes accessPassword.
- Every known validation completes before the first write.
- Rollback restores all entry/taxonomy/SEO/revision state.
