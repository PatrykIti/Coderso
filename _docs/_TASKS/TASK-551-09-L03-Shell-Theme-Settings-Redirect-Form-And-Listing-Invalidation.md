# TASK-551-09-L03: Shell, Theme, Settings, Redirect, Form, and Listing Invalidation
# FileName: TASK-551-09-L03-Shell-Theme-Settings-Redirect-Form-And-Listing-Invalidation.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-09
**Priority:** Critical
**Category:** Public Runtime / Cache / Transactions
**Estimated Effort:** Very Large
**Dependencies:** TASK-551-09-L02; TASK-551-03 query/batch and TASK-551-06
detail-page revision handoffs terminal; parent external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; closure only)

---

## Objective

Complete dependency invalidation for selected menu/footer, active theme,
public settings, redirects, forms, listing queries/templates and detail-page
configuration, including nested import transactions.

## Exclusive Ownership

Sole writer of:

- `core/services/menus/menuService.ts`;
- `core/services/pages/pageTemplateLibraryService.ts`;
- `core/services/pages/publicSiteShell.ts`;
- `core/services/themes/themeProfileService.ts`;
- `core/services/settings/settingsService.ts`;
- `core/services/redirects/redirectService.ts`;
- `core/services/forms/formsService.ts`;
- `core/services/content/listingQueriesService.ts`;
- `core/services/content/listingTemplatesService.ts`;
- whole `core/services/content/detailPageDocumentService.ts` for handed-off
  bounded/concurrency-safe revision adoption plus invalidation;
- whole `core/services/tools/importExportService.ts` for handed-off bounded
  query/chunk behavior and explicit invalidation-plan propagation through its
  transaction wrapper;
- new `core/services/cache/siteDependencyInvalidation.ts`;
- new `tests/vitest/cache/site-dependency-invalidation.test.ts`;
- new `tests/integration/runtime/site-shell-cache-invalidation.test.ts`;
- new `tests/integration/runtime/site-routing-cache-invalidation.test.ts`;
- new `tests/integration/runtime/site-form-listing-cache-invalidation.test.ts`;
- existing `tests/unit/tools/importExport.test.ts`,
  `tests/integration/routes/importExport.test.ts`, and
  `tests/unit/content/detailPageDocumentService.test.ts` for exact adoption
  assertions only.

Forbidden: `core/services/backups/**` (TASK-511), publicSite/siteCache, page/
entry/post/SEO, security settings/Admin, 07/08, migrations/packages and shared
docs/tasks. Before dispatch verify TASK-511's terminal or parent-gate exact
serialized import/restore seam can
collect/apply a `CacheInvalidationPlan` after its outer commit. If not, stop and
amend the tasks; never restore pre-commit invalidation to avoid the collision.
TASK-551-03 and TASK-551-06 hand off specifications/evidence only and do not edit
`importExportService.ts` or `detailPageDocumentService.ts`; this leaf is their
sole TASK-551 source writer and must adopt the handed-off batch/query/revision
requirements without weakening their tests.

## Dependency and Transaction Contract

- `publicSiteShell` returns selected menu/footer identities and dependency tags
  actually consumed. Mutation of a selected menu, any selected menu item/status,
  or selected published footer template invalidates `site-shell` plus dependent
  HTML through finite `site:shell`/`site:html` generations; unrelated drafts use
  only Admin detail state and do not create a generation key.
- Active theme/profile/token/route mutations bump the exact finite
  `site:themes`/`site:runtime` generations after commit. Inactive profile
  drafts do not globally invalidate; explicit preview remains cache-exempt.
- Public-setting dependency mapping explicitly covers `site.name`, cache TTL,
  homepage/404 IDs, menu/footer refs, content routes, public base/canonical
  inputs, analytics tracking and every L01 safe snapshot field. Secret/
  integration/security settings never enter the public snapshot.
- `setSetting`, `setSettings`, `deleteSetting` and `setSettingsTx` share one
  pure plan builder. `setSettingsTx` returns/collects its plan and never applies
  it before the caller's outer commit. Import wrapper and TASK-511 handoff merge
  and deduplicate plans, persist Redis outbox in the same outer transaction and
  apply once after terminal commit. Every before/consistency read and write in
  `setSettingsTx` and nested import receives and uses the supplied `tx`; no
  global `db`/`getSetting` fallback is permitted inside that transaction.
- Redirect create/update/delete invalidates global redirect generation plus old
  and new normalized source-path identities through the finite
  `site:redirects`/`site:html` generations. Positive and negative redirect
  records have short bounded TTL; no per-path generation key is created.
- Form configuration/status/schema/action changes invalidate linked rendered
  dependencies; submissions do not invalidate HTML and nonce-bearing HTML
  remains excluded.
- Listing query/template/detail-page create/update/delete/activation invalidate
  linked route/content-type/list/detail dependencies through finite
  `site:listings`/`site:entries`/`site:html` generations. No path scan or
  `KEYS`/`SCAN`; broad uncertain linkage uses `site:all`.
- All service mutations follow L02's transaction/outbox/after-commit pattern.
  Failed/no-op/rollback emits nothing; cache failure does not reverse success.
  Memory bump failure installs a local affected-family incoherence fence and
  forces DB/render bypass until recovery.
- Adopt TASK-551-03's handed-off bounded streaming/chunked import-export behavior
  without whole-table materialization, and TASK-551-06's handed-off shared
  concurrency-safe allocator plus bounded detail-page revision read/retention
  behavior. Preserve TASK-511 restore atomicity and checksums.
- Public Redis invalidation is bounded-eventual, not linearizable, with <=250 ms
  healthy polling, <=1 second p99 target, >5-second degraded/bypass readiness and
  policy TTL as the hard stale ceiling. Admin preview/read-after-write bypasses
  until event observation; security/private/nonce output remains excluded.

## Implementation Pseudocode

```ts
function buildSiteDependencyPlan(change): CacheInvalidationPlan | null {
  const tags = collectOldAndNewDependencyTags(change);
  return tags.length ? { eventKey: change.eventKey, tags } : null;
}

const committed = await db.transaction(async (tx) => {
  const change = await mutateUsingTxOnly(tx, input);
  const plan = buildSiteDependencyPlan(change);
  if (plan) await persistCacheInvalidationTx(tx, plan, backend);
  return { value: change.value, plan };
});
if (committed.plan) await applyCacheInvalidationAfterCommit(committed.plan);
```

## Security Contract

- **Visibility/routes:** no route registration change.
- **Auth/RBAC/CSRF/rate limits:** existing Admin/internal write enforcement and
  public-read middleware remain unchanged.
- **Validation:** strict existing schemas plus normalized bounded IDs/routes/
  settings keys/tags; unknown settings remain rejected.
- **Secrets/privacy:** secret/security/provider settings, form submissions and
  authored private bodies never enter cache/outbox/PubSub/logs.
- **Anti-abuse:** no public write changes; form nonce/HMAC/CAPTCHA stays
  authoritative and nonce-bearing HTML stays cache-exempt.

## Regression Shape and Validation

Prime multiple pages, then mutate selected/unselected menu/footer/theme/profile;
prove only declared dependencies/global fallback miss. Cover every public
setting above, redirect positive/negative old/new, form config vs submission,
listing query/template/detail linkage, import outer commit/rollback and Redis
failure retry. Inject a memory bump failure and prove local family bypass. Prove
`setSettingsTx` performs no global-client reads, and rerun handed-off bounded
import/chunk/checksum plus detail-page revision concurrency/retention assertions.
Run memory and two-client Redis variants with unique fixtures.

```bash
set -a && source .env && set +a
bun run test:vitest -- tests/vitest/cache/site-dependency-invalidation.test.ts
SERVER_CACHE_BACKEND=memory bun test \
  tests/integration/runtime/site-shell-cache-invalidation.test.ts \
  tests/integration/runtime/site-routing-cache-invalidation.test.ts \
  tests/integration/runtime/site-form-listing-cache-invalidation.test.ts \
  tests/integration/runtime/site-shell-runtime.test.ts \
  tests/integration/runtime/detail-page-preview-cache.test.ts \
  tests/unit/tools/importExport.test.ts \
  tests/integration/routes/importExport.test.ts \
  tests/unit/content/detailPageDocumentService.test.ts
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-09-l03 bun test \
  tests/integration/runtime/site-shell-cache-invalidation.test.ts \
  tests/integration/runtime/site-routing-cache-invalidation.test.ts \
  tests/integration/runtime/site-form-listing-cache-invalidation.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/{menus/menuService,pages/pageTemplateLibraryService,pages/publicSiteShell,themes/themeProfileService,settings/settingsService,redirects/redirectService,forms/formsService,content/listingQueriesService,content/listingTemplatesService,content/detailPageDocumentService,tools/importExportService}.ts \
  core/services/cache/siteDependencyInvalidation.ts \
  tests/unit/tools/importExport.test.ts \
  tests/integration/routes/importExport.test.ts \
  tests/unit/content/detailPageDocumentService.test.ts \
  tests/vitest/cache/site-dependency-invalidation.test.ts \
  tests/integration/runtime/site-*-invalidation.test.ts
```

Split any touched production/test file that would exceed 1,000 lines by cohesive
ownership before adding behavior. Documentation remains 10-L02 ownership.
