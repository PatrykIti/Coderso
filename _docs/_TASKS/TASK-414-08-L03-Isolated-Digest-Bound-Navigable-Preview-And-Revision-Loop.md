# TASK-414-08-L03: Isolated Digest-Bound Navigable Preview and Revision Loop
# FileName: TASK-414-08-L03-Isolated-Digest-Bound-Navigable-Preview-And-Revision-Loop.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-08
**Priority:** Critical
**Category:** Designer / Preview / Revisions / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-08-L01, TASK-414-08-L02;
TASK-548-03-L01 terminal before final Admin composition
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Render a complete navigable site from Designer staging read models, bind every
preview byte to one immutable revision/validation tuple, provide one secure
same-origin Admin-session path, and orchestrate revision requests without
mutating reviewed history. Preview never reads
canonical fallback data and is never cache-eligible or indexable.


## Sub-Tasks

None; this is an executable leaf.
## Exact Ownership

This leaf is the sole writer for:

- `core/services/designer/previewContract.ts`
- `core/services/designer/previewArtifactService.ts`
- `core/services/designer/previewSessionService.ts`
- `core/services/designer/stagingPreviewRenderer.ts`
- `core/services/designer/revisionLoopService.ts`
- `core/admin/services/designerPreviewClient.ts` — including the exact
  `DesignerPreviewHandoffInputV1` type and the separate
  `previewHandoff(input)` method that calls the existing preview-create and
  immediate-bind flow once. This is the single owner of the preview-handoff
  type; TASK-414-07-L03's generic import slot never references it, and
  TASK-414-10-L02's Figma slot integration imports it from here read-only after
  import returns a ready revision.
- `core/admin/ui/designer/preview/DesignerPreviewPanel.tsx`
- `core/admin/ui/designer/preview/DesignerRevisionComposer.tsx`
- `core/admin/ui/designer/preview/DesignerGraphDiff.tsx`
- `tests/vitest/designer/designer-preview-contract.test.ts`
- `tests/vitest/designer/designer-preview-session.test.ts`
- `tests/vitest/admin/designer/designer-preview-panel.test.tsx`
- `tests/integration/designer/designer-preview-renderer.test.ts`
- `tests/integration/routes/designer-preview.test.ts`
- `tests/security/designerPreview.security.test.ts`

It must not edit the TASK-414-07 route/schema files or register routes, shared route mounts,
`AdminApp.tsx`, Admin route/nav descriptors, canonical public resolvers, normal
preview tables/routes, canonical cache keys, TASK-547 package files, promotion
services, task indexes, or changelog files. TASK-414-09-L03 composes and mounts
the route factories and UI after all capabilities are terminal.

## Preview Binding and Rendering Contract

A `DesignerPreviewManifestV1` binds workspace ID/version, revision ID/number,
brief/core-package/sidecar-set/whole-bundle/stage-graph/install-plan/
validation-receipt digests, deterministic
route map, asset-manifest digest, renderer version, capability-manifest digest,
and preview digest. Each route maps to one staged resource key. Unknown,
ambiguous, external, traversal, encoded-separator, redirect, or canonical-
fallback routes fail closed.

The renderer reads only Designer stage rows/private assets through a bounded
revision-scoped read model. It uses terminal native renderers only through
stage-safe adapters that accept explicit staged dependencies. An adapter that
implicitly queries canonical state is preview-unavailable. Dynamic forms,
booking, checkout, webhooks, analytics, uploads, and mutations render inert
review states; preview submits no public or internal write.

Every HTML/data/asset/error response emits `Cache-Control: private, no-store,
max-age=0`, `Pragma: no-cache`, `X-Robots-Tag: noindex, nofollow, noarchive`,
strict CSP/frame policy for the Admin origin, nosniff, and no canonical URL or
sitemap/search registration. Service workers, prefetch caches, shared CDN
caches, normal server caches, and analytics are disabled.

## Same-Origin Access

V1 uses only TASK-414-07-L02's authenticated same-origin Admin proxy. Session
creation returns a nonauthorizing opaque `previewSessionId` plus one raw random
`bindSecret` exactly once in a `private, no-store` JSON POST response. Only the
secret hash is stored with owner, workspace/revision/version, exact core/sidecar/
bundle/validation/preview digests, issue/expiry, and unbound state. The Designer
client immediately sends that secret in the strict body of the CSRF-protected
bind POST. A successful constant-time match consumes it and binds the preview
row to the actor's current Admin-session digest; the raw value is then discarded
from component memory. It never enters a path/query/fragment, browser
persistence, cache, log, analytics, error, screenshot, task evidence, or later
render request.

All preview navigation paths contain only `previewSessionId` and the declared
safe `/*tail` route from TASK-414-03-L03. The ID is a locator, not a credential:
guessing or copying it cannot satisfy Admin authentication, `designer:read`,
owner, bound Admin-session digest, TTL, revocation, or exact digest checks. An
unbound row cannot render and expires quickly. Failed/ambiguous binding consumes
or revokes the row; the client creates a fresh session instead of persisting or
reusing the raw secret.

Every GET/HEAD reauthorizes `designer:read`, actor ownership, Admin-session
binding, TTL, revocation, and the exact digest tuple before loading staged data.
Revision activation, reject, expiry, promotion, logout/session rotation, or
workspace deletion revokes the session. Deny on unavailable revocation state.
No front-host/public preview route, cross-origin token transfer, signed bearer,
token mint/exchange endpoint, or preview write exists in v1. A later cross-host
transport requires its own separately audited task and explicit secret-transfer
protocol; this contract does not reserve or partially implement one.

Preview creation imports `ASSISTANT_RETENTION_POLICY_V1` and uses exactly
`designer-preview-session`: 15 minutes by default, request clamp 1–30 minutes,
hard 30-minute maximum from `issued_at`, no read/bind refresh. Bind-secret
material is removed on consume/revoke/expiry and only the 30-day safe revocation
fact remains. No local preview constant is permitted.

## Revision Loop Contract

A revision request contains bounded user instructions, exact current workspace
version/state/revision and all review digests. The backend records a new brief
revision, atomically revokes prior preview sessions, CAS-enters `generating`,
and invokes TASK-414-08-L01/L02. Stable symbolic resource keys produce an
explicit bounded graph diff. Restoring historical work clones it into a new
revision and recompiles/revalidates; old package/receipt/preview bytes remain
unchanged.

## Implementation Pseudocode

```ts
export async function createDesignerPreviewSession(
  command: CreateDesignerPreviewCommand,
  deps: PreviewDeps
): Promise<OneTimePreviewBindingView> {
  const bindSecret = deps.handles.randomOpaque();
  const session = await deps.db.transaction(async (tx) => {
    const ready = await deps.workspaces.lockOwnedReadyRevisionTx(tx, command);
    assertExactPreviewBinding(ready, command);
    const manifest = await deps.artifacts.requireManifestTx(tx, ready.binding);
    return deps.sessions.insertUnboundTx(tx, {
      binding: manifest.binding,
      bindSecretHash: deps.handles.hash(bindSecret),
      expiresAt: clampPreviewExpiry(command.requestedTtl, deps.clock.now()),
      actorId: command.actor.id,
    });
  });
  return projectOneTimePreviewBindingResponse(session, bindSecret);
}

export async function bindDesignerPreviewSession(
  command: BindDesignerPreviewCommand,
  deps: PreviewDeps,
): Promise<BoundPreviewSessionView> {
  return deps.sessions.consumeSecretAndBindTx({
    previewSessionId: command.previewSessionId,
    actorId: command.actor.id,
    adminSessionDigest: command.actor.adminSessionDigest,
    bindSecret: command.bindSecret,
    constantTimeVerify: deps.handles.verify,
  });
}

export async function renderDesignerPreviewRead(request: PreviewReadRequest, deps: RenderDeps) {
  const session = await deps.sessions.requireOwnedActiveExact(request);
  const manifest = await deps.manifests.readExact(session.binding);
  assertDigestTuple(session, manifest);
  const staged = await deps.readModel.loadBoundedRoute(manifest, request.route);
  return withPreviewSecurityHeaders(deps.renderer.render(staged, manifest));
}

export async function requestDesignerRevision(command: RevisionCommand, deps: RevisionDeps) {
  const next = await deps.workspaces.createRevisionAndRevokePreview(command);
  return deps.providerRuns.start({ ...next, revisionInstruction: command.instruction });
}
```

The revision service persists/CASes first, ends its transaction, then performs
provider I/O. Preview rendering performs no write and cannot refresh TTL as a
side effect of GET.

## Data Flow

```text
ready staged revision + receipt
  -> deterministic preview manifest/artifacts
  -> unbound short-lived preview row + one-time bind secret in POST body only
  -> CSRF POST consumes secret and binds current Admin session
  -> nonauthorizing previewSessionId navigation
  -> exact route/digest/revocation check
  -> bounded staging read model
  -> secure no-store/noindex HTML/data/assets

revision instruction
  -> exact binding/CAS + preview revocation
  -> immutable new brief revision
  -> provider run -> compiler/materializer
  -> stable-key graph diff + new preview digest
```

## Machine-Readable Errors

- `designer_preview_not_ready`
- `designer_preview_binding_invalid`
- `designer_preview_session_invalid`
- `designer_preview_binding_secret_invalid`
- `designer_preview_session_expired`
- `designer_preview_revoked`
- `designer_preview_route_not_found`
- `designer_preview_capability_unavailable`
- `designer_preview_rate_limited`
- `designer_revision_invalid`
- `designer_revision_conflict`
- `designer_revision_limit_exceeded`

Internal responses collapse handle/binding/revocation distinctions to a uniform
safe unauthorized/not-found result. No handle, Admin-session digest, binding
tuple, private path, resource body, or stack is logged.

## Security Contract

| Concern | Contract |
|---|---|
| Visibility | Preview management and every staged read are internal under TASK-414-07-L02's same-origin `/admin/api/designer/*` route family. No public/cross-host route exists. |
| Authentication | Every read requires the authenticated Admin session, server actor/owner recheck, a consumed one-time secret binding to that Admin-session digest, and exact workspace/revision/version/digest tuple. The path ID is nonauthorizing. |
| RBAC | Session creation/bind/read requires `designer:read`; requesting a new revision requires `designer:write`. Neither ID nor bind secret grants anything or satisfies Admin auth, RBAC, or promotion. |
| CSRF | Internal preview-session creation, one-time binding, and revision POSTs require shared CSRF before body parsing. GET/HEAD rendering is side-effect free and carries no secret; there is no public mutation. |
| Rate limits | Session creation and every preview read use `designer-preview`, with per-actor/Admin-session/workspace concurrency, route/byte budgets, and short fixed TTL. Revision generation also enters `designer-generation`. |
| Validation | Strict reject-unknown params/bodies/session/manifests; constant-time one-time bind-secret hash check; exact server-side Admin-session/digest binding equality; bounded safe-tail decoding, route/asset size, staged projections and response bytes; no redirects or canonical fallback. |
| Anti-abuse | No public write means nonce/HMAC request signing and reCAPTCHA are not applicable. Admin session + RBAC + consumed server-side session binding + revocation + TTL + CSP/frame policy + no-store/noindex + rate limits + deny-on-state-failure protect reads. |

## Regression-Test Shape

Vitest tests cover canonical manifest/preview digest, every session-binding
field, Admin-session rotation, TTL clamps, constant-time bind-secret verifier seam,
unknown fields, each binding
mutation, revocation reasons, stable graph diff, and response-header helpers.
React tests cover navigable route changes, desktop/mobile viewport controls,
visible staged content, graph diff, revision conflict, focus/keyboard/reduced-
motion semantics, light/dark Admin chrome, zero credential persistence, and
zero console errors.

Bun route/render/security tests cover:

- complete multi-page staged navigation and private staged assets;
- no canonical DB query/fallback, public form submission, analytics, cache,
  sitemap, service worker, or external redirect;
- exact internal GET/HEAD facade behavior with Admin auth/RBAC and no public
  registration;
- session ID absent/invalid/expired/wrong actor/Admin-session/workspace/revision/
  version/package/receipt/preview, unbound rows, bind-secret mismatch/replay/race,
  and uniform safe errors; raw secret appears only in the creation response and
  bind request body and never in any URL/log/cache/screenshot;
- immediate revocation on revision/reject/expiry/promotion/session loss;
- all HTML/data/asset/error headers and CSP/frame behavior;
- path traversal, encoded separators, host-header, range, oversized asset, and
  rate/concurrency abuse;
- an old revision remains byte-identical while restore/revise creates a new
  revision and different digest.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/designer/designer-preview-contract.test.ts \
  tests/vitest/designer/designer-preview-session.test.ts \
  tests/vitest/admin/designer/designer-preview-panel.test.tsx
set -a && source .env && set +a && bun test \
  tests/integration/designer/designer-preview-renderer.test.ts \
  tests/integration/routes/designer-preview.test.ts \
  tests/security/designerPreview.security.test.ts
bun run check:admin-boundary
git diff --check
wc -l core/services/designer/previewContract.ts \
  core/services/designer/previewArtifactService.ts \
  core/services/designer/previewSessionService.ts \
  core/services/designer/stagingPreviewRenderer.ts \
  core/services/designer/revisionLoopService.ts \
  core/admin/services/designerPreviewClient.ts \
  core/admin/ui/designer/preview/DesignerPreviewPanel.tsx \
  core/admin/ui/designer/preview/DesignerRevisionComposer.tsx \
  core/admin/ui/designer/preview/DesignerGraphDiff.tsx \
  tests/vitest/designer/designer-preview-contract.test.ts \
  tests/vitest/designer/designer-preview-session.test.ts \
  tests/vitest/admin/designer/designer-preview-panel.test.tsx \
  tests/integration/designer/designer-preview-renderer.test.ts \
  tests/integration/routes/designer-preview.test.ts \
  tests/security/designerPreview.security.test.ts
```

## Documentation Updates Required

Provide the closure leaf with preview topology/configuration, session/TTL/
revocation policy, security headers, supported inert interactions, revision and
graph-diff UX, and troubleshooting codes. Do not edit shared docs, task
indexes, or changelog 1266 in this leaf.
