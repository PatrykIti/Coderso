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
**Changelog:** 1310 (pinned; closure only)

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
- existing `tests/integration/runtime/pages-runtime.test.ts` plus its already-split
  siblings `tests/integration/runtime/pages-runtime-blocks.test.ts`,
  `tests/integration/runtime/pages-runtime-listings.test.ts`, and
  `tests/integration/runtime/pages-runtime-responsive.test.ts` for exact page
  runtime cache-invalidation assertions, plus new additive
  `tests/integration/runtime/pages-runtime-cache-invalidation.test.ts` where no
  existing suite is a cohesive home;
- existing `tests/unit/content/entryService.test.ts` (core CRUD) plus its
  already-split siblings `entryServiceMetadataWrites.test.ts`,
  `entryServiceVisibility.test.ts`, `entryServiceConcurrency.test.ts`,
  `entryServiceSourceAudit.test.ts`, and `entryServiceFacadeFence.test.ts`, and
  new additive `entryServiceCacheInvalidation.test.ts` where no existing suite is
  a cohesive home, plus `tests/unit/content/postsService.test.ts`,
  `tests/unit/seo/seoService.test.ts`, new `tests/unit/seo/seoServicePersistence.test.ts`,
  and `tests/integration/posts/posts-revisions-flow.test.ts` for exact adoption
  assertions only.
- terminal TASK-493 backend regression suites
  `tests/vitest/seo/seoSearchPerformanceTypes.test.ts`,
  `tests/vitest/seo/sitemapBuilder.test.ts`,
  `tests/vitest/seo/seoPerformanceAggregation.test.ts`,
  `tests/integration/integrations/gscClient.test.ts`,
  `tests/integration/routes/sitemap.test.ts`,
  `tests/integration/seo/gscSyncService.test.ts`,
  `tests/integration/routes/seo-performance.test.ts`,
  `tests/integration/routes/seo-pipeline.test.ts`,
  `tests/integration/routes/seo.test.ts`,
  `tests/security/gsc-credential.test.ts`,
  `tests/security/seo-sitemap-submission.test.ts`,
  `tests/security/seo-sync-service.test.ts`,
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

The entry suite is already split at HEAD: `entryService.test.ts` retains core
CRUD/list/duplicate/delete facade behavior, `entryServiceMetadataWrites.test.ts`
owns metadata/taxonomy/media relation validation, `entryServiceVisibility.test.ts`
owns visibility and password projections, and `entryServiceConcurrency.test.ts`,
`entryServiceSourceAudit.test.ts`, and `entryServiceFacadeFence.test.ts` own their
named contracts. This leaf adds its new invalidation/transaction assertions to
those exact owning suites and, where no cohesive home exists, to a new additive
`entryServiceCacheInvalidation.test.ts`. The existing 1,318-line
`tests/unit/seo/seoService.test.ts` still exceeds the gate, so split it so
`seoService.test.ts` owns pure normalization/analysis/plan behavior and
`seoServicePersistence.test.ts` owns transaction, bounded query/list/audit and
invalidation adoption. Do not extract a new shared test helper: keep narrowly
scoped builders/fixtures inside their exact owning suite so the allowlist and
line-count manifest remain closed. Every suite stays independently runnable and
no behavior assertion is dropped.

The page runtime suite is already split at HEAD into `pages-runtime.test.ts`,
`pages-runtime-blocks.test.ts`, `pages-runtime-listings.test.ts`, and
`pages-runtime-responsive.test.ts`, sharing the existing
`pages-runtime-test-support.ts` helpers. This leaf adds its new cache-invalidation
assertions to those exact owning suites and, where no cohesive home exists, to a
new additive `pages-runtime-cache-invalidation.test.ts`. No suite imports another
suite, each exact test file runs alone, and every touched file remains at most
1,000 physical lines; no assertion may be dropped or weakened.

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
  tests/integration/runtime/pages-runtime.test.ts \
  tests/integration/runtime/pages-runtime-blocks.test.ts \
  tests/integration/runtime/pages-runtime-listings.test.ts \
  tests/integration/runtime/pages-runtime-responsive.test.ts \
  tests/integration/runtime/pages-runtime-cache-invalidation.test.ts \
  tests/unit/content/entryService.test.ts \
  tests/unit/content/entryServiceMetadataWrites.test.ts \
  tests/unit/content/entryServiceVisibility.test.ts \
  tests/unit/content/entryServiceConcurrency.test.ts \
  tests/unit/content/entryServiceSourceAudit.test.ts \
  tests/unit/content/entryServiceFacadeFence.test.ts \
  tests/unit/content/entryServiceCacheInvalidation.test.ts \
  tests/unit/content/postsService.test.ts \
  tests/unit/seo/seoService.test.ts \
  tests/unit/seo/seoServicePersistence.test.ts \
  tests/integration/posts/posts-revisions-flow.test.ts \
  tests/integration/integrations/gscClient.test.ts \
  tests/integration/routes/sitemap.test.ts \
  tests/integration/seo/gscSyncService.test.ts \
  tests/integration/routes/seo-performance.test.ts \
  tests/integration/routes/seo-pipeline.test.ts \
  tests/integration/routes/seo.test.ts \
  tests/security/gsc-credential.test.ts \
  tests/security/seo-sitemap-submission.test.ts \
  tests/security/seo-sync-service.test.ts \
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
  tests/unit/content/{entryService,entryServiceMetadataWrites,entryServiceVisibility,entryServiceConcurrency,entryServiceSourceAudit,entryServiceFacadeFence,entryServiceCacheInvalidation}.test.ts \
  tests/unit/content/postsService.test.ts \
  tests/unit/seo/{seoService,seoServicePersistence}.test.ts \
  tests/integration/posts/posts-revisions-flow.test.ts \
  tests/vitest/cache/content-mutation-invalidation.test.ts \
  tests/integration/runtime/site-cache-{page-entry,post-seo}-invalidation.test.ts \
  tests/integration/runtime/pages-runtime.test.ts \
  tests/integration/runtime/pages-runtime-blocks.test.ts \
  tests/integration/runtime/pages-runtime-listings.test.ts \
  tests/integration/runtime/pages-runtime-responsive.test.ts \
  tests/integration/runtime/pages-runtime-cache-invalidation.test.ts \
  tests/vitest/seo/{seoSearchPerformanceTypes,sitemapBuilder,seoPerformanceAggregation}.test.ts \
  tests/integration/integrations/gscClient.test.ts \
  tests/integration/seo/gscSyncService.test.ts \
  tests/integration/routes/{sitemap,seo-performance,seo-pipeline,seo}.test.ts \
  tests/security/{gsc-credential,seo-sitemap-submission,seo-sync-service,seo-pipeline}.test.ts \
  tests/perf/seo-sitemap.test.ts
```

## Documentation Updates Required

The commands above literally run every relevant terminal TASK-493 backend current-
SEO/sitemap/sync/security/performance suite. Consume L01's TASK-517 test receipt
without editing or rerunning its files here. Docs and changelog remain 10-L02
ownership.

## Workflow Dispatch Envelope

Memory is the documented default server-cache backend, so the DB test lane has
no backend assignment. The Redis lane receives only the sidecar's private DB/
Redis bindings, fixed Redis backend, and derived namespace.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-09-L02",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-09"
  },
  "artifactPolicy": "none",
  "allowlist": [
    "core/services/pages/pageService.ts",
    "core/services/content/entryService.ts",
    "core/services/content/entryServiceContract.ts",
    "core/services/content/entryPersistence.ts",
    "core/services/content/entryMutationService.ts",
    "core/services/content/entryRevisionService.ts",
    "core/services/content/postsService.ts",
    "core/services/content/postDocumentContract.ts",
    "core/services/content/postMutationService.ts",
    "core/services/content/postRevisionService.ts",
    "core/services/seo/seoService.ts",
    "core/services/cache/contentMutationInvalidation.ts",
    "tests/integration/runtime/site-cache-page-entry-invalidation.test.ts",
    "tests/integration/runtime/site-cache-post-seo-invalidation.test.ts",
    "tests/vitest/cache/content-mutation-invalidation.test.ts",
    "tests/integration/runtime/pages-runtime.test.ts",
    "tests/integration/runtime/pages-runtime-blocks.test.ts",
    "tests/integration/runtime/pages-runtime-listings.test.ts",
    "tests/integration/runtime/pages-runtime-responsive.test.ts",
    "tests/integration/runtime/pages-runtime-cache-invalidation.test.ts",
    "tests/unit/content/entryService.test.ts",
    "tests/unit/content/entryServiceMetadataWrites.test.ts",
    "tests/unit/content/entryServiceVisibility.test.ts",
    "tests/unit/content/entryServiceConcurrency.test.ts",
    "tests/unit/content/entryServiceSourceAudit.test.ts",
    "tests/unit/content/entryServiceFacadeFence.test.ts",
    "tests/unit/content/entryServiceCacheInvalidation.test.ts",
    "tests/unit/content/postsService.test.ts",
    "tests/unit/seo/seoService.test.ts",
    "tests/unit/seo/seoServicePersistence.test.ts",
    "tests/integration/posts/posts-revisions-flow.test.ts",
    "tests/vitest/seo/seoSearchPerformanceTypes.test.ts",
    "tests/vitest/seo/sitemapBuilder.test.ts",
    "tests/vitest/seo/seoPerformanceAggregation.test.ts",
    "tests/integration/integrations/gscClient.test.ts",
    "tests/integration/routes/sitemap.test.ts",
    "tests/integration/seo/gscSyncService.test.ts",
    "tests/integration/routes/seo-performance.test.ts",
    "tests/integration/routes/seo-pipeline.test.ts",
    "tests/integration/routes/seo.test.ts",
    "tests/security/gsc-credential.test.ts",
    "tests/security/seo-sitemap-submission.test.ts",
    "tests/security/seo-sync-service.test.ts",
    "tests/security/seo-pipeline.test.ts",
    "tests/perf/seo-sitemap.test.ts"
  ],
  "forbiddenPaths": [
    "core/server/publicSite.tsx",
    "core/services/pages/publicSiteShell.ts",
    "core/services/menus/menuService.ts",
    "core/services/cache/serverCacheRuntime.ts",
    "core/services/backups/backupService.ts",
    "core/db/schema.ts",
    "core/db/migrations/meta/_journal.json",
    "tests/unit/pages/pageService.test.ts"
  ],
  "dependencies": ["TASK-551-09-L01:single"],
  "commands": [
    {
      "id": "content-invalidation-vitest",
      "lane": "vitest",
      "argv": ["bun", "run", "test:vitest", "--", "tests/vitest/cache/content-mutation-invalidation.test.ts", "tests/vitest/seo/seoSearchPerformanceTypes.test.ts", "tests/vitest/seo/sitemapBuilder.test.ts", "tests/vitest/seo/seoPerformanceAggregation.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "test-paths", "paths": ["tests/vitest/cache/content-mutation-invalidation.test.ts", "tests/vitest/seo/seoSearchPerformanceTypes.test.ts", "tests/vitest/seo/sitemapBuilder.test.ts", "tests/vitest/seo/seoPerformanceAggregation.test.ts"], "minimum": 1 }
    },
    {
      "id": "content-memory-db-tests",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/runtime/site-cache-page-entry-invalidation.test.ts", "tests/integration/runtime/site-cache-post-seo-invalidation.test.ts", "tests/integration/runtime/public-site-cache-query-budget.test.ts", "tests/integration/runtime/public-content-visibility-cache-gate.test.ts", "tests/integration/runtime/public-content-list-membership-cache-gate.test.ts", "tests/integration/runtime/pages-runtime.test.ts", "tests/integration/runtime/pages-runtime-blocks.test.ts", "tests/integration/runtime/pages-runtime-listings.test.ts", "tests/integration/runtime/pages-runtime-responsive.test.ts", "tests/integration/runtime/pages-runtime-cache-invalidation.test.ts", "tests/unit/content/entryService.test.ts", "tests/unit/content/entryServiceMetadataWrites.test.ts", "tests/unit/content/entryServiceVisibility.test.ts", "tests/unit/content/entryServiceConcurrency.test.ts", "tests/unit/content/entryServiceSourceAudit.test.ts", "tests/unit/content/entryServiceFacadeFence.test.ts", "tests/unit/content/entryServiceCacheInvalidation.test.ts", "tests/unit/content/postsService.test.ts", "tests/unit/seo/seoService.test.ts", "tests/unit/seo/seoServicePersistence.test.ts", "tests/integration/posts/posts-revisions-flow.test.ts", "tests/integration/integrations/gscClient.test.ts", "tests/integration/routes/sitemap.test.ts", "tests/integration/seo/gscSyncService.test.ts", "tests/integration/routes/seo-performance.test.ts", "tests/integration/routes/seo-pipeline.test.ts", "tests/integration/routes/seo.test.ts", "tests/security/gsc-credential.test.ts", "tests/security/seo-sitemap-submission.test.ts", "tests/security/seo-sync-service.test.ts", "tests/security/seo-pipeline.test.ts", "tests/perf/seo-sitemap.test.ts"],
      "environmentProfile": "task551-db-test",
      "positiveDiscovery": { "kind": "test-paths", "paths": ["tests/integration/runtime/site-cache-page-entry-invalidation.test.ts", "tests/integration/runtime/site-cache-post-seo-invalidation.test.ts", "tests/integration/runtime/public-site-cache-query-budget.test.ts", "tests/integration/runtime/public-content-visibility-cache-gate.test.ts", "tests/integration/runtime/public-content-list-membership-cache-gate.test.ts", "tests/integration/runtime/pages-runtime.test.ts", "tests/integration/runtime/pages-runtime-blocks.test.ts", "tests/integration/runtime/pages-runtime-listings.test.ts", "tests/integration/runtime/pages-runtime-responsive.test.ts", "tests/integration/runtime/pages-runtime-cache-invalidation.test.ts", "tests/unit/content/entryService.test.ts", "tests/unit/content/entryServiceMetadataWrites.test.ts", "tests/unit/content/entryServiceVisibility.test.ts", "tests/unit/content/entryServiceConcurrency.test.ts", "tests/unit/content/entryServiceSourceAudit.test.ts", "tests/unit/content/entryServiceFacadeFence.test.ts", "tests/unit/content/entryServiceCacheInvalidation.test.ts", "tests/unit/content/postsService.test.ts", "tests/unit/seo/seoService.test.ts", "tests/unit/seo/seoServicePersistence.test.ts", "tests/integration/posts/posts-revisions-flow.test.ts", "tests/integration/integrations/gscClient.test.ts", "tests/integration/routes/sitemap.test.ts", "tests/integration/seo/gscSyncService.test.ts", "tests/integration/routes/seo-performance.test.ts", "tests/integration/routes/seo-pipeline.test.ts", "tests/integration/routes/seo.test.ts", "tests/security/gsc-credential.test.ts", "tests/security/seo-sitemap-submission.test.ts", "tests/security/seo-sync-service.test.ts", "tests/security/seo-pipeline.test.ts", "tests/perf/seo-sitemap.test.ts"], "minimum": 1 }
    },
    {
      "id": "content-redis-db-tests",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/runtime/site-cache-page-entry-invalidation.test.ts", "tests/integration/runtime/site-cache-post-seo-invalidation.test.ts", "tests/integration/runtime/public-site-cache-query-budget.test.ts", "tests/integration/runtime/public-content-visibility-cache-gate.test.ts", "tests/integration/runtime/public-content-list-membership-cache-gate.test.ts"],
      "environmentProfile": "task551-db-redis-test",
      "positiveDiscovery": { "kind": "test-paths", "paths": ["tests/integration/runtime/site-cache-page-entry-invalidation.test.ts", "tests/integration/runtime/site-cache-post-seo-invalidation.test.ts", "tests/integration/runtime/public-site-cache-query-budget.test.ts", "tests/integration/runtime/public-content-visibility-cache-gate.test.ts", "tests/integration/runtime/public-content-list-membership-cache-gate.test.ts"], "minimum": 1 }
    },
    {
      "id": "core-lint-types",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "diff-check",
      "lane": "tooling",
      "argv": ["git", "diff", "--check"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "line-count",
      "lane": "tooling",
      "argv": ["wc", "-l", "core/services/pages/pageService.ts", "core/services/content/entryService.ts", "core/services/content/entryServiceContract.ts", "core/services/content/entryPersistence.ts", "core/services/content/entryMutationService.ts", "core/services/content/entryRevisionService.ts", "core/services/content/postsService.ts", "core/services/content/postDocumentContract.ts", "core/services/content/postMutationService.ts", "core/services/content/postRevisionService.ts", "core/services/seo/seoService.ts", "core/services/cache/contentMutationInvalidation.ts", "tests/integration/runtime/site-cache-page-entry-invalidation.test.ts", "tests/integration/runtime/site-cache-post-seo-invalidation.test.ts", "tests/vitest/cache/content-mutation-invalidation.test.ts", "tests/integration/runtime/pages-runtime.test.ts", "tests/integration/runtime/pages-runtime-blocks.test.ts", "tests/integration/runtime/pages-runtime-listings.test.ts", "tests/integration/runtime/pages-runtime-responsive.test.ts", "tests/integration/runtime/pages-runtime-cache-invalidation.test.ts", "tests/unit/content/entryService.test.ts", "tests/unit/content/entryServiceMetadataWrites.test.ts", "tests/unit/content/entryServiceVisibility.test.ts", "tests/unit/content/entryServiceConcurrency.test.ts", "tests/unit/content/entryServiceSourceAudit.test.ts", "tests/unit/content/entryServiceFacadeFence.test.ts", "tests/unit/content/entryServiceCacheInvalidation.test.ts", "tests/unit/content/postsService.test.ts", "tests/unit/seo/seoService.test.ts", "tests/unit/seo/seoServicePersistence.test.ts", "tests/integration/posts/posts-revisions-flow.test.ts", "tests/vitest/seo/seoSearchPerformanceTypes.test.ts", "tests/vitest/seo/sitemapBuilder.test.ts", "tests/vitest/seo/seoPerformanceAggregation.test.ts", "tests/integration/integrations/gscClient.test.ts", "tests/integration/routes/sitemap.test.ts", "tests/integration/seo/gscSyncService.test.ts", "tests/integration/routes/seo-performance.test.ts", "tests/integration/routes/seo-pipeline.test.ts", "tests/integration/routes/seo.test.ts", "tests/security/gsc-credential.test.ts", "tests/security/seo-sitemap-submission.test.ts", "tests/security/seo-sync-service.test.ts", "tests/security/seo-pipeline.test.ts", "tests/perf/seo-sitemap.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "single",
      "dependsOn": ["TASK-551-09-L01:single"],
      "commandIds": ["content-invalidation-vitest", "content-memory-db-tests", "content-redis-db-tests", "core-lint-types", "core-lint", "diff-check", "line-count"]
    }
  ]
}
```

## Dated Contract Corrections — 2026-09-25 (mirror of TASK-551-03-L02 FAZA-0; append-only)

- **Correction:** single-writer ownership of
  `tests/unit/pages/pageService.test.ts` transfers from TASK-551-09-L02 to
  TASK-551-03-L02.
- **Before:** this leaf listed the suite under Exclusive Ownership ("existing
  `tests/unit/pages/pageService.test.ts` for exact page mutation and
  invalidation adoption assertions"), in the envelope `allowlist`, in the
  `content-memory-db-tests` `argv` and `positiveDiscovery.paths`, in the
  `line-count` `argv`, and in both prose `bun test` / `wc -l` command blocks.
- **After:** the path is removed in place from Exclusive Ownership, the envelope
  `allowlist`, the `content-memory-db-tests` `argv` and
  `positiveDiscovery.paths`, the `line-count` `argv`, and both prose command
  blocks, and is added to the envelope `forbiddenPaths` as the single-writer
  guard. Every command stays in place and non-empty; envelope `dependencies`,
  `occurrences` ids and `dependsOn` are unchanged.
- **Reason:** the TASK-551-06-L02 receipt
  (`_docs/_workflows/_smoke/task-551/impl-06-l02.json`) hands the full semantic
  envelope adoption of `tests/unit/pages/pageService.test.ts` and
  `tests/unit/pages/pageRevisionAutosave.test.ts` to TASK-551-03-L02, and the
  dispatch contract (`_docs/_workflows/lib/task-551-dispatch-contract.mjs`,
  `allowlist_cross_owner` check) forbids one path in two leaves' allowlists, so
  03-L02 can own the suite only after this leaf releases it.
- **Consumption:** this leaf consumes the 03-L02-adopted suite read-only. Its
  page mutation/invalidation assertions land in the page runtime suites it still
  owns (or the additive `pages-runtime-cache-invalidation.test.ts`); if it needs
  evidence from `pageService.test.ts`, it performs an execution-only rerun of
  that exact file without editing it.

## Dated Contract Corrections — 2026-09-25 (mirror of TASK-551-03-L02 round 3 R3-34; append-only)

Source: `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round3-dispositions.md`
item R3-34 (orchestrator decision, HEAD `9c5b6666`) and the TASK-551-06-L02
dated section "R7 amendments (round 4, 2026-09-25)", item I1. Anchors were
re-grounded on 2026-09-25 at HEAD `9c5b6666` plus the uncommitted TASK-551
edits. This section adds scope inside the existing allowlist. No earlier
sentence of this file is superseded. It supersedes the ownership sentence of
TASK-551-06-L02 (`:696-698`, "`pageService.ts` is owned by TASK-551-03-L02;
this is recorded as a handoff to TASK-551-03-L02, whose wave W1 may align it
under the same rule."), which 06-L02 I1 corrects. The Workflow Dispatch
Envelope, `**Status:**` and `**Changelog:**` stay unchanged.

**M1 — the legacy `listPages` author follows the hash-only email rule
(taken).** `core/services/pages/pageService.ts` is in this leaf's envelope
`allowlist` (`:328`), so this leaf is its single writer. Today `listPages`
(`pageService.ts:140-175`; author mapping `:163-173`) emits
`author: { id, name, email: resolveEmailValue({ emailEncrypted, email }) ?? "" }`
whenever `pages.author_id` is set. For a hash-only author (the keyed hash in
`users.email`, null `email_encrypted`), `resolveEmailValue` returns `null`
(`core/services/security/piiEmail.ts:118`), so the list ships `email: ""`
labelled as an email. The rule is the TASK-551-06-L02 R6 rule for
`PageRevisionSummary.createdBy`: `author` is non-null only when the author id
AND a resolved email both exist.

```ts
// core/services/pages/pageService.ts — listPages mapper (projection unchanged)
return rows.map((row) => {
  const email = row.authorId
    ? resolveEmailValue({ emailEncrypted: row.authorEmailEncrypted, email: row.authorEmail })
    : null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status as PageStatus,
    updatedAt: row.updatedAt,
    author: row.authorId && email
      ? { id: row.authorId, name: row.authorName ?? null, email }
      : null,
  };
});
```

The following stay unchanged:

- the 9-column projection (`:142-152`), the left join, the ordering, and the
  `PageSummary`/`PageAuthor` types (`PageAuthor.email: string`, `:34-38`);
- the import at `:27`;
- decrypt errors, which propagate with no new catch or fallback (R6 A4
  parity).

The disclosure only narrows: `content:read` on `GET /pages`
(`core/server/routes/pageRoutes.ts:109-111`) never receives the raw column.

Consumers and the visible effect: `PageTable` falls back to "No author" with
the hint "Previous author is no longer available." for a `null` author
(`core/admin/ui/pages/PageTable.tsx:58-62`, `:111-112`), and `PageListPage`
drops it from the author filter options (`core/admin/ui/pages/PageListPage.tsx:164-168`).
Today a nameless hash-only author renders an empty label, because `""` passes
`??`. This matches the R6 A6 accepted edge case: it occurs only for
non-canonical rows, because canonical writers (`buildEmailFields`,
`piiEmail.ts:138-147`) always store the encrypted payload. The assistant
catalogs call `listPages` (`core/services/assistant/adminContextCatalogs.ts:231`;
`actionExecutorService.ts:49`/`:144` into `actionExecutorCatalogReads.ts:124`)
and read no `author` field. That was verified on 2026-09-25: there are zero
`author` matches in those modules, so they are unaffected.

**Test ownership.** `tests/unit/pages/pageService.test.ts` was released to
TASK-551-03-L02 (first dated section above, `:446-473`; `forbiddenPaths`
`:381`). It has zero `listPages` references (verified `grep -c` = 0), so M1
re-baselines nothing there, and this leaf only reruns it execution-only.
TASK-551-03-L02 C10 v3 pins the same rule for its new `pageReadService` DTO
with a route-suite assertion (R3-34). It cannot pin the legacy `listPages`
path, because 03-L02 INITIAL lands before this leaf (see land order). A legacy
pin there would assert the pre-M1 `""`. The M1 behaviour assertion therefore
lands in this leaf's owned DB suite `tests/integration/runtime/pages-runtime.test.ts`
(allowlist `:343`; `content-memory-db-tests` argv `:396`; 427 lines at HEAD).
It uses owned fixtures only:

```ts
// tests/integration/runtime/pages-runtime.test.ts — one testIfDb leg
// seed: marker user A with email = 64-hex keyed-hash shape, emailEncrypted null;
//       marker user B with a legacy plaintext email (e.g. `m1-${token}@example.com`);
//       one marker page authored by A, one by B, one with authorId null (trackPage)
const byId = new Map((await listPages()).map((page) => [page.id, page]));
expect(byId.get(pageA.id)?.author).toBeNull();                 // hash-only -> null, never ""
expect(byId.get(pageB.id)?.author).toEqual({ id: userB.id, name: userB.name, email: userB.email });
expect(byId.get(pageNone.id)?.author).toBeNull();
// finally: delete only the three marker pages and the two marker users by id
```

The leg adds about 45 lines (427 → about 472), and `pageService.ts` grows from
810 to about 816. Both stay under 1,000.

**Land order.** In the parent graph, `TASK-551-09-L02:single` (parent `:1002`)
follows `TASK-551-03-L02:initial` (parent `:992`) transitively, through 07-L02,
08-L01, 08-L02, 08-L03 FINAL, 03-L03, 04-L01, 04-L02 and 09-L01. Wave W1 is
part of 03-L02 INITIAL (03-L02 wave table, "W1 services/routes/races").
03-L02 W1 therefore lands first and never edits `pageService.ts`. M1 lands in
this leaf's single occurrence, together with its other `pageService.ts`
invalidation edits. `TASK-551-03-L02:final` (parent `:997`) is not an ancestor
of this leaf and does not touch `pageService.ts`.

**Scope after M1.** Both edited paths (`core/services/pages/pageService.ts`,
`tests/integration/runtime/pages-runtime.test.ts`) are already in the
envelope `allowlist`, and their commands already exist. The envelope
`allowlist`, `forbiddenPaths`, `dependencies`, occurrence ids and command ids
are unchanged.
