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

## Overview

Make every current page, entry, post and SEO mutation produce a complete,
deduplicated post-commit invalidation plan covering old/new identities and
dependent public list/detail/HTML families. Old/new identities are inputs to a
pure selector only; the resulting plan contains no record identity.

## Sub-Tasks

None. This file is an executable leaf under TASK-551-09.

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
- existing oversized `tests/integration/runtime/pages-runtime.test.ts` solely for
  its cohesive replacement and deletion, plus new exact split files
  `tests/integration/runtime/pages-runtime-fixtures.ts`,
  `tests/integration/runtime/pages-runtime-rendering.test.ts`,
  `tests/integration/runtime/pages-runtime-collections.test.ts`,
  `tests/integration/runtime/pages-runtime-routing-preview.test.ts`, and
  `tests/integration/runtime/pages-runtime-responsive-cache.test.ts`;
- existing `tests/unit/pages/pageService.test.ts` for exact page mutation and
  invalidation adoption assertions;
- existing `tests/unit/content/entryService.test.ts`,
  new `tests/unit/content/entryServiceMetadataAndRelations.test.ts`,
  new `tests/unit/content/entryServiceVisibilityAndRevisions.test.ts`,
  `tests/unit/content/postsService.test.ts`, `tests/unit/seo/seoService.test.ts`,
  new `tests/unit/seo/seoServicePersistence.test.ts`,
  and `tests/integration/posts/posts-revisions-flow.test.ts` for exact adoption
  assertions only.
- terminal TASK-493 backend regression suites
  `tests/vitest/seo/seoSearchPerformanceTypes.test.ts`,
  `tests/vitest/seo/sitemapBuilder.test.ts`,
  `tests/vitest/seo/seoPerformanceAggregation.test.ts`,
  `tests/integration/integrations/gscClient.test.ts`,
  `tests/integration/routes/sitemap.test.ts`,
  `tests/integration/routes/seo-sitemap.test.ts`,
  `tests/integration/routes/seo-sync.test.ts`,
  `tests/integration/routes/seo-performance.test.ts`,
  `tests/integration/routes/seo-pipeline.test.ts`,
  `tests/integration/routes/seo.test.ts`,
  `tests/security/gsc-credential.test.ts`,
  `tests/security/seo-sitemap.test.ts`,
  `tests/security/seo-sync.test.ts`,
  `tests/security/seo-pipeline.test.ts`, and
  `tests/perf/seo-sitemap.test.ts`, only to preserve the terminal current-SEO,
  sitemap, sync, secret/RBAC/CSRF, pipeline and performance contracts after the
  service handoff. TASK-493's Admin-only UI suite remains outside this backend
  leaf and is not edited.

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
query/list/audit and invalidation adoption. Do not extract a new shared test helper:
keep narrowly scoped builders/fixtures inside their exact owning suite so the
allowlist and line-count manifest remain closed. Every suite stays independently
runnable and no behavior assertion is dropped.

Before changing page runtime behavior, delete the 2,078-line monolithic
`pages-runtime.test.ts` only after mapping every assertion into these exact
independently runnable suites: `pages-runtime-rendering.test.ts` owns published
versus draft, SVG isolation, recursive layouts, all insertable blocks, legacy
widgets and invalid published-row behavior; `pages-runtime-collections.test.ts`
owns collection resolution, filters/sort, numbered pagination and auto entry-list
routes; `pages-runtime-routing-preview.test.ts` owns SEO, dev assets, configured
homepage, preview-token rejection, generic-entry preview and content-route
precedence; `pages-runtime-responsive-cache.test.ts` owns responsive media CSS,
override-free byte behavior and static atomic-section caching. Shared DB probes,
tracked-row/settings cleanup and builders move only to
`pages-runtime-fixtures.ts`, which exposes explicit setup/cleanup helpers and has
no import-time mutation. No suite imports another suite, and each exact test file
must run alone. All five replacement files must remain at most 1,000 physical
lines; no assertion may be dropped or weakened.

TASK-493 and TASK-517 source writers must be terminal or explicitly serialized;
then re-read and preserve their sitemap/GSC/current-SEO and entry-visibility
behavior. Never edit TASK-493 GSC schema/migrations/routes/Admin UI. Forbidden: `publicSite`,
site shell/settings/theme/menu/forms/listing/Admin, 07/08, TASK-511 backup,
migrations/packages/shared docs/tasks.

## Mutation Contract

- Create one opaque event key before each authoritative transaction. Inside the
  transaction capture narrow before/after projections, perform the mutation,
  build normalized tags and call 08-L02 `persistCacheInvalidationTx` in Redis
  mode. Return value plus plan; after the outer commit call and await the lifecycle-owned
  invalidation handle's `applyAfterCommit(plan)` exactly once. The exact plan is
  only `{ eventKey, tags }`, where
  `tags` is a deduplicated finite `CacheTag[]`; IDs, slugs, paths, hashes and
  domain payload never cross into plan/outbox/PubSub.
- The outer mutation awaits that single `applyAfterCommit(plan)` call. The handle
  absorbs cache transport failures into `applied|queued|bypassed` and resolves
  only after local observation plus any required affected-family force fence are
  visible; fire-and-forget `void`/detached dispatch is forbidden.
- Failed validation, DB rollback, missing delete and semantic no-op emit no plan.
  A committed mutation returns success even if immediate cache transport fails;
  durable Redis retry remains. The handle reports its outcome to the sole
  lifecycle coherence controller; only that controller advances the process epoch
  or installs an affected-family fence after a memory-mode bump failure. Domain
  code never advances/fences directly. Failure is never represented as DB failure
  or allowed to reuse old bytes merely until TTL.
- Page plans map ID, old/new normalized slug, homepage/not-found selection,
  global page/navigation lists and rendered template dependencies to finite
  `site:pages`/`site:shell`/`site:all` generations. Publish, unpublish, delete and
  published-data removal always advance `updated_at`; L01's page/home detail/list
  gate remains mandatory before cached bytes.
- Entry plans map ID, content type, old/new slug/path, detail/list route,
  metadata/SEO and global/list dependencies to finite `site:entries`,
  `site:listings`, `site:html` and fallback site generations, then discard the
  identity projection. Every visibility/password transition also advances the
  authoritative `updated_at` visibility-version in the same transaction and
  bumps `site:entries`/`site:html`. Preserve TASK-517 exclusion and L01's rule
  that every mutable-content detail performs its one family-specific point DB
  gate and every cached list that can contain mutable content performs its one
  bounded indexed public-membership/version gate. Entry status/publishedAt/
  visibility/hasPassword/updatedAt all participate in the proof. The list gate's
  ordered digest changes on unpublish, missing representation, visibility,
  membership, ordering or version changes before primed HTML can be returned.
- Post plans map ID, old/new slug, status, taxonomy/feed/list/detail and SEO to
  finite `site:posts`/`site:listings`/`site:html` generations. Every status/
  publishedAt transition advances `updated_at`; post detail/list still executes
  L01's mandatory narrow publication/version gate before cached bytes.
- SEO mutations map target identity to finite owning content plus `site:html`
  generations and remove direct synchronous `clearSiteCache` calls. No v1
  record/slug/path generation key is created.
- Never invalidate before an outer transaction commits. Helpers accept the
  supplied transaction handle and do not fall back to global `db` inside it.
- Adopt TASK-551-03's handed-off set-based/narrow SEO reads and constant query
  budget (`<=5` for SEO summaries), and TASK-551-06's concurrency-safe shared
  revision allocator plus bounded revision reads/retention in the domain modules.
- Public Redis invalidation is bounded-eventual, not linearizable, under 08's
  <=250 ms polling and <=1 second p99 target. Locally visible age `>5_000 ms`
  forces value GET/fill bypass until proven recovery; hard policy TTL applies
  only to ambiguity not locally known degraded. Admin preview/read-after-write bypasses until event
  observation; security/private/nonce-bearing output remains excluded. Commerce
  product blocks/data and every request-scoped form/booking/analytics token use
  L01's exact no-manifest/no-envelope-fill exclusions; this leaf does not take
  ownership of `commerceService`.

## Implementation Pseudocode

```ts
const eventKey = createCacheInvalidationEventKey();
const committed = await db.transaction(async (tx) => {
  const before = await loadCacheProjection(tx, id);
  const value = await mutate(tx, input);
  if (isNoOp(before, value)) return { value, plan: null };
  const plan = buildContentMutationInvalidation({ eventKey, before, after: value });
  await persistCacheInvalidationTx(tx, plan, cacheBackend);
  return { value, plan };
});
if (committed.plan) {
  await getServerCacheRuntime().invalidation.applyAfterCommit(committed.plan);
}
return committed.value;
```

Known domain/constraint errors retain their mappings. Cache plan/transport
errors are stable redacted codes and do not expose slugs/data in logs/outbox.

## Security Contract

- **Visibility/routes:** no route change; existing public reads/internal writes.
- **Auth/RBAC/CSRF/rate limits:** route enforcement is unchanged; service
  refactors cannot widen access.
- **Validation:** existing strict mutation schemas plus bounded canonical tags.
- **Secrets/privacy:** plans/outbox contain only opaque event key plus finite
  tags—never IDs, slugs, paths, path digests, body, private content, SEO secret,
  bind value or user data.
- **Anti-abuse:** no new public write; TASK-517 gated output remains ineligible.

## Testing Requirements

For each domain test create/publish/update body/update slug/delete/unpublish and
revision restore as applicable; prime old/new detail and list caches, then prove
post-commit miss/fresh bytes. Assert old and new slugs, homepage/404, feed/taxonomy
and SEO head dependencies. Inject rollback, no-op and Redis failure/outbox retry;
run memory and two-client Redis variants with owned DB fixtures only. Assert each
committed plan calls lifecycle `applyAfterCommit` exactly once and rollback/no-op
calls it zero times. Prove callers cannot resume before the local observation or
failure fence is visible and no mutation detaches/voids the promise. Inject a
memory bump failure and prove the sole controller,
not domain code, advances/fences the affected family and bypasses old values. Re-run
the handed-off SEO query-count and entry/post revision concurrency/bounded-read
assertions without weakening them. Prime pages, posts and entries, then commit
published→draft/unpublish, remove a page published representation, remove/reorder
list membership, and commit entry public→private/password transitions. Assert
every relevant `updated_at` version changes. The next detail/list request must
execute exactly two total queries: one uncached security-settings read plus one
point or bounded membership/version gate before any HTML value GET. It never
returns the primed item and executes zero additional domain/render/cache reads.
Assert plan/outbox strict parsing rejects IDs,
slugs, paths, digests and extra fields.

```bash
set -a && source .env && set +a
bun run test:vitest -- tests/vitest/cache/content-mutation-invalidation.test.ts \
  tests/vitest/seo/seoSearchPerformanceTypes.test.ts \
  tests/vitest/seo/sitemapBuilder.test.ts \
  tests/vitest/seo/seoPerformanceAggregation.test.ts
SERVER_CACHE_BACKEND=memory bun test \
  tests/integration/runtime/site-cache-page-entry-invalidation.test.ts \
  tests/integration/runtime/site-cache-post-seo-invalidation.test.ts \
  tests/integration/runtime/public-site-cache-query-budget.test.ts \
  tests/integration/runtime/public-content-visibility-cache-gate.test.ts \
  tests/integration/runtime/public-content-list-membership-cache-gate.test.ts \
  tests/integration/runtime/pages-runtime-rendering.test.ts \
  tests/integration/runtime/pages-runtime-collections.test.ts \
  tests/integration/runtime/pages-runtime-routing-preview.test.ts \
  tests/integration/runtime/pages-runtime-responsive-cache.test.ts \
  tests/unit/pages/pageService.test.ts \
  tests/unit/content/entryService.test.ts \
  tests/unit/content/entryServiceMetadataAndRelations.test.ts \
  tests/unit/content/entryServiceVisibilityAndRevisions.test.ts \
  tests/unit/content/postsService.test.ts \
  tests/unit/seo/seoService.test.ts \
  tests/unit/seo/seoServicePersistence.test.ts \
  tests/integration/posts/posts-revisions-flow.test.ts \
  tests/integration/integrations/gscClient.test.ts \
  tests/integration/routes/sitemap.test.ts \
  tests/integration/routes/seo-sitemap.test.ts \
  tests/integration/routes/seo-sync.test.ts \
  tests/integration/routes/seo-performance.test.ts \
  tests/integration/routes/seo-pipeline.test.ts \
  tests/integration/routes/seo.test.ts \
  tests/security/gsc-credential.test.ts \
  tests/security/seo-sitemap.test.ts \
  tests/security/seo-sync.test.ts \
  tests/security/seo-pipeline.test.ts \
  tests/perf/seo-sitemap.test.ts
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-09-l02 bun test \
  tests/integration/runtime/site-cache-page-entry-invalidation.test.ts \
  tests/integration/runtime/site-cache-post-seo-invalidation.test.ts \
  tests/integration/runtime/public-site-cache-query-budget.test.ts \
  tests/integration/runtime/public-content-visibility-cache-gate.test.ts \
  tests/integration/runtime/public-content-list-membership-cache-gate.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/pages/pageService.ts \
  core/services/content/{entryService,entryServiceContract,entryPersistence,entryMutationService,entryRevisionService,postsService,postDocumentContract,postMutationService,postRevisionService}.ts \
  core/services/seo/seoService.ts core/services/cache/contentMutationInvalidation.ts \
  tests/unit/pages/pageService.test.ts \
  tests/unit/content/{entryService,entryServiceMetadataAndRelations,entryServiceVisibilityAndRevisions}.test.ts \
  tests/unit/content/postsService.test.ts \
  tests/unit/seo/{seoService,seoServicePersistence}.test.ts \
  tests/integration/posts/posts-revisions-flow.test.ts \
  tests/vitest/cache/content-mutation-invalidation.test.ts \
  tests/integration/runtime/site-cache-{page-entry,post-seo}-invalidation.test.ts \
  tests/integration/runtime/pages-runtime-fixtures.ts \
  tests/integration/runtime/pages-runtime-rendering.test.ts \
  tests/integration/runtime/pages-runtime-collections.test.ts \
  tests/integration/runtime/pages-runtime-routing-preview.test.ts \
  tests/integration/runtime/pages-runtime-responsive-cache.test.ts \
  tests/vitest/seo/{seoSearchPerformanceTypes,sitemapBuilder,seoPerformanceAggregation}.test.ts \
  tests/integration/integrations/gscClient.test.ts \
  tests/integration/routes/{sitemap,seo-sitemap,seo-sync,seo-performance,seo-pipeline,seo}.test.ts \
  tests/security/{gsc-credential,seo-sitemap,seo-sync,seo-pipeline}.test.ts \
  tests/perf/seo-sitemap.test.ts
```

## Documentation Updates Required

The commands above literally run every relevant terminal TASK-493 backend current-
SEO/sitemap/sync/security/performance suite. Consume L01's TASK-517 test receipt
without editing or rerunning its files here. Docs and changelog remain 10-L02
ownership.
