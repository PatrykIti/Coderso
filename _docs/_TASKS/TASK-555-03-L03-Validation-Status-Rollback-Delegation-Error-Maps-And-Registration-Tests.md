# TASK-555-03-L03: Validation Status Rollback Delegation Error Maps and Registration Tests
# FileName: TASK-555-03-L03-Validation-Status-Rollback-Delegation-Error-Maps-And-Registration-Tests.md

**Parent Subtask:** TASK-555-03
**Priority:** High
**Category:** Internal API / Lifecycle / Error Mapping / Registration
**Estimated Effort:** Large
**Dependencies:** landed TASK-555-03-L02 receipt; landed TASK-555-06-L01/L02
lineage, installed-state, validation-service, and drift-policy receipts; terminal
TASK-414-02-L01 pure capability schema (authored `⏳ To Do` in the parallel
TASK-414 worktree; external blocker until terminal) and terminal TASK-548 source
handoff
**Status:** ⏳ To Do

---

## Overview

Add status, explicit validation, and exact source-run rollback route factories;
centralize exhaustive safe domain error mapping; then compose all TASK-555 factories
into the existing Solution Kits and Setup route modules without regressing TASK-489
history or the deterministic `/solution-kits/plan` endpoint. Replace TASK-489's generic
route's direct engine call with the same server-verified curated-lineage composite used
by the new aliases. Prove final route order,
registration, permissions, CSRF/rate classification, and unknown-error redaction.

## Sub-Tasks

None; this is an executable leaf.

## Exact Single-Writer Ownership

This leaf is the sole writer for exactly:

- `core/server/validation/curatedStarterLifecycleSchemas.ts` (new);
- `core/server/routes/curatedStarterLifecycleRoutes.ts` (new);
- `core/server/routes/curatedStarterErrorMap.ts` (new);
- `core/server/routes/contributions/curatedStarterRouteContribution.ts` (new pure
  fourteen-route descriptor source);
- `core/services/kits/curatedStarters/contributions/curatedStarterAdminControlContribution.ts`
  (new pure Admin control descriptor source);
- `core/services/kits/curatedStarters/contributions/curatedStarterNativeContribution.ts`
  (new pure domain/read/mutation descriptor source);
- `core/services/kits/curatedStarters/contributions/curatedStarterCacheContribution.ts`
  (new pure browser-cache descriptor source);
- `core/services/kits/curatedStarters/contributions/curatedStarterSmokeContribution.ts`
  (new pure `task-555` suite/scenario descriptor source);
- `core/services/kits/curatedStarters/contributions/curatedStarterCapabilitySourceAdapter.ts`
  (new terminal TASK-414 source adapter joining descriptor IDs to one feature row;
  no runtime authorization import);
- `core/server/routes/solutionKitsRoutes.ts` (composition/legacy plan+run preservation);
- `core/server/routes/setupRoutes.ts` (retire old drifted starter handlers only;
  unrelated Setup routes stay byte-identical);
- `tests/integration/routes/curatedStarterLifecycleRoutes.test.ts` (new);
- `tests/integration/routes/solutionKitsRoutes.test.ts`;
- `tests/integration/routes/setupStarterContent.test.ts`;
- `tests/integration/routes/curatedStarterRouteRegistration.test.ts` (new);
- `tests/vitest/kits/curated-starter-capability-contributions.test.ts` (new); and
- `tests/security/setupStarterContent.security.test.ts`.

`core/server/routes/index.ts` already registers both existing composer names and is a
read-only assertion target unless fresh implementation evidence proves its call shape
must change. If it must change, amend this ownership list and rerun the contract audit
before editing.

## Dependencies and Land Order

Final TASK-555-03 leaf. Read all current route files after TASK-554 terminal. Preserve
terminal TASK-489 run routes and static-route precedence. Hand the final API to Admin
and Setup leaves.

All curated factories register their Solution Kits and Setup aliases exactly once
from `registerSolutionKitsRoutes`. `registerSetupRoutes` removes its superseded
starter-content handlers and does not call the curated factories, preventing duplicate
method/path registration. `routes/index.ts` keeps mounting both stable composer names.

Within `registerSolutionKitsRoutes`, the existing
`POST /solution-kits/runs/:runId/rollback` descriptor is preserved but its handler
dependency changes from direct TASK-489 engine dispatch to L03's
`rollbackServerVerifiedSolutionKitRun`. Curated lifecycle aliases call the same
composite with `expectedStarterId`; the generic route calls it without that hint. The
composite alone may fall through to TASK-489's engine-only dispatcher after proving the
source has no curated lineage membership.

## Exact Routes and Inputs

- `GET /solution-kits/starters/:starterId/status` with empty normalized query;
- `POST /solution-kits/starters/:starterId/validate` body exactly `{sourceRunId:uuid}`;
- `POST /solution-kits/starters/:starterId/rollback` body exactly `{sourceRunId:uuid}`;
- `GET /setup/starter-content/status?starterId=<enum>` and no other query key;
- `POST /setup/starter-content/validate` body exactly `{starterId,sourceRunId}`;
- `POST /setup/starter-content/rollback` body exactly `{starterId,sourceRunId}`.

Every new curated alias POST descriptor uses terminal pre-body JSON policy with a
1,024-byte ceiling and `parseErrorCode:"invalid_json"`. The preserved generic
TASK-489 exact-rollback descriptor keeps its 64-byte ceiling and
`solution_kit_rollback_body_invalid` parse code.
Status and validation bind the landed curated JSON no-store HTTP-200 response
policy; rollback binds its exact HTTP-200-or-202 variant. Setup aliases use the
same policies. Success, recovery, and every mapped error response carry
`Cache-Control: no-store`; no lifecycle descriptor may fall back to a cacheable
router default.

Status returns `CuratedStarterInstalledStatusV1`; validate returns
`CuratedStarterValidationReceiptV1`; rollback returns
`CuratedStarterRollbackResultV1`. Source run is always explicit. No latest-run
fallback, provider field, `continueOnError`, or force/downgrade flag is accepted.
Validation POST reruns the one L06 bounded validator and idempotently recovers any
pending deterministic audit/backend-specific invalidation receipt for that source; it
never retries provider/resource mutation. Redis may recover its durable outbox event;
memory may apply its persisted committed plan and never creates an outbox row. Status
GET performs zero receipt/effect writes.

Curated rollback responses consume TASK-489's exact
`success|failed|recovery_required` result union. `failed` is a safe HTTP 200 command
result with exact code/counters. `recovery_required` is HTTP 202 with exact code and
`summary:null`. Both have null effective settings. Terminal failed proves zero net
rollback mutation, so TASK-555 atomically clears only its pending reservation, keeps the
active head, and permits a fresh exact retry. Recovery retains the same reservation/
source/engine owner. No route maps recovery to a second dispatcher call, settings
restore, TASK-555 rollback audit, or generic exception.

## Forbidden Paths

- TASK-414/489/545/547/548/551/554 task files and all foreign changelogs/indexes/workflows/
  smoke evidence;
- TASK-489 UI/source outside the existing route composer regions, assistant routes,
  DB/domain/client/UI, package artifacts, L01/L02 route modules/tests, and owner dirty
  files.

## Security Contract

- **Endpoint visibility:** internal `/admin/api/*`; no public endpoint.
- **Auth model:** authenticated Admin session only.
- **RBAC:** status requires `solution-kits:read`; validate requires
  `solution-kits:write`; rollback uses one permission snapshot containing both
  `solution-kits:write` and `settings:write`.
- **CSRF:** validate/rollback POST require shared session CSRF; status GET does not.
- **Rate-limit bucket:** status `admin_read`; validate/rollback `admin_write`.
- **Wire-cap-first order:** terminal TASK-414 transport must match the route and reject
  invalid/oversized declared or streamed bytes before session/RBAC/rate/CSRF or any
  handler work. The invariant order is route match -> wire length syntax/cap -> session
  -> one permission snapshot -> rate -> CSRF -> exact content type/body mode -> bounded
  parse -> strict schema/domain. No TASK-555 route reconstructs that pipeline.
- **Validation:** strict empty/query/body schemas, closed starter ID, UUID source run,
  exact provider/release/active-lineage provenance revalidated by domain, unknown
  keys rejected. Only preview is actor-bound; lifecycle source reads are authorized
  administrator operations and never filter by the original installer actor.
- **Anti-abuse:** no public nonce/HMAC/reCAPTCHA; bounded validation, explicit source,
  RBAC/CSRF/rate limits, and exact provider delegation.
- **Privacy:** cross-actor preview is safe not-found. Lifecycle sources are resolved
  by exact starter/release provenance under current RBAC, not installer actor;
  responses/errors contain no snapshots, package, settings payload, form data,
  SQL/driver messages, or actor.

## Error Mapping

`mapCuratedStarterError(error): ApiError | null` passes through `ApiError`, maps only
exact machine codes, and returns `null` for unknown errors so the central redacted 500
handler owns them.

| Domain code | HTTP |
|---|---:|
| `curated_starter_not_found` | 404 |
| `curated_starter_preview_not_found` | 404 |
| `curated_starter_run_not_found` | 404 |
| `curated_starter_preview_expired` | 410 |
| `curated_starter_preview_consumed` | 409 |
| `curated_starter_preview_stale` | 409 |
| `curated_starter_settings_takeover_required` | 409 |
| `curated_starter_idempotency_invalid` | 400 |
| `curated_starter_idempotency_conflict` | 409 |
| `curated_starter_apply_in_progress` | 409 |
| `curated_starter_recovery_required` | 409 |
| `curated_starter_reservation_conflict` | 409 |
| `curated_starter_lineage_limit_exceeded` | 409 |
| `curated_starter_reconciliation_required` | 409 |
| `curated_starter_drift_conflict` | 409 |
| `curated_starter_rollback_invalid_source` | 409 |
| `curated_starter_core_incompatible` | 409 |
| `curated_starter_artifact_invalid` | 503 |
| `curated_starter_artifact_integrity_failed` | 503 |
| `curated_starter_provider_mismatch` | 409 |
| `curated_starter_release_invalid` | 503 |
| `curated_starter_release_drift` | 503 |
| `curated_starter_registry_invalid` | 503 |
| `curated_starter_response_invalid` | 500 |
| `curated_starter_apply_failed` | 409 |
| `curated_starter_validation_invalid` | 409 |
| `curated_starter_post_commit_recovery_required` | 409 |
| `curated_starter_audit_identity_conflict` | 409 |
| `curated_starter_installed_state_unknown` | 409 |
| `curated_starter_reconciliation_candidate_not_found` | 409 |
| `curated_starter_reconciliation_ambiguous` | 409 |
| `curated_starter_lineage_missing` | 409 |
| `solution_kit_retention_recovery_required` | 409 |

`curated_starter_apply_in_progress` is raised exactly once by the TASK-555-02-L02
preview-reservation/apply gate when a fenced apply reservation is already active
for the same package/actor; it is never produced by any other leaf. The
`curated_starter_post_commit_recovery_required` code exists only in the error
map above (409); its post-commit warning counterpart uses the separate
`CuratedStarterWarningCode` member `curated_starter_post_commit_recovery_required`
(200 semantics) and the two are never conflated: the error code is raised by
TASK-555-02-L03 after a committed-but-unfinished run that requires a reviewed
recovery action, while the warning code is emitted by the status/validation DTO
for informational post-commit diagnostics.

Validation receipt status `failed` is a normal bounded receipt (HTTP 200), not an
unknown exception. TASK-489 rollback `failed` is likewise HTTP 200 with exact
`packageKey`, `safeErrorCode`, and counters; `recovery_required` is HTTP 202 with exact
package/code and `summary:null`. This route never invents `running` or performs settings
restoration/audit.
Post-commit warning codes remain successful 200 responses.
The implementation owns a closed `CuratedStarterDomainErrorCode` union and an
exhaustive `satisfies Record<CuratedStarterDomainErrorCode,...>` map. Provider/native
codes are normalized into that union at the domain boundary; no known code falls
through by accident. Unknown values alone return `null` to the redacted 500 handler.

## Implementation Pseudocode

```ts
export function registerCuratedStarterLifecycleRoutes(router, deps): void {
  router.register(statusDescriptor({
    path: "/solution-kits/starters/:starterId/status",
    permissions: ["solution-kits:read"],
    rateLimitBucket: "admin_read",
    body: { mode: "none" },
    response: curatedStarterJsonNoStoreOk,
  }, deps));
  router.register(validateDescriptor({
    path: "/solution-kits/starters/:starterId/validate",
    permissions: ["solution-kits:write"],
    csrf: "required", rateLimitBucket: "admin_write",
    body: strictJsonBody(1_024, { parseErrorCode: "invalid_json" }),
    response: curatedStarterJsonNoStoreOk,
  }, deps));
  router.register(rollbackDescriptor({
    path: "/solution-kits/starters/:starterId/rollback",
    permissions: ["solution-kits:write", "settings:write"],
    csrf: "required", rateLimitBucket: "admin_write",
    body: strictJsonBody(1_024, { parseErrorCode: "invalid_json" }),
    response: curatedStarterJsonNoStoreRollback,
  }, deps));
  // Setup aliases project the same domain inputs/results.
}

export function registerSolutionKitsRoutes(router, deps): void {
  registerCuratedStarterStaticReadRoutes(router, deps); // includes Setup options
  // Preserve TASK-489 descriptors, but inject the shared server-verified composite
  // into its exact-run rollback handler; TASK-489's dispatcher remains engine-only.
  registerTask489RunRoutes(router, {
    ...deps.task489,
    rollbackExactRun: async command => {
      try {
        return projectTask489RollbackResult(
          await deps.rollbackServerVerifiedSolutionKitRun(command)
        );
      } catch (error) {
        throw mapCuratedRollbackClassifierToTask489Code(error);
      }
    },
  });
  // Preserve the existing GET catalog and deterministic plan. Do not register the
  // retired legacy apply/rollback routes.
  registerCuratedStarterMutationRoutes(router, deps); // includes Setup aliases
  registerCuratedStarterLifecycleRoutes(router, deps);
  registerCuratedStarterDynamicDetailRoute(router, deps);
  // Preserve legacy GET /solution-kits/:id after every /starters* static route.
}
```

The generic-route adapter has one exact closed pre-write mapping:
`curated_starter_rollback_invalid_source -> solution_kit_rollback_invalid_source`,
`curated_starter_lineage_limit_exceeded ->
solution_kit_rollback_relation_limit_exceeded`,
`curated_starter_reservation_conflict -> solution_kit_rollback_in_progress`, and
`curated_starter_reconciliation_required|curated_starter_installed_state_unknown ->
solution_kit_rollback_recovery_required`. It rethrows every other value unchanged.
The preserved TASK-489 mapper therefore remains exhaustive and owns the fixed HTTP
409 responses; known curated classifier codes cannot reach its unknown 500 path.
The terminal matched-route error boundary applies TASK-489's no-store header to
those mapped responses without changing the preserved descriptor or its 200/202
successful-result allowlist. Absence of that terminal TASK-414 capability is a
pre-implementation predecessor blocker.

If the router matches in registration order, all static routes are registered before
the dynamic detail route. No handler delegates based on string prefix at runtime.

The six pure contribution modules consume terminal TASK-414 source-adapter descriptor
types exactly; they do not redeclare a schema. Their frozen IDs are:

| Descriptor kind | ID |
|---|---|
| route | `core:solution-kits/curated-starter-routes` |
| control | `core:solution-kits/curated-starter-controls` |
| native | `core:solution-kits/curated-starter-domain` |
| cache | `core:solution-kits/curated-starter-admin-cache` |
| smoke | `core:solution-kits/curated-starter-runtime-smoke` |
| feature/source | `core:solution-kits/curated-starter-lifecycle` |

The route descriptor source owns the fourteen final method/path/permission/body-cap
facts. The Admin control source owns these exact terminal `AdminControlDescriptorV1`
identities; every row has `productAreaCapabilityId:"docs.area.solution-kits"`:

| `controlId` | `routeId` | `controlIdInRoute` |
|---|---|---|
| `docs.control.solution-kits.curated-starter-select` | `core.advanced.solution-kits` | `curated-starter-select` |
| `docs.control.solution-kits.curated-starter-preview` | `core.advanced.solution-kits` | `curated-starter-preview` |
| `docs.control.solution-kits.curated-starter-apply` | `core.advanced.solution-kits` | `curated-starter-apply` |
| `docs.control.solution-kits.curated-starter-validate` | `core.advanced.solution-kits` | `curated-starter-validate` |
| `docs.control.solution-kits.curated-starter-open-site` | `core.advanced.solution-kits` | `curated-starter-open-site` |
| `docs.control.solution-kits.curated-starter-rollback` | `core.advanced.solution-kits` | `curated-starter-rollback` |
| `docs.control.setup.curated-starter-select` | `core.root` | `setup-curated-starter-select` |
| `docs.control.setup.curated-starter-preview` | `core.root` | `setup-curated-starter-preview` |
| `docs.control.setup.curated-starter-apply` | `core.root` | `setup-curated-starter-apply` |
| `docs.control.setup.curated-starter-validate` | `core.root` | `setup-curated-starter-validate` |
| `docs.control.setup.curated-starter-rollback` | `core.root` | `setup-curated-starter-rollback` |
| `docs.control.setup.finish` | `core.root` | `setup-finish` |

The feature adapter binds every Solution Kits atomic ref to exact section
`{docId:"coderso-solution-kits",locale:"en",sectionId:"reviewed-curated-starter-install"}`
and every Setup atomic ref to exact section
`{docId:"getting-started-site-setup-and-first-publish",locale:"en",sectionId:"reviewed-curated-starter-setup"}`.
Its exact composed-workflow refs are
`docs.workflow.solution-kits.curated-starter-reviewed-install` and
`docs.workflow.setup.curated-starter-reviewed-install`. Terminal TASK-548 owns the
relations: the first orders Solution Kits select/preview/apply/validate/open-site, and
the second orders Setup select/preview/apply/validate/finish. Rollback atoms remain
section-bound conditional recovery controls rather than unconditional workflow steps.

`CURATED_STARTER_CAPABILITY_SOURCE_CONTRIBUTIONS_V1` is a deeply frozen tuple of the
exact discriminated contribution rows landed by terminal TASK-414's
`cmsCapabilitySourceAdapters.ts`. One row projects a valid `CmsFeatureCapabilityV1`
with the stable feature ID; separate rows reference exactly one route, control, native,
cache, and smoke descriptor ID from the table above. No wrapper or feature row invents
`descriptorRefs`, `routes`, `controls`, cache, or smoke fields. The implementation start
receipt pins the exact landed discriminators/type names; if terminal TASK-414 exposes no
matching contribution kind, this leaf and TASK-555 closure are externally blocked on
TASK-414 rather than declaring a local schema or compatibility discriminator. Existing
feature fields reference native/route adapter IDs
and exact Guide atoms/workflows. No route/RBAC module imports capability output.

The native descriptor points only to the curated registry/read/preview/apply/status/
validate/shared-rollback owners. The cache descriptor pins the landed curated list,
Setup/Admin options, detail, and per-starter status families/TTLs plus TASK-489
invalidation joins. Preview is persisted server-side as a dry-run ledger record but
remains memory-only mutation/review state in the browser; it has no browser cache
family or TTL.
The smoke descriptor pins suite `task-555` and the parent's exact nine scenario IDs.
Focused tests validate each descriptor through terminal source adapters, prove exact
route/control/runtime/cache/smoke parity, and reject putting route/control records
inside `CmsFeatureCapabilityV1`. This leaf writes no final generated CMS capability
JSON and no TASK-548 source/generated bytes.

## Data Flow

Terminal route match -> wire length syntax/cap with zero body bytes consumed -> session
-> one permission snapshot -> rate -> CSRF for POST -> content-type/body-mode selection
-> bounded parse -> strict starter/source input -> installed/validate/shared rollback
service -> strict DTO -> response. Composer preserves existing run/plan descriptors and
central mapped-error wrapping.

## Error Handling

- Known domain codes map exactly as above with generic text.
- `ApiError` is not double-wrapped. Unknown/non-Error/driver values return `null` and
  reach the central redacted 500 boundary.
- Cross-actor preview maps to the same not-found response as absence; lifecycle
  sources are resolved by exact provenance under route RBAC, not actor equality.
- A committed install with deferred cache/audit warning remains 200. Rollback may
  carry only TASK-555 lineage/status cache-recovery warnings; TASK-489's single
  centralized rollback audit/recovery contract has no second TASK-555 warning or
  writer, including for `recovery_required`.

## Regression Tests

- Exact complete method/path order: list, options, runs, run detail, plan, mutations,
  lifecycle, curated dynamic detail, then legacy catalog dynamic detail; no static
  route is captured by `/:id` or `/:starterId` and no path is registered twice.
- Existing legacy list/detail/plan and TASK-489 run list/detail remain byte-behavior
  compatible. The old `POST /solution-kits/:id/apply`, old Setup apply shape, and their
  Admin clients are absent, and legacy HTTP bodies containing
  `dryRun|continueOnError|plan` cannot install any catalog starter. This guarantee is
  scoped to TASK-555 Admin Solution Kits and Setup HTTP/UI; tests assert the current
  internal Assistant `site-kit.install` path is unchanged for later TASK-414 migration
  rather than falsely claiming global service-call retirement. TASK-555 does not
  reclassify the planner; every new TASK-555 POST is mutation-classified with CSRF +
  `admin_write`.
- Setup/Admin status/validate/rollback aliases produce equal domain inputs/results.
- Generic TASK-489 rollback and both curated aliases invoke the same composite. Direct
  route DB coverage creates `A -> B -> C`, proves successful
  `C -> B -> A -> null`, rejects an older non-head through both route families before
  engine dispatch, and proves a source with no curated evidence reaches the TASK-489
  engine-only dispatcher exactly once.
- Exact rollback DTO routing preserves all three TASK-489 statuses. `failed` returns
  safe HTTP 200 with terminal counters; `recovery_required` returns safe HTTP 202 with
  `summary:null`. Both have null effective settings. Failed atomically clears pending
  reservation with head unchanged and a subsequent request claims a fresh exact owner;
  recovery retains the same reservation/owner and performs no second dispatch. Neither
  performs a second settings restore/audit or TASK-555 resource/history invalidation.
  Generic-route projection strips curated-only fields and preserves the exact TASK-489
  DTO and HTTP status.
- Status performs zero writes; repeated validation/recovery creates/verifies one
  deterministic audit UUID and either one Redis outbox receipt or one memory committed
  plan with zero outbox rows, and never repeats provider/resource mutation.
- Exact permission matrices with one permission lookup/snapshot, status GET no
  CSRF/admin_read, POST CSRF/admin_write and 1,024-byte cap, missing permission/CSRF
  and unknown fields with zero service work.
- Status/validation HTTP 200, rollback HTTP 200 and recovery HTTP 202, plus every
  mapped 4xx/5xx lifecycle response carry exact `Cache-Control: no-store`; Setup
  aliases have byte-equal policy and no descriptor omits its response policy.
- Declared and streamed over-cap bodies reject immediately after route match and before
  session/RBAC/rate/CSRF/parse/service; terminal transport spies prove zero body bytes
  and zero downstream calls. At-cap malformed/unknown input reaches only the bounded
  parser/schema path in the exact terminal order.
- Explicit source required; provider/force/downgrade/continueOnError/package fields
  rejected.
- Every mapping row plus ApiError passthrough, unknown Error/non-Error redaction, and
  no raw message/body leakage. The lineage-limit code maps exactly to 409 and an unknown
  near-match still reaches the redacted 500 boundary.
- Generic-route adapter tests cover every closed curated-to-TASK-489 code mapping;
  an older curated non-head returns fixed HTTP 409 with zero engine/run/settings/
  audit/resource mutation and exact `Cache-Control:no-store` rather than entering
  the centralized unknown 500 path.
- `registerAllRoutes` still exposes each endpoint once under `/admin/api`.
- Capability source adapter has the six exact sibling descriptor IDs, fourteen route
  facts, twelve exact Admin control facts, native/cache/nine-scenario smoke parity, and
  one valid feature row containing no route/control payload. Its twelve atomic refs,
  two exact localized section tuples, and two exact five-atom workflow refs validate
  through terminal pure source adapters and have no authorization consumer.

## Testing Requirements

```bash
bun test tests/integration/routes/curatedStarterLifecycleRoutes.test.ts \
  tests/integration/routes/solutionKitsRoutes.test.ts \
  tests/integration/routes/setupStarterContent.test.ts \
  tests/integration/routes/curatedStarterRouteRegistration.test.ts \
  tests/security/setupStarterContent.security.test.ts
NODE_ENV=test vitest run --config vitest.config.ts \
  tests/vitest/kits/curated-starter-capability-contributions.test.ts
bun run lint:repo:types
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Run `wc -l` for every owned human-authored source/test file and fail above 1,000.

## Documentation Updates Required

None. TASK-555-07-L01 owns API/security/Guide/generated documentation after final
validation; L03 is closure metadata only.
