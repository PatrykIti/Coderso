# TASK-414-07-L02: Designer Workspace Routes, Ownership, and Decision APIs
# FileName: TASK-414-07-L02-Designer-Workspace-Routes-Ownership-And-Decision-APIs.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-07
**Priority:** Critical
**Category:** Designer / Internal API / Security
**Estimated Effort:** Large
**Dependencies:** TASK-414-07-L01; TASK-414-03-L03 terminal handoff
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Own one strict, dependency-injected internal Designer API factory for workspace
reads and every user decision. Define the complete route/schema/error boundary
now as an injected facade contract so later compiler, preview, and promotion
leaves implement those operations instead of reopening route files. The
interface is intentionally defined before its implementations; there is no
dependency on TASK-414-08/09. Registering the factory with the
application is explicitly deferred to TASK-414-09-L03.


## Sub-Tasks

None; this is an executable leaf.
## Exact Ownership

This leaf is the sole writer for:

- `core/services/designer/designerApiFacade.ts`
- `core/server/validation/designerSchemas.ts`
- `core/server/routes/designerRoutes.ts`
- `core/server/routes/designerErrorMapper.ts`
- `tests/vitest/designer/designer-api-schema.test.ts`
- `tests/vitest/designer/designer-error-mapper.test.ts`
- `tests/integration/routes/designer.test.ts`
- `tests/security/designerRoutes.security.test.ts`

It must not edit `core/server/routes/index.ts`, the HTTP server/rate-limit
registry, permission catalogs, `AdminApp.tsx`, `adminPaths`, Admin navigation,
TASK-548 route descriptors, public preview routes, compiler/promotion service
implementations, task indexes, or changelog files. TASK-414-09-L03 is the sole
Designer-family integration writer for those shared files.

## Internal Route Matrix

All paths are under `/admin/api/designer` and return `Cache-Control: no-store`.
The route module accepts one `DesignerApiFacade`; it never imports concrete DB,
provider, compiler, preview, promotion, backup, or cache services.

| Method and path | Operation | Permission | Bucket |
|---|---|---|---|
| `GET /workspaces` | Bounded keyset workspace summaries | `designer:read` | `admin_read` |
| `POST /workspaces` | Create owner-scoped draft | `designer:write` | `admin_write` |
| `POST /agent-handoffs/:handoffId/consumptions` | Transactionally consume one owner-scoped Agent handoff and create/replay exactly one source-bound workspace | `designer:write` | `admin_write` |
| `GET /workspaces/:workspaceId` | Read one Designer aggregate projection | `designer:read` | `admin_read` |
| `PATCH /workspaces/:workspaceId` | Save metadata/brief with state+version CAS | `designer:write` | `admin_write` |
| `POST /workspaces/:workspaceId/inputs` | Bind one ready owner-scoped TASK-414-04 private attachment projection | `designer:write` | `admin_write` |
| `DELETE /workspaces/:workspaceId/inputs/:inputId` | Unbind and, when workspace-owned and now unreferenced, request private purge | `designer:write` | `admin_write` |
| `POST /workspaces/:workspaceId/generations` | Start provider/compiler run | `designer:write` | `designer-generation` |
| `GET /workspaces/:workspaceId/revisions` | Bounded immutable revision summaries | `designer:read` | `admin_read` |
| `POST /workspaces/:workspaceId/revisions/:revisionId/restorations` | Clone old revision as new active draft | `designer:write` | `admin_write` |
| `POST /workspaces/:workspaceId/revision-requests` | Request a new immutable revision from the currently reviewed binding | `designer:write` | `designer-generation` |
| `POST /workspaces/:workspaceId/preview-sessions` | Create one short-lived same-origin Admin preview session | `designer:read` | `designer-preview` |
| `POST /workspaces/:workspaceId/preview-sessions/:previewSessionId/bindings` | Consume the one-time body secret and bind this preview to the current Admin session | `designer:read` | `designer-preview` |
| `GET/HEAD /workspaces/:workspaceId/preview-sessions/:previewSessionId/render/*tail` | Render one bounded staged route/asset through the authenticated same-origin proxy; the path ID is not authorization | `designer:read` | `designer-preview` |
| `POST /workspaces/:workspaceId/approval-intents` | Capture actor/digest/receipt/fresh-baseline decision tuple | `designer:promote` + plan-native permissions | `designer-promotion` |
| `POST /workspaces/:workspaceId/promotions` | Idempotently promote exactly the approved tuple | `designer:promote` + plan-native permissions | `designer-promotion` |
| `POST /workspaces/:workspaceId/rejections` | Reject a nonpromoted workspace | `designer:write` | `admin_write` |
| `POST /workspaces/:workspaceId/reconciliations` | Request authorized recovery review; never blind resume | `designer:promote` | `designer-promotion` |

There is no public write, generic action route, arbitrary resource path, raw
provider response endpoint, lease endpoint, force-state endpoint, or endpoint
that serves private asset bytes directly.

## Strict Request Contracts

Shared guards must model IDs, keyset cursors, versions, immutable revision IDs,
lowercase versioned digests, idempotency keys, optional approval-intent IDs,
bounded human text, and exact enums. Every object rejects unknown keys.

Mutation bodies always include `expectedVersion` and `expectedState`; revision,
preview, approval, and promotion commands additionally include the exact
revision and digest fields they consume. Actor/owner/current-installation IDs
are forbidden in request bodies and are derived from the authenticated context.

Handoff consumption is the narrow pre-workspace exception. Its body accepts
exactly `{ expectedHandoffVersion, expectedHandoffDigest, idempotencyKey }`.
The path supplies the opaque handoff ID; actor/session ownership and the target
workspace ID are server-derived. TASK-414-07-L01 locks the handoff and
atomically creates or replays its one unique source-bound workspace.

The input endpoint accepts strict JSON containing one opaque ready attachment
ID plus exact workspace/version/state binding. A user may first upload directly
to that workspace through TASK-414-04's
`/admin/api/private-inputs/designer-workspaces/:workspaceId/attachments` route
and `private-input-upload` bucket; no Agent session/permission is involved.
This route rechecks the exact owner/workspace root, readiness and expiry, then
creates only a Designer revision input reference;
it never receives bytes, a URL, an object key, or scanner/extractor facts from
the browser.

```ts
export interface DesignerApiFacade {
  listWorkspaces(command: ListDesignerWorkspacesCommand): Promise<WorkspacePage>;
  createWorkspace(command: CreateDesignerWorkspaceCommand): Promise<WorkspaceView>;
  consumeAgentHandoff(command: ConsumeAgentHandoffCommand): Promise<WorkspaceView>;
  readWorkspace(command: ReadDesignerWorkspaceCommand): Promise<WorkspaceDetail>;
  saveDraft(command: SaveDesignerDraftCommand): Promise<WorkspaceDetail>;
  addInput(command: AddDesignerInputCommand): Promise<InputView>;
  removeInput(command: RemoveDesignerInputCommand): Promise<void>;
  startGeneration(command: StartDesignerGenerationCommand): Promise<RunView>;
  listRevisions(command: ListDesignerRevisionsCommand): Promise<RevisionPage>;
  restoreRevision(command: RestoreDesignerRevisionCommand): Promise<WorkspaceDetail>;
  requestRevision(command: RequestDesignerRevisionCommand): Promise<RunView>;
  createPreviewSession(command: CreateDesignerPreviewCommand): Promise<OneTimePreviewBindingView>;
  bindPreviewSession(command: BindDesignerPreviewCommand): Promise<BoundPreviewSessionView>;
  readPreview(command: ReadDesignerPreviewCommand): Promise<DesignerPreviewHttpView>;
  prepareApproval(command: PrepareDesignerApprovalCommand): Promise<ApprovalIntentView>;
  promote(command: PromoteDesignerWorkspaceCommand): Promise<PromotionView>;
  reject(command: RejectDesignerWorkspaceCommand): Promise<RejectionView>;
  requestReconciliation(command: ReconcileDesignerWorkspaceCommand): Promise<ReconciliationView>;
}
```

This interface, the literal route matrix, `mapDesignerError()`, and this one
`registerDesignerRoutes()` factory are also the only post-terminal extension
seam for a new built-in Designer materialization source. TASK-556 may add one
strict `seedStaticStarterWorkspace` method and one prefixless
`POST /designer/static-starters/:sourceId/workspaces` descriptor only after the
terminal facade is complete. It must use the same `router.register` pre-body
shape, response policy, and centralized error map; a sibling route factory,
`router.post` overload, reconstructed middleware order, or direct service import
is forbidden.

## Implementation Pseudocode

```ts
export function registerDesignerRoutes(
  router: Router,
  deps: DesignerRouteDeps
): void {
  router.register({
    method: "POST",
    // Route factories are prefixless with respect to the server-owned /admin/api.
    path: "/designer/workspaces/:workspaceId/promotions",
    preBody: {
      auth: "admin-session",
      permissions: ["designer:promote"],
      csrf: "required",
      rateCharges: {
        entries: [
          { bucket: "designer-promotion", identity: "actor", weight: 1 },
        ],
      },
      body: {
        mode: "json",
        contentTypes: ["application/json"],
        maxBytes: DESIGNER_PROMOTION_BODY_MAX_BYTES,
      },
      authorizeBeforeBody: deps.requireOwnedWorkspaceFromPath,
    },
    response: designerJsonNoStoreResponsePolicyV1,
    handlers: [async (ctx) => {
      const params = parseDesignerWorkspaceParams(ctx.params);
      const body = parsePromoteDesignerWorkspaceBody(ctx.body);
      const actor = ctx.requireResolvedActor();
      const plan = await deps.planAuthorization.loadOwnedStagedPlan({
        actor,
        workspaceId: params.workspaceId,
        approvalIntentId: body.approvalIntentId,
      });
      const requiredPermissions = deriveExactNativePermissionUnion(plan);
      const permissionDigest = digestCanonicalPermissions(requiredPermissions);
      assertExpectedPermissionDigest(body.expectedPermissionDigest, permissionDigest);
      await deps.nativePermissions.requireAll(actor, requiredPermissions);
      const result = await deps.facade.promote({
        ...params,
        ...body,
        actor,
        authoritativePlanId: plan.id,
        authoritativePermissionDigest: permissionDigest,
      });
      return routeJson(projectPromotionResponse(result), {
        status: statusFor(result),
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      });
    }],
  });

  router.register({
    method: "POST",
    path: "/designer/agent-handoffs/:handoffId/consumptions",
    preBody: {
      auth: "admin-session",
      permissions: ["designer:write"],
      csrf: "required",
      rateCharges: {
        entries: [
          { bucket: "admin_write", identity: "actor", weight: 1 },
        ],
      },
      body: {
        mode: "json",
        contentTypes: ["application/json"],
        maxBytes: DESIGNER_HANDOFF_CONSUMPTION_BODY_MAX_BYTES,
      },
      authorizeBeforeBody: deps.requireOwnedAgentHandoffFromPath,
    },
    response: designerJsonNoStoreResponsePolicyV1,
    handlers: [async (ctx) => {
      const result = await deps.facade.consumeAgentHandoff({
        ...parseDesignerHandoffParams(ctx.params),
        ...parseConsumeAgentHandoffBody(ctx.body),
        actor: ctx.requireResolvedActor(),
      });
      return routeJson(projectWorkspaceResponse(result), {
        status: 200,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      });
    }],
  });
}
```

The client-supplied digest is only an optimistic conflict token; it is never a
permission list or proof. Every handler consumes TASK-414-03-L03's shared order:
exact route/wire cap, authenticated session, static RBAC, rate limit, CSRF for
writes, path-derived owner admission, exact content type and strict body parse,
then dynamic native
permission resolution where required, trusted actor construction, facade call,
safe projection, centralized domain-error mapping. Authentication and
authorization must happen before existence-sensitive service reads.

`registerDesignerRoutes(router, deps)` is the sole owner of the preview-session
creation/binding POSTs, revision-request POST, and internal preview GET/HEAD
paths. TASK-414-08-L03
implements the injected `requestRevision`, `createPreviewSession`,
`bindPreviewSession`, and
`readPreview` methods and exports no competing route factory. The complete
literal method/path catalog above is frozen in `designer.test.ts`; duplicate or
overlapping registration fails the route test and TASK-414-09-L03 composition.

## Data Flow

```text
HTTP request
  -> exact route + wire cap
  -> Admin session / static RBAC / bucket / CSRF / path-owner admission
  -> exact content type + strict reject-unknown parse
  -> dynamic native permission check when plan-bound
  -> trusted actor command
  -> injected DesignerApiFacade
  -> safe response projection + no-store
```

Later leaves provide facade methods. The route module compiles against the
interface but is not mounted while any dependency is unavailable. Missing
promotion atomicity or preview capability is a fail-closed
`designer_capability_unavailable`, never a partial fallback.

The Designer workspace Admin descriptor may declare the browser-only metadata
`setupAccess: "review"`. That marker is consumed only by TASK-555's explicit
in-memory Setup continuation gate; it grants no server access, is absent from
API DTOs, and never bypasses session, RBAC, owner, state, or digest checks.

## Machine-Readable Errors

`mapDesignerError()` maps known domain codes without exposing causes:

| Code | HTTP |
|---|---:|
| `designer_request_invalid` | 400 |
| `designer_input_invalid` | 400 |
| `designer_input_too_large` | 413 |
| `designer_workspace_not_found` | 404 |
| `designer_handoff_not_found` | 404 |
| `designer_revision_not_found` | 404 |
| `designer_forbidden` | 403 |
| `designer_workspace_conflict` | 409 |
| `designer_handoff_expired` | 409 |
| `designer_handoff_conflict` | 409 |
| `designer_workspace_state_invalid` | 409 |
| `designer_baseline_stale` | 409 |
| `designer_receipt_stale` | 409 |
| `designer_idempotency_conflict` | 409 |
| `designer_promotion_in_progress` | 409 |
| `designer_rate_limited` | 429 |
| `designer_capability_unavailable` | 422 |
| `designer_provider_unavailable` | 503 |
| `designer_reconciliation_required` | 503 |

Unknown errors map to the existing sanitized internal error. Response details
may include safe state/version and retry metadata only; no prompts, package
bodies, receipts, tokens, storage paths, SQL, provider bodies, or stack traces.

## Security Contract

| Concern | Contract |
|---|---|
| Visibility | Every route in this module is internal under `/admin/api/designer/*`. It is not registered on a public router and emits `no-store`. |
| Authentication | Shared Admin session middleware is mandatory. Actor/owner/current-installation identity is derived only from the session and server context; body-supplied identity is rejected. |
| RBAC | `designer:read`, `designer:write`, and `designer:promote` apply as in the route matrix. Approval also requires every native permission resolved from the exact staged plan; no wildcard or client-declared permission list is trusted. |
| CSRF | All POST, PUT, PATCH, and DELETE routes require the shared CSRF middleware before parsing or dispatch. GET routes are read-only. |
| Rate limits | Exact buckets are `admin_read`, `admin_write`, `designer-generation`, `designer-preview`, and `designer-promotion` as listed. Generation also applies provider/user quotas. Missing bucket registration fails route composition. |
| Validation | Params, query, and JSON use strict reject-unknown schemas. Attachment IDs resolve through TASK-414-04's owner/ready checks; cursors, IDs, versions, states, digests, TTL requests, and idempotency keys are bounded. Raw upload validation remains with its owning route. |
| Anti-abuse | Session + CSRF + RBAC + owner predicates + CAS + quotas protect internal writes. No public write exists, so public nonce/HMAC and reCAPTCHA are not applicable. Preview credentials are never accepted by these write routes as authorization. |

Add security headers through existing middleware. Only the nonauthorizing
`previewSessionId` may appear in the declared route path. Never put the raw
one-time bind secret in a URL, JSON log, analytics event, browser persistence,
cache, screenshot, task evidence, or error payload.

## Regression-Test Shape

Vitest schema/error tests cover every endpoint's valid minimal body, all
unknown-key levels, bad IDs/cursors/states/versions/digests/idempotency keys,
oversized strings, and complete known-error mapping with sanitized fallback.

Bun route/security tests use a recording router and injected facade spies to
prove:

- the exact method/path matrix and no accidental public alias;
- every factory path starts at `/designer/...`; the server-owned `/admin/api`
  prefix is applied exactly once, and a doubled `/admin/api/admin/api` route is
  absent;
- middleware order, exact bucket, CSRF on every write, and no CSRF on GET;
- static and dynamic RBAC denial before facade invocation;
- body actor/installation/native-permission injection is rejected;
- owner-scoped not-found semantics do not leak cross-user existence;
- one-time bind secret is accepted only in the CSRF-protected strict POST body,
  is consumed exactly once, and never reaches the render path/access log;
- malformed/cross-owner/cross-root/not-ready attachment references never bind
  to a workspace, and a Designer-only user does not need an Agent session;
- the route has no multipart/raw-byte/remote-URL path and does not duplicate TASK-414-04 upload handling;
- CAS and idempotency fields reach the facade unchanged after normalization;
- handoff consumption reauthorizes owner + `designer:write`, forwards exact
  version/digest/key once, returns the same workspace on exact replay, and
  rejects cross-owner/stale/changed bindings before any facade mutation;
- all responses carry `no-store` and omit sensitive fields;
- `registerAllRoutes` does not expose Designer yet in this leaf.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/designer/designer-api-schema.test.ts \
  tests/vitest/designer/designer-error-mapper.test.ts
set -a && source .env && set +a && bun test \
  tests/integration/routes/designer.test.ts \
  tests/security/designerRoutes.security.test.ts
git diff --check
wc -l core/services/designer/designerApiFacade.ts \
  core/server/validation/designerSchemas.ts \
  core/server/routes/designerRoutes.ts \
  core/server/routes/designerErrorMapper.ts \
  tests/vitest/designer/designer-api-schema.test.ts \
  tests/vitest/designer/designer-error-mapper.test.ts \
  tests/integration/routes/designer.test.ts \
  tests/security/designerRoutes.security.test.ts
```

## Documentation Updates Required

Provide the final route/permission/rate-limit/error matrix and multipart limits
to the closure leaf. Do not publish API docs or mark endpoints available until
TASK-414-09-L03 mounts the complete fail-closed facade. Do not edit task indexes
or changelog 1266 here.
