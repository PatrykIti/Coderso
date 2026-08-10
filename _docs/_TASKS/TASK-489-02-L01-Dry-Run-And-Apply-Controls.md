# TASK-489-02-L01: Strict Prefixless Internal History, Detail, and Exact Rollback Routes
# FileName: TASK-489-02-L01-Dry-Run-And-Apply-Controls.md

**Parent Subtask:** TASK-489-02
**Priority:** High
**Category:** Solution Kits / Routes / Validation / Security
**Estimated Effort:** Large
**Dependencies:** All TASK-489 parent-level start gates; TASK-489-01-L01 and TASK-489-01-L02; TASK-547 done; complete terminal TASK-551/TASK-414-03-L03 receipts
**Status:** ⏳ To Do
**Changelog:** 1268 (pinned; closure only)

---

## Overview

Replace the unsafe run-row route responses with strict safe read DTOs and add
one exact-source rollback route. Register prefixless internal paths only and map
every known read/classification/legacy/full-site error exhaustively. Repair the
existing Setup starter-content apply route in the same later route leaf by
removing its duplicate post-service audit and mapping the new recovery/conflict
surface without changing its endpoint or request schema.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Production:**
`core/server/validation/solutionKitSchemas.ts` and
`core/server/routes/solutionKitsRoutes.ts`, including retirement of the old
`POST /solution-kits/:id/rollback` latest-capable route, plus one new pure
`core/server/routes/contributions/solutionKitRunOperationsRouteContribution.ts`,
and `core/server/routes/setupRoutes.ts` only for the Setup audit/error/result
repair below.

**Tests:**
`tests/vitest/server/solutionKitSchemas.test.ts` and
`tests/vitest/server/solutionKitRunOperationsRouteContribution.test.ts` (new),
`tests/integration/routes/solutionKitsRoutes.test.ts`, plus the exact existing
Setup route consumers verified in the current tree:
`tests/integration/routes/setupStarterContent.test.ts`,
`tests/integration/routes/onboardingFlow.test.ts`, and
`tests/security/setupStarterContent.security.test.ts`.

`tests/integration/routes/starterContent.test.ts` is the service lifecycle suite
and remains L02-owned. `tests/integration/routes/setupAdvancedWizardPayloads.test.ts`
does not import or execute `setupRoutes.ts` and remains untouched; neither is an
alias for the three route tests above.

No service/repository, Admin client/hook/UI, DB schema/migrations, router kernel,
rate-limit middleware, auth middleware, Solution Kit apply/dry-run behavior,
public/API-key routes, docs/tasks/changelog/board, or TASK-555/TASK-556 may be
edited. The bounded existing Setup route repair above is the sole apply-route
exception.

Consume terminal TASK-414-03-L03's `router.register`,
`RoutePreBodyPolicyV1`, and `RouteResponseV1`/response-policy exports exactly.
This leaf never reconstructs transport order or reads a request body itself.
Its named JSON no-store response policy permits exactly read/terminal HTTP 200
and claimed-owner recovery HTTP 202 for this route family; handlers cannot add
arbitrary headers or statuses.
That allowlist governs successful handler `RouteResponseV1` values. Terminal
TASK-414 transport must also apply the matched descriptor's fixed no-store header
to every mapped error-boundary response, including HTTP 400/404/409/500, without
widening the handler status allowlist or allowing arbitrary headers. If the landed
transport cannot prove this matched-route error-header behavior, the predecessor
gate blocks implementation for TASK-414 amendment.

## Pure Route/Control Capability Contribution

The new contribution module is Bun/DB/React/router-runtime free and exports one
deeply frozen primitive-fact object named
`SOLUTION_KIT_RUN_OPERATIONS_ROUTE_CONTROL_CONTRIBUTION_V1`. It is deliberately
compatible input for terminal TASK-414-02-L01's source adapter; it does not
define a competing capability schema/normalizer and is never imported to grant
authorization. Its identities are exact:

```ts
const SOLUTION_KIT_RUN_OPERATIONS_ROUTE_CONTROL_CONTRIBUTION_V1 = {
  sourceId: "core:solution-kits/run-operations",
  featureId: "core:solution-kits/run-operations",
  routes: [
    { routeId: "solution-kits.runs.list", method: "GET",
      pattern: "/solution-kits/runs", classification: "read",
      permissionIds: ["solution-kits:read"] },
    { routeId: "solution-kits.runs.detail", method: "GET",
      pattern: "/solution-kits/runs/:runId", classification: "read",
      permissionIds: ["solution-kits:read"] },
    { routeId: "solution-kits.runs.rollback", method: "POST",
      pattern: "/solution-kits/runs/:runId/rollback", classification: "write",
      permissionIds: ["settings:write", "solution-kits:write"] },
  ],
  controls: [
    { controlId: "solution-kits.run-history", routeId: "solution-kits.runs.list" },
    { controlId: "solution-kits.run-detail", routeId: "solution-kits.runs.detail" },
    { controlId: "solution-kits.exact-rollback", routeId: "solution-kits.runs.rollback" },
  ],
} as const;
```

The focused pure test pins exact key sets/order/IDs and statically proves no
runtime/auth/capability-output import. Route registration tests prove method,
pattern, classification, and permission parity. L03 UI and closure prove the
three controls and terminal TASK-548 Guide atomic/workflow bindings before the
later TASK-414 compiler consumes this source.

## Exact Endpoints

### `GET /solution-kits/runs`

- Strict normalized query keys only: `packageKey`, `cursor`, `limit`.
- `limit` remains a decimal string at raw validation, then parses strictly to an
  integer 1..100; absent defaults to 25. Reject signs, decimals, whitespace,
  exponent notation, leading junk, and unknowns. The current request adapter
  does not preserve duplicate query multiplicity, so this family makes no false
  duplicate-param claim; terminal transport may tighten it later.
- `packageKey` 1..128 UTF-8 bytes; cursor uses terminal TASK-551's exact
  <=2,048-byte signed wire.
- Returns the exact keyset envelope from L01, ordered `createdAt DESC,id DESC`.

### `GET /solution-kits/runs/:runId`

- Canonical UUID path; reject any normalized query key. GET body behavior remains
  the shared transport contract and is not reimplemented here.
- Returns only `SafeSolutionKitRunDetailDto`.

### `POST /solution-kits/runs/:runId/rollback`

- Canonical UUID path; reject any query key.
- `Content-Type` must be `application/json`; a body must be present and parse to
  a plain object with exactly zero own keys. Missing/unsupported-content body,
  arrays, `null`, and unknown keys reject. No `sourceRunId`, kit/package ID,
  engine, or options are accepted.
- The frozen pre-body descriptor sets `maxBytes:64` and
  `parseErrorCode:"solution_kit_rollback_body_invalid"`. It consumes terminal
  TASK-414's invariant order exactly: host/IP/global context -> exact route match ->
  wire `Content-Length` syntax/cap -> cookies/session -> one static require-all
  permission snapshot -> `admin_write` -> CSRF -> optional admission (none here) ->
  exact content type/body mode -> bounded parse -> handler. It does not copy that
  middleware. Oversized, malformed-length, or non-stream missing/chunked-length
  bodies fail at the wire boundary with zero body bytes consumed and before auth,
  RBAC, rate, CSRF, parser, handler, or domain invocation.
- Actor is `ctx.requireResolvedActor().id`; caller cannot supply it.
- Calls only the typed `deps.rollbackExactRun({sourceRunId:ctx.params.runId,actorId})`;
  its initial binding and serialized TASK-555 replacement are defined below.
- Returns only strict `SafeSolutionKitRollbackResultDto`. Terminal `success` and
  `failed` completed commands return HTTP 200 with their safe code/counters.
  Claimed-owner `recovery_required` returns HTTP 202 with durable rollback run ID,
  safe code, and `summary:null`. All three use the same validated no-store response
  policy; a pre-write rejection remains a mapped error and creates no rollback run.
- The previous `POST /solution-kits/:id/rollback` route is absent after this leaf;
  no route can derive a latest source from a kit ID.

The route factory receives a typed `rollbackExactRun` dependency whose TASK-489 default
is `rollbackExactInstallRunEngineOnly`; it does not close over an unreplaceable
import. Serialized TASK-555 later injects its lineage-aware composite at the native
Solution Kits route composer. That composite keeps every active, pending,
reconciled, or predecessor-chain curated member inside TASK-555, rejects older
non-heads there, and calls the engine-only TASK-489 export only after proving zero
curated evidence; the
curated coordinator's engine callback also uses the engine-only export. The route
schema, path, permissions, transport, and generic safe response remain unchanged,
and recursion is structurally impossible.

## Existing Setup Route Repair

`setupRoutes.ts` remains on the existing prefixless
`POST /setup/starter-content/preview` and
`POST /setup/starter-content/apply` paths with the current strict selector schema
and require-all apply permissions. It consumes the terminal TASK-414 registered
pre-body/response policies for those landed routes rather than retaining or
reconstructing a second middleware order; preview/apply remain session-only,
CSRF-protected writes in `admin_write`. This leaf removes the `logAudit` import,
`SetupRouteDeps.logAudit`, and route-owned
`setup.starter_content.applied` call. L01/L02 service finalization now inserts the
single deterministic apply audit atomically with the source run, so the route
must not emit another event.

After validation and `toChoice`, the apply handler does exactly one awaited domain
call and immediately returns its resolved strict result. There is no post-service
audit, cache callback, metadata patch, or other throwing operation. A route test
uses a service seam that records committed success and returns a result, then
proves the handler resolves that result even though the removed historical audit
seam would have thrown; the compiled `SetupRouteDeps` no longer exposes such a
seam. Service rejection still passes through `mapSetupRouteError` before any
response is emitted.

`mapSetupRouteError` remains exact, has fixed copy, passes an existing `ApiError`
through, and adds every Setup code introduced by L01/L02:

| Setup code | HTTP |
|---|---:|
| `starter_kit_unknown` | 400 |
| `starter_choice_invalid` | 400 |
| `solution_kit_plan_limit_exceeded` | 409 |
| `solution_kit_starter_apply_recovery_required` | 409 |
| `solution_kit_starter_rollback_metadata_invalid` | 409 |
| `solution_kit_rollback_state_changed` | 409 |
| fallback `setup_error` | 500 |

The recovery/conflict rows never collapse to `setup_error`, and no raw exception
message enters copy, logs, or response. The generic exact rollback route keeps its
separate exhaustive table below.

## Error Mapping

Map without starts-with catch-all ambiguity:

| Code | HTTP |
|---|---:|
| `solution_kit_runs_query_invalid` | 400 |
| `solution_kit_runs_cursor_expired` | 409 |
| `solution_kit_run_id_invalid` | 400 |
| `solution_kit_rollback_body_invalid` | 400 |
| `solution_kit_install_run_not_found` | 404 |
| `solution_kit_rollback_invalid_source` | 409 |
| `solution_kit_rollback_in_progress` | 409 |
| `solution_kit_rollback_recovery_required` | 409 |
| `solution_kit_rollback_source_superseded` | 409 |
| `solution_kit_rollback_relation_limit_exceeded` | 409 |
| `solution_kit_rollback_state_changed` | 409 |
| `solution_kit_starter_apply_recovery_required` | 409 |
| `solution_kit_starter_rollback_metadata_invalid` | 409 |
| `solution_kit_template_rollback_after_snapshot_missing` | 409 |
| `solution_kit_run_engine_unknown` | 409 |
| `solution_kit_run_engine_mixed` | 409 |
| `solution_kit_already_rolled_back` | 409 |
| `site_package_run_not_found` | 404 |
| `site_package_rollback_invalid_source` | 409 |
| `site_package_already_rolled_back` | 409 |
| `site_package_rollback_in_progress` | 409 |
| `site_package_recovery_conflict` | 409 |
| `native_cms_writer_fence_busy` | 409 |
| `native_cms_writer_recovery_required` | 409 |
| `site_package_rollback_conflict` | 409 |
| `site_package_rollback_dependency_invalid` | 409 |
| `site_package_rollback_dependency_blocked` | 409 |
| `solution_kit_run_shape_invalid` | 500 |
| `solution_kit_history_read_failed` | 500 |
| `solution_kit_rollback_failed` | 500 |
| `site_package_rollback_failed` | 500 |
| `site_package_rollback_ledger_failed` | 500 |
| `site_package_rollback_claim_failed` | 500 |
| `native_cms_writer_fence_failed` | 500 |
| `native_cms_writer_fence_lost` | 500 |

Messages are fixed safe copy. Unknown errors remain unknown for centralized 500
handling and never expose `error.message`.
`solution_kit_rollback_recovery_required` in this table is an owner-less/pre-write
conflict and remains HTTP 409. Once a durable owner exists, fence loss or
unprovable terminalization is consumed by the dispatcher and returned as the
strict `status:"recovery_required"` HTTP 202 DTO; it must not be remapped through
this error table.
Every terminal TASK-551 cursor-expiry or retired/key-rotation-key failure is
collapsed to the one public `solution_kit_runs_cursor_expired` code; signature,
scope, malformed, and arbitrary cursor failures remain
`solution_kit_runs_query_invalid`. No key ID or rotation detail is exposed.

## Security Contract

- **Endpoint visibility:** internal only; prefixless registrations resolve under
  `/admin/api`. No public endpoint or API-key mode.
- **Auth model:** authenticated Admin session only.
- **RBAC:** both GET routes require `solution-kits:read`. Rollback uses one
  `requirePermission(["solution-kits:write", "settings:write"])` snapshot; two
  independently queried guards are forbidden.
- **CSRF:** rollback uses the shared write CSRF boundary; tests prove missing or
  invalid token rejection. GET does not require CSRF.
- **Rate limit:** GET `admin_read`; rollback `admin_write` through shared HTTP
  classification. Tests pin it at the registered runtime boundary.
- **Validation:** strict normalized query, path, exact JSON empty body, and strict safe output.
- **Anti-abuse:** bounded keyset reads; exact source; no nonce/HMAC/CAPTCHA because
  no public mode exists.
- **Pre-body order:** terminal wire syntax/cap precedes cookies/session/RBAC/rate/
  CSRF/admission/content selection/parse; registration/runtime tests require zero
  consumed bytes and zero downstream calls for a wire-cap rejection.
- **Sensitive data:** response/log/audit tests reject actor/options/snapshots/
  rollback payload/raw error keys and values.
- **Setup commit boundary:** apply audit is service-owned and atomic; the route
  returns committed success directly and cannot report failure due to a duplicate
  audit or cache side effect.

## Implementation Pseudocode

```ts
router.register({
  method: "GET",
  path: "/solution-kits/runs",
  preBody: {
    auth: "admin-session",
    permissions: ["solution-kits:read"],
    csrf: "disabled",
    rateLimitBucket: "admin_read",
    body: { mode: "none" },
  },
  response: solutionKitOperationsJsonNoStoreResponsePolicyV1,
  handlers: [async ctx => routeJson(await withSolutionKitErrors(() =>
    listSafeInstallRuns(parseStrictRunsRawQuery(ctx.query), requirePaginationCursorKeyring())
  ))],
});

router.register({
  method: "POST",
  path: "/solution-kits/runs/:runId/rollback",
  preBody: {
    auth: "admin-session",
    permissions: ["settings:write", "solution-kits:write"],
    csrf: "required",
    rateLimitBucket: "admin_write",
    body: {
      mode: "json",
      contentTypes: ["application/json"],
      maxBytes: 64,
      parseErrorCode: "solution_kit_rollback_body_invalid",
    },
  },
  response: solutionKitOperationsJsonNoStoreResponsePolicyV1,
  handlers: [async ctx => {
    validateExactEmptyObject(ctx.body);
    const result = await withSolutionKitErrors(() => deps.rollbackExactRun({
      sourceRunId: ctx.params.runId,
      actorId: ctx.requireResolvedActor().id,
    }));
    return routeJson(result, {
      status: result.status === "recovery_required" ? 202 : 200,
    });
  }],
});
```

The detail GET uses the same descriptor shape as list with `body.mode="none"`.

**Data flow:** terminal host/IP context -> exact route match -> wire length syntax/
64-byte cap with zero bytes consumed on rejection -> session -> one static
permission snapshot -> rate limit -> CSRF -> exact body-mode/content type ->
bounded parse using the descriptor `parseErrorCode` -> strict route parser -> L01
safe read or injected L02 engine-only/TASK-555 successor composite -> validated
HTTP 200/202 no-store `RouteResponseV1`.

**Error handling:** map only the table above; permission/CSRF/rate-limit errors
remain shared middleware-owned. No generic `solution_kit_*` payload mapping.

## Regression Tests

- Route registration pins all three prefixless paths and no public/API-key path.
- Exhaustive valid/invalid normalized query matrix, default 25/max 100, cursor/filter
  handoff, exact discriminated response envelope, running `summary:null` without
  fake zeros, and no forbidden response keys recursively.
- Detail rejects normalized query and missing/invalid run IDs.
- Rollback rejects missing/non-JSON/nonempty/array/null body, query params, missing CSRF/session,
  each missing permission independently, and calls no service on rejection.
- Malformed JSON is rejected pre-handler with terminal policy code
  `solution_kit_rollback_body_invalid`; no handler-owned body reader or second parser
  exists.
- Require-all success performs exactly one permission lookup/snapshot and calls
  dispatcher once with exact path ID and session actor.
- Malformed/overflow declared length and streamed/chunked/missing-length JSON fail
  at terminal wire-cap handling before cookies/session/RBAC/rate/CSRF/admission/
  content selection/parse/service, consume zero body bytes, and use the descriptor's
  exact `parseErrorCode`. A declared <=64-byte valid-whitespace body reaches strict
  `{}` validation. Terminal transport order and 200/202 no-store response policy
  are pinned by registration/runtime tests.
- Exhaustive mapping test covers every table row plus unknown fallthrough.
- Every mapped error-table response, including the post-TASK-555 injected curated
  classifier's HTTP 409, carries the matched route's exact `Cache-Control:no-store`
  header through terminal transport; the descriptor's successful status allowlist
  remains exactly 200/202.
- Terminal TASK-551 expiry and key-rotation-key fixtures collapse to
  `solution_kit_runs_cursor_expired`; malformed/signature/scope failures do not.
  The safe error contains no key identifier.
- Registration/runtime test asserts `admin_read` vs `admin_write` buckets.
- Registration test proves the old kit-key rollback route is absent.
- A superseded older source returns direct HTTP 409 with
  `solution_kit_rollback_source_superseded` and zero dispatcher mutation after
  the locked domain rejection; terminal dispatcher `success` and `failed` results
  return strict HTTP 200/no-store DTOs, while a claimed unproven-terminal owner
  returns strict HTTP 202/no-store `recovery_required` with summary null. The 202
  branch never traverses the error mapper.
- A terminal failed DTO is HTTP 200 only for the service-proven zero-net/full-
  compensation branch. Any partial/unresolved mutation remains the same running
  owner and returns HTTP 202 recovery; route code never reclassifies it as failed.
- Relation-sentinel overflow maps exact HTTP 409
  `solution_kit_rollback_relation_limit_exceeded` with zero owner/domain writes;
  it is not collapsed into superseded or recovery-required.
- Route-factory dependency tests prove the pre-TASK-555 default calls the engine-
  only export once and an injected successor composite receives the exact path/
  actor command without changing transport. TASK-555 owns the later real-lineage
  direct-route chain test.
- Pure contribution import has no Bun/DB/React/router/capability-output side
  effect and its three route/three control facts exactly match registration.
- Setup route regression pins the exact three verified files. It proves the
  `logAudit` dependency/call is gone, the service is invoked once with the session
  actor, every Setup table code maps to fixed status/copy, unknown errors retain
  the fixed `setup_error`, and a committed service success is returned without a
  later route-owned failure. `onboardingFlow.test.ts` no longer attributes the
  atomic service audit to the route or injects a route audit seam; the service
  lifecycle suite remains responsible for proving the one persisted audit.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/server/solutionKitSchemas.test.ts tests/vitest/server/solutionKitRunOperationsRouteContribution.test.ts
set -a && source .env && set +a && bun test tests/integration/routes/solutionKitsRoutes.test.ts tests/integration/routes/setupStarterContent.test.ts tests/integration/routes/onboardingFlow.test.ts tests/security/setupStarterContent.security.test.ts
wc -l core/server/validation/solutionKitSchemas.ts core/server/routes/solutionKitsRoutes.ts core/server/routes/setupRoutes.ts core/server/routes/contributions/solutionKitRunOperationsRouteContribution.ts tests/vitest/server/solutionKitSchemas.test.ts tests/vitest/server/solutionKitRunOperationsRouteContribution.test.ts tests/integration/routes/solutionKitsRoutes.test.ts tests/integration/routes/setupStarterContent.test.ts tests/integration/routes/onboardingFlow.test.ts tests/security/setupStarterContent.security.test.ts
git diff --check
```

Every touched production/test file must be <=1,000 physical lines.

## Documentation Updates Required

TASK-489-03-L02 adds exact endpoint shapes, raw-query rules, permission matrix,
CSRF/rate buckets, stable errors, and the explicit no-public/no-API-key contract
to `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`, and `_docs/SOLUTION_KITS.md`,
and binds this pure contribution to terminal TASK-548 Guide atoms/workflow.
