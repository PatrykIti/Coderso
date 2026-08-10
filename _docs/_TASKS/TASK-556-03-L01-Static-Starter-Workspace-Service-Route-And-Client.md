# TASK-556-03-L01: Static Starter Workspace Service Route and Client
# FileName: TASK-556-03-L01-Static-Starter-Workspace-Service-Route-And-Client.md

**Parent Task:** TASK-556
**Parent Subtask:** TASK-556-03
**Priority:** High
**Category:** Designer / Internal API / Client
**Estimated Effort:** Large
**Dependencies:** TASK-556 external terminal gate; TASK-556-02-L02
**Start Receipt:** Complete TASK-556-02 reviewed landed receipts and terminal route/security/client exports recorded
**Completion Receipt:** Reviewed owned diff plus every command/budget below green
**Status:** ⏳ To Do
**Changelog:** 1270 pinned

---

## Overview

Implement the complete service/facade, route, error map, strict DTO and Admin
client for one static-starter seed/reopen endpoint.

## Sub-Tasks

None; this is an executable leaf.

## Exact Writer and Forbidden Paths

Sole writer paths:

- `core/services/designer/staticSources/staticStarterWorkspaceContract.ts`;
- `core/services/designer/staticSources/staticStarterWorkspaceCapabilityEvidence.ts`;
- `core/services/designer/staticSources/staticStarterWorkspaceService.ts`;
- exact additive schemas in `core/server/validation/designerSchemas.ts`;
- exact additive route region in `core/server/routes/designerRoutes.ts` and exact
  additive `designer_workspace_terminal` projection in
  `core/server/routes/designerErrorMapper.ts`;
- exact additive successor regions in
  `core/services/designer/designerRuntimeFacade.ts`,
  `core/services/assistant/task414RuntimeFacade.ts`, and
  `core/server/routes/contributions/task414RouteContributions.ts`;
- `core/admin/services/designerStaticStartersClient.ts`;
- `tests/vitest/designer/designer-static-starter-workspace-contract.test.ts`;
- `tests/vitest/admin/designer-static-starters-client.test.ts`;
- `tests/integration/server/task556StaticStarterWorkspaceService.test.ts`;
- `tests/integration/server/designerStaticStarterRoutes.test.ts`;
- `tests/unit/server/designerRouteRegistration.test.ts`;
- exact additive static-source composition cases in
  `tests/integration/routes/designer-mount.test.ts`;
- `tests/security/designerStaticStarterRoute.security.test.ts`.

Forbidden paths: all external dependency source outside the exact additive route,
error, facade, and contribution regions listed above; prior TASK-556 files outside
imports; `core/admin/ui/kits/**`, `core/admin/ui/setup/**`, shared CTA files,
capability/smoke/docs, Agent/Assistant/canonical installer files, task/changelog
indexes, root config, `AGENTS.md`, `_TMP*`, and non-TASK-556 tasks.

## Exact API Contract

The Bun-free capability-evidence module owns the route identity before any
capability or Guide work:

```ts
export const STATIC_STARTER_WORKSPACE_FEATURE_SOURCE_ID_V1 =
  "core:designer/code-owned-static-starter";
export const STATIC_STARTER_WORKSPACE_ROUTE_ID_V1 =
  "core.designer.static-starters.by-source-id.workspaces";
export const STATIC_STARTER_WORKSPACE_ROUTE_EVIDENCE_V1 = deepFreeze({
  featureSourceId: STATIC_STARTER_WORKSPACE_FEATURE_SOURCE_ID_V1,
  routeId: STATIC_STARTER_WORKSPACE_ROUTE_ID_V1,
  method: "POST",
  prefixlessPath: "/designer/static-starters/:sourceId/workspaces",
  classification: "internal-write",
  permissionIds: ["solution-kits:read", "designer:read", "designer:write"],
} satisfies StaticStarterWorkspaceRouteEvidenceV1);
```

`StaticStarterWorkspaceRouteEvidenceV1` is a strict, normalized projection onto
the landed terminal route/capability descriptor contracts; it adds no competing
schema and contains no function, label, href, authorization result, or inferred
path. It preserves the registered route descriptor's exact permission order; the
terminal capability normalizer, not TASK-556, owns any canonical sort for emitted
manifest facts. The route registration and capability inventory both import this
one frozen export and tests prove its method/path/permissions match the registered
descriptor exactly.

```http
POST /admin/api/designer/static-starters/:sourceId/workspaces
Content-Type: application/json
X-CSRF-Token: <shared admin token>
```

`sourceId` is exactly `formadom-studio`. Body has exactly:

```ts
type StaticStarterWorkspaceRequestV1 = Readonly<{
  expectedReleaseDescriptorDigest: Sha256Hex;
  idempotencyKey: string; // 16..128 visible ASCII; no trim/coercion
}>;
```

Unknown/missing/prototype/accessor/nonplain/nested fields reject. Actor, owner,
workspace/revision/run/claim, artifact hash, package fingerprint/body/path,
release metadata, provider facts, permissions, expected CAS/fence, and href are
forbidden request fields and server-derived.

Strict response has exactly:

```ts
type StaticStarterNavigableWorkspaceStateV1 =
  | "generating"
  | "ready"
  | "promotion_pending"
  | "failed"
  | "promoted";

type StaticStarterWorkspaceResponseV1 = Readonly<{
  schemaVersion: 1;
  outcome: "seeded" | "resumed" | "reopened" | "replayed";
  sourceId: "formadom-studio";
  releaseKey: "formadom-studio@1.0.0";
  releaseVersion: "1.0.0";
  releaseDescriptorDigest: Sha256Hex;
  workspace: Readonly<{
    id: string;
    activeRevisionId: string;
    version: number;
    state: StaticStarterNavigableWorkspaceStateV1;
  }>;
}>;
```

Deterministic failure and its same-key replay use the mapped `422` safe error and
never a success DTO. `replayed` means exact same-key receipt-bound success and
never redispatches; a same-key nonterminal alias also never redispatches. The
service never performs an unlocked post-classification workspace reload. Each
successful preflight/Transaction-A/Transaction-B path returns the operation outcome
and owner-authorized workspace ID, active revision ID, version, and state from one
final locked snapshot in the transaction that established that outcome. Those
fields are mutually authoritative at that snapshot even when later Designer work
commits immediately afterward. Cross-field normalization requires `seeded | resumed` to be
`ready`, allows `reopened` only for `generating | ready | promotion_pending |
failed`, and allows `promoted` only for exact historical `replayed` success. A
fresh key on a promoted binding forks and returns the new private root; it never
returns the promoted root as `reopened`.

No href is trusted from the server response; the browser derives it through the
terminal `adminPaths` Designer workspace helper. Responses, including errors,
set `Cache-Control: private, no-store`; success is `200` for all outcomes.
Navigation uses only the workspace ID, then the normal Designer detail route
loads the complete authoritative aggregate; this DTO is not a replacement
Designer detail read.

## Route Policy, Errors, and Budgets

Consume terminal TASK-414-03-L03's immutable `RoutePreBodyPolicyV1` and
`RouteResponseV1`; do not reopen or fork the generic transport. The prefixless
descriptor passed to `router.register` is exactly
`{ auth: "admin-session", permissions: ["solution-kits:read", "designer:read",
"designer:write"], rateLimitBucket: "admin_write", csrf: "required",
authorizeBeforeBody: deps.requireStaticStarterSeedAdmissionFromPath,
body: { mode: "json", contentTypes: ["application/json"], maxBytes: 1024,
parseErrorCode: "invalid_json" } }`. The terminal transport itself maps a declared/
observed cap violation to its landed global safe 413 code, expected to remain
`payload_too_large`; TASK-556 does not add an unrecognized per-route
`tooLargeCode` field. The start receipt must record the exact terminal policy keys and
cap-error code; any mismatch blocks for contract correction rather than creating a
second parser. The terminal transport order is exactly host/IP/global request
context -> exact route match -> wire `Content-Length` syntax/cap -> session ->
static require-all RBAC -> rate -> CSRF -> owner admission -> content type/parse.
Recursive strict request-schema failures occur after transport parsing and map to
`designer_static_seed_invalid`. The frozen response policy applies
`private, no-store, max-age=0` on success and mapped errors.
All routes without this descriptor remain byte/behavior identical. Extend the
one `DesignerApiFacade`, centralized `mapDesignerError`, and
`registerDesignerRoutes`; compose the new dependency once through terminal
Task414 facades/contribution registry. Use `apiRequest`; no raw fetch, sibling
factory, direct service import from the route, or dedicated settings bucket.

Exhaustive safe mapping. The first seven rows are shared transport/middleware
codes; every remaining static domain code is a member of the closed union
created by 01-L01:

| Domain code | Public API code | HTTP |
|---|---|---:|
| `auth_required` | `auth_required` | 401 |
| `forbidden` | `forbidden` | 403 |
| `rate_limited` | `rate_limited` | 429 |
| `csrf_invalid` | `csrf_invalid` | 403 |
| `csrf_expired` | `csrf_expired` | 403 |
| `payload_too_large` | `payload_too_large` | 413 |
| `invalid_json` | `invalid_json` | 400 |
| `designer_static_seed_invalid` | `designer_static_seed_invalid` | 400 |
| `designer_static_seed_owner_not_found` | `designer_static_source_not_found` | 404 |
| `designer_static_source_unknown` | `designer_static_source_not_found` | 404 |
| `designer_static_seed_idempotency_conflict` | `designer_static_seed_idempotency_conflict` | 409 |
| `designer_static_seed_in_progress` | `designer_static_seed_in_progress` | 409 |
| `designer_static_seed_request_limit` | `designer_static_seed_request_limit` | 409 |
| `designer_static_binding_version_conflict` | `designer_static_binding_version_conflict` | 409 |
| `designer_static_release_descriptor_stale` | `designer_static_release_descriptor_stale` | 409 |
| `designer_static_replay_conflict` | `designer_static_replay_conflict` | 409 |
| `designer_static_claim_invalid` | `designer_static_claim_stale` | 409 |
| `designer_static_claim_stale` | `designer_static_claim_stale` | 409 |
| `designer_static_compile_invalid` | `designer_static_seed_failed` | 422 |
| `designer_static_release_unavailable` | `designer_static_release_unavailable` | 503 |
| `designer_static_artifact_mismatch` | `designer_static_release_unavailable` | 503 |
| `designer_static_package_fingerprint_mismatch` | `designer_static_release_unavailable` | 503 |
| `designer_static_compile_timeout` | `designer_static_release_unavailable` | 503 |
| `designer_static_stage_timeout` | `designer_static_stage_timeout` | 503 |
| `designer_static_seed_migration_required` | `designer_static_release_unavailable` | 503 |
| `designer_static_seed_constraint_conflict` | `internal_error` | 500 |
| `designer_static_source_invalid` | `internal_error` | 500 |
| `designer_static_source_duplicate` | `internal_error` | 500 |
| `designer_static_source_mutable` | `internal_error` | 500 |
| `designer_static_source_digest_mismatch` | `internal_error` | 500 |
| `designer_static_receipt_invalid` | `internal_error` | 500 |
| `designer_static_stage_invalid` | `internal_error` | 500 |
| `designer_static_canonical_isolation_failed` | `internal_error` | 500 |
| unknown error | `internal_error` | 500 |

Cross-owner/missing collapse to the same 404. Every lower layer imports the one
01-L01 union instead of declaring a competing union. The mapping is a
compile-time exhaustive `satisfies Record<StaticStarterWorkspaceDomainErrorCode,
ApiErrorProjection>` object, while transport errors are tested separately. No raw
cause, digest mismatch details, SQL, path, package, provider, foreign ID, or stack escapes.

Lifecycle classification may also throw terminal
`designer_workspace_state_invalid`, `designer_workspace_terminal`, or
`designer_reconciliation_required`. The route delegates those exact errors to
the one centralized `mapDesignerError` before applying the static map. Because
terminal TASK-414 declares but does not project `designer_workspace_terminal`,
this leaf owns exactly one additive centralized row:
`designer_workspace_terminal -> designer_workspace_terminal / 409`. It does not
add that code to `StaticStarterWorkspaceDomainErrorCode`, duplicate a mapper, or
change any preexisting Designer projection. Focused tests pin all three delegated
codes, the new exact row, and byte/behavior parity for every prior map row.
`STATIC_WORKSPACE_PUBLIC_ERRORS` includes the static projection column plus the
three exact delegated pairs: `designer_workspace_state_invalid/409`,
`designer_workspace_terminal/409`, and
`designer_reconciliation_required/503`. The strict client therefore preserves
those bounded codes without accepting arbitrary terminal Designer errors.

- Rate classification is existing `admin_write` with its shipped security-settings
  behavior; claim uniqueness, bounded lease, and one-dispatch semantics prevent
  duplicate generation. TASK-556 introduces no hidden limiter or settings key.
- Request body <=1 KiB; response <=4 KiB; route timeout 10,000 ms.
- New seed follows prior budgets; exact ready replay <=3 DB statements and <=50
  ms p95 (the 01-L01 service budget, excluding network; see `TASK-556-01-L01`
  Numeric Budgets, the single owner); ready different-key reopen <=6; complete new seed
  <=24 plus two set-based stage inserts and one terminal alias-lifecycle update;
  route itself adds 0 DB list queries.
- Maximum one in-process service dispatch per accepted request. The client allows
  only `apiRequest`'s existing one-time CSRF-token refresh replay, reusing the same
  idempotency key; it adds no other automatic mutation retry.
- On successful seed/resume/reopen/replay, the client applies the authoritative
  workspace response, invalidates the terminal actor/epoch-scoped Designer list
  and exact workspace cache keys, and broadcasts only the safe cache key/version
  event through `cacheBus`. Cache/storage/broadcast failure is best effort and
  cannot turn a committed seed into an apparent API failure. No TASK-556 binding,
  brief, seed-request, idempotency, receipt, package, or staged-body digest/value
  enters Designer cache/broadcast/storage. TASK-555's already approved actor/
  epoch-scoped safe release summary, including `releaseDescriptorDigest`, remains
  its read-only cached input; TASK-556 installs no second copy or cache family.

The preflight projection returns the stored normalized generation-run
`static_brief`/digest, contribution/registry/compiler versions, and binding
identity whenever it can
classify an existing takeover/retry candidate; Transaction A locks and verifies
the same projection and is authoritative. It lazily calls the pure current-facts
supplier only for `new` or `fork_promoted`. A replay or live collision calls
neither current facts nor compiler; a unique loser may have completed only the
immutable TASK-555 upstream accessor pass.

## Implementation Pseudocode

```ts
export async function seedOrResumeStaticWorkspace(command, deps) {
  const preflight = await deps.db.transaction((tx) =>
    deps.staticGeneration.resolveStaticSeedPreflightTx(tx, command, {
      projectSuccessfulOutcomeFromFinalLocks: true,
    }),
  );
  switch (preflight.kind) {
    case "replay_ready":
      return preflight.lockedOperationResult;
    case "replay_failed":
      throw replayStoredStaticFailure(preflight);
    case "reopen":
      return preflight.lockedOperationResult;
    case "in_progress":
      throw staticError("designer_static_seed_in_progress");
    case "miss":
      break;
    default:
      return assertNever(preflight);
  }

  const snapshot = await deps.staticRelease.loadTrustedSnapshot(
    command.expectedReleaseDescriptorDigest,
  );
  const claim = await deps.db.transaction((tx) =>
    deps.staticGeneration.claimStaticSeedTx(
      tx,
      bindTrustedUpstreamIdentity(command, snapshot),
      () => deps.staticSources.requireCurrentCompilationFacts("formadom-studio"),
    ),
  );

  switch (claim.kind) {
    case "replay_ready":
      return claim.lockedOperationResult;
    case "replay_failed":
      throw replayStoredStaticFailure(claim);
    case "reopen":
      return claim.lockedOperationResult;
    case "in_progress":
      throw staticError("designer_static_seed_in_progress");
    case "dispatch":
      break;
    default:
      return assertNever(claim);
  }

  try {
    const prepared = prepareCodeOwnedStaticCompilation(
      claim,
      snapshot,
      claim.compilationFacts,
      deps.compiler,
    );
    return await materializeClaimedStaticStage(
      {
        ...claim,
        operationOutcome:
          claim.reason === "new" || claim.reason === "fork_promoted"
            ? "seeded"
            : "resumed",
      },
      prepared,
      deps,
    ); // Transaction B returns outcome + workspace from its post-CAS locks.
  } catch (error) {
    if (isDeterministicStaticFailure(error)) {
      await deps.staticGeneration.failIfCurrentFence(claim, safeStaticCode(error));
    }
    throw error;
  }
}

router.register({
  method: "POST",
  path: "/designer/static-starters/:sourceId/workspaces",
  preBody: {
    auth: "admin-session",
    permissions: ["solution-kits:read", "designer:read", "designer:write"],
    rateLimitBucket: "admin_write",
    csrf: "required",
    authorizeBeforeBody: deps.requireStaticStarterSeedAdmissionFromPath,
    body: {
      mode: "json",
      contentTypes: ["application/json"],
      maxBytes: 1024,
      parseErrorCode: "invalid_json",
    },
  },
  response: designerJsonNoStoreResponsePolicyV1,
  handlers: [async (ctx) => {
    const result = await deps.facade.seedStaticStarterWorkspace({
      actor: ctx.requireResolvedActor(),
      ...parseStaticSourceParams(ctx.params),
      ...parseStaticWorkspaceRequestOrThrow(ctx.body, "designer_static_seed_invalid"),
    });
    return routeJson(projectStaticWorkspaceResponse(result), {
      status: 200,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }],
});

export async function createStaticStarterWorkspace(sourceId, body) {
  try {
    const payload = await apiRequest(
      `/designer/static-starters/${encodeURIComponent(sourceId)}/workspaces`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      { withCsrf: true },
    );
    const result = normalizeStaticWorkspaceResponse(payload);
    bestEffortInvalidateAndBroadcastDesignerWorkspaceCaches(result.workspace);
    return result;
  } catch (error) {
    throw normalizeStaticWorkspaceClientError(error, STATIC_WORKSPACE_PUBLIC_ERRORS);
  }
}
```

**Data flow:** authenticated server actor + literal path + strict digest/key ->
bounded alias/binding preflight -> optional TASK-555 accessor -> Transaction A ->
only a dispatch fence plus persisted takeover/retry facts or current new/promoted-
fork facts enters the one TASK-556 compiler pass/Transaction B ->
one final locked outcome/workspace/active-revision projection -> safe strict
response -> identity-scoped in-memory Designer state only. Navigation then loads
the normal Designer aggregate.

**Errors:** use the exhaustive map; client preserves stable code/status, permits
only shared one-time CSRF refresh replay with the same key, and rejects malformed
success/error bodies. `normalizeStaticWorkspaceClientError` accepts only an
`ApiClientError` whose code/status pair appears in the public projection column,
drops `details`/cause, and maps every unknown or mismatched pair to bounded local
`designer_static_response_invalid`; UI never displays arbitrary server text.

## Tests

- Exact route/method/prefix registered once; no public/alias route and no
  TASK-556 diff in `router.ts`, `httpServer.ts`, `requestBody.ts`,
  `routePreBodyPolicy.ts`, or `routeResponse.ts`.
- Bun-free capability evidence has the exact feature source/route IDs,
  method/path/classification/permission order above, is deeply frozen, is the
  same export consumed by route and capability composition, and has no inferred
  or duplicate descriptor.
- Session, each missing permission and require-all combination, and policy-driven
  exact order host/IP/global request context -> exact route match -> wire
  `Content-Length` syntax/cap -> session -> static require-all RBAC ->
  `admin_write` rate -> CSRF -> owner admission -> content type/parse. Tests pin
  terminal `invalid_json`, the
  terminal transport-owned cap code (currently `payload_too_large`), separate
  strict-schema `designer_static_seed_invalid`, no-store on every success/error,
  strict path/body/response, and unchanged behavior for unconfigured routes.
- Complete terminal `DesignerApiFacade`/runtime-facade/contribution composition;
  missing static dependency fails capability composition before registration,
  and no route or source is mounted twice.
- Seed/resume/reopen/replay and all error rows; cross-owner non-enumeration;
  deterministic failure replay; stale release/key/claim conflicts with zero
  duplicate/canonical effects.
- Current active revision/version/state after later provider generation success,
  in-progress, or failure; later provider claims never become static claims.
  Fresh-key promoted calls fork, while exact historical replay may return
  `promoted`; every rejected/expired/restoring/reconciliation/deleting/deleted
  case delegates to terminal `mapDesignerError` with zero dispatch.
- Every success returns outcome and workspace ID/active revision/version/state
  from one final locked snapshot in the deciding transaction. A barrier-controlled
  later provider revision committed immediately after that snapshot cannot mix its
  revision/version/state into the earlier outcome, and spies prove no unlocked
  workspace reload occurs.
- Same-key live and fresh-key live collisions create no second dispatch or loser
  alias; same-key expired conflicts, while a fresh key takes over after expiry.
  A 33-key live race cannot exhaust the separate terminal-reopen cap. Initial
  dispatch plus seven takeovers are accepted under the run lock; a ninth attempt
  maps terminal `designer_reconciliation_required` with no alias/fence/service
  dispatch, including concurrent eighth/ninth callers.
- After a unique insert race loss, a same-key winner completed to ready before
  re-read is classified through owner/key alias and returns replay; only an absent
  alias permits binding classification. No loser reopen alias is inserted.
- Persisted normalized generation-run `static_brief`/digest/contribution/registry/compiler/binding facts
  are returned for takeover/retry after registry evolution; current facts are
  called only for new/promoted-fork. Unique losers perform at most the upstream
  package pass.
- Client URL encoding, CSRF option, no raw fetch/retry/storage, strict success
  normalization including outcome/state cross-field rules and
  `activeRevisionId`, exact public code/status pairs, unknown code/status/details
  rejection, and cause/detail redaction in UI-facing errors.
- Successful mutation invalidates/broadcasts exact Designer list/workspace keys;
  identity isolation, dirty-state protection, best-effort cache failure, and zero
  TASK-556 binding/brief/request/idempotency/receipt/package/private-stage data in
  cache or bus payloads, while preserving TASK-555's safe scoped release summary.
- Exact query/call/size/timeout/rate budgets and source-import boundaries.

## Security Contract

- **Visibility:** internal same-origin Admin POST only.
- **Authentication:** shared Admin session; actor/owner/install server-derived.
- **RBAC:** require all `solution-kits:read`, `designer:read`, `designer:write`.
- **CSRF:** shared guard after wire cap/session/static require-all RBAC/rate and
  before owner admission/content type/parse.
- **Rate limit:** existing shared `admin_write`; no new bucket/configuration.
- **Validation:** recursive reject-unknown params/body/response and bounded JSON.
- **Anti-abuse:** no public write, nonce/HMAC/reCAPTCHA.
- **Privacy/cache:** private no-store; no sensitive browser persistence/log/error data.

## Testing Requirements

After safe `.env` load and DB reachability:

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/designer/designer-static-starter-workspace-contract.test.ts tests/vitest/admin/designer-static-starters-client.test.ts
bun test tests/integration/server/task556StaticStarterWorkspaceService.test.ts tests/integration/server/designerStaticStarterRoutes.test.ts tests/integration/routes/designer-mount.test.ts tests/unit/server/designerRouteRegistration.test.ts tests/security/designerStaticStarterRoute.security.test.ts
bun run check:admin-boundary
bun run scan:security:strict
git diff --check
```

Run terminal Designer error/route registration regressions and budget tests.
Run `wc -l` for all touched human-authored production/test files; fail >1,000.

## Documentation Updates Required

Record exact paths, route factory, DTO/error/rate/query contracts and test receipts
for TASK-556-04-L02. Edit no shared docs/metadata here.
