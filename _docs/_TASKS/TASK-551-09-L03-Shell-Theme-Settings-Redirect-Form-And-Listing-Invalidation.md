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

## Overview

Complete dependency invalidation for selected menu/footer, active theme,
public settings, redirects, forms, listing queries/templates and detail-page
configuration, including nested import transactions.

## Sub-Tasks

None. This file is an executable leaf under TASK-551-09.

## Exclusive Ownership

Sole writer of:

- `core/services/menus/menuService.ts`;
- `core/services/pages/pageTemplateLibraryService.ts`;
- `core/services/pages/publicSiteShell.ts`;
- `core/services/themes/themeProfileService.ts`;
- `core/services/settings/settingsService.ts`;
- `core/services/redirects/redirectService.ts`;
- new `core/services/redirects/redirectCachePolicy.ts`;
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
- new `tests/vitest/cache/redirect-cache-policy.test.ts`;
- new `tests/integration/runtime/site-shell-cache-invalidation.test.ts`;
- new `tests/integration/runtime/site-routing-cache-invalidation.test.ts`;
- new `tests/integration/runtime/site-form-listing-cache-invalidation.test.ts`;
- existing `tests/integration/runtime/site-shell-runtime.test.ts` for complete
  shell/render dependency adoption assertions;
- existing `tests/integration/runtime/detail-page-preview-cache.test.ts` for
  detail-preview cache-exclusion and revision adoption assertions;
- existing `tests/unit/menus/menuService.test.ts`,
  `tests/unit/pages/pageTemplateLibraryService.test.ts`,
  `tests/unit/pages/publicSiteShell.test.ts`,
  `tests/unit/themes/themeProfileService.test.ts`,
  `tests/unit/settings/settingsService.test.ts`,
  `tests/unit/redirects/redirectService.test.ts`,
  `tests/unit/forms/formsService.test.ts`,
  `tests/unit/content/listingQueriesService.test.ts`, and
  `tests/unit/content/listingTemplatesService.test.ts` for exact adoption
  assertions;
- existing `tests/unit/tools/importExport.test.ts`,
  `tests/integration/routes/importExport.test.ts`, and
  `tests/unit/content/detailPageDocumentService.test.ts` for exact adoption
  assertions only.

Forbidden: `core/services/backups/**` (TASK-511), publicSite/siteCache, page/
entry/post/SEO, security settings/Admin, 07/08, migrations/packages and shared
docs/tasks. `core/services/forms/formActionsService.ts` and its tests are also
explicitly read-only/forbidden: action definitions/runs are post-submission Admin
behavior, not a public rendered dependency. Before dispatch verify TASK-511's terminal or parent-gate exact
serialized import/restore seam can
carry its outer event key and `collectInvalidationTagsTx`, persist one plan in its
outer transaction and call the lifecycle-owned invalidation handle's
`applyAfterCommit(plan)` exactly once and await it after commit. Nested import contributes tags
only and no participant advances/fences coherence directly. If not, stop and
amend the tasks; never restore pre-commit or nested invalidation to avoid the
collision.
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
  `site:themes`/`site:runtime` generations after commit. A route or dependency-
  set change also bumps `site:all`, which owns the dependency manifest mapping.
  Inactive profile drafts do not globally invalidate; explicit preview remains
  cache-exempt.
- Public-setting dependency mapping explicitly covers `site.name`, cache TTL,
  homepage/404 IDs, menu/footer refs, content routes, public base/canonical
  inputs, analytics tracking and every L01 safe snapshot field. Secret/
  integration/security settings, `SecuritySettings`, rate-limit policy and
  header policy never enter the public snapshot. A changed
  snapshot field bumps `site:settings` plus its owning finite dependency tag;
  routing/dependency-set fields also bump `site:runtime` and `site:all`.
- `setSetting`, `setSettings`, `deleteSetting` and `setSettingsTx` share one pure
  tag selector. The one outermost authoritative transaction allocates one opaque
  `eventKey` before it begins and passes the same transaction/event key through
  `collectInvalidationTagsTx`. Nested settings/import/restore services contribute
  only finite tags to that collector; they never allocate another event key,
  persist an outbox row, apply invalidation or return an independently applicable
  plan. Old/new values/identities are selector input only. After all nested work,
  the outer wrapper creates exactly
  `{ eventKey, tags: deduplicated finite CacheTag[] }`, persists that one Redis
  outbox plan in the outer transaction and calls lifecycle
  `applyAfterCommit(plan)` once and awaits it after terminal commit. The handle
  absorbs cache transport failures into `applied|queued|bypassed` and resolves
  only after its local observation and any required force fence are visible;
  detached/`void` dispatch is forbidden.
  The plan contains no setting key, record ID, slug, path, raw/digested variable
  tag or domain payload. Every before/consistency read and write in
  `setSettingsTx`, nested import and restore receives and uses the supplied `tx`;
  no global `db`/`getSetting` fallback is permitted inside that transaction.
- Redirect create/update/delete invalidates global redirect generation plus old
  and new normalized source-path identities through the finite
  `site:redirects`/`site:runtime`/`site:html` generations, then discards those
  identities before plan construction. Positive and negative redirect
  records have short bounded TTL; no per-path generation key is created.
- Form public configuration/status/schema/field changes owned by `formsService`
  invalidate linked rendered dependencies. Form action-definition/action-run
  mutations and submissions do not invalidate HTML; nonce-bearing HTML remains
  excluded. No render audit, dependency selector, invalidation plan, outbox row,
  or source import may treat `formActionsService`/`form_actions` as public HTML.
- V1 never takes ownership of `commerceService`: any commerce product data/block
  is L01 `commerce_product_data` cache-excluded. Form/booking submission nonces,
  booking `slotsToken`, analytics beacon nonces, other request-scoped/one-time
  tokens and unknown dynamic dependencies likewise produce no manifest or HTML
  envelope. This leaf may select/invalidate finite tags for cacheable dependencies
  only; it cannot relax or reclassify an L01 exclusion.
- Listing query/template/detail-page create/update/delete/activation invalidate
  linked route/content-type/list/detail dependencies through finite
  `site:listings`/`site:entries`/`site:html` generations. No path scan or
  `KEYS`/`SCAN`; broad uncertain linkage uses `site:all`.
- All service mutations follow L02's transaction/outbox/after-commit pattern.
  Failed/no-op/rollback emits nothing; cache failure does not reverse success.
  The lifecycle-owned invalidation handle reports to the sole coherence
  controller, which alone advances the epoch or installs a local affected-family
  fence on bump failure and forces DB/render bypass until recovery. Domain code
  never calls an epoch/fence helper directly.
- Adopt TASK-551-03's handed-off bounded streaming/chunked import-export behavior
  without whole-table materialization, and TASK-551-06's handed-off shared
  concurrency-safe allocator plus bounded detail-page revision read/retention
  behavior. Detail autosave imports the TASK-551-06-owned revision module exports
  through the same documented owner path once that handoff is final; it does not
  wrap or redeclare them. It calls
  `withRevisionParentLock({ family: "detail_page", parentId }, tx, async () =>
  allocateRevision(input, tx))`; the owner callback is zero-argument and closes
  over the outer supplied `tx`.
  `input` is the owner-validated detail-page allocation input and the returned
  owner allocation result is adapted to the existing detail revision return shape
  without changing version/id semantics. Only the owner's machine-readable
  `revision_conflict` is mapped to the existing `detail_page_conflict` service
  error; every other error is rethrown unchanged and the route remains untouched.
  Preserve TASK-511 restore atomicity and checksums.
- Public Redis invalidation is bounded-eventual, not linearizable, with <=250 ms
  healthy polling and <=1 second p99 target. Locally visible age `>5_000 ms`
  forces value GET/fill bypass until proven recovery; policy TTL is the hard
  ceiling only for ambiguity not locally known degraded. Admin preview/read-after-write bypasses
  until event observation; security/private/nonce output remains excluded.

### L03-Owned Cache Policy

L03 owns the exact v1 policy for the additional cached family it adopts; callers
import this policy and do not synthesize variants:

| Family | schemaVersion | Positive TTL | maxValueBytes | Tags | negativeTtlMs | Eligibility | stalePolicy |
|---|---:|---:|---:|---|---:|---|---|
| `redirects` | `1` | `30_000 ms` | `65_536` | `site:all`, `site:runtime`, `site:redirects` | `10_000 ms` for a strictly proven normalized public redirect miss | normalized non-secret public GET/HEAD redirect projection or proven miss; unknown query/auth/private variants forbidden | `forbid` |

Encoded envelope plus UTF-8 key must fit the normalized total entry cap. Redirect
misses never carry request identity outside digested canonical key input. The
redirect loader returns `kind:"fill", fillKind:"positive"` for a decoded positive
projection and `kind:"fill", fillKind:"negative", companion:null` only for the
strictly proven public miss. That negative branch uses the declared 10,000 ms
negative ceiling, never the 30,000 ms positive TTL. An ineligible/malformed miss
returns or fails without fill according to L01's strict result contract.

## Implementation Pseudocode

```ts
async function saveDetailPageRevision(input, tx): Promise<DetailPageRevision> {
  try {
    return await withRevisionParentLock(
      { family: "detail_page", parentId: input.parentId },
      tx,
      async () => {
        const allocated = await allocateRevision(
          toDetailPageRevisionAllocationInput(input),
          tx,
        );
        return adaptAllocatedRevisionToDetailPageRevision(allocated);
      },
    );
  } catch (error) {
    if (isRevisionConflict(error)) throw detailPageConflictError();
    throw error;
  }
}

function collectInvalidationTagsTx(
  collector,
  tx,
  eventKey,
  change,
): void {
  collector.assertOuterContext(tx, eventKey);
  collector.add(collectOldAndNewDependencyTags(change));
}

const eventKey = createCacheInvalidationEventKey();
const committed = await db.transaction(async (tx) => {
  const collector = createTransactionInvalidationCollector(tx, eventKey);
  const change = await mutateUsingTxOnly(tx, input, {
    eventKey,
    collectInvalidationTagsTx: (nestedTx, nestedEventKey, nestedChange) =>
      collectInvalidationTagsTx(
        collector,
        nestedTx,
        nestedEventKey,
        nestedChange,
      ),
  });
  collectInvalidationTagsTx(collector, tx, eventKey, change);
  const tags = collector.finishDeduplicatedFiniteTags();
  const plan = tags.length ? { eventKey, tags } : null;
  if (plan) await persistCacheInvalidationTx(tx, plan, backend);
  return { value: change.value, plan };
});
if (committed.plan) {
  await getServerCacheRuntime().invalidation.applyAfterCommit(committed.plan);
}
```

## Security Contract

- **Visibility/routes:** no route registration change.
- **Auth/RBAC/CSRF/rate limits:** existing Admin/internal write enforcement and
  public-read middleware remain unchanged.
- **Validation:** strict existing schemas plus normalized bounded IDs/routes/
  settings keys/tags; unknown settings remain rejected.
- **Secrets/privacy:** secret/security/provider settings, form submissions and
  authored private bodies never enter cache/outbox/PubSub/logs. Plans/outbox
  contain only event key plus finite tags—never IDs, setting keys, slugs, paths,
  variable/digested identity tags or domain payload.
- **Anti-abuse:** no public write changes; form nonce/HMAC/CAPTCHA stays
  authoritative and nonce-bearing HTML stays cache-exempt.

## Testing Requirements

Prime multiple pages, then mutate selected/unselected menu/footer/theme/profile;
prove only declared dependencies/global fallback miss. Cover every public
setting above, redirect positive/negative old/new, form public config/fields vs
action definition/run/submission, listing query/template/detail linkage, import
outer commit/rollback and Redis
failure retry. Inject a memory bump failure and prove local family bypass. Prove
`setSettingsTx` performs no global-client reads, and rerun handed-off bounded
import/chunk/checksum plus detail-page revision concurrency/retention assertions.
Assert a nested import/restore allocates exactly one outer event key, contributes
tags only through `collectInvalidationTagsTx`, persists exactly one deduplicated
plan, and never applies from a nested service. Assert detail autosave uses one
transaction/parent lock, invokes the exact zero-argument owner callback and closes
over the same outer `tx`,
preserves the owner return shape, produces unique concurrent versions, maps only
`revision_conflict` to `detail_page_conflict`, and rethrows every other error
without route changes. Pin every L03 `redirects` policy field plus max+1 value/
entry bounds; assert positive/negative discriminators, negative TTL selection and
zero write for null-policy/ineligible/malformed negative results. Strictly reject
any plan/outbox extra identity field; assert the
outer wrapper calls lifecycle `applyAfterCommit` exactly once, nested/rollback/
no-op paths call it zero times, the caller cannot resume before observation/
fence visibility, no mutation detaches the promise, and only the sole controller
advances/fences coherence. Re-run L01's exact commerce/form-nonce/booking-nonce/slots-token/
analytics-nonce/request-token/unknown-dependency no-fill matrix and its tagged-
or-gated-or-excluded invariant. Run memory and two-client Redis variants with
unique fixtures.
Add a source guard over production renderer/dependency/invalidation modules that
fails on any `formActionsService`, `form_actions`, action-run cache tag or action-
mutation invalidation reference; runtime spies prove action changes produce zero
HTML cache/outbox activity while public form config/field changes still invalidate.

```bash
set -a && source .env && set +a
bun run test:vitest -- tests/vitest/cache/site-dependency-invalidation.test.ts \
  tests/vitest/cache/redirect-cache-policy.test.ts
SERVER_CACHE_BACKEND=memory bun test \
  tests/integration/runtime/site-shell-cache-invalidation.test.ts \
  tests/integration/runtime/site-routing-cache-invalidation.test.ts \
  tests/integration/runtime/site-form-listing-cache-invalidation.test.ts \
  tests/integration/runtime/public-site-cache-eligibility.test.ts \
  tests/integration/runtime/site-shell-runtime.test.ts \
  tests/integration/runtime/detail-page-preview-cache.test.ts \
  tests/unit/menus/menuService.test.ts \
  tests/unit/pages/pageTemplateLibraryService.test.ts \
  tests/unit/pages/publicSiteShell.test.ts \
  tests/unit/themes/themeProfileService.test.ts \
  tests/unit/settings/settingsService.test.ts \
  tests/unit/redirects/redirectService.test.ts \
  tests/unit/forms/formsService.test.ts \
  tests/unit/content/listingQueriesService.test.ts \
  tests/unit/content/listingTemplatesService.test.ts \
  tests/unit/tools/importExport.test.ts \
  tests/integration/routes/importExport.test.ts \
  tests/unit/content/detailPageDocumentService.test.ts
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-09-l03 bun test \
  tests/integration/runtime/site-shell-cache-invalidation.test.ts \
  tests/integration/runtime/site-routing-cache-invalidation.test.ts \
  tests/integration/runtime/site-form-listing-cache-invalidation.test.ts \
  tests/integration/runtime/public-site-cache-eligibility.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/{menus/menuService,pages/pageTemplateLibraryService,pages/publicSiteShell,themes/themeProfileService,settings/settingsService,redirects/redirectService,forms/formsService,content/listingQueriesService,content/listingTemplatesService,content/detailPageDocumentService,tools/importExportService}.ts \
  core/services/cache/siteDependencyInvalidation.ts \
  core/services/redirects/redirectCachePolicy.ts \
  tests/unit/menus/menuService.test.ts \
  tests/unit/pages/{pageTemplateLibraryService,publicSiteShell}.test.ts \
  tests/unit/themes/themeProfileService.test.ts \
  tests/unit/settings/settingsService.test.ts \
  tests/unit/redirects/redirectService.test.ts \
  tests/unit/forms/formsService.test.ts \
  tests/unit/content/{listingQueriesService,listingTemplatesService}.test.ts \
  tests/unit/tools/importExport.test.ts \
  tests/integration/routes/importExport.test.ts \
  tests/unit/content/detailPageDocumentService.test.ts \
  tests/vitest/cache/site-dependency-invalidation.test.ts \
  tests/vitest/cache/redirect-cache-policy.test.ts \
  tests/integration/runtime/site-shell-cache-invalidation.test.ts \
  tests/integration/runtime/site-routing-cache-invalidation.test.ts \
  tests/integration/runtime/site-form-listing-cache-invalidation.test.ts \
  tests/integration/runtime/site-shell-runtime.test.ts \
  tests/integration/runtime/detail-page-preview-cache.test.ts
```

## Documentation Updates Required

Split any touched production/test file that would exceed 1,000 lines by cohesive
ownership before adding behavior. Documentation remains 10-L02 ownership.
