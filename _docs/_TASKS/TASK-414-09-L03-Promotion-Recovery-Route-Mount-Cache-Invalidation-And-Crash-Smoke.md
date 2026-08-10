# TASK-414-09-L03: Promotion Recovery, Route Mount, Cache Invalidation, and Crash Smoke
# FileName: TASK-414-09-L03-Promotion-Recovery-Route-Mount-Cache-Invalidation-And-Crash-Smoke.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-09
**Priority:** Critical
**Category:** Designer / Integration / Recovery / Runtime Smoke
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-03-L03; TASK-414-04 terminal; TASK-414-05 terminal;
TASK-414-06 terminal;
TASK-414-07 terminal; TASK-414-08 terminal; TASK-414-09-L01,
TASK-414-09-L02, TASK-414-09-L04; TASK-414-10 terminal;
TASK-548-03-L01,
TASK-548-03-L03, TASK-548-06-L02, and TASK-548-07-L01 terminal;
TASK-551-08-L02, TASK-551-08-L03, TASK-551-09-L02, and TASK-551-09-L03
terminal; TASK-511 terminal; TASK-489 terminal; TASK-555 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Finish shared TASK-414 composition by reconciling interrupted Designer
promotions, composing the complete Agent/attachment/research/Post/handoff/
Designer API facades, mounting every family route/Admin contribution exactly
once, registering canonical navigation and rate-policy seams, adapting
promotion to TASK-551's finite invalidation lifecycle, and handing seven
exact Designer visible/crash flows to TASK-414-11-L01's shared smoke adapter.

This is the sole TASK-414 family integration writer and therefore lands after
TASK-414-10. No earlier or later
implementation leaf may reopen shared route/navigation mounts or aggregate
cache publication. It consumes terminal TASK-555's exact Setup/Solution Kits
host-region and in-memory continuation exports; a missing/renamed host anchor is
contract drift, not permission to reconstruct that UI. TASK-414-10-L02
contributes the strict deps-erased Figma route-mount builder and browser-safe
source descriptor,
and TASK-414-10-L01 contributes the exact `resolveAndCreateFigmaImportRuntimeV1`
factory from which the materialization-source verifier is obtained; this leaf
statically composes those exact exports into its predeclared Figma import
slot/rate/source-verification seam without mounting them directly.
TASK-414's closure leaf may update tests/docs/
tasks/changelog only and must not change these production contracts.


## Sub-Tasks

None; this is an executable leaf.
## Exact Ownership

### New focused modules

This leaf is the sole writer for:

- `core/services/designer/promotionRecoveryContract.ts`
- `core/services/designer/promotionRecoveryService.ts`
- `core/services/designer/promotionReconciler.ts`
- `core/services/designer/designerCacheInvalidation.ts`
- `core/services/designer/designerRuntimeFacade.ts`
- `core/services/assistant/task414RuntimeFacade.ts`
- `core/server/routes/contributions/task414RouteContributions.ts`
- `core/admin/app/routes/task414AdminContributions.ts`
- `core/admin/app/routes/designer.admin-route-descriptor.ts`
- `core/admin/app/routes/designer.admin-route.tsx`
- `core/admin/ui/designer/promotion/DesignerPromotionPanel.tsx`
- `core/admin/ui/designer/promotion/DesignerRecoveryNotice.tsx`
- `tests/vitest/designer/designer-promotion-recovery.test.ts`
- `tests/vitest/cache/designer-promotion-invalidation.test.ts`
- `tests/vitest/admin/designer/designer-admin-route.test.tsx`
- `tests/vitest/admin/designer/designer-promotion-panel.test.tsx`
- `tests/integration/designer/designer-promotion-recovery.test.ts`
- `tests/integration/designer/designer-postcommit-invalidation.test.ts`
- `tests/integration/routes/designer-mount.test.ts`
- `tests/security/designerIntegration.security.test.ts`

### Shared integration regions

After re-reading every terminal owner, this leaf alone makes the bounded
TASK-414 additions to:

- `core/server/routes/assistantRoutes.ts` — the ONE terminal edit that (1)
  rejects the retired legacy `mode: "llm-guide"` Agent request server-side
  (TASK-414-03-L03 retires the browser/validation surfaces and emits the typed
  Agent contribution; it does not edit this file) and (2) wires
  TASK-414-05-L05's frozen action registry into plan normalization/dry-run/
  execute through its focused `assistantActionRouteInjection.ts` helper. No
  other TASK-414 leaf edits this file;
- `core/server/routes/index.ts` for the pure contribution factories landed by
  TASK-414-03-L03 (Agent session/run), TASK-414-04 (private attachment and
  research), TASK-414-05 (Post/action/binding/handoff), TASK-414-06-L05
  (external-configuration approval), TASK-414-07/08/09
  (Designer workspace/generation/preview/decision/promotion/recovery), plus the
  strict TASK-414-10 Figma factory mounted through the generic optional
  Designer import slot;
- `core/server/middleware/rateLimit.ts`,
  `core/services/settings/securitySettings.ts`,
  and `core/server/validation/settingsSchemas.ts` for exact `assistant`, `assistant-research`,
  `private-input-upload`, `assistant-external-config`, `designer-generation`, `designer-preview`,
  `designer-promotion`, and predeclared disabled-by-default `designer-figma`
  bucket/config/path selection;
- terminal TASK-551's composed HTTP lifecycle registration region only, to
  register the bounded expiry, cleanup, promotion-reconciliation, and private-
  attachment participants without adding signals/listen/drain owners;
- `core/admin/utils/adminPaths.ts`, the terminal shared Admin route registry,
  prefetch owner, and `core/admin/ui/navigation/sidebarConfig.ts` for canonical
  Agent list/session and Designer list/workspace paths plus the generic Designer
  import route token. Navigation uses `AdminLink`/shared prefetch helpers;
- the exact focused tests/fixtures for those shared contracts.

TASK-414-02-L01 remains the sole writer of backend/browser permission catalogs
and risk metadata. This leaf imports its exact IDs and verifies middleware/UI
use; it must not re-declare or edit them. TASK-414-02-L02 is the later final
reconciliation owner for TASK-548 route/capability/docs generated projections,
so this leaf emits descriptors but does not edit TASK-548 coverage source or
generated outputs.

Do not edit `AdminApp.tsx`, `AssistantPanel.tsx`, Guide tabs, permission
catalogs, TASK-548 coverage/generated outputs, TASK-547
package/install modules, native domain services, canonical schemas/tables,
TASK-551 cache internals, TASK-511 archive/import internals beyond L02's landed
extension, `core/server/{router,httpServer,requestBody,routeResponse,
routePreBodyPolicy}.ts`, public CMS renderers, task indexes, user/developer docs,
or changelog.
If a terminal shared seam/path differs or another owner is active, stop and
reconcile ownership before editing; do not add a second registry/lifecycle/
cache/route implementation.

TASK-414-03-L03 is the sole post-TASK-551 successor owner of the generic route
transport, pre-body policy, response union, safe tail, HEAD, and raw-stream
behavior. This leaf consumes those terminal exports and statically composes only
route/rate/lifecycle/Admin contributions. Missing pre-body policy, response
policy, or declared bucket on any TASK-414 route fails integration tests/startup;
this leaf may not repair that by adding path switches or body parsing in
`httpServer.ts`.

### Runtime-smoke handoff boundary

TASK-414-11-L01 is the sole family writer for the literal `task-414` suite,
central runtime-smoke contracts/CLI/registry, adapter/worker files, smoke unit
tests, screenshots/reports, and final real-flow execution. This leaf must not
register a competing Designer-only suite or edit those files. It owns the
production recovery/fault seams and the exact seven-scenario Designer handoff
below; the closure adapter consumes them through strict injected test handlers.

The handoff is defined against `docs/develop/runtime-smoke-cookbook.md` and
requires the shared wrappers/helpers for lifecycle, polling, process supervision,
profile-scoped persistent workers, database batches, browser segments,
checkpoint identities, redaction, timing, cleanup, and report contracts. A
task-local shell wrapper, helper fork, worker lifecycle, Playwright lifecycle,
DB cleanup loop, or report implementation is forbidden.

## Recovery and Checkpoint Contract

Durable promotion checkpoints are monotonic and bind lease fence plus the full
approval tuple:

```text
lease_acquired
  -> private_prepared
  -> product_committed
  -> postcommit_observed
  -> complete

precommit failure -> compensation_pending -> returned_to_review | failed
ambiguous evidence -> reconciliation_required
```

`product_committed` is established by the atomic promotion ledger/transaction,
not by an in-memory callback. There is no durable `product_tx_started` claim:
an interrupted uncommitted transaction rolls back and is classified by absence
of a complete ledger after lease expiry.

The bounded keyset reconciler claims expired/nonowned leases using the same
singleton-activation/workspace lock order and a higher fence. It then follows
exactly one path:

- **Before product commit:** prove no complete ledger/canonical mapping exists.
  Resume private-prepared promotion only when the exact approval intent remains
  unexpired, all digests/baseline/capabilities remain equal, prepared artifacts
  remain private and valid, and the recorded actor is active with all current
  permissions. Otherwise compensate private artifacts and CAS back to `ready`
  or bounded `failed` review.
- **After product commit:** require one complete atomic ledger, complete active
  generation/pointer binding, and committed invalidation plan. Never call
  native adapters or compensation. Await the
  lifecycle-owned `applyAfterCommit(plan)` and finish checkpoint/lease state;
  the durable outbox handles queued transport.
- **Ambiguous/impossible evidence:** partial/mismatched ledger, ownership drift,
  missing committed plan, stale fence, or canonical inconsistency transitions
  to `reconciliation_required`, revokes preview, alerts operators, and performs
  no automated canonical/private mutation.
- **Restored archive:** `designer_restore_*_review_required` always blocks auto-
  resume regardless of archived checkpoint/intent. An authorized human must
  prepare a fresh baseline and approval.

Fault injection is an injected test dependency with named checkpoints; it is
not an HTTP/body/config flag and is unavailable in production composition.

## Exact Cache Invalidation Contract

`designerCacheInvalidation.ts` maps the committed promotion ledger/generation's resource-
kind/dependency facts to terminal TASK-551's finite `CacheTag` set. It returns
exactly `{ eventKey, tags }`; no resource ID, slug, path, workspace identity,
package/receipt data, or arbitrary payload may enter the plan. Tags are sorted,
unique, bounded, and include only dependencies actually affected by the staged
plan (content/page/SEO, shell/theme/settings/redirect/form/listing, and global
route dependency tags where terminal selectors require them).

TASK-414-09-L04 injects this builder and calls terminal
`persistCacheInvalidationTx(tx, plan, backend)` inside the promotion transaction.
The uninterrupted outer promotion caller then invokes and awaits only
`getServerCacheRuntime().invalidation.applyAfterCommit(plan)` after commit.
Recovery may replay the same stable event key, so delivery is at-least-once and
effects are idempotent/effectively-once. Nested native adapters contribute
facts/tags only; none persists its
own plan or advances epochs/fences. Rollback/no-op emits no plan/call. A
committed `applied | queued | bypassed` outcome remains success after the
required observation/fence semantics and is recorded in recovery evidence.

Designer staging/preview remains cache-ineligible. Rejection/expiry revokes
preview and invalidates only authenticated Designer browser-memory keys; it
does not advance public CMS generations because canonical state did not change.

## Route, Permission, and Admin Composition

- Mount every contribution only through `Task414RuntimeFacade`. Agent,
  attachment, research, Post/action/binding/handoff, Designer, preview,
  decision, promotion, reject, and recovery methods must all be complete or
  return a typed capability-unavailable result before side effects.
- Mount `registerDesignerRoutes` only with a complete `DesignerApiFacade` whose
  provider/compiler/preview/promotion/reject/recovery methods are all available
  or fail with a typed capability error before side effects.
- Post-terminal built-in source additions extend that same facade and the
  statically composed `designerMaterializationSources` input. TASK-556 may add
  only its literal code-owned contribution and injected service dependency;
  it must not reopen `registerTask414Integration`, add a second route mount, or
  reconstruct provider/compiler/preview/promotion dependencies.
- Mount only the authenticated same-origin Designer preview GET/HEAD methods
  owned by `registerDesignerRoutes`. Do not mount a second preview factory,
  public/cross-host preview, bearer/token mint, or preview write route.
- Mount TASK-414-04's private attachment route through its terminal factory;
  Designer binds only ready projections and adds no duplicate upload path.
- Mount TASK-414-03-L03's Agent routes, TASK-414-05's Post/action/binding/
  handoff contributions, and TASK-414-06-L05's external-configuration approval
  contribution without changing request schemas or bypassing exact product/
  native RBAC.
- Compose pure Agent and Designer Admin descriptors through the terminal route
  registry. Use canonical `adminPaths`, `AdminLink`, and
  `prefetchAdminRoute`; no hand-built href, route alias, or AssistantPanel mode.
- Descriptor/nav visibility requires `designer:read`; UI controls reflect
  `designer:write`/`designer:promote`, while server authorization remains
  authoritative.
- The workspace-detail descriptor exposes `setupAccess: "review"` for
  TASK-555's in-memory Setup continuation gate. The list/create/import routes do
  not. Refresh without that browser-memory continuation returns to Setup, while
  every server route still applies normal Designer authorization.
- Own one strict optional `designer-import` contribution slot and
  `designer-figma` rate-policy key. Statically import TASK-414-10-L02's exact
  `figmaDesignerImportContribution` (pure descriptor only) and
  `buildFigmaDesignerImportRouteMount` deps-erased mount builder, plus
  TASK-414-10-L01's exact `resolveAndCreateFigmaImportRuntimeV1`
  factory and `isFigmaImportRuntimeV1` verifier; the closed source-binding
  verifier is obtained only as
  `runtime.materializationSourceContribution` from the `available` branch and
  is never imported directly. The composer calls
  `resolveAndCreateFigmaImportRuntimeV1({ featureEnabled, settings,
  configDeps, runtimeDeps })` exactly once and does not read config or status
  separately: the factory is the sole single-read owner
  (`resolveFigmaBackendConfigV1` runs inside it; an invalid config becomes the
  `unavailable`/`config_invalid` branch with zero construction;
  `FIGMA_REFRESH_CONTRACT_STATUS_V1` is imported inside the factory, never
  caller-supplied). `Task414IntegrationDeps` carries no pre-resolved
  `config.figmaBackend` field. The composer then calls
  `isFigmaImportRuntimeV1(runtime)` before consuming the runtime and treats a
  failed check exactly like the `unavailable` branch. The pure
  `figmaDesignerImportContribution` (with its browser-safe
  descriptor) is always composed, so the slot renders the descriptor and its
  unavailable reason in disconnected/unavailable states; availability gates
  only route factory invocation, dependency construction, and materialization.
  When unavailable, the factory returns no runtime (zero service/contribution
  construction, zero I/O), route mounting is skipped, the materialization
  registry has no `figma` verifier, and persisted Figma claims fail closed
  before I/O. Registration is duplicate-safe and cannot accept arbitrary
  plugin route code, module paths, side-effect imports, directory scanning,
  forged structural runtimes, or casts. This leaf's `task414RouteContributions.ts`
  owns the exact `registerConfiguredDesignerImportRoutes` helper used below; it
  accepts only TASK-414-07-L03's closed registry/config plus a source-keyed
  map of deps-erased `DesignerImportRouteMountV1` mounts. It receives the
  always-present pure contributions plus the source-keyed availability map;
  when a source is unavailable it skips route
  mounting, and it invokes only the
  already built pre-bound mounts (built by `buildFigmaDesignerImportRouteMount`
  from the WeakSet-verified runtime), so no function requiring
  `DesignerFigmaRouteDeps` is ever stored under
  `(DesignerImportRouteDepsV1) => void` and a forged runtime can never produce
  a mount (`null` is returned). Registration stays
  prefixless: the
  server-owned HTTP layer owns `/admin/api` exactly once, the helper takes no
  `adminApiPrefix` argument and never prepends the prefix, and `/admin/api`
  appears only in external endpoint metadata and tests; a second or double
  prefix fails composition tests. It uses TASK-414-03-L03's `RouteResponseV1`
  policy for no-store headers. Exact Figma status/source/import descriptors
  precede generic `/:id` routes in the composed registry.
- The same helper additionally registers the composed safe dynamic
  import-source status route `GET /designer/import-sources/status` (prefixless,
  internal, `designer:read`/`admin_read`, no-store). It returns one
  designer-readable safe status projection per composed source — the pure
  descriptor plus the source's dynamic
  `available | disconnected | unavailable` state and bounded reason — with zero
  settings leakage: no config value, client ID, token expiry, secret, or
  provider detail ever reaches the projection. Each source's safe dynamic state
  comes from its own safe projection module (TASK-414-10-L02's
  `projectFigmaDesignerImportStatus` for Figma); the helper only joins and
  serializes them.
- TASK-414-02-L02 later regenerates documentation/capability coverage from the
  landed pure descriptors and is the sole writer of related Guide corpus and
  Assistant/capability developer prose. TASK-414-11-L01 owns only its
  enumerated non-corpus closeout documents.

## Implementation Pseudocode

```ts
export async function reconcileDesignerPromotion(
  candidate: PromotionRecoveryCandidate,
  deps: PromotionRecoveryDeps
): Promise<PromotionRecoveryResult> {
  const claim = await deps.leases.reclaimExpiredWithHigherFence(candidate);
  const evidence = await deps.ledger.inspectExact(claim.approvalBinding);

  if (evidence.state === "complete") {
    assertAtomicCommittedEvidence(evidence, claim);
    const outcome = await deps.cacheRuntime.invalidation.applyAfterCommit(evidence.plan);
    return deps.checkpoints.completeCommittedRecovery(claim, evidence, outcome);
  }
  if (evidence.state === "absent") {
    if (await canSafelyResumePreCommit(claim, deps)) {
      return deps.promotion.resumeExactPreparedApproval(claim);
    }
    await deps.privatePreparation.compensateIdempotently(claim);
    return deps.checkpoints.returnToReview(claim);
  }
  return deps.checkpoints.requireManualReconciliation(claim, evidence.safeCode);
}

export function registerTask414Integration(
  router: Router,
  lifecycle: RuntimeLifecycleRegistry,
  deps: Task414IntegrationDeps
): void {
  // Single call; the factory is the sole single-read owner of config/status.
  // No separate resolveFigmaBackendConfigV1 or refresh-status read here; an
  // invalid config becomes the unavailable/config_invalid branch inside the
  // factory with zero construction.
  const figmaResolution = resolveAndCreateFigmaImportRuntimeV1({
    featureEnabled: deps.config.designerFigmaEnabled,
    settings: deps.settings,
    configDeps: deps.figmaConfigDeps,
    runtimeDeps: deps.figmaRuntimeDeps,
  });
  const figmaRuntime =
    figmaResolution.state === "available" &&
    isFigmaImportRuntimeV1(figmaResolution.runtime)
      ? figmaResolution.runtime // WeakSet recheck before any consumption
      : null; // zero service/contribution construction, zero I/O
  const designerMaterializationSources =
    composeDesignerMaterializationSourceRegistry({
      promptAi: builtInPromptAiMaterializationSource(deps.provider),
      preparedPrivateSources: figmaRuntime
        ? [figmaRuntime.materializationSourceContribution]
        : [],
    });
  registerAssistantAgentSessionRoutes(router, deps.agent);
  registerAssistantResearchRoutes(router, deps.research);
  registerPrivateInputAttachmentRoutes(router, deps.privateInputs);
  registerAssistantPostActionRoutes(router, deps.postActions);
  registerAssistantResourceBindingRoutes(router, deps.resourceBindings);
  registerAssistantDesignerHandoffRoutes(router, deps.designerHandoffs);
  registerAssistantExternalConfigurationRoutes(
    router, deps.externalConfiguration,
  );
  registerDesignerRoutes(router, {
    ...deps.routes,
    facade: buildDesignerRuntimeFacade({
      ...deps,
      designerMaterializationSources,
    }),
  });
  const designerImports = composeDesignerImportContributions(
    [figmaDesignerImportContribution], // always composed: descriptor visible even when unavailable
  );
  const figmaRouteMount: DesignerImportRouteMountV1 | null = figmaRuntime
    ? buildFigmaDesignerImportRouteMount({
        runtime: figmaRuntime, // builder re-verifies WeakSet membership; null on forgery
        responsePolicy: task414RouteResponsePolicy,
        serviceDeps: deps.figmaImportServiceDeps,
      }) // deps-erased closure; internal Picks only, never caller-supplied
    : null;
  registerConfiguredDesignerImportRoutes(router, designerImports, {
    availabilityBySource: figmaResolution.state === "available"
      ? { figma: figmaResolution.availability } // safe descriptor: state + credentialGeneration only
      : { figma: { state: "unavailable", reason: figmaResolution.reason } },
    routeMountsBySource: figmaRouteMount ? { figma: figmaRouteMount } : {},
    responsePolicy: task414RouteResponsePolicy,
  });
  lifecycle.register(
    assistantAgentRunLifecycleContribution.create(deps.agentLifecycle),
  );
  lifecycle.register(
    privateInputAttachmentLifecycleContribution.create(deps.privateInputLifecycle),
  );
  lifecycle.register(deps.expiryParticipant);
  lifecycle.register(deps.cleanupParticipant);
  lifecycle.register(deps.promotionReconcilerParticipant);
  lifecycle.register(deps.restoreFinalizationParticipant);
}
```

Registration is idempotent at module composition and lifecycle start/close.
Consume terminal TASK-551's existing `registerRuntimeLifecycleParticipant`
owner; never call lifecycle start/close, install signals, listen, or drain.

This leaf also applies the single terminal `assistantRoutes.ts` edit as part of
the same composition: it rejects the retired legacy `mode: "llm-guide"` Agent
request server-side and wires TASK-414-05-L05's frozen action registry through
`applyAssistantActionRegistry` (from L05's focused
`assistantActionRouteInjection.ts`) into plan normalization, dry-run, and
execute. No other TASK-414 leaf edits `assistantRoutes.ts`.

## Data Flow

```text
Admin route descriptor/navigation
  -> authenticated internal route + exact bucket/RBAC/CSRF/schema
  -> composed Designer facade
  -> staged generation/preview OR transactional promotion/reject/recovery

promotion product transaction
  -> complete generation + finite invalidation plan persisted atomically
  -> active-generation pointer CAS
  -> commit
  -> awaited applyAfterCommit(plan); recovery may replay the same eventKey
  -> public/cache-visible complete site

expired lease/checkpoint
  -> bounded reconciler + higher fence
  -> complete ledger: postcommit observation only
     | no ledger: exact resume or private compensation/review
     | ambiguous: manual reconciliation, no mutation
```

## Machine-Readable Errors

- `designer_runtime_unavailable`
- `designer_route_contract_invalid`
- `designer_rate_policy_invalid`
- `designer_recovery_not_eligible`
- `designer_recovery_lease_lost`
- `designer_recovery_actor_unavailable`
- `designer_recovery_permission_denied`
- `designer_recovery_baseline_stale`
- `designer_recovery_compensation_failed`
- `designer_promotion_reconciliation_required`
- `designer_invalidation_plan_invalid`
- `designer_invalidation_evidence_missing`

Routes map only known safe codes. Recovery logs contain stable run/checkpoint
IDs and bounded phases/codes, never lease secrets/fences, approval/package
bodies, preview bind secrets, private paths, native IDs outside authorized results,
cache event internals, SQL, or stack traces.

## Security Contract

| Concern | Contract |
|---|---|
| Visibility | Agent/research/attachment/Post/handoff/external configuration and all Designer management/preview/decision/reconciliation routes are internal same-origin Admin APIs. No public AI, preview, upload, token-mint, promotion, reject, restore, or recovery route exists. |
| Authentication | Every route, including preview GET/HEAD, requires the current Admin session and server actor. Preview also requires a consumed one-time bind secret and exact server-side Admin-session binding; the path ID never replaces authentication. Lifecycle workers use registered bounded identities and durable fences. |
| RBAC | Read uses `designer:read`; stage/revise/reject uses `designer:write`; approval/promotion/reconciliation uses high-risk `designer:promote` plus exact current native permissions. Attachment and backup keep their terminal permissions. |
| CSRF | Every internal POST/PUT/PATCH/DELETE is behind shared CSRF before parsing/dispatch. GET/HEAD are side-effect free. Workers are lifecycle participants, not hidden HTTP bypasses. |
| Rate limits | Exact policies are `assistant`, `assistant-research`, `private-input-upload`, `assistant-external-config`, `designer-generation`, `designer-preview`, `designer-promotion`, and the disabled-until-registered `designer-figma`; ordinary metadata uses `admin_read`/`admin_write`, and terminal backup policies remain unchanged. Figma status reads use `admin_read`; Figma OAuth/source-grant/import mutations use `designer-figma`, with import also charging `designer-generation`. Missing config/path mapping fails startup/tests. |
| Validation | Recursive reject-unknown API/facade/recovery/checkpoint/plan/config/worker/smoke schemas; exact state/version/digest/baseline/receipt/lease/idempotency equality; finite cache tags; bounded batches/routes/bytes/retries. |
| Anti-abuse | Internal session + CSRF for mutations + RBAC + ownership + CAS + lease/fence + idempotency apply. Preview is same-origin, session-bound, short-lived, revoked, no-store/noindex/CSP protected, and read-only. No public write exists, so nonce/HMAC write signing and reCAPTCHA are not applicable. Generated public forms retain native anti-abuse after promotion. |

## Runtime-Smoke Scenarios

TASK-414-11-L01's `fast` and `certification` profiles must execute these exact
seven distinct Designer scenario IDs without omission or substitution:

1. **`designer-staging-invisible-navigable-preview`** — create/save/reload and
   generate a complete staged graph; show Designer durability while CMS/search/
   cache/front/Agent/Guide contain zero staged resources; navigate home,
   secondary, detail, and inert-form routes with visible effects, private
   assets, noindex/no-store, deep nesting, wide/narrow geometry, light/dark
   Admin chrome, and zero console/network escapes.
2. **`designer-revision-digest-rotation`** — bind clean multimodal projections,
   request a revision, and visibly prove immutable history/graph diff plus
   workspace/core/sidecar/bundle/stage/receipt/preview digest rotation and old-preview
   revocation.
3. **`designer-reject-owned-cleanup`** — reject one draft and claim one expiry;
   visibly show terminal state and exact staging/input/private cleanup while
   unrelated/canonical rows and bytes remain unchanged. Backup/restore no-auto-
   resume remains a required L02 integration test and closure security gate,
   not an extra runtime scenario ID.
4. **`designer-approve-front-parity`** — visibly deny missing native RBAC and a
   stale live baseline with zero writes; refresh review, approve once, and prove
   one complete canonical graph plus preview/front content/navigation/geometry
   parity and cache/search/outbox observation. Hold one old-generation request
   across cutover and prove it sees the complete old site while the first new
   request sees only the complete new site; normal Admin sections expose all
   promoted resources together.
5. **`designer-crash-retry-idempotency`** — exercise at least private-prepared,
   precommit adapter, and product-committed-before-`applyAfterCommit` process
   loss points; restart/reconcile, show compensation or committed completion as
   appropriate, prove no partial/duplicate visibility or leaked lease, replay
   the same key once, and reject a mismatched tuple.
6. **`designer-cross-industry-matched-media`** — generate a non-service-business
   site whose exact industry/role has trusted licensed image/video/gallery
   candidates; prove semantic match, attribution, accessible playback/gallery,
   staged invisibility, approve/front parity, and exact owner cleanup.
7. **`designer-cross-industry-unsupported-media-empty`** — generate a distinct
   industry/role with no trusted candidate and prove the visible honest empty/
   needs-input state, zero unrelated stock fallback, zero remote/model URL,
   valid layout, and clean reject with no canonical Media/content residue.

Use `playwright-cli` only through TASK-414-11-L01's cookbook-registered shared
browser wrapper/segments, restart
the Bun dev server first, verify Admin/front readiness, collect console
listeners before navigation, and store evidence only beneath the closure
suite's exact
`_docs/_workflows/_smoke/evidence/task-414/task-414-certification/`
certification allowlist. Fast candidates stay under the cookbook-owned
task/session candidate root and are removed/proven absent before certification.

Assertions target computed styles, geometry, DOM/ARIA state, headers, route
navigation, public bytes, DB/ledger/query canaries, process restart, and
cleanup receipts—not mere control/rule presence. Use condition polling,
independent scenario result boundaries/report assertions, and the shared profile
worker plus fixture/cleanup helpers. All seven handoff scenarios execute on
every invocation; this leaf defines no runtime checkpoint, seal, or resume
state. No fixed sleeps, task-local worker, one-process-per-query worker,
unbounded cleanup, or selective scenario skipping is allowed.

## Regression-Test Shape

Vitest covers the recovery decision table, impossible/ambiguous evidence,
restored no-resume marker, finite tag mapping for every supported resource kind,
no-ID/payload cache plans, exact permissions/rate buckets/Admin descriptor/path,
UI recovery states, and the exact seven-scenario closure handoff.

Bun integration/security tests cover route registration/middleware order,
same-origin Admin GET/HEAD-only preview, lifecycle registration idempotence, bounded
reconciler claims, higher-fence races, actor/RBAC/baseline changes, private
compensation retry, complete-ledger no-adapter recovery, impossible-ledger
manual stop, and exact TASK-551 persisted at-least-once/effectively-once
postcommit behavior for `applied|queued|bypassed`. They also table-drive the
single authoritative Figma resolution across flag/status/config combinations.
With the current official-doc conflict, even a true flag never mints a runtime:
`resolveAndCreateFigmaImportRuntimeV1` returns the `unavailable` branch so zero
Figma store/client/transport/scanner/storage
dependencies, routes, or verifier are constructed and zero I/O occurs; forged
structural runtimes, casts, and direct contribution imports prove the same
(`isFigmaImportRuntimeV1` fails them and `buildFigmaDesignerImportRouteMount`
returns `null`),
while the pure contribution/descriptor stays composed so the slot renders the
unavailable reason.
The composed registry proves prefixless registration with `/admin/api` owned
by the server HTTP layer and present only in external endpoint metadata/tests
(no `adminApiPrefix` argument, no double prefix), exact
status-before-`/:id` precedence, both import buckets, route-specific pre-body
order, and no-store `RouteResponseV1` headers. A disabled persisted Figma claim
performs zero I/O, and missing, duplicate, unknown, or caller-supplied source
verifiers fail startup or the claim closed as applicable. Test source/import guards forbid direct cache epoch/
fence APIs and competing lifecycle/signal/listen/drain owners.

TASK-414-11-L01 owns runtime-smoke unit tests for static registration, both
profiles, the complete 25-scenario family inventory containing these seven
Designer IDs, safe evidence/redaction, repository guard, screenshot identities,
readiness/console/header/visible-effect proof, crash receipts, bounded set-based
cleanup, and cleanup aggregation.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/designer/designer-promotion-recovery.test.ts \
  tests/vitest/cache/designer-promotion-invalidation.test.ts \
  tests/vitest/admin/designer/designer-admin-route.test.tsx \
  tests/vitest/admin/designer/designer-promotion-panel.test.tsx
set -a && source .env && set +a && bun test \
  tests/integration/designer/designer-promotion-recovery.test.ts \
  tests/integration/designer/designer-postcommit-invalidation.test.ts \
  tests/integration/routes/designer-mount.test.ts \
  tests/security/designerIntegration.security.test.ts
bun run check:admin-boundary
bun run gates:coderso
git diff --check
wc -l core/services/designer/promotionRecoveryContract.ts \
  core/services/designer/promotionRecoveryService.ts \
  core/services/designer/promotionReconciler.ts \
  core/services/designer/designerCacheInvalidation.ts \
  core/services/designer/designerRuntimeFacade.ts \
  core/services/assistant/task414RuntimeFacade.ts \
  core/server/routes/contributions/task414RouteContributions.ts \
  core/admin/app/routes/task414AdminContributions.ts \
  core/admin/app/routes/designer.admin-route-descriptor.ts \
  core/admin/app/routes/designer.admin-route.tsx \
  core/admin/ui/designer/promotion/DesignerPromotionPanel.tsx \
  core/admin/ui/designer/promotion/DesignerRecoveryNotice.tsx \
  tests/vitest/designer/designer-promotion-recovery.test.ts \
  tests/vitest/cache/designer-promotion-invalidation.test.ts \
  tests/vitest/admin/designer/designer-admin-route.test.tsx \
  tests/vitest/admin/designer/designer-promotion-panel.test.tsx \
  tests/integration/designer/designer-promotion-recovery.test.ts \
  tests/integration/designer/designer-postcommit-invalidation.test.ts \
  tests/integration/routes/designer-mount.test.ts \
  tests/security/designerIntegration.security.test.ts
```

TASK-414-11-L01 then runs the closure-owned adapter after every production leaf
is terminal:

```bash
bun scripts/runtime-smoke.ts run --suite task-414 \
  --profile fast --session task-414-fast
bun scripts/runtime-smoke.ts run --suite task-414 \
  --profile certification --session task-414-certification
```

Every added/modified human-authored production/test file must remain at or below
1,000 physical lines. The closure receipt records both smoke JSON reports,
timings, scenario receipts, console errors, cleanup, and screenshots.

## Documentation Updates Required

Hand the closure leaf the final route/permission/rate-limit matrix, Designer
Admin path/navigation, adapter availability, recovery decision table and
operator runbook, finite invalidation mapping/outcomes, the exact seven-scenario
runtime-smoke handoff, and security/privacy evidence. Do not edit user/developer
docs, TASK board/status files, generated final coverage outputs, or changelog
1266 in this implementation leaf.
