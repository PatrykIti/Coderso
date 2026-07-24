# TASK-551-09-L02: Page, Entry, Post, and SEO Invalidation
# FileName: TASK-551-09-L02-Page-Entry-Post-And-SEO-Invalidation.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-09
**Priority:** Critical
**Category:** Content / Cache / Transactions / SEO
**Estimated Effort:** Large
**Dependencies:** TASK-551-09-L01; TASK-551-03 query and TASK-551-06 revision
handoffs terminal; parent external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; closure only)

---

## Objective

Make every current page, entry, post and SEO mutation produce a complete,
deduplicated post-commit invalidation plan covering old/new identities and
dependent public list/detail/HTML families.

## Exclusive Ownership

Sole writer of:

- existing `core/services/pages/pageService.ts`;
- existing `core/services/content/entryService.ts` plus
  `core/services/content/entryServiceContract.ts`,
  `core/services/content/entryPersistence.ts`,
  `core/services/content/entryMutationService.ts`, and
  `core/services/content/entryRevisionService.ts`;
- existing `core/services/content/postsService.ts` plus
  `core/services/content/postDocumentContract.ts`,
  `core/services/content/postMutationService.ts`, and
  `core/services/content/postRevisionService.ts`;
- existing `core/services/seo/seoService.ts`;
- new `core/services/cache/contentMutationInvalidation.ts`;
- new `tests/integration/runtime/site-cache-page-entry-invalidation.test.ts`;
- new `tests/integration/runtime/site-cache-post-seo-invalidation.test.ts`;
- new `tests/vitest/cache/content-mutation-invalidation.test.ts`;
- existing `tests/unit/content/entryService.test.ts`,
  new `tests/unit/content/entryServiceMetadataAndRelations.test.ts`,
  new `tests/unit/content/entryServiceVisibilityAndRevisions.test.ts`,
  `tests/unit/content/postsService.test.ts`, `tests/unit/seo/seoService.test.ts`,
  new `tests/unit/seo/seoServicePersistence.test.ts`,
  and `tests/integration/posts/posts-revisions-flow.test.ts` for exact adoption
  assertions only.

This leaf is the sole TASK-551 writer for the whole entry/post facade, mutation
and revision adoption plus the whole current `seoService`. TASK-551-03 hands off
its verified set-based SEO query/batch specification without editing these files;
TASK-551-06 hands off its shared revision allocator/retention specification and
evidence without editing these domain files. Perform the cohesive split first,
preserve imports/re-exports, adopt those query/revision contracts, and leave every
resulting file below 1,000 lines. The canonical post module name is singular
`postMutationService.ts`; `postsMutationService.ts` must not be created.

Split the existing 2,084-line entry suite before adding assertions:
`entryService.test.ts` retains core CRUD/list/duplicate/delete facade behavior,
`entryServiceMetadataAndRelations.test.ts` owns metadata/taxonomy/media relation
validation, and `entryServiceVisibilityAndRevisions.test.ts` owns visibility,
password projections and shared revision/retention adoption. Split the existing
1,318-line SEO suite so `seoService.test.ts` owns pure normalization/analysis/
plan behavior and `seoServicePersistence.test.ts` owns transaction, bounded
query/list/audit and invalidation adoption. Shared fixtures may be extracted
only into a narrowly named L02-owned helper below 1,000 lines; every suite stays
independently runnable and no behavior assertion is dropped.

TASK-493 and TASK-517 source writers must be terminal or explicitly serialized;
then re-read and preserve their sitemap/GSC/current-SEO and entry-visibility
behavior. Never edit TASK-493 GSC schema/migrations/routes/Admin UI. Forbidden: `publicSite`,
site shell/settings/theme/menu/forms/listing/Admin, 07/08, TASK-511 backup,
migrations/packages/shared docs/tasks.

## Mutation Contract

- Create one opaque event key before each authoritative transaction. Inside the
  transaction capture narrow before/after projections, perform the mutation,
  build normalized tags and call 08-L02 `persistCacheInvalidationTx` in Redis
  mode. Return value plus plan; call `applyCacheInvalidationAfterCommit` only
  after the outer commit.
- Failed validation, DB rollback, missing delete and semantic no-op emit no plan.
  A committed mutation returns success even if immediate cache transport fails;
  durable Redis retry remains. A memory-mode bump failure immediately fences the
  affected local finite families so reads bypass until recovery; it is never
  represented as DB failure or allowed to reuse old bytes merely until TTL.
- Page plans map ID, old/new normalized slug, homepage/not-found selection,
  global page/navigation lists and rendered template dependencies to finite
  `site:pages`/`site:shell`/`site:all` generations.
- Entry plans map ID, content type, old/new slug/path, detail/list route,
  metadata/SEO and global/list dependencies to finite `site:entries`,
  `site:listings`, `site:html` and fallback site generations. Preserve TASK-517
  visibility cache exclusion.
- Post plans map ID, old/new slug, status, taxonomy/feed/list/detail and SEO to
  finite `site:posts`/`site:listings`/`site:html` generations.
- SEO mutations map target identity to finite owning content plus `site:html`
  generations and remove direct synchronous `clearSiteCache` calls. No v1
  record/slug/path generation key is created.
- Never invalidate before an outer transaction commits. Helpers accept the
  supplied transaction handle and do not fall back to global `db` inside it.
- Adopt TASK-551-03's handed-off set-based/narrow SEO reads and constant query
  budget (`<=5` for SEO summaries), and TASK-551-06's concurrency-safe shared
  revision allocator plus bounded revision reads/retention in the domain modules.
- Public Redis invalidation is bounded-eventual, not linearizable, under 08's
  <=250 ms polling, <=1 second p99 target, >5-second degraded/bypass signal and
  hard policy-TTL ceiling. Admin preview/read-after-write bypasses until event
  observation; security/private/nonce-bearing output remains excluded.

## Implementation Pseudocode

```ts
const committed = await db.transaction(async (tx) => {
  const before = await loadCacheProjection(tx, id);
  const value = await mutate(tx, input);
  if (isNoOp(before, value)) return { value, plan: null };
  const plan = buildContentMutationInvalidation({ eventKey, before, after: value });
  await persistCacheInvalidationTx(tx, plan, cacheBackend);
  return { value, plan };
});
if (committed.plan) await applyCacheInvalidationAfterCommit(committed.plan);
return committed.value;
```

Known domain/constraint errors retain their mappings. Cache plan/transport
errors are stable redacted codes and do not expose slugs/data in logs/outbox.

## Security Contract

- **Visibility/routes:** no route change; existing public reads/internal writes.
- **Auth/RBAC/CSRF/rate limits:** route enforcement is unchanged; service
  refactors cannot widen access.
- **Validation:** existing strict mutation schemas plus bounded canonical tags.
- **Secrets/privacy:** plans/outbox contain opaque IDs or digested path tags, no
  body, private content, SEO secret, bind value or user data.
- **Anti-abuse:** no new public write; TASK-517 gated output remains ineligible.

## Regression Shape and Validation

For each domain test create/publish/update body/update slug/delete/unpublish and
revision restore as applicable; prime old/new detail and list caches, then prove
post-commit miss/fresh bytes. Assert old and new slugs, homepage/404, feed/taxonomy
and SEO head dependencies. Inject rollback, no-op and Redis failure/outbox retry;
run memory and two-client Redis variants with owned DB fixtures only. Inject a
memory bump failure and prove its local family fence bypasses old values. Re-run
the handed-off SEO query-count and entry/post revision concurrency/bounded-read
assertions without weakening them.

```bash
set -a && source .env && set +a
bun run test:vitest -- tests/vitest/cache/content-mutation-invalidation.test.ts
SERVER_CACHE_BACKEND=memory bun test \
  tests/integration/runtime/site-cache-page-entry-invalidation.test.ts \
  tests/integration/runtime/site-cache-post-seo-invalidation.test.ts \
  tests/integration/runtime/pages-runtime.test.ts \
  tests/unit/content/entryService.test.ts \
  tests/unit/content/entryServiceMetadataAndRelations.test.ts \
  tests/unit/content/entryServiceVisibilityAndRevisions.test.ts \
  tests/unit/content/postsService.test.ts \
  tests/unit/seo/seoService.test.ts \
  tests/unit/seo/seoServicePersistence.test.ts \
  tests/integration/posts/posts-revisions-flow.test.ts
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-09-l02 bun test \
  tests/integration/runtime/site-cache-page-entry-invalidation.test.ts \
  tests/integration/runtime/site-cache-post-seo-invalidation.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/pages/pageService.ts \
  core/services/content/{entryService,entryServiceContract,entryPersistence,entryMutationService,entryRevisionService,postsService,postDocumentContract,postMutationService,postRevisionService}.ts \
  core/services/seo/seoService.ts core/services/cache/contentMutationInvalidation.ts \
  tests/unit/content/{entryService,entryServiceMetadataAndRelations,entryServiceVisibilityAndRevisions}.test.ts \
  tests/unit/content/postsService.test.ts \
  tests/unit/seo/{seoService,seoServicePersistence}.test.ts \
  tests/integration/posts/posts-revisions-flow.test.ts \
  tests/vitest/cache/content-mutation-invalidation.test.ts \
  tests/integration/runtime/site-cache-{page-entry,post-seo}-invalidation.test.ts
```

Re-run every TASK-493 current-SEO/sitemap and TASK-517 entry-visibility test named
by the terminal handoffs. Docs and changelog remain 10-L02 ownership.
