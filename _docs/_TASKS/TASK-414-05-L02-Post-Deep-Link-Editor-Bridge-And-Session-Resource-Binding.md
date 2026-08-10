# TASK-414-05-L02: Post Deep-Link Editor Bridge And Session Resource Binding
# FileName: TASK-414-05-L02-Post-Deep-Link-Editor-Bridge-And-Session-Resource-Binding.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-05
**Priority:** High
**Category:** Agent / Posts / Admin Navigation / Conflict UX
**Estimated Effort:** Large
**Dependencies:** TASK-414-05-L01; TASK-414-03 terminal; TASK-548 terminal;
TASK-554 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Bridge a reviewed Agent Post action into the canonical Post editor without
placing a trusted Post ID, Post body, draft token, or permission claim in the
handoff. The link carries an opaque Agent session ID plus the exact opaque
resource-binding ID. The server reauthorizes the caller and resolves that one
binding; it never guesses which Post is intended when a session contains
multiple resources.

The editor treats Agent/cache changes as external authoritative updates. A
clean editor may reload after a version comparison. A dirty editor is never
overwritten: it retains its bytes and shows a visible compare/reload-after-save-
or-discard choice. The bridge keeps the same durable Agent session visible as a
companion panel beside the native editor, so the user can request further
changes to this bound Post in the new tab/window. No effect body blindly calls
`setState` with a remote Post.


## Sub-Tasks

None; this is an executable leaf.
## Exact File Ownership

This leaf is the sole TASK-414 writer for:

- new `core/services/assistant/resources/agentResourceBindingContracts.ts`;
- new `core/services/assistant/resources/agentResourceBindingService.ts`;
- new `core/server/validation/assistantResourceBindingSchemas.ts`;
- new `core/server/routes/assistantResourceBindingRoutes.ts`;
- new `core/admin/app/routes/agent-post-binding.admin-route-descriptor.ts`,
  containing only stable route ID, typed params, permission metadata, and the
  path-free Post bridge contribution consumed by TASK-414-09-L03;
- new `core/admin/services/agentResourceBindingClient.ts`;
- new `core/admin/ui/posts/PostAgentSessionBridgePage.tsx`;
- new `core/admin/ui/posts/editor/PostAgentSessionCompanion.tsx`, a thin
  consumer of TASK-414-03's existing Agent session client/components;
- new `core/admin/ui/posts/editor/agentPostEditorBridge.ts`;
- new `core/admin/ui/posts/editor/hooks/useAgentPostEditorBridge.ts`;
- new `core/admin/ui/posts/editor/AgentPostUpdateBanner.tsx`;
- existing `core/admin/ui/posts/PostEditorPage.tsx`, only to accept the resolved
  bridge context through the terminal Admin route contribution;
- existing `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`, only for the
  bridge hook/banner integration;
- existing `core/admin/ui/posts/editor/PostClassicEditorShell.tsx`, only for the
  same behavior parity;
- new `tests/vitest/assistant/agentResourceBindingContracts.test.ts`;
- new `tests/vitest/admin/agentPostBindingRouteDescriptor.test.ts`;
- new `tests/vitest/admin/agentResourceBindingClient.test.ts`;
- new `tests/vitest/ui/agent-post-editor-bridge.test.tsx`;
- new `tests/integration/routes/assistantResourceBindings.test.ts`;
- new `tests/integration/server/assistantPostResourceBinding.test.ts`.

Forbidden: `usePostEditorState.ts` (currently 2,713 lines), Post native service/
route/schema/client files, L01 action/approval files, TASK-414-03 DB schema/
migrations/repositories, TASK-548 route-registry/auth/Assistant files,
`AssistantPanel.tsx`, shared Admin route registry/mount/prefetch files, shared
route index/`assistantRoutes.ts`, Media, shared docs/tasks/changelog, and later
leaves. TASK-414-09-L03 mounts the already-tested Admin/API contributions and
adds shared route/prefetch registration; it does not reimplement this bridge.

TASK-554 is the prior writer of `PostClassicEditorShell.tsx` metadata-save
behavior. This leaf rereads its terminal bytes and may add only the bridge/
companion integration. It must preserve TASK-554's baseline-versus-draft
present-only payload helper, no-op request suppression, omission of `status`
and `scheduledAt` from unrelated metadata saves, and intentional publication
submission behavior. It must not inline, replace, or bypass
`postMetadataMutationPayload.ts`.

Immediately before implementation, re-read TASK-548's terminal canonical route
exports. TASK-414-09-L03 is the sole writer of the actual
`core/admin/utils/adminPaths.ts`, route registry, matcher, navigation, and
prefetch seams; this leaf supplies a pure descriptor and consumes an injected
route resolver. Never hand-build a competing href, alias, active matcher,
`AdminLink`, or prefetch rule.

The exact pure integration exports are:

```ts
export function registerAssistantResourceBindingRoutes(
  router: Router,
  deps: AssistantResourceBindingRouteDeps,
): void;
export const agentPostBindingAdminRouteContribution:
  Task414AdminContributionV1;
```

`Task414AdminContributionV1` and its single dependency type name
`Task414ContributionDepsV1` are imported from TASK-414-03-L03's one exact owner
`core/server/routes/contributions/task414ContributionContract.ts`; this leaf
never redefines the contribution type.

They have no import-time side effects; TASK-414-09-L03 mounts each once.

## Server Binding Contract

TASK-414-03 owns storage. This leaf owns the strict projection and service rules:

```ts
export type AgentResourceBindingV1 = Readonly<{
  bindingId: string;
  sessionId: string;
  resourceKind: "post";
  resourceId: string;
  resourceVersion: number;
  resourceUpdatedAt: string;
  resourceDigest: string;
  sourceActionId: string;
  sourceExecutionId: string;
  boundAt: string;
  expiresAt: string;
}>;

export type AgentResourceBindingDtoV1 = Readonly<{
  bindingId: string;
  sessionId: string;
  resource: Readonly<{
    kind: "post";
    id: string;
    version: number;
    updatedAt: string;
  }>;
  destination: Readonly<{
    routeId: "posts.edit";
    params: Readonly<{ postId: string }>;
  }>;
  expiresAt: string;
}>;
```

The stored row is actor/session scoped inside the current CMS installation. L01 writes/updates it through the
terminal transaction-aware generic binding repository only after a successful
Post mutation, binding exact execution/action/version/time/digest. A failed/
rolled-back action cannot update the binding. The public DTO omits digest,
execution ID, actor ID, permissions, and Post body.

`GET /admin/api/assistant/agent/sessions/:sessionId/resource-bindings/:bindingId`:

1. validates both opaque IDs using their owning normalizers;
2. requires the authenticated actor's exact session ownership;
3. loads that one owner/session-scoped nonexpired binding;
4. reauthorizes `content:read` and rehydrates the Post narrow identity/version;
5. rejects deleted/wrong-kind/stale-invalid bindings; and
6. returns the strict DTO with a closed route ID/params destination. The browser
   resolves it through the shared canonical route helper; the server never
   returns an arbitrary href.

Binding lifetime is no longer than the owning Agent session and an absolute 30
days. Archive/delete removes the active binding through TASK-414-03 lifecycle.
Expiry never deletes the Post or action audit record.

## Canonical Deep-Link Contract

TASK-414-09-L03's terminal shared helper gains exactly from this descriptor:

```ts
adminPaths.agentPostEditor({
  sessionId: OpaqueAgentSessionId,
  bindingId: OpaqueAgentResourceBindingId,
}): string
// canonical relative route: /agent/sessions/:sessionId/bindings/:bindingId/post
```

The helper encodes/normalizes only an already validated opaque ID and flows
through canonical base-path, alias, active-route, `AdminLink`, and prefetch
helpers. It never accepts `postId`, slug, redirect URL, query bag, permission,
or arbitrary suffix. The binding ID prevents ambiguity when one session has
multiple Posts or other resources. `PostAgentSessionBridgePage` resolves the server binding
before selecting an editor. A missing/forbidden/expired binding shows a bounded
error with safe return actions; it does not guess a Post or fall back to a URL
parameter.

After resolution, `PostAgentSessionBridgePage` renders the canonical native Post
editor and `PostAgentSessionCompanion` while the browser remains on the
session+binding route. The destination route ID/params select the native editor
component; they are not a redirect target. Reload/new-window navigation
therefore re-resolves the binding and reopens the same DB-authoritative Agent
session. The companion uses TASK-414-03's existing message/run APIs and memory
cache; it creates no second transcript/session store and never serializes Post
body/conflict digest/approval/provider data into URL, history state,
localStorage, or sessionStorage. A separate explicit “Open native editor” action
may leave the Agent context, but automatic replacement is forbidden.

## Dirty Editor Contract

`agentPostEditorBridge.ts` is pure and returns one of:

```ts
type AgentPostRefreshDecisionV1 =
  | { state: "current" }
  | { state: "reload-clean"; binding: AgentResourceBindingDtoV1 }
  | { state: "prompt-dirty"; binding: AgentResourceBindingDtoV1 }
  | { state: "conflict"; code: "assistant_post_version_conflict" };
```

- Compare exact Post ID, version, and canonical `updatedAt`; never compare title
  or browser timestamps heuristically.
- When clean and server binding is newer, request one uncached/revalidated
  native Post detail and then adopt it through the editor's existing explicit
  load boundary.
- When dirty, keep every local field/block/selection/undo/autosave state
  untouched. Show `AgentPostUpdateBanner` with Compare, Save local changes, and
  Discard/reload actions. Reload remains disabled until save/discard settles.
- Compare shows a bounded server-generated/native diff; it does not inject a
  second Post body directly into the editor store.
- Cache bus/browser events are hints. Focus/reconnect re-fetches the binding and
  native Post before deciding. Duplicate/out-of-order events are ignored by
  version/time.
- Block and Classic editors have parity. No effect performs synchronous
  unconditional remote `setState`, and no dirty protection is weakened to make
  a test pass.
- Companion requests carry the current opaque binding ID as server-resolved
  resource context. They cannot target a different Post by prompt/body field;
  a newer successful Agent mutation refreshes that binding and flows through
  the same clean/dirty decision contract.

## Security Contract

- **Visibility:** one internal binding GET route and one authenticated Admin SPA
  bridge route. No public resource-binding or Post endpoint is added.
- **Auth:** authenticated Admin session. Server resolves actor/session
  owner and Post binding. Session ID is opaque but not an authorization token.
- **RBAC:** API/SPA resolution requires `assistant:use` and `content:read`.
  Save/discard/publish retain native `content:write`/`content:publish` checks;
  the bridge cannot grant them.
- **CSRF:** GET binding is side-effect free and needs no CSRF. Existing editor
  mutations and any binding write performed by action execution remain CSRF
  protected. GET cannot extend TTL or mutate active session.
- **Rate limit:** binding GET uses the bounded `assistant` read policy plus
  per-actor/session enumeration controls; Post reads retain native limits.
- **Validation:** exact opaque path ID, strict reject-unknown response/client
  normalization, owner/kind/expiry/current-Post checks, canonical route
  builder only, exact version/time comparisons.
- **Anti-abuse:** no public write, so nonce/HMAC/reCAPTCHA are not applicable.
  Opaque >=128-bit session IDs, authorization on every read, bounded retries,
  and no redirect input prevent enumeration/open redirects.
- **Secrets/privacy:** no Post body, draft digest, approval, execution, provider,
  permission, private attachment, cookie/session/CSRF, or arbitrary redirect in
  URL, history/browser storage, caches, logs, metrics, screenshots, or errors.

## Implementation Pseudocode

```ts
export async function resolveAgentResourceBinding(
  rawSessionId: unknown,
  rawBindingId: unknown,
  ctx: AuthorizedAdminContext,
  deps: AgentResourceBindingDeps
): Promise<AgentResourceBindingDtoV1> {
  const sessionId = normalizeOpaqueAgentSessionId(rawSessionId);
  const bindingId = normalizeOpaqueAgentResourceBindingId(rawBindingId);
  await deps.sessions.requireOwned(sessionId, ctx.actorId);
  await deps.permissions.require(ctx.actorId, "content:read");
  const binding = await deps.bindings.getActive(bindingId, sessionId, ctx.actorId);
  if (!binding || binding.resourceKind !== "post") {
    throw domainError("assistant_resource_binding_not_found");
  }
  const post = await deps.posts.getNarrowIdentity(binding.resourceId);
  assertBindingStillAuthorized(binding, post);
  return normalizeAgentResourceBindingDtoV1({
    bindingId,
    sessionId,
    resource: { kind: "post", id: post.id, version: post.version, updatedAt: post.updatedAt },
    destination: { routeId: "posts.edit", params: { postId: post.id } },
    expiresAt: binding.expiresAt,
  });
}

export function decideAgentPostRefresh(input: {
  editor: { postId: string; version: number; updatedAt: string; dirty: boolean };
  binding: AgentResourceBindingDtoV1;
}): AgentPostRefreshDecisionV1 {
  assertSamePost(input.editor.postId, input.binding.resource.id);
  const order = comparePostVersionToken(input.editor, input.binding.resource);
  if (order === "same") return { state: "current" };
  if (order === "editor-newer") return { state: "conflict", code: "assistant_post_version_conflict" };
  return input.editor.dirty
    ? { state: "prompt-dirty", binding: input.binding }
    : { state: "reload-clean", binding: input.binding };
}
```

## Data Flow

Successful L01 transaction → terminal server-side session resource binding →
Agent UI builds `adminPaths.agentPostEditor({ sessionId, bindingId })` →
authenticated bridge GET → owner/RBAC/Post rehydration → strict binding DTO →
native editor + same-session Agent companion under the unchanged bridge route →
bound follow-up request → exact clean/dirty decision → explicit reload or
conflict banner. No Post target/body is trusted from browser navigation.

## Machine-Readable Errors

- `assistant_resource_binding_invalid`,
  `assistant_resource_binding_not_found`,
  `assistant_resource_binding_forbidden`,
  `assistant_resource_binding_expired`,
  `assistant_resource_binding_conflict`;
- `assistant_post_target_not_found`, `assistant_post_version_conflict`,
  `assistant_post_updated_at_conflict`;
- canonical existing `auth_required` and permission errors.

Missing/forbidden may share a non-enumerating 404 projection. Unexpected DB/
router/editor errors are redacted and never trigger a guessed navigation.

## Regression-Test Shape

- Route/server tests cover missing auth, `assistant:use`, `content:read`, CSRF
  invariance for GET, rate limit, malformed/unknown path, cross-actor/session
  enumeration, expired/wrong-kind/deleted Post, and no TTL mutation.
- DTO/client tests recursively inject body/digest/execution/actor/
  permissions/provider/private fields and reject them.
- descriptor/shared-owner integration tests cover custom Admin base paths, aliases, active matching,
  encoding, malformed IDs, `AdminLink`/prefetch descriptor parity, and prove no
  caller can add Post ID/query/hash/external redirect.
- Editor pure/UI tests cover same/newer/older Post tokens, clean reload, dirty
  no-overwrite, duplicate/out-of-order events, reconnect revalidation, save/
  discard races, compare, focus and accessible status.
- Companion tests prove reload/new tab reopen the same session and binding,
  follow-up requests cannot inject another Post ID, New session remains an
  explicit separate Agent action, and no duplicate transcript/browser store is
  created.
- Block and Classic shells preserve every current load/autosave/publish/cache/
  dirty behavior. Spies prove no remote body enters dirty state and no
  unconditional effect-body `setState` is introduced.
- Runtime smoke opens the opaque deep link from Agent, proves server binding,
  clean update, dirty banner/no overwrite, and expired/forbidden behavior with
  visible DOM effects and zero console errors.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/assistant/agentResourceBindingContracts.test.ts \
  tests/vitest/admin/agentPostBindingRouteDescriptor.test.ts \
  tests/vitest/admin/agentResourceBindingClient.test.ts \
  tests/vitest/ui/agent-post-editor-bridge.test.tsx
set -a && source .env && set +a
bun test tests/integration/routes/assistantResourceBindings.test.ts \
  tests/integration/server/assistantPostResourceBinding.test.ts
# Rerun TASK-554's exact shell/payload/client/route/RBAC test commands from its
# terminal receipt; no fixture or assertion re-baseline is permitted here.
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
git diff --check
wc -l core/services/assistant/resources/*.ts \
  core/server/routes/assistantResourceBindingRoutes.ts \
  core/server/validation/assistantResourceBindingSchemas.ts \
  core/admin/app/routes/agent-post-binding.admin-route-descriptor.ts \
  core/admin/services/agentResourceBindingClient.ts \
  core/admin/ui/posts/PostAgentSessionBridgePage.tsx \
  core/admin/ui/posts/editor/{agentPostEditorBridge,AgentPostUpdateBanner,PostAgentSessionCompanion}.ts* \
  core/admin/ui/posts/editor/hooks/useAgentPostEditorBridge.ts \
  core/admin/ui/posts/{PostEditorPage,editor/PostBlockEditorShell,editor/PostClassicEditorShell}.tsx \
  tests/vitest/assistant/agentResourceBindingContracts.test.ts \
  tests/vitest/admin/{agentPostBindingRouteDescriptor,agentResourceBindingClient}.test.ts \
  tests/vitest/ui/agent-post-editor-bridge.test.tsx \
  tests/integration/routes/assistantResourceBindings.test.ts \
  tests/integration/server/assistantPostResourceBinding.test.ts
```

## Documentation Updates Required

Hand the canonical deep link, same-session editor companion, server binding,
conflict/dirty-state, route, and UI receipts to TASK-414-11-L01. This leaf edits no shared docs, route mount,
task board/status, or changelog.

The implementation handoff to TASK-414-11-L01 includes an unchanged TASK-554
shell/payload test receipt proving publication-owned fields remain preserved
and present only after the bridge integration.
