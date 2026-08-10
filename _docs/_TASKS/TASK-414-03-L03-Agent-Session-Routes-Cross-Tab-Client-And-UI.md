# TASK-414-03-L03: Agent Session Routes, Cross-Tab Client, and UI
# FileName: TASK-414-03-L03-Agent-Session-Routes-Cross-Tab-Client-And-UI.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-03
**Priority:** Critical
**Category:** Agent / Internal API / Admin UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-03-L01; TASK-414-03-L02; terminal
TASK-548-03-L03; complete TASK-551 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Replace the browser-only Agent transcript with an owner-scoped,
DB-authoritative session product. This leaf owns the Agent status/session/run
facade, durable run dispatcher/worker/reconciler, browser-safe client cache,
Agent list/detail UI, the one terminal TASK-548 Agent-surface retirement, and
the shared route transport required by every later TASK-414 API.
It emits pure route, Admin, and lifecycle contribution descriptors for the
later family integration owner; it does not mount shared routes, edit global
navigation, implement attachments/research/Post actions, or create any
Designer UI/API.

- **Owning services:** L01 provider/run capability service and L02 Agent
  repositories.
- **Source-of-truth docs:** `_docs/ARCHITECTURE.md`, `_docs/CMS_API.md`,
  `_docs/AUTH_SPEC.md`, `_docs/RBAC_SPEC.md`, `_docs/SECURITY_SPEC.md`, and
  `_docs/TESTING_STRATEGY.md`.
- **Out of scope:** Guide retrieval/content/state, attachment/research routes, resource bindings,
  Post/native action execution, Agent-to-Designer handoff, Designer workspaces,
  shared permission catalogs, shared route mounting, `adminPaths`, sidebar,
  prefetch, lifecycle registration, and final runtime-smoke registration.

## Security Contract

- **Endpoint visibility:** internal Admin API only. The route factory declares
  `/assistant/agent/status`, `/assistant/agent/user-state`,
  `/assistant/agent/sessions`, and nested session/run routes; the server's
  canonical Admin router supplies `/admin/api`.
- **Auth model:** authenticated Admin session. Actor/owner/current-installation
  identity is resolved server-side and never accepted from params, query, body,
  cache, or broadcasts.
- **RBAC:** every route requires `assistant:use`; run creation additionally
  resolves every known tool/context permission through L01. This leaf does not
  declare permissions; it imports the IDs owned by TASK-414-02-L01.
- **CSRF:** required for every POST/PUT/PATCH/DELETE, including New session,
  selection, archive/reopen/delete, run creation, and cancellation.
- **Rate-limit bucket:** `admin_read` for bounded reads, `admin_write` for
  session/user-state mutations, and `assistant` for run start/cancel. Native or
  downstream tools may add stricter buckets.
- **Validation:** strict reject-unknown route schemas; bounded IDs, prompts,
  cursors, page sizes, labels, context refs, idempotency keys, and `If-Match`.
- **Anti-abuse:** no public write; nonce/HMAC/CAPTCHA are not applicable.
  Owner isolation, CSRF, rate limits, run budgets, optimistic concurrency, and
  idempotency remain mandatory.
- **Secret handling:** responses/cache/broadcasts exclude provider keys,
  capability raw payloads, hidden prompts, tool schemas, private attachment
  material, SQL/internal errors, and cross-user existence.

## Sub-Tasks

None; this is an executable leaf. Implement in this order:

1. strict Agent route DTOs, error mapper, and orchestration-only route factory;
2. browser-safe client/cache/broadcast contract;
3. Agent list/detail route contribution and durable-session UI migration;
4. focused unit, route, security, and UI tests plus the runtime-smoke handoff.

The transport foundation in step 1 lands before any Agent route. Later TASK-414
leaves consume it read-only and may add route descriptors, but may not fork body
parsing, response serialization, tail matching, security wrapping, or request
lifecycle behavior.

## Exact Exclusive Ownership

After re-reading terminal L01/L02/TASK-548 exports, this leaf is the sole writer
of the following new focused files (rename only after amending this contract if
the terminal tree proves a path collision):

- `core/services/assistant/agent/agentSessionApiContract.ts`
- `core/services/assistant/agent/agentSessionRouteErrors.ts`
- `core/services/assistant/agent/agentRunDispatcher.ts`
- `core/services/assistant/agent/agentRunWorker.ts`
- `core/services/assistant/agent/agentRunReconciler.ts`
- new `core/server/routeResponse.ts`
- new `core/server/routePreBodyPolicy.ts`
- `core/server/routes/assistantAgentSessionRoutes.ts`
- `core/server/routes/contributions/assistantAgentRouteContribution.ts`
- `core/server/routes/contributions/task414ContributionContract.ts` (the one
  exact pure contribution-type owner: `Task414RouteContributionV1`,
  `Task414AdminContributionV1`, `RuntimeLifecycleContributionV1`,
  `Task414RouteLeafIdV1`, and the one shared dependency type name
  `Task414ContributionDepsV1`)
- `core/server/lifecycle/contributions/assistantAgentRunLifecycleContribution.ts`
- `core/admin/services/assistantAgentClient.ts`
- `core/admin/services/assistantAgentCache.ts`
- `core/admin/services/assistantAgentBroadcast.ts`
- `core/admin/oauthPrelude.ts` (minimal pre-React OAuth prelude module with NO
  imports; sole owner of `captureAndScrubOAuthCallbackBeforeBootstrap()`,
  `takeScrubbedOAuthCallbackOnce()`, and the closed callback-path registry —
  the exact `/designer/imports/figma/oauth/callback` suffix is registered
  here; its module body performs the synchronous capture + scrub +
  `history.replaceState` at evaluation time, before any other app module body)
- `core/admin/app/oauthCallbackScrub.ts` (thin read-only consumer facade for
  TASK-414-10-L02: re-exports the prelude's one-use take-once slot; it adds no
  scrub logic and no registry)
- `core/admin/main.tsx` only for the single pre-React scrub wiring edit
  (importing the prelude as its FIRST import statement so its module body runs
  before `initialPath`/`createRoot`/router/request metrics; no router, request
  metrics, or bootstrap read sees `code`/`state`)
- `core/admin/app/routes/agent.admin-route-descriptor.ts`
- `core/admin/app/routes/agent.admin-route.tsx`
- `core/admin/ui/assistant/agent/AgentSessionList.tsx`
- `core/admin/ui/assistant/agent/AgentSessionPage.tsx`
- `core/admin/ui/assistant/agent/AgentComposer.tsx`
- `core/admin/ui/assistant/agent/AgentRunTimeline.tsx`
- focused tests under
  `tests/vitest/assistant/agent-sessions/`,
  new `tests/vitest/server/routeResponse.test.ts`,
  new `tests/vitest/server/routePreBodyPolicy.test.ts`,
  new `tests/vitest/server/routeWireFraming.test.ts`,
  existing `tests/vitest/server/requestBody.test.ts`,
  existing `tests/vitest/server/routeMatcher.test.ts`,
  new `tests/vitest/admin/app/oauthCallbackScrub.test.ts`,
  new `tests/integration/server/route-transport.test.ts`,
  new `tests/security/routePreBodyPolicy.security.test.ts`,
  new `tests/integration/routes/admin-html-no-store.test.ts`,
  `tests/integration/routes/assistant-agent-sessions.test.ts`,
  `tests/integration/server/assistant-agent-run-lifecycle.test.ts`, and
  `tests/security/assistantAgentSessions.security.test.ts`.

After complete TASK-551 is terminal, this leaf is the sole successor writer of
the narrowly bounded transport regions in:

- `core/server/router.ts`;
- `core/server/httpServer.ts`; and
- `core/server/requestBody.ts`.

The `core/server/httpServer.ts` edit additionally makes the Admin HTML response
(`handleAdmin`'s `index.html` projection) `Cache-Control: no-store` with the
matching frozen response-policy headers; that is the same single writer as the
transport region. Before editing, re-read the terminal TASK-551-08-L03 bytes and
its `route-response-headers.test.ts` receipt. Preserve
`RouteContext.setResponseHeader(...)`, its closed private/no-store header set,
request isolation, error propagation, composed runtime-participant registration,
cache/retention/backup lifecycle, security/request-ID/CORS headers, and all
legacy route behavior. This leaf extends that owner once; it does not replace or
reimplement the TASK-551 seam. If complete TASK-551 differs from this contract,
amend TASK-414 and rerun its fresh author/drift audit before source dispatch.

After terminal TASK-548-03-L03 has performed its required cohesive panel split,
this leaf is also the successor writer of only the Agent branches/seams in:

- `core/admin/ui/assistant/AssistantPanel.tsx`;
- `core/admin/ui/assistant/assistantConversationState.ts`;
- `core/admin/ui/assistant/assistantRuntimeStateCache.ts`;
- `core/admin/services/assistantClient.ts`; and
- `core/server/validation/assistantSchemas.ts`.

`core/server/routes/assistantRoutes.ts` is intentionally NOT owned here.
TASK-414-09-L03 is the sole family writer of that file: it applies the single
terminal edit that (1) rejects the retired legacy `mode: "llm-guide"` Agent
request server-side and (2) wires TASK-414-05-L05's frozen action registry into
plan normalization/dry-run/execute. This leaf retires the browser/validation
surfaces and emits the typed Agent route contribution; the server-side
retirement lands once with the final integration owner, so no TASK-414 leaf
edits `assistantRoutes.ts` except TASK-414-09-L03.

`core/services/assistant/assistantService.ts` remains exclusively owned by
TASK-414-03-L01. This leaf imports L01's terminal provider/runtime contracts
from focused modules and implements durable dispatch only in the new `agent/*`
files above; it must not reopen that compatibility facade.

Before editing, freeze the terminal split imports/symbols and amend this list if
TASK-548 extracted an Agent branch into a more focused named module. Changes in
these shared seams are limited to retiring browser-local Agent chat/action
state, rejecting the legacy `mode: "llm-guide"` Agent request, and rendering a
thin launcher/link into the canonical durable Agent route. Guide `docs-only`
request/response behavior, history, Help links, readiness, and generated docs
remain byte/behavior compatible. If any shared file is still over 1,000 lines,
perform a cohesive Guide/Agent/shell extraction first and keep public imports
stable.

The route contribution exports one factory and metadata; it performs no
registration at import time. The Admin descriptor exports stable route IDs and
typed params only. TASK-414-09-L03 is the sole family writer that consumes all
route/Admin contributions and updates `core/server/routes/index.ts`, global
`adminPaths`, prefetch, sidebar, shared lifecycle, rate-limit settings, and
documentation route coverage. It must not edit the three shared transport files
owned here.

The exact pure integration exports are:

```ts
export function registerAssistantAgentSessionRoutes(
  router: Router,
  deps: AssistantAgentSessionRouteDeps,
): void;
export const assistantAgentRouteContribution: Task414RouteContributionV1;
export const assistantAgentAdminRouteContribution: Task414AdminContributionV1;
export const assistantAgentRunLifecycleContribution:
  RuntimeLifecycleContributionV1;
```

The lifecycle contribution composes dispatcher, fenced worker, and reconciler
under one shared-lifecycle participant. It does not start them at import time.

### Contribution contract types (one dependency type name)

`task414ContributionContract.ts` is the one exact pure owner of the three
family contribution types and the single shared dependency type name; every
TASK-414 leaf that emits a route/Admin/lifecycle contribution imports these
exact types from it and never redefines a parallel shape:

```ts
export type Task414ContributionDepsV1 = Readonly<{
  responsePolicy: RouteResponsePolicyV1;
  rateCharges: RateChargePlanV1;
  lifecycle: RuntimeLifecycleRegistry; // terminal TASK-551 owner type
  session: Task414SessionResolverV1;
  permissions: Task414PermissionResolverV1;
}>;

export type Task414RouteLeafIdV1 =
  | "assistant-session" | "designer-workspace" | "designer-import";
// closed union of the exact TASK-414 route leaf ids; a new leaf id enters this
// vocabulary only together with its own `*RouteDeps` and a contract amendment

export type Task414RouteContributionV1 = Readonly<{
  routeContributionId: string;
  family: string;
  register(
    router: Router,
    deps: Task414ContributionDepsV1,
    leafDeps: ReadonlyMap<Task414RouteLeafIdV1, unknown>,
  ): void;
}>;

export type Task414AdminContributionV1 = Readonly<{
  adminContributionId: string;
  routeIds: readonly string[];
  descriptor: AdminRouteDescriptorV1;
}>;

export type RuntimeLifecycleContributionV1 = Readonly<{
  participantId: string;
  phase: RuntimeLifecyclePhaseV1;
  create(deps: Task414ContributionDepsV1): RuntimeLifecycleParticipantV1;
}>;
```

Leaf route factories keep their own exact `*RouteDeps` types (for example
`AssistantAgentSessionRouteDeps` extends the shared `Task414ContributionDepsV1`
base); the three contribution descriptors above are typed only with the one
shared dependency type name `Task414ContributionDepsV1`. Leaf-specific route
factories (`AssistantAgentSessionRouteDeps`, `DesignerImportRouteDepsV1`, and
every other `*RouteDeps` leaf factory) are resolved ONLY through the `leafDeps`
map passed by the composer into the contribution's `register`: the final
composer never calls a leaf factory directly and never stores a leaf-typed
factory under a shared-deps signature. Each `leafDeps` entry is keyed by the
exact closed `Task414RouteLeafIdV1` and carries that leaf's own
`*RouteDeps`-shaped value; an unknown leaf id, a missing entry, or a value that
does not match the leaf's exact dependency shape fails composition instead of
casting. The terminal TASK-551 lifecycle participant type
(`RuntimeLifecycleRegistry`, `RuntimeLifecycleParticipantV1`,
`RuntimeLifecyclePhaseV1`) is consumed read-only from TASK-551's owner; this
module only adapts it.

### Ordered atomic rate-charge plan

`RoutePreBodyPolicyV1` (in `routePreBodyPolicy.ts`) carries one ordered atomic
`rateCharges` plan. All listed charges commit together before any body byte or
I/O; an unknown bucket, an unregistered bucket, or a partial-charge failure
rejects the route at composition/startup and fails the request before body
parsing and before any service I/O:

```ts
export type RateLimitBucketIdV1 =
  | "admin_read" | "admin_write" | "assistant" | "assistant-research"
  | "assistant-external-config" | "private-input-upload"
  | "designer-generation" | "designer-preview" | "designer-promotion"
  | "designer-figma"; // closed predeclared vocabulary; no free-form buckets

export type RateChargeIdentityV1 = "actor" | "installation";

export type RateChargePlanEntryV1 = Readonly<{
  bucket: RateLimitBucketIdV1;
  identity: RateChargeIdentityV1;
  weight: number; // positive finite number, clamped to [1, 1000]
}>;

export type RateChargePlanV1 = Readonly<{
  entries: readonly RateChargePlanEntryV1[]; // ordered; charged atomically
}>;
```

Both `designer-figma` and `designer-generation` must be chargeable by a single
route (the Figma import route charges both in one ordered plan); the final
composer registers every bucket in the closed vocabulary before mounting, and a
route whose plan names an unregistered bucket fails composition instead of
degrading to a single charge.

### Serialized TASK-489/TASK-555 transport handoff

This leaf is an explicit inter-family checkpoint, not only an Agent deliverable.
After its diff and gates are landed, the TASK-414 workflow pauses before
TASK-414-04. TASK-489 consumes the exact terminal `Router.register`,
`RoutePreBodyPolicyV1`, `RouteResponseV1`, prefixless route convention,
require-all RBAC, response-header validators and registration tests read-only;
TASK-555 then consumes the same receipt through terminal TASK-489. Neither task
may edit `router.ts`, `httpServer.ts`, `requestBody.ts`, `routeResponse.ts` or
`routePreBodyPolicy.ts`, copy the middleware order, use a draft field name, or
add a legacy `router.get/post` path for a new route.

Each external family must record the exact landed export names and source
digests at implementation start, use only descriptor factories plus its native
route composer, and pass the terminal transport's byte-zero-before-auth/RBAC/
CSRF/admission tests. TASK-489 must become terminal before TASK-555. Both must
also land their own TASK-414-02-L01 capability contribution and regenerate any
changed TASK-548 Guide source through the terminal TASK-548 write/check
transaction. Only after both terminal receipts are revalidated may TASK-414-04
dispatch resume. TASK-414-02-L02 later consumes those descriptors and generated
docs; it does not reconstruct them.

This leaf must not edit:

- TASK-414-02-L01 permission catalogs;
- L01 capability/tool owners or L02 DB/schema/migration/repository owners;
- `core/server/routes/assistantRoutes.ts` (single terminal edit belongs to
  TASK-414-09-L03), `core/server/routes/index.ts`, global Admin
  path/navigation/prefetch files,
  `AdminApp.tsx`, TASK-548 Guide/Help files other than the exact successor seams
  above, shared lifecycle/rate-limit registration files;
- TASK-414-04 attachment/research files, TASK-414-05 action/binding files, or
  any TASK-414-07..10 Designer/Figma file;
- generated capability/docs artifacts, task board/status, or changelog.

## Pre-React OAuth Callback Scrubbing (generic terminal bootstrap seam)

Before any TASK-414-10 OAuth route can land, this leaf owns one generic
pre-React callback scrub seam with a single writer. TASK-414-10-L02 consumes it
read-only; it never re-implements capture, scrubbing, or Admin HTML policy.

- `core/admin/oauthPrelude.ts` is the minimal pre-React OAuth prelude module.
  It has NO imports, so its module body is the first app module body to run
  when `core/admin/main.tsx` imports it as its first import statement. It owns
  the closed registry of exact OAuth callback paths. The exact canonical
  relative Admin suffix is `/designer/imports/figma/oauth/callback` (resolved
  under the configured Admin base path); TASK-414-10-L02 registers exactly that
  suffix here and no other path exists in v1. The module exports:

```ts
// The prelude module body calls this synchronously at evaluation time, before
// any other app module body runs (main.tsx's first import statement is the
// contract; static module bodies imported after the prelude may run). It
// captures `code`/`state` only when location.pathname matches a registered
// callback path exactly, then synchronously history.replaceState()s the same
// URL minus the query pair before returning. The raw pair never reaches React
// Router state, history entries, debug payloads, screenshots, or evidence.
// The function is exported so tests can invoke the same deterministic routine.
export function captureAndScrubOAuthCallbackBeforeBootstrap(): void;

// One-use in-memory slot: the captured pair is returned at most once and then
// erased from module memory. Consumed by TASK-414-10-L02's slot for the single
// CSRF-protected exchange POST. Returns null when nothing was captured or the
// slot was already taken.
export function takeScrubbedOAuthCallbackOnce(): Readonly<{
  code: string;
  state: string;
} | null>;
```

- `core/admin/main.tsx` imports the prelude as its FIRST import statement
  (for example `import "./oauthPrelude"`); the prelude module body then runs
  before `initialPath` is read, before `createRoot`, the router, request
  metrics, or any other bootstrap read, and before any other static module
  body. Prelude import order IS the contract: static ESM imports execute their
  module bodies before the importing module's first statement, so no
  "first statement" promise can precede them; after the prelude, the normal
  static bootstrap continues unchanged. `document.referrer` is neutralized by
  the Admin HTML response's referrer policy plus the replaceState-before-mount
  ordering; no subsequent navigation may carry the query pair.
- The server side of the seam is the single `core/server/httpServer.ts`
  `handleAdmin` edit owned here: the Admin HTML response is
  `Cache-Control: no-store` with the frozen response-policy headers, so the
  callback URL is never a shared cache candidate.
- The captured pair is handed to the caller exactly once through
  `takeScrubbedOAuthCallbackOnce()`; after the single CSRF-protected exchange
  POST the module memory is empty. No storage, log, cache, analytics, audit,
  screenshot, or evidence write receives the pair.
- Tests: `tests/vitest/admin/app/oauthCallbackScrub.test.ts` (exact-path-only
  capture for `/designer/imports/figma/oauth/callback`, replaceState before
  mount, no router-state leakage, once-only take, null after take) plus an
  evaluation-order test in that suite (or a named sibling) that imports the
  prelude alongside an app module and asserts the prelude module body executes
  before any app-module side effect; and
  `tests/integration/routes/admin-html-no-store.test.ts` (Admin HTML carries
  `Cache-Control: no-store` plus the frozen header set; a callback-path request
  leaves zero cacheable bytes and zero secret residue in the HTML).

## Shared Route Transport and Pre-Body Contract

The terminal transport must match method/path and construct a route descriptor
before reading any body byte. `Router` gains an explicit descriptor registration
API while its current convenience methods and plain-object handler results stay
backward compatible. The closed method set is `GET|HEAD|POST|PUT|PATCH|DELETE`.
The only tail syntax is a declared terminal `/*tail`; it is bounded, decoded
segment-by-segment, and rejects malformed escapes, NUL, encoded separators,
dot-segments, path escape, excessive segments/bytes, and non-terminal splats.
There is no catch-all fallback. An explicit `HEAD` route executes the same
authorized bounded read contract as its paired `GET`, but the final transport
always strips the body.

Every new TASK-414 route registers a strict `RoutePreBodyPolicyV1` containing:

- body mode `none | json | urlencoded | buffered-multipart | stream`, exact
  allowed content type(s), declared and wire-observed byte ceiling, and safe
  parse error code;
- authentication mode, finite permission IDs, CSRF policy, and the exact
  ordered atomic `rateCharges` plan (closed predeclared bucket vocabulary,
  actor/installation identities and weights; all charges commit together
  before any body byte or I/O); and
- an optional route-owned `authorizeBeforeBody(ctxWithoutBody)` admission hook
  for path-derived ownership/quota checks. It cannot access a body, stream, or
  parsed value and returns only an opaque request-local admission receipt.

The server order is invariant: host/IP/global request context -> exact route
match -> wire framing validation -> wire `Content-Length` syntax/cap ->
cookies/session -> static RBAC ->
rate limit -> CSRF for internal writes -> optional path/owner/quota admission ->
exact content-type/body-mode selection -> bounded parse or one-shot raw stream
handoff -> route handlers. Missing/chunked length is allowed only for a stream
policy with a hard byte counter and cancellation. Rejection, disconnect, parse
failure, and handler failure close/cancel the stream and invoke the admission
receipt's idempotent cleanup. No Task-414 route calls `Request.formData()` or
reads a body before these controls. Existing routes remain on their legacy
adapter until separately migrated; no Task-414 security claim may rely on that
adapter.

### Wire framing: transport-level pre-dispatch rejection versus `request_framing_invalid`

Wire framing is governed by two tiers with distinct observable guarantees.

**Tier 1 — transport-level pre-dispatch rejection (Bun HTTP parser).** The
Bun 1.3.14 HTTP parser rejects duplicate/conflicting `Content-Length` and any
`Content-Length` + `Transfer-Encoding` combination with its own HTTP `400`
BEFORE the app callback runs. Such requests never reach the route matcher, the
app transport, or any app code: the app transport cannot attach the frozen
response-policy headers and cannot write an app access-log record for them.
No TASK-414, TASK-489, or TASK-555 promise treats those bytes as app-visible.

**Tier 2 — app-visible framing validation (`request_framing_invalid`).**
Validation of the malformed-but-Bun-permitted framing the parser forwards runs
in the app transport immediately after exact route match and before
cookies/session, RBAC, rate limit, CSRF, admission, content-type selection, or
any body byte. It is one stable, global, machine-readable error:
`request_framing_invalid` mapping to HTTP `400` with the fixed no-store policy
headers. It is emitted exactly when:

- `Content-Length` is malformed (non-numeric, negative, or beyond a bounded
  decimal length) and the parser forwards the request to the app callback;
- `Transfer-Encoding` appears on a policy whose body mode is not `stream`; or
- a length is missing (or chunked framing is used) for a policy whose body mode
  requires an exact declared length (`none | json | urlencoded |
  buffered-multipart`).

Duplicate/conflicting `Content-Length` and CL+`Transfer-Encoding` are Tier 1
parser rejections and are NEVER app-visible `request_framing_invalid`.

`payload_too_large` (`413`) is reserved exclusively for actual cap breaches:
the validated wire `Content-Length` exceeds the declared ceiling, the bounded
parser observes more bytes than the policy allows, or the one-shot stream hard
byte counter trips. It is never emitted for malformed or conflicting framing,
and neither code reports the observed size, the ceiling, body bytes, or driver
text. No route defines a local overload of either code; downstream TASK-414
leaves, TASK-489, and TASK-555 consume both read-only.

Raw-wire tests (`tests/vitest/server/routeWireFraming.test.ts` plus the
transport integration suite) send literal HTTP byte fixtures in two groups.
The transport-level group (duplicate/conflicting `Content-Length`,
CL+`Transfer-Encoding`) asserts the Bun-native `400` with NO promise of frozen
response-policy headers and NO app access-log record, because the app callback
never runs. The app-visible group (malformed `Content-Length` forwarded by the
parser, forbidden missing/chunked framing) asserts each framing failure returns
exactly `request_framing_invalid`/`400` with zero cookies, RBAC, rate, CSRF, or
body work; the exact cap boundary is accepted and one-over returns
`payload_too_large`/`413`; and every app-visible outcome carries the frozen
response-policy headers and exactly one sanitized access-log record.

`RouteResponseV1` is a strict discriminated union of JSON, raw stream/bytes, and
empty responses. It carries an explicit validated status plus only headers
allowed by the matched route's frozen response policy. The global transport
owns and cannot be overridden for security headers, request ID, CORS, access
logging, cookie collection, and bodyless `HEAD`. Content type, no-store, ETag,
retry, disposition, and preview-hardening headers require named validators; CRLF,
duplicates with different values, arbitrary headers, invalid status, oversized
raw output, and conflicting `Content-Length` fail closed. A legacy handler
returning a plain value still becomes JSON `200`; terminal TASK-551's
`setResponseHeader(...)` bag is merged through the same validator. Thus Agent
can return `202` and ETag/no-store metadata, attachment routes can return
`202/204`, and Designer can emit authenticated raw preview bytes without a
second server or serialization path.

The transport always maps known route/domain errors through the existing safe
error boundary, applies global headers, and records exactly one sanitized access
log for every app-visible outcome: pre-body rejection after dispatch, parse
failure, handler failure, success, and HEAD. Tier 1 parser-level rejections
never reach the app transport and therefore produce no app access-log record.
It never logs query/body/tail contents, upload names, preview credentials,
provider payloads, or raw response bytes.

### Fixed response-policy headers and wire-cap rejection

Every outcome that occurs after exact route match is serialized by the same
transport path and carries the matched route's frozen response-policy headers:
success responses, known/mapped route/domain errors through the safe error
boundary, and every pre-body outcome (wire framing rejection, wire
`Content-Length` syntax/cap
rejection, cookie/session failure, static RBAC denial, rate-limit denial, CSRF
failure, path/owner/quota admission rejection, content-type mismatch, and parse
failure). There is no legacy branch after route match that can emit a body,
redirect, or error page without the policy headers and without the single
sanitized access-log record.

Response headers are split into two exact sets. The **frozen set** is owned by
the global transport and is always present, never overridable, and identical on
every outcome after route match: security headers, request ID, CORS, cookie
collection, access logging, and bodyless `HEAD` behavior. The
**handler-allowed set** is chosen by the matched route's frozen response policy
through named validators only: content type, no-store, ETag, retry, disposition,
and preview-hardening headers. A route can neither add a header outside the
handler-allowed set nor shadow/weaken a frozen header; CRLF, duplicates with
different values, arbitrary headers, invalid status, oversized raw output, and
conflicting `Content-Length` fail closed. Raw-wire tests assert the complete
frozen set on success, mapped error, and every pre-body outcome.

Wire-cap rejection is one stable, global, machine-readable error:
`payload_too_large`. It is emitted when the wire `Content-Length` exceeds the
declared ceiling, when the bounded parser observes more bytes than the policy
allows, or when the one-shot stream hard byte counter trips. It maps to HTTP
`413` with a fixed no-store policy header and never includes the observed size,
the ceiling, body bytes, or driver text. No route defines a local overload
code, message, or header set; downstream TASK-414 leaves, TASK-489, and
TASK-555 consume `payload_too_large` read-only and must not reinvent a
wire-cap code, header set, or merge order.

Header validation/merge order is invariant and single-owner:

1. the matched route's frozen response policy selects the validated status and
   the named validators for its allowed headers (content type, no-store, ETag,
   retry, disposition, preview-hardening);
2. route headers produced by `RouteResponseV1` or the terminal TASK-551
   `setResponseHeader(...)` bag pass the same named validators; CRLF,
   duplicates with different values, arbitrary headers, invalid status,
   oversized raw output, and conflicting `Content-Length` fail closed;
3. the global transport then applies the non-overridable security headers,
   request ID, CORS, cookie collection, access logging, and bodyless `HEAD`
   behavior last, so a route can never weaken or shadow them;
4. the single sanitized access log records the final status exactly once.

Focused tests pin the guarantee for all three outcome classes: `routeResponse`
and `routePreBodyPolicy` unit cases plus
`tests/integration/server/route-transport.test.ts` prove every error and
pre-body outcome after route match carries the exact policy headers; a body
over the declared ceiling yields exactly `payload_too_large` / `413` with the
fixed no-store header; merge-order violations (route header shadowing a global
header, duplicate/CRLF headers, conflicting length) fail closed; and `HEAD`/
empty responses keep the same guarantees.

The existing TASK-548 local Agent transcript is discarded locally only after
the durable Agent status endpoint is ready. It is never uploaded, converted, or
merged. The old guided site-builder intake and active Agent UI access to
`site-kit.*` disappear at the same cutover. Historical Solution Kits/site-kit
code may remain only outside the Agent route, provider context, proposal
projection, and UI; TASK-414-05-L03 enforces that server-side boundary. Do not
delete Guide history or merge Guide and Agent state.

## Internal API Contract

All list reads are keyset-paginated through L02's signed/scoped cursor owner,
default 25 and hard maximum 100. All point reads resolve
`(authenticatedOwnerId, sessionId)` and return the same non-enumerating `404`
for absent/cross-owner rows. Safe GET responses are `private, no-store` and
carry an ETag in both the header and typed DTO where offline comparison needs it.

| Method and path | Request contract | Result/effect |
| --- | --- | --- |
| `GET /assistant/agent/status` | no body/query | browser-safe exact Agent availability from L01; never settings/credentials |
| `GET /assistant/agent/user-state` | no body/query | selected session ID plus state version/ETag |
| `PUT /assistant/agent/user-state/selected-session` | strict `{ sessionId, idempotencyKey }` + `If-Match` | owner-scoped atomic selection; session must be selectable |
| `GET /assistant/agent/sessions` | bounded cursor, limit, exact status filter | owner-scoped summaries in stable `(updatedAt DESC, id DESC)` order |
| `POST /assistant/agent/sessions` | strict `{ label?, idempotencyKey }` + user-state `If-Match` | create a new independent session and atomically select it |
| `GET /assistant/agent/sessions/:sessionId` | bounded message/run page cursors | owner-scoped detail and first bounded pages |
| `PATCH /assistant/agent/sessions/:sessionId` | closed `{ op: rename \| archive \| reopen, ... }` + session `If-Match` | CAS metadata/lifecycle transition; no ID reuse |
| `DELETE /assistant/agent/sessions/:sessionId` | `If-Match` + idempotency key | transition to L02 deletion lifecycle; never delete native resources/audit receipts |
| `GET /assistant/agent/sessions/:sessionId/messages` | cursor + limit | ordered bounded message projection; no raw provider payload |
| `GET /assistant/agent/sessions/:sessionId/runs` | cursor + limit | bounded run summaries |
| `GET /assistant/agent/sessions/:sessionId/runs/:runId` | optional bounded tool-call cursor | owner/session-scoped safe run, budget, citation IDs, and tool summaries |
| `POST /assistant/agent/sessions/:sessionId/runs` | strict body below + session `If-Match` | atomically persist user message + queued run intent, schedule only after commit, return `202` safe run DTO |
| `POST /assistant/agent/sessions/:sessionId/runs/:runId/cancel` | `If-Match` + idempotency key | durably request cancellation of a queued/running run; never undo a committed CMS effect |

`POST /sessions` is the only New operation. Clear/reset cannot archive/delete
and then reuse a session ID. Selecting an existing session never copies or
merges its transcript.

The run body contains only:

```ts
type CreateAgentRunBodyV1 = {
  prompt: string;
  operationId: string;
  contextRefs: AgentContextRefV1[];
  attachmentProjectionIds: string[];
  idempotencyKey: string;
};

type CreateAgentRunCommandV1 = CreateAgentRunBodyV1 & {
  sessionId: string; // path-derived, never body-derived
  actorId: string; // auth-context-derived
};
```

`contextRefs` and attachment IDs are symbolic, bounded references. Their later
owners resolve and authorize them. The route never accepts provider ID, model
ID, credentials, arbitrary tool definitions, permissions, owner ID, or a native
table/path. L01 resolves the current provider/model server-side immediately
before execution and L02 snapshots L01's complete strict
`ProviderExecutionBindingV1` on the run. A missing/stale exact profile fails before provider
I/O and cannot be replaced by Guide or deterministic planning.

The queued snapshot is an immutable execution intent, not advisory history. At
fenced worker claim, resolve the current profile and require byte-equality of
provider ID, model ID, adapter version, non-secret config generation, capability
evidence digest, and effective input-policy digest with that queued snapshot.
Any settings/model/adapter/evidence change settles
`assistant_run_profile_changed` with zero provider, research, attachment, tool,
or native CMS I/O. The worker never silently CAS-rebinds an existing run; the
user creates/retries a new run under the new profile.

## Client, Cache, and Cross-Tab Contract

- Cache keys include auth identity/epoch and stable session/run IDs. Payloads
  remain bounded in memory; transcript pages are never persisted to
  `localStorage`, `sessionStorage`, IndexedDB, service-worker cache, URL query,
  or browser logs.
- `BroadcastChannel` and `cacheBus` publish only
  `{ event, actorScopeHash, sessionId?, runId?, version?, etag? }`. No prompt,
  response, title from private content, citation, tool payload, or attachment ID
  is broadcast.
- New/select/archive/reopen/delete/run completion invalidates exact cache
  families. The initiating tab applies the server response and broadcasts an
  invalidation; other tabs refetch instead of trusting broadcast state.
- Focus, online/reconnect, auth-epoch change, and a missed-version observation
  revalidate user state and the route-pinned or default session. A stale background response
  cannot overwrite a dirty composer or a newer ETag.
- A canonical route token contains only stable route ID and encoded
  `sessionId`; TASK-414-09-L03 resolves it through shared `adminPaths`. Query
  text/transcripts/provider state never enter the URL.
- On first durable Agent load, the old TASK-548 Agent-only browser snapshot is
  discarded after server readiness is proven. It is never uploaded or merged.
  Guide-only state remains untouched.

## Agent UI Contract

- Agent has a dedicated list/detail page, not a mode in Guide. It shows exact
  availability and a focused configuration link only when the current user may
  access settings; it never reveals whether a hidden provider exists.
- **New session** always creates and selects a new server session. Session
  selection, rename, archive, and reopen have explicit states and conflict
  recovery.
- The selected session in user state is only the default used by an unpinned
  Agent launcher. An explicit `/agent/sessions/:sessionId` route pins that
  browser tab after server authorization and never mutates the global default.
  New creates/selects a new default for future launchers, while already pinned
  tabs and Post companion panels stay on their own sessions. Explicit selection
  from the session list may update the default. Cross-tab invalidation refetches
  data but never forces navigation; an inaccessible ID renders the same
  not-found state.
- Composer submission is disabled while Agent is unavailable or while the
  current run cannot accept another turn. Pending text stays component memory
  only. Retrying uses the same idempotency key and does not duplicate a user
  message/run.
- Timeline renders only safe normalized messages/run/tool summaries. Later
  research, attachment, Post, and Designer handoff contributions extend typed
  slots; this leaf does not implement placeholders that claim those features.
- Loading/error/empty/conflict/cancelled/archived states are keyboard and
  screen-reader usable in light/dark and narrow/wide layouts. Background
  revalidation cannot clear typed text or move focus unexpectedly.

## Implementation Pseudocode

```ts
export function registerAssistantAgentSessionRoutes(
  router: Router,
  deps: AssistantAgentSessionRouteDeps,
): void {
  router.register({
    method: "POST",
    path: "/assistant/agent/sessions/:sessionId/runs",
    preBody: {
      auth: "admin-session",
      permissions: [ASSISTANT_USE_PERMISSION_ID],
      csrf: "required",
      rateCharges: {
        entries: [{ bucket: "assistant", identity: "actor", weight: 1 }],
      },
      body: {
        mode: "json",
        contentTypes: ["application/json"],
        maxBytes: AGENT_RUN_BODY_MAX_BYTES,
      },
      authorizeBeforeBody: deps.requireOwnedRunnableSessionFromPath,
    },
    response: agentRunResponsePolicyV1,
    handlers: [ctx => createAgentRunRoute(ctx, deps)],
  });
}

export async function createAgentRunRoute(
  ctx: AuthorizedParsedRouteContext<CreateAgentRunBodyV1>,
  deps: AssistantAgentSessionRouteDeps,
): Promise<RouteResponseV1> {
  const actor = ctx.requireResolvedActor();
  const sessionId = parseId(ctx.params.sessionId);
  const body = createAgentRunBodyV1Schema.parse(ctx.body);
  const expectedVersion = requireIfMatch(ctx);
  const resolved = await deps.agent.resolveKnownOperationAndContexts({
    actor,
    sessionId,
    operationId: body.operationId,
    contextRefs: body.contextRefs,
    attachmentProjectionIds: body.attachmentProjectionIds,
  });
  await deps.permissions.requireCurrentNativePermissionUnion(
    actor.id,
    resolved.requiredPermissions,
  );
  const admission = await deps.agent.requireAvailableForResolvedOperation(
    resolved.operation,
  );

  const intent = await deps.sessions.createRunIntentTx({
    actorId: actor.id,
    sessionId,
    expectedVersion,
    body: bindResolvedRunInputs(body, resolved),
    providerExecutionBinding: admission.profile.executionBinding,
    authorizationDigest: resolved.authorizationDigest,
  });
  deps.dispatcher.dispatchAfterCommit(intent.runId);
  return routeJson(intent.safeRun, {
    status: 202,
    headers: { "Cache-Control": "private, no-store, max-age=0", ETag: intent.etag },
  });
}

export async function processClaimedAgentRun(
  claim: FencedAgentRunClaim,
  deps: AgentRunWorkerDeps,
): Promise<void> {
  try {
    const authorization = await deps.agent.requireCurrentProfilePermissionsAndInputs({
      ownerId: claim.ownerId,
      sessionId: claim.sessionId,
      operationId: claim.operationId,
      inputBindingIds: claim.inputBindingIds,
    });
    assertExactQueuedProviderBinding(
      claim.providerExecutionBinding,
      authorization.profile.executionBinding,
    ); // mismatch occurs before executeCheckpointed or any external/native I/O
    const result = await deps.agent.executeCheckpointed(claim, authorization);
    await deps.runs.completeIfCurrentFence(claim, result);
  } catch (error) {
    await deps.runs.settleIfCurrentFence(claim, classifyRunFailure(error));
  }
}

export function publishAgentCacheInvalidation(
  event: AgentSafeInvalidationV1,
  deps: AgentClientDeps,
): void {
  deps.cache.invalidate(event);
  deps.broadcast.publish(event);
}
```

**Data flow:** exact route/wire cap -> authenticate/RBAC/rate/CSRF -> path-derived
owner/session admission -> exact content type + bounded strict body -> ETag ->
resolve one registered operation plus every symbolic context/attachment ref ->
require the current exact native permission union -> provider admission check ->
transactionally persist the resolved queued intent and authorization digest ->
`202` -> post-commit dispatch -> fenced lease claim -> fresh exact provider/
model/tool/RBAC resolution -> checkpointed bounded I/O outside DB transactions ->
CAS completion/failure/cancellation or reconciliation-required -> safe
invalidation -> refetch in other tabs.

The lifecycle contribution registers one awaited bounded dispatcher/worker/
reconciler participant with the terminal shared lifecycle; it owns no signal,
timer, or process shutdown hook. Expired claims are reclaimed by higher fence.
Every tool/native effect carries per-call idempotency and a durable checkpoint.
If a crash leaves outcome ambiguity, the run waits for explicit reconciliation
and cannot automatically repeat the effect.

**Error handling:** map known domain errors centrally. `404` is
non-enumerating, `409` carries only a safe current ETag/version hint, `412`
handles missing/mismatched preconditions, `422` handles strict validation or
unsupported exact capability, `429` handles bounded rate/budget exhaustion, and
`503` handles unavailable provider/model. Never expose driver/provider text.

**Regression-test shape:** transport tests pin strict status/header/raw/empty/HEAD
serialization, declared safe tails, legacy JSON/TASK-551 compatibility, global
security/access-log wrapping, and pre-body ordering with zero consumed bytes;
unit tests pin strict DTOs/error mapping/cache keys; route tests cover
auth/RBAC/CSRF/rate/owner/ETag/idempotency/provider fail-closed, unknown
operation/context/attachment refs, and native permission revocation before
`createRunIntentTx` with zero run/message/dispatch effect;
lifecycle/route tests include missing/invalid CSRF on selected-session `PUT`
with zero user-state/session effect;
lifecycle tests cover process loss before dispatch, expired lease reclaim,
heartbeat/fence loss, cancellation, fresh provider/RBAC revocation, tool-call
checkpoint replay, ambiguous-effect reconciliation, and no duplicate effect;
profile/RBAC/input resolution throwing after claim is caught inside the same
settlement boundary and settles only the current fence with zero external/native
I/O;
enqueue-versus-provider/settings/model/adapter/evidence changes prove exact
queued/current binding mismatch settles with zero I/O and a new run succeeds;
UI tests cover New/select/reload, two different route-pinned sessions in two
tabs, dirty composer/archive/conflict, old Agent/site-builder retirement, and
Guide isolation.

## Machine-Readable Errors

- `assistant_agent_unavailable`
- `assistant_session_not_found`
- `assistant_session_conflict`
- `assistant_session_archived`
- `assistant_session_delete_pending`
- `assistant_run_not_found`
- `assistant_run_conflict`
- `assistant_run_not_cancellable`
- `assistant_run_reconciliation_required`
- `assistant_run_budget_exceeded`
- `assistant_run_profile_changed`
- `assistant_route_input_invalid`
- `assistant_idempotency_conflict`
- `request_framing_invalid` (app-visible transport wire-framing rejection;
  malformed `Content-Length` forwarded by the parser and forbidden
  missing/chunked framing fail before auth/body work — 400; duplicate/
  conflicting `Content-Length` and CL+Transfer-Encoding are rejected by the Bun
  parser before the app callback and are NOT this code)
- `payload_too_large` (global transport wire-cap; emitted only for actual cap
  breaches — 413; every TASK-414 route and the
  TASK-489/TASK-555 consumers share this one code — no route-local overload)

L01 provider/tool errors pass only through the centralized safe mapper.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/assistant/agent-sessions \
  tests/vitest/server/routeResponse.test.ts \
  tests/vitest/server/routePreBodyPolicy.test.ts \
  tests/vitest/server/routeWireFraming.test.ts \
  tests/vitest/server/requestBody.test.ts \
  tests/vitest/server/routeMatcher.test.ts \
  tests/vitest/admin/app/oauthCallbackScrub.test.ts
set -a && source .env && set +a && bun test \
  tests/integration/server/route-transport.test.ts \
  tests/integration/routes/admin-html-no-store.test.ts \
  tests/integration/routes/assistant-agent-sessions.test.ts \
  tests/integration/server/assistant-agent-run-lifecycle.test.ts \
  tests/security/routePreBodyPolicy.security.test.ts \
  tests/security/assistantAgentSessions.security.test.ts
bun run check:admin-boundary
bun run scan:security:strict
git diff --check
wc -l core/server/routeResponse.ts core/server/routePreBodyPolicy.ts \
  core/server/routes/assistantAgentSessionRoutes.ts \
  core/server/routes/contributions/{assistantAgentRouteContribution,task414ContributionContract}.ts \
  core/server/lifecycle/contributions/assistantAgentRunLifecycleContribution.ts \
  core/admin/oauthPrelude.ts core/admin/app/oauthCallbackScrub.ts \
  core/admin/main.tsx \
  core/admin/services/assistantAgent{Client,Cache,Broadcast}.ts \
  core/admin/app/routes/agent.admin-route{,-descriptor}.tsx \
  core/admin/ui/assistant/agent/*.tsx \
  tests/vitest/assistant/agent-sessions/*.ts \
  tests/vitest/server/route{Response,PreBodyPolicy,WireFraming}.test.ts \
  tests/vitest/server/{requestBody,routeMatcher}.test.ts \
  tests/vitest/admin/app/oauthCallbackScrub.test.ts \
  tests/integration/server/route-transport.test.ts \
  tests/integration/routes/admin-html-no-store.test.ts \
  tests/integration/routes/assistant-agent-sessions.test.ts \
  tests/integration/server/assistant-agent-run-lifecycle.test.ts \
  tests/security/routePreBodyPolicy.security.test.ts \
  tests/security/assistantAgentSessions.security.test.ts
```

- terminal TASK-551 route-response-header and HTTP lifecycle suites unchanged
- exact L01 availability/tool tests and L02 repository/concurrency tests
- touched production/test physical-line count; every file must be <=1,000

Runtime handoff to TASK-414-11-L01 must provide, without creating a second
smoke lifecycle: Agent unavailable with Guide unchanged; New session isolation;
same session across two tabs/reload; different pinned sessions staying isolated
across tabs; stale ETag conflict preserving composer; process-recovered queued
run; and cancel/retry idempotency. Shared registration and screenshots remain
the closure leaf's ownership.

## Documentation Updates Required

This leaf supplies implementation facts to TASK-414-11-L01 for
`docs/develop/assistant.md`, `_docs/CMS_API.md`, `_docs/DATA_MODEL.md`,
`_docs/AUTH_SPEC.md`, `_docs/RBAC_SPEC.md`, and `_docs/SECURITY_SPEC.md`. It does
not edit shared product docs, generated docs, task statuses, board rows, or
changelog 1266.

## Done Criteria

- Agent sessions/runs are DB-authoritative, bounded, owner-isolated, and
  optimistic-concurrency safe.
- Explicit New creates isolated context; default selection and route-pinned
  deep links let tabs intentionally share or isolate sessions without browser
  transcript persistence or forced cross-tab navigation.
- The old browser-local Agent/provider chat and guided site-builder flow are no
  longer active surfaces; Guide remains unchanged and full-site intent is
  available only through the durable Agent-to-Designer handoff.
- Agent fails closed without an exact usable provider/model profile and never
  relabels Guide/local fallback as Agent.
- This leaf emits pure Agent contribution descriptors; TASK-414-09-L03 remains
  the only shared mount/navigation/integration writer.
- Focused gates pass and all touched production/test files remain <=1,000 lines.
