# TASK-414-10-L02: Figma IR to Designer Brief, Package, Ready Revision, and Tests
# FileName: TASK-414-10-L02-Figma-IR-To-Designer-Brief-Package-Preview-And-Tests.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-10
**Priority:** High
**Category:** Designer / Import Mapping / Compiler / Preview / Internal API
**Estimated Effort:** Large
**Dependencies:** TASK-414-10-L01; TASK-414-02-L01;
TASK-414-07-L01 through L03; TASK-414-08-L01 through L03;
TASK-414-09-L01, TASK-414-09-L02, TASK-414-09-L04; and TASK-547 terminal
**Status:** ⏳ To Do
**Target:** Later delivery phase, disabled by default, but required before
TASK-414 family closure
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Convert L01's strict provider-neutral `DesignIRV1` into the existing strict
Designer generation inputs, invoke the terminal `DesignerSiteBundleV1`
compiler/staging/revision services without forking them, expose a pure
internal Figma route/import contribution for the final shared integrator, and
prove the complete staged-only path.

This leaf is an adapter and orchestration boundary. It may construct a strict
`DesignerBriefV1` and a strict untrusted Designer draft envelope from Design IR,
but it may not construct `FullSitePackageV1`, `DesignerSiteBundleV1`, sidecar,
native CMS document, validation-receipt, staged-graph, preview, HTML, CSS, or
JavaScript bytes itself. These exact terminal owners remain authoritative:

- `normalizeDesignerBriefForWrite()` and the strict untrusted draft parser from
  TASK-414-08-L01;
- `compileAndMaterializeDesignerRevision()` from TASK-414-08-L02; and
- the existing preview-create and immediate-bind client/route flow from
  TASK-414-08-L03, invoked by the UI only after import returns a ready revision.

The resulting Figma import is behaviorally one Designer generation source. Its
service creates one immutable private Designer revision and returns its safe
ready binding. The UI then explicitly calls the existing preview-create route
and immediately consumes its one-time bind through TASK-414-08-L03. The import
service never creates or binds a preview, canonical CMS row, or alternate
promotion path.


## Sub-Tasks

None; this is an executable leaf.
## Mandatory Terminal Reconcile

Immediately before implementation, re-read the final TASK-414-07/08 exports,
the landed TASK-414-09-L01/L02/L04 contracts, and terminal TASK-547 exports;
update this contract if any file/helper hint differs. This leaf exposes one
strict prefixless deps-erased route-mount builder
(`buildFigmaDesignerImportRouteMount`) and one browser-safe source
descriptor. It does not mount either. TASK-414-09-L03 lands after TASK-414-10
and is the sole shared integration writer: it statically imports this exact
builder/descriptor, mounts them through `Task414RuntimeFacade`, and owns the
predeclared `designer-figma` rate-policy integration. The generic closed import
registry, exact disabled-by-default config, and neutral Admin slot already belong
to terminal TASK-414-07-L03 and are consumed without modification. Before
dispatch, prove that generic slot takes a successful ready-revision binding,
calls TASK-414-08-L03's existing preview-create endpoint once, immediately binds
the one-time secret without persistence, and leaves the ready revision
reviewable when preview creation/bind fails. If that neutral seam is absent,
repair its owner contract before L02 rather than adding Figma-owned preview code.

Do not work around that land order with dynamic imports, directory scanning,
side-effect registration, edits to `integrationsRoutes.ts`, a second Admin
route tree, a second Designer shell, weaker existing buckets, or caller-supplied
module paths. A missing terminal seam is contract drift to repair in
TASK-414-09-L03 before implementation dispatch.

## Exact Exclusive Ownership

After that reconcile, only this leaf may add or modify the following files:

| Area | Exact file |
| --- | --- |
| IR-to-Designer mapping | `core/services/designer/imports/designIrToDesignerDraft.ts` |
| Browser-safe source descriptor | `core/services/designer/imports/figma/figmaDesignerSourceDescriptor.ts` |
| Import/idempotency orchestration | `core/services/designer/imports/figma/figmaDesignerImportService.ts` |
| Strict route schemas | `core/server/validation/designerFigmaSchemas.ts` |
| Internal route factory | `core/server/routes/designerFigmaRoutes.ts` — module-private; never exported; invoked only inside `buildFigmaDesignerImportRouteMount` with internally projected deps |
| Central safe error mapper | `core/server/routes/designerFigmaErrorMapper.ts` |
| Figma Admin client (source-slot integration) | `core/admin/services/designerFigmaClient.ts` — maps the exact `FigmaOAuth*`/`FigmaSourceGrant*`/`FigmaImport*` DTOs, calls TASK-414-08-L03's separate preview-create/bind flow only after import returns a ready revision, and never claims import created a preview |
| Figma slot controls contribution | `core/admin/ui/designer/imports/FigmaImportSlotControls.tsx` — the source-owned `DesignerImportSlotControlsV1` render contribution; all OAuth/source-grant/import controls and DTO mapping live here; consumes `takeScrubbedOAuthCallbackOnce()` from TASK-414-03-L03's scrub seam read-only |
| Pure mapping tests | `tests/vitest/designer/designIrToDesignerDraft.test.ts` |
| Service/idempotency tests | `tests/vitest/designer/figmaDesignerImportService.test.ts` |
| Schema/route tests | `tests/integration/routes/designer-figma.test.ts` |
| DB/staging integration | `tests/integration/designer/figma-designer-import.test.ts` |
| Generic Admin-slot tests | `tests/vitest/admin/designer/figma-import-flow.test.tsx` |
| Route/security tests | `tests/security/designerFigmaRoutes.security.test.ts` |

The terminal shared route/navigation mount, `integrationsRoutes.ts`, rate
policy, and Admin composition files remain TASK-414-09-L03 owned. This leaf
supplies its browser-safe source descriptor and route-mount builder for that
final
static composition and does not edit TASK-414-07-L03's registry/config/slot or
any shared registrar. It also
must not edit L01 files,
Designer brief/provider/compiler/stage/preview/promotion files, TASK-547,
canonical CMS services, DB schema/migrations, integration secret-store owners,
Admin route/navigation/shell files, generated capability/docs artifacts, task
indexes, or changelog files.

No additional adapter-list file is permitted in this leaf. If static
composition needs one, TASK-414-09-L03 must name and own it before dispatch. A
runtime-scanned directory or caller-supplied module path is forbidden.

## Required Exports

`designIrToDesignerDraft.ts` owns only the pure deterministic projection:

```ts
export type DesignIRDesignerProjectionV1 = Readonly<{
  brief: DesignerBriefV1;
  untrustedDraft: DesignerProviderDraftV1;
  temporaryAssetBindings: readonly DesignerImportAssetBindingV1[];
  diagnostics: readonly DesignerImportDiagnosticV1[];
  projectionSha256: string;
}>;

export function mapDesignIRToDesignerDraft(
  input: MapDesignIRToDesignerDraftInput
): DesignIRDesignerProjectionV1;
```

`figmaDesignerImportService.ts` exports:

```ts
export function importFigmaIntoDesigner(
  command: ImportFigmaIntoDesignerCommand,
  deps: FigmaDesignerImportDeps
): Promise<FigmaDesignerReadyRevisionView>;
```

`FigmaDesignerImportDeps.figma` is typed as L01's exact
`FigmaImportServiceConsumerV1` — a `Pick<>` over `FigmaImportRuntimeV1`
containing only `describeOwnedSourceGrantForClaim`, `importFigmaDesignIR`,
`requireCurrentImportLease`, and `releaseImportLeaseAndPurgeConsumedSource`.
L01 owns the single full-runtime type-level parity test; this leaf never
re-pins the full member set, and any rename or removal in L01 breaks both the
`Pick<>` here and L01's parity test. The service is never constructed with a
caller-supplied consumer: `buildFigmaDesignerImportRouteMount` binds it
internally from the WeakSet-verified runtime using
`FigmaDesignerImportServiceDepsV1` (exactly `FigmaDesignerImportDeps` minus
`figma`, which is projected inside the builder).

The browser-safe view contains only workspace ID/state/version, revision ID/
number, source adapter ID, safe connection/import status, bounded diagnostics,
Design IR/core-package/sidecar-set/bundle/stage/validation digests already
authorized for the workspace view, and the exact safe ready-revision binding
accepted by TASK-414-08-L03's existing preview-create route. It contains no
preview session, URL, bind secret, or claim that preview creation succeeded. It contains
no IR/core/sidecar/bundle/stage/receipt body, Figma file key/node ID, source URL, token,
provider response, temporary/private storage handle, or raw preview bind secret.

`figmaDesignerSourceDescriptor.ts` exposes only stable adapter ID, later-phase
enabled flag, `available | disconnected | unavailable` state, exact known scope
label, bounded reason code, accepted source-input fields, and L01 limit summary.
The terminal generic Designer slot may return this projection under
`designer:read` without granting Settings access. Provider account identity,
token expiry/health detail, OAuth controls, and connection management remain on
the `settings:read`/`settings:write` routes, and source-grant creation stays on
the Settings-owned route under `settings:write` plus exact workspace access; a
user with `designer:write` can import through an already-issued opaque grant but
cannot create grants, submit raw file/URL/node/depth selection, or inspect or
change Settings. The browser descriptor module is browser-safe and separate
from the server factory and runtime-contribution modules: it imports only the
pure `DesignerImportSourceDescriptorV1` type from TASK-414-07-L03's registry
and never imports `figmaRuntimeFactory.ts`, `figmaDesignerImportService.ts`,
`designerFigmaRoutes.ts`, or any server/runtime module (pinned by the
`check:admin-boundary` and a focused import-inventory test).

The module exports exactly:

```ts
export const figmaDesignerSourceDescriptor: DesignerImportSourceDescriptorV1;
export function buildFigmaDesignerImportRouteMount(input: Readonly<{
  runtime: unknown;                 // must be the verified full FigmaImportRuntimeV1
  responsePolicy: RouteResponsePolicyV1;
  serviceDeps: FigmaDesignerImportServiceDepsV1; // everything the import service needs except `figma`
}>): DesignerImportRouteMountV1 | null; // null when isFigmaImportRuntimeV1(runtime) is false
export const figmaDesignerImportContribution:
  DesignerImportSourceContributionV1; // pure descriptor only; no route function
```

### Figma slot controls and safe import-status projection

`FigmaImportSlotControls.tsx` exports the exact source-owned controls
contribution typed as TASK-414-07-L03's `DesignerImportSlotControlsV1`; the
generic Designer import slot consumes it through
`DesignerImportSlotPropsV1.controls` and never sees source-specific payloads:

```ts
// core/admin/ui/designer/imports/FigmaImportSlotControls.tsx
export const designerImportSlotControls: DesignerImportSlotControlsV1; // sourceId: "figma"; renders all OAuth/source-grant/import controls and DTO mapping
```

`figmaDesignerImportService.ts` additionally exports the server-side safe
status projection consumed by TASK-414-09-L03's composed
`GET /designer/import-sources/status` helper (the helper only joins and
serializes it; zero settings leakage: no config value, client ID, token
expiry, secret, or provider detail ever reaches the projection):

```ts
// core/services/designer/imports/figma/figmaDesignerImportService.ts
export type FigmaDesignerImportStatusProjectionV1 = Readonly<{
  sourceId: "figma";
  state: DesignerImportSourceStateV1; // "available" | "disconnected" | "unavailable"
  reasonCode: string | null;          // bounded reason; always present when state is "unavailable"
}>;

export function projectFigmaDesignerImportStatus(input: Readonly<{
  availability: FigmaRuntimeAvailabilityV1; // pure descriptor from L01's figmaContracts.ts
  connection: FigmaConnectionStatus;        // safe status from the WeakSet-verified runtime
}>): FigmaDesignerImportStatusProjectionV1; // designer-readable facts only; no preview claim
```

Mapping is exact: an `unavailable` availability (any reason) projects
`state: "unavailable"` with that bounded reason; an `available` availability
projects `"available"` only when the safe connection status reports
`connected: true`, otherwise `"disconnected"` with a bounded reason.

The contribution uses TASK-414-07-L03's exact closed types
(`DesignerImportSourceDescriptorV1`, `DesignerImportSourceContributionV1`) and
literal source ID `figma`; the pure contribution contains only the descriptor,
so the registry never stores a route function and no function requiring
`DesignerFigmaRouteDeps` is ever stored as
`(DesignerImportRouteDepsV1) => void`.

**Route mounting is unbypassable.** `registerDesignerFigmaRoutes` is a
module-private factory inside `designerFigmaRoutes.ts`; it is NOT exported and
accepts only the internally projected deps. The single exported entry point is
`buildFigmaDesignerImportRouteMount`, which:

1. calls `isFigmaImportRuntimeV1(input.runtime)` first and returns `null`
   immediately for any forged structural runtime, cast, Pick-shaped object, or
   plain object — the WeakSet membership check is the only admission;
2. internally projects `figma: FigmaImportRouteConsumerV1` (route
   OAuth/status/grant members) and builds the bound import service with
   `figma: FigmaImportServiceConsumerV1` from the same verified runtime — a
   caller can never supply either Pick;
3. constructs the module-private `DesignerFigmaRouteDeps` (extends
   TASK-414-07-L03's `DesignerImportRouteDepsV1` with the two internal Picks)
   and invokes the module-private route factory; and
4. returns the deps-erased `DesignerImportRouteMountV1` `(router) => void`
   closure that TASK-414-09-L03 stores in its source-keyed mount map.

A forged Pick or object therefore cannot mount routes or invoke I/O: without
WeakSet membership there is no projection, no factory call, and a `null`
result identical to the `unavailable` branch. Route tests pin all six
methods/paths and prove the builder consumes only the `FigmaImportRuntimeV1`
obtained from L01's exact `resolveAndCreateFigmaImportRuntimeV1` available
branch; construction of that runtime happens only inside L01's factory. Direct
imports of L01's OAuth/REST/import/materialization callable exports, casts,
and forged structural runtimes construct zero services and perform zero I/O.
Any `unavailable` resolution returns no runtime, the builder receives `null`
and mounts zero
routes and installs no materialization verifier; a raw `figmaEnabled` boolean,
descriptor state, or cast is not accepted. The browser-safe descriptor
contribution stays composed and visible in disconnected/unavailable states, so
the slot can always render the unavailable reason.

## Deterministic Mapping Contract

The mapper consumes only `normalizeDesignIRV1()` output. It never imports Figma
types. Projection rules are explicit and capability-driven:

- ordered IR roots become bounded page/content concepts; names are untrusted
  authored hints normalized through the Designer brief owner, not route or
  canonical ID authority;
- container/layout semantics map only to allowlisted Designer section/widget
  capability IDs present in TASK-414-02-L01's exact pure native-feature source
  registry; this leaf emits its Figma contribution for the later final manifest;
- text becomes bounded authored content after Unicode/secret/prompt-injection
  safety processing; it can never alter system instructions, IDs, permissions,
  schemas, routes, adapters, or workflow state;
- colors, typography, radius, spacing, and alignment become bounded brand/
  design intent only when the Designer brief/token policy supports them;
- raster references join by exact digest to L01 temporary private asset handles
  and become symbolic private package references only through the terminal
  compiler/stage adapter;
- instances become supported reusable semantic candidates or a diagnostic;
  there is no component-code generation; and
- absolute coordinates, unsupported effects, and presentation-only details are
  advisory diagnostics. If dropping a detail changes reading order, content,
  hierarchy, route intent, interaction meaning, or asset identity, the entire
  mapping fails `designer_import_semantics_unsupported`.

The mapper builds a strict draft object, then passes it through the exact
TASK-414-08-L01 untrusted-draft parser. It does not cast to the type. Equivalent
canonical IR + pure capability-source snapshot bytes produce byte-identical normalized
brief, draft, diagnostics, asset bindings, and projection digest.

There is no pixel-perfect promise. The Admin review visibly explains that Figma
is translated into supported Coderso structures and lists bounded warnings
before the user starts the import. Unknown/unsupported capability rows never
become generic HTML/CSS or silently disappear.

## Import and Idempotency Contract

The strict import request contains only:

- `expectedState`, `expectedVersion`, and the current authorized workspace ID
  from the path;
- one 16-128 character idempotency key;
- opaque `sourceGrantId` only; exact node/depth selection is encrypted and
  digest-bound inside the Designer-authorized grant; and
- no preview transport field: v1 always uses the terminal same-origin Admin
  preview session.

Raw Figma file keys/URLs are accepted only by the separate Settings-owned source
grant route below under `settings:write` plus exact workspace access and are
forbidden from this Designer import command.
Actor/session/provider IDs, permissions, OAuth scope, capability facts,
digests, core/sidecar/bundle fields, and asset handles are forbidden request
keys. The
service stores a request digest over the normalized command with the Designer
run/idempotency record. Same key + same digest returns the existing safe result;
same key + different digest returns `designer_import_idempotency_conflict`.
After an uncertain result, the caller reconciles the exact run/workspace state
before deciding whether an explicit retry is legal.

The workspace CAS generation claim is committed before Figma external I/O and
stores the exact `figma` source ID, opaque source-grant ID, and normalized
selection digest as a pending prepared-source request. That pending claim is
not compiler-eligible. L01 must claim the grant/lease and CAS-attach its exact
`FigmaImportExecutionBindingV1` before any provider/raster/scanner/storage-
attempt I/O; L02 then uses only the returned bound claim. A late import cannot
overwrite a newer workspace version/revision. All accepted
IR/assets are compiled into one strict `DesignerSiteBundleV1` and staged through
one new immutable revision. L01 first prepares scanned bytes in attempt-scoped
private storage. The terminal TASK-414-08-L02 short transaction then rechecks
the fenced workspace and asset attempt, adopts exact asset/input bindings,
inserts the complete stage graph/receipt, marks the revision `ready`, and
records safe evidence atomically. The import service returns only after commit
for that ready binding. Preview creation is a separate existing UI/API
operation.

There are exactly two short owning transactions, never one transaction spanning
external I/O: transaction A claims actor-scoped idempotency plus the pending
workspace generation and exact grant-selection digest; after commit, bounded
Figma/raster/scanner/private-storage work runs; transaction B locks the current
claim/lease/fence and atomically adopts exact assets/input bindings, inserts the
complete stage graph/receipt, settles the run/idempotency result, and marks the
revision ready. Ambiguous commit at either boundary is reconciled from durable
facts before any retry; no external mutation is blindly replayed.

Failure behavior:

- pre-claim validation/authorization failure creates no run or asset;
- provider/cap/mapping/compiler failure fences the run as failed with one safe
  code, purges the exact temporary import attempt, and creates no ready revision;
- materialization/adoption rollback leaves no adopted binding, partial stage
  graph, or ready revision and leaves the exact private attempt eligible for
  idempotent cleanup/recovery;
- a later UI preview-create or immediate-bind failure leaves the ready revision
  reviewable and is mapped by TASK-414-08-L03's existing preview contract; it
  does not re-enter this import service, recompile, or promote; and
- asset cleanup uncertainty after rollback enters an explicit durable
  adoption-attempt recovery state and cannot be reported as successful.

## Implementation Pseudocode

```ts
export async function importFigmaIntoDesigner(
  command: ImportFigmaIntoDesignerCommand,
  deps: FigmaDesignerImportDeps
): Promise<FigmaDesignerReadyRevisionView> {
  const request = normalizeFigmaDesignerImportCommand(command);
  const existing = await deps.idempotency.readExact(request);
  if (existing !== null) return reconcileExactIdempotentResult(existing, request);

  const sourceGrant = await deps.figma.describeOwnedSourceGrantForClaim({
    sourceGrantId: request.selection.sourceGrantId,
    actor: request.actor,
    workspaceId: request.workspaceId,
  }); // metadata/digest only; no source/node/provider I/O
  const claim = await deps.workspaces.claimGeneration({
    workspaceId: request.workspaceId,
    actor: request.actor,
    expectedState: request.expectedState,
    expectedVersion: request.expectedVersion,
    source: "figma",
    preparedSourceRequest: {
      sourceId: "figma",
      sourceGrantId: request.selection.sourceGrantId,
      requestBindingDigest: sourceGrant.selectionSha256,
    },
    idempotencyKey: request.idempotencyKey,
    requestSha256: request.requestSha256,
  });

  let activeClaim = claim;
  let figmaInput: FigmaImportBundleV1 | null = null;
  try {
    figmaInput = await deps.figma.importFigmaDesignIR({
      selection: request.selection,
      generationClaim: claim,
    }); // bounded external I/O; never inside a DB transaction
    activeClaim = figmaInput.boundGenerationClaim;
    await deps.figma.requireCurrentImportLease(
      activeClaim,
      figmaInput.executionBinding,
    );

    const projection = mapDesignIRToDesignerDraft({
      designIR: figmaInput.designIR,
      temporaryAssets: figmaInput.temporaryAssets,
      capabilities: await deps.capabilities.readExactSnapshot(activeClaim),
    });
    const brief = deps.briefs.normalizeDesignerBriefForWrite(projection.brief);
    const draft = deps.drafts.parseUntrustedDesignerProviderDraft(
      projection.untrustedDraft
    );

    await deps.figma.requireCurrentImportLease(
      activeClaim,
      figmaInput.executionBinding,
    );
    const ready = await deps.compiler.compileAndMaterializeDesignerRevision(
      {
        claim: activeClaim,
        brief,
        inputs: projection.temporaryAssetBindings,
        draft,
        preparedPrivateAssets: bindFigmaExecutionToPreparedAdoption(
          figmaInput.preparedAssetAdoption,
          figmaInput.executionBinding,
        ),
      },
      deps.compilerDeps,
    );
    return projectSafeFigmaDesignerReadyRevisionView(ready, projection);
  } catch (error) {
    await deps.runs.failFencedClaim(
      activeClaim,
      mapSafeFigmaDesignerFailure(error),
    );
    if (figmaInput !== null) {
      await deps.assets.cleanupUnadoptedAttemptOrRecordRecovery(activeClaim);
    }
    throw normalizeFigmaDesignerImportError(error);
  } finally {
    if (figmaInput !== null) {
      await deps.figma.releaseImportLeaseAndPurgeConsumedSource(
        activeClaim,
        figmaInput.executionBinding,
      );
    }
  }
}
```

The implementation must use the exact terminal signatures. The terminal
compiler signature is
`compileAndMaterializeDesignerRevision(input: UntrustedDesignerDraft, deps:
DesignerCompilerDeps)`; this leaf calls it with that exact `(input, deps)`
shape — `deps.compilerDeps` is typed as the terminal `DesignerCompilerDeps`
(consumed read-only from TASK-414-08-L02) and is never a redefined adapter. If
the terminal
compiler requires a different normalized import envelope, correct this
pseudocode and rerun task audit before coding; do not create an adapter that
bypasses the compiler or redefines its input.

The final runtime composer statically installs L02's
`figmaDesignerImportContribution` and obtains L01's
`materializationSourceContribution` only from the `available` branch of
`resolveAndCreateFigmaImportRuntimeV1` (WeakSet-verified via
`isFigmaImportRuntimeV1` before consumption); the contribution is never imported
directly. Route dependencies cannot substitute either contribution. When
Figma is disabled, the factory returns the `unavailable` branch (zero
service/contribution
construction, zero I/O), neither routes nor its materialization verifier are
mounted, while the pure `figmaDesignerImportContribution` (with its
browser-safe descriptor) stays composed so the slot renders the unavailable
reason; any persisted pending/bound Figma claim fails closed as unavailable
rather than dispatching through a fallback.

## Internal Route Matrix

All paths are internal and no-store. The factory registers only the prefixless
paths shown first below. Registration stays prefixless: the server-owned HTTP
layer owns `/admin/api` exactly once, and the prefix appears only in the
external endpoint metadata and tests below. TASK-414-09-L03's shared
`Task414RuntimeFacade` composes the frozen pre-body policy and serializes the
strict `RouteResponseV1` with `Cache-Control: private, no-store, max-age=0`
without passing or adding a prefix. The L02 factory never embeds `/admin/api`,
accepts no prefix argument, cannot return an unwrapped plain handler object for
these routes, and is absent when availability is unavailable.

| Method and factory path (composed endpoint) | Permission | Bucket | Strict operation |
| --- | --- | --- | --- |
| `GET /settings/integrations/figma` (`/admin/api/settings/integrations/figma`) | `settings:read` | `admin_read` | Safe connection/requested-scope/expiry status |
| `POST /settings/integrations/figma/oauth/start` (`/admin/api/settings/integrations/figma/oauth/start`) | `settings:write` | `designer-figma` | One-time OAuth state + PKCE authorization URL |
| `POST /settings/integrations/figma/oauth/exchange` (`/admin/api/settings/integrations/figma/oauth/exchange`) | `settings:write` | `designer-figma` | Consume code/state and store encrypted least-scope tokens |
| `DELETE /settings/integrations/figma/connection` (`/admin/api/settings/integrations/figma/connection`) | `settings:write` | `designer-figma` | Disconnect and invalidate pending attempts |
| `POST /settings/integrations/figma/workspaces/:workspaceId/source-grants` (`/admin/api/settings/integrations/figma/workspaces/:workspaceId/source-grants`) | `settings:write` + exact workspace owner/access | `designer-figma` | Settings-owned: transiently normalize one raw file/official URL plus exact node/depth selection and issue a ten-minute actor/workspace/generation/purpose-bound opaque grant |
| `POST /designer/workspaces/:workspaceId/imports/figma` (`/admin/api/designer/workspaces/:workspaceId/imports/figma`) | `designer:write` + workspace owner/access | `designer-figma` and `designer-generation` | IR -> brief/draft -> compiler/stage -> ready revision only |

All six schemas in `designerFigmaSchemas.ts` import `FIGMA_IMPORT_LIMITS_V1`
from L01's `figmaContracts.ts` as the single literal owner and never redefine
a ceiling. Route/security tests retest only the route-relevant ceilings
(request JSON, file key ASCII, node-ID count/length, REST depth, query/body
bytes) and prove parity identity against the sole owner constant;
adapter-internal ceilings (raster/IR/scan/deadline) stay L01-owned and are not
re-tested here.

The composed registry test proves exact Figma status/source/import descriptors
precede any existing generic `/:id` route, applies both import buckets, runs all
pre-body admission before body bytes, proves prefixless registration with
`/admin/api` present only in external endpoint metadata/tests (no double
prefix), and preserves the no-store response header on success and every mapped
error.

The route factory imports services only through injected dependencies. Handler
order and path admission are route-specific. Workspace owner/quota admission
exists only on the source-grant and import routes, whose paths carry
`:workspaceId`; status and the OAuth/disconnect routes never call the workspace
resolver and succeed with the exact Settings permission only. The two orders
are:

- status/OAuth/disconnect: Admin session -> static RBAC -> dedicated rate
  limit -> CSRF for writes -> exact content-type and strict empty query/body
  parse -> service call -> safe projection -> `Cache-Control: no-store` ->
  centralized known-error map; and
- source-grant/import: the same order with path-derived workspace owner/quota
  admission inserted between CSRF and parse.

No body byte, file key, grant ID, or existence-sensitive connection/workspace
read occurs before the applicable admission steps. Authorization occurs before
existence-sensitive connection/workspace reads; status/OAuth/disconnect perform
no workspace read at all.

### Strict route DTO envelopes

`designerFigmaSchemas.ts` imports L01's pure DTOs from `figmaContracts.ts` and
owns only the six exact route-envelope schema exports below
(`figmaStatusRouteSchemasV1`, `figmaOAuthStartRouteSchemasV1`,
`figmaOAuthExchangeRouteSchemasV1`, `figmaDisconnectRouteSchemasV1`,
`figmaSourceGrantRouteSchemasV1`, `figmaImportRouteSchemasV1`), each exporting
strict `{ params, query, body, contentType }`. Every envelope recursively
rejects unknown fields; empty query/body contracts are exact (`{}` with no
extra key passes, any unknown key fails closed); body routes require
`application/json`; absent-body semantics follow L01's exact rules (an empty
body parses as `{}` only for the `{}` contracts; any required-field body route
rejects a missing body before service work):

| Route | Params | Query | Body DTO | Response DTO |
| --- | --- | --- | --- | --- |
| `GET /settings/integrations/figma` | none | `{}` | `{}` | `FigmaStatusViewV1` |
| `POST /settings/integrations/figma/oauth/start` | none | `{}` | `FigmaOAuthStartBodyV1` (`{}` or `{ returnWorkspaceId? }`) | `FigmaOAuthStartViewV1` |
| `POST /settings/integrations/figma/oauth/exchange` | none | `{}` | `FigmaOAuthExchangeBodyV1` (`{ code, state }`) | `FigmaOAuthExchangeViewV1` |
| `DELETE /settings/integrations/figma/connection` | none | `{}` | `FigmaDisconnectBodyV1` (`{}`) | `204`, no body |
| `POST /settings/integrations/figma/workspaces/:workspaceId/source-grants` | `{ workspaceId }` | `{}` | `FigmaSourceGrantBodyV1` | `FigmaSourceGrantViewV1` |
| `POST /designer/workspaces/:workspaceId/imports/figma` | `{ workspaceId }` | `{}` | `FigmaImportBodyV1` | `FigmaImportViewV1` |

`returnWorkspaceId` is the only optional body field (OAuth start); the OAuth
transaction binds it exactly as the optional return workspace.

The OAuth authorization redirect URI is derived server-side exactly once as
`site.publicBaseUrl + adminBasePath + /designer/imports/figma/oauth/callback`
(the canonical relative Admin suffix `/designer/imports/figma/oauth/callback`
resolved under the configured Admin base path). The generic
Designer import slot handles the browser secret only as follows: OAuth
`state` may exist in the browser only inside the one-time authorization and
callback URLs, and `code`/`state` only in the immediate exchange request body.
TASK-414-03-L03's generic pre-React callback scrub seam owns this exact
callback path: `captureAndScrubOAuthCallbackBeforeBootstrap()` runs
synchronously in `core/admin/main.tsx` before `createRoot` and strips the pair
via `history.replaceState`; the slot then reads the once-only value through
`takeScrubbedOAuthCallbackOnce()` before rendering or evidence and issues one
explicit CSRF-protected exchange request. This leaf never
re-implements capture, scrubbing, or Admin HTML no-store policy; it registers
the exact callback suffix in the scrub seam's closed registry and consumes the
once-only slot. The pair is never persisted
to storage, logs, cache, screenshots, or evidence. The server consumes the OAuth
state/code once; an uncertain client response is reconciled from safe
connection status rather than blindly exchanging the code again. No GET
performs token exchange or other mutation.

## Machine-Readable Errors

The route mapper preserves L01's exact Figma errors and adds:

| Code | HTTP | Meaning |
| --- | ---: | --- |
| `designer_figma_request_invalid` | 400 | strict route/import command invalid |
| `designer_workspace_not_found` | 404 | owner-scoped workspace absent |
| `designer_forbidden` | 403 | product/workspace/Settings permission denied |
| `designer_import_conflict` | 409 | workspace state/version/run changed |
| `designer_import_idempotency_conflict` | 409 | same key used for different request digest |
| `designer_import_semantics_unsupported` | 422 | IR cannot map without changing meaning |
| `designer_brief_invalid` | 422 | normalized brief rejected |
| `designer_provider_output_invalid` | 422 | strict untrusted draft envelope rejected |
| `designer_capability_drift` | 422 | manifest/compiler adapter mismatch |
| `designer_package_invalid` | 422 | terminal compiler rejected mapped draft |
| `designer_stage_materialization_failed` | 500 | atomic stage transaction failed |
| `designer_import_asset_recovery_required` | 503 | temporary asset adoption/purge uncertain |

L01's `figma_rate_limited` remains 429 and cap errors retain 413/422. Unknown
errors use the existing sanitized internal mapper. Responses never include raw
schema/provider/storage/DB errors, file/node IDs, source URLs,
IR/core/sidecar/bundle bytes,
digests not authorized by the workspace projection, or retry internals.

## Security Contract

- **Endpoint visibility:** all six routes are internal `/admin/api/*` only and
  return no-store. The existing optional Designer preview remains read-only;
  this leaf adds no public callback, webhook, import, asset, token, package, or
  CMS-write endpoint.
- **Auth model:** existing authenticated Admin session with server-derived
  actor/session and workspace ownership/access. OAuth/Figma identity never
  authenticates to Coderso; no API-key path is added.
- **RBAC:** Settings status requires `settings:read`; OAuth connect/exchange/
  disconnect require `settings:write`; Settings-owned source-grant creation
  requires `settings:write` plus exact workspace owner/access. Import requires
  `designer:write` plus exact workspace owner/access and accepts only an
  already-issued opaque grant;
  a `designer:write`-only actor can import but cannot submit raw file/URL/node/
  depth selection or inspect/change Settings. The grant route accepts transient
  source selection but cannot inspect/change Settings; no Figma route
  accepts/returns Settings values.
  V1 requires the minimal same-actor contract: the actor who creates a source
  grant must hold `settings:write` plus exact workspace access AND
  `designer:write` plus exact workspace access to import that grant; the grant
  is actor/workspace/generation/purpose-bound, single-use, and
  ten-minute-expiring, so there is no cross-actor recipient flow in v1 (a
  secure recipient flow would require its own separately audited contract).
  Native resource permissions are not needed to stage and remain mandatory only
  in the terminal reviewed `designer:promote` path.
- **CSRF:** every POST and DELETE requires the shared valid Admin CSRF token
  before parsing/dispatch. OAuth state + PKCE supplement CSRF. GET status is
  read-only; the provider redirect lands on the SPA and performs no mutation.
- **Rate-limit bucket:** status uses `admin_read`; OAuth uses dedicated
  `designer-figma`; import charges both `designer-figma` and
  `designer-generation`, one active import per actor/workspace, two
  installation-wide,
  plus L01/provider budgets. Missing either bucket fails composition.
- **Reject unknown:** params, query, bodies, OAuth response/status projection,
  source descriptor, IR projection, import command, idempotency record, compiler
  handoff, UI proof, and response recursively reject unknown fields and enforce
  L01/Designer limits. Actor/permissions/digests are server-owned.
- **Anti-abuse:** no public write, so nonce, HMAC/signature, and reCAPTCHA are
  not applicable. Internal writes use session + CSRF + RBAC + ownership + CAS +
  idempotency + concurrency/byte/time caps. OAuth uses one-time state, PKCE,
  exact redirect/fixed egress, and no mutating GET. Raster SSRF/MIME controls
  remain L01-owned.
- **Secrets/privacy:** tokens and the PKCE verifier never enter the browser.
  OAuth `state` may exist in the browser only in the one-time
  authorization/callback URL, and `code`/`state` only in the immediate exchange
  body; both are removed from history before render and never persisted to
  storage, logs, audit, cache, screenshots, or evidence. Status/UI/audit/cache/
  evidence exclude tokens, verifier, file key/node IDs, raw provider response,
  source/private URLs, IR/core/sidecar/bundle/receipt bodies, raster bytes/
  handles, preview bind secrets, cookies/CSRF/session values, prompts with
  secrets, and customer design data.
- **Persistence/transactions:** external Figma/storage I/O never occurs inside
  a DB transaction. Short transaction A owns pending claim + idempotency before
  I/O; short transaction B owns fenced asset/input adoption + complete stage +
  receipt + ready/result settlement after I/O. Failure cleanup/recovery and the
  later UI-owned preview binding use their owning bounded contracts. No
  canonical CMS transaction is called.
- **Audit:** connect, exchange success, disconnect, import start/success/failure,
  and cleanup/recovery transitions use stable action IDs and safe actor/
  workspace/import-attempt metadata only. Audit excludes OAuth/token material,
  file/node identity, source/private URLs, provider/IR/core/sidecar/bundle
  bodies, customer
  content, and storage handles.

## Regression-Test Shape

### Pure/service Vitest

- every supported IR node/layout/text/style/raster projection and stable ordered
  mapping to `DesignerBriefV1` + strict untrusted draft;
- deterministic byte/digest equality for equivalent canonical IR and exact
  digest change for every semantic change;
- capability missing/stale/unsupported, critical lossy mapping, unknown fields,
  raw code/URL/provider keys, malicious text instructions, duplicate symbolic
  keys, asset digest mismatch, and every aggregate bound fail closed;
- same idempotency key/same digest returns the safe prior result; mismatched
  digest conflicts; uncertain state requires read reconciliation; and
- UI-slot projection shows connect/import/progress/diagnostic/preview states
  rendered through the source-owned controls contribution, consumes the once-
  only callback pair via `takeScrubbedOAuthCallbackOnce()` (null after take),
  stores no secret/source/draft locally, preserves dirty
  Designer state, and covers keyboard/focus/reduced motion/light/dark/narrow.

### Bun route/DB/security

- exact method/path/middleware/bucket/permission matrix, no public alias, no
  mutating GET, CSRF rejection before service, strict nested unknown-key tests,
  owner non-enumeration, safe error/status projection, and exact-boundary and
  one-over-boundary rejection for the route-relevant `FIGMA_IMPORT_LIMITS_V1`
  ceilings (request JSON, file key, node IDs, REST depth, query/body bytes)
  driven by L01's single limits test matrix plus a parity-identity assertion
  against the sole owner constant;
  adapter-internal ceilings stay L01-owned and are not re-tested;
- all six strict params/query/body/content-type/response DTOs reject unknowns,
  empty query/body contracts are exact, and `returnWorkspaceId` is the only
  optional body field;
- route mounting is unbypassable: the module-private route factory is never
  exported; `buildFigmaDesignerImportRouteMount` returns `null` (identical to
  the `unavailable` branch) for every forged structural runtime, cast,
  Pick-shaped object, and plain object because `isFigmaImportRuntimeV1`
  (WeakSet membership) is the only admission; the builder internally projects
  the route/service consumer Picks from the verified runtime, so a caller can
  never supply a Pick, mount routes, or invoke I/O; direct
  L01 I/O/contribution imports construct zero services and zero I/O;
- the exact consumer `Pick<>` types are used: `FigmaDesignerImportDeps.figma` is
  typed as L01's `FigmaImportServiceConsumerV1` and the internal
  `DesignerFigmaRouteDeps.figma`
  as `FigmaImportRouteConsumerV1`, each projected only inside
  `buildFigmaDesignerImportRouteMount` and pinned by L01's single full-runtime
  type-level parity test (invoked member names:
  `describeOwnedSourceGrantForClaim`, `importFigmaDesignIR`,
  `requireCurrentImportLease`, `releaseImportLeaseAndPurgeConsumedSource`);
  `buildFigmaDesignerImportRouteMount` returns a deps-erased
  `DesignerImportRouteMountV1` (or `null`) and no registry stores a route
  function; the
  browser-safe descriptor contribution stays composed and visible in
  disconnected/unavailable states with zero routes, dependencies, and I/O;
- route-specific pre-body order is proven byte-zero: status/OAuth/disconnect
  run `session -> static RBAC -> rate -> CSRF -> parse` with zero
  workspace-resolver calls and succeed with the exact Settings permission
  only, while source-grant/import insert `path owner admission` between CSRF
  and parse; only the Settings-owned source-grant route under `settings:write`
  plus exact workspace access accepts a transient raw file key/official
  URL/node/depth selection, while Designer import under `designer:write`
  rejects all raw source fields and accepts only an opaque actor/workspace/
  generation-bound grant ID; a `designer:write`-only actor can import an
  already-issued grant but cannot create grants or inspect/change Settings;
- disabled/disconnected/wrong-scope/expired/rate/cap failures call no compiler
  and create no ready revision;
- successful import requires every L01 raster's raw digest, clean ClamAV receipt,
  canonical re-encode digest, and adoption binding before invoking the exact
  terminal brief parser, untrusted-draft parser, and `DesignerSiteBundleV1`
  compiler/materializer once with matching core/sidecar/bundle/asset/stage/
  receipt digests. The import result contains a ready revision and zero preview
  service calls; the generic Designer UI then calls the existing preview-create
  and immediate-bind flow once;
- the initial pending claim contains the exact grant ID and normalized
  selection digest but cannot enter the compiler; only L01's CAS-bound returned
  claim can map/compile/materialize, and stale/mismatched bind attempts perform
  zero external or storage-attempt I/O;
- normal CMS lists/details/search/cache/public runtime and public Media remain
  unchanged while staged preview is navigable;
- stale workspace/late response/concurrent imports, compiler rollback, later UI
  preview failure, and temporary asset cleanup uncertainty follow the exact state/
  idempotency/recovery contract with no duplicate/partial data; fault injection
  around adoption proves no ready revision can reference an unadopted asset; and
- disconnect/new OAuth start is raced before every REST/raster request, mapping,
  compiler entry, transactional adoption, and ready CAS; every stale generation
  aborts the same import lease, removes private attempt bytes, and yields no
  stage/ready result or later preview call;
- every grant ID, selection digest, source-binding schema/digest, credential
  generation, lease ID, and lease fence mutation is tested before mapping and
  under the materialization transaction lock; caller-supplied verifiers and a
  disabled/unregistered Figma contribution fail closed;
- no route/UI/log/audit/cache/test snapshot includes the forbidden secret,
  provider, source, staged, or bearer fields.

The tests use only small synthetic recorded official-wire fixtures from L01.
They do not require a live Figma account or product-code fallback. TASK-414-11
owns the registered real-host/browser scenario when Figma is enabled.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/designer/designIrToDesignerDraft.test.ts \
  tests/vitest/designer/figmaDesignerImportService.test.ts \
  tests/vitest/admin/designer/figma-import-flow.test.tsx
set -a && source .env && set +a && bun test \
  tests/integration/routes/designer-figma.test.ts \
  tests/integration/designer/figma-designer-import.test.ts \
  tests/security/designerFigmaRoutes.security.test.ts
bun run check:admin-boundary
bun run scan:security:strict
wc -l \
  core/services/designer/imports/designIrToDesignerDraft.ts \
  core/services/designer/imports/figma/figmaDesignerSourceDescriptor.ts \
  core/services/designer/imports/figma/figmaDesignerImportService.ts \
  core/server/validation/designerFigmaSchemas.ts \
  core/server/routes/designerFigmaRoutes.ts \
  core/server/routes/designerFigmaErrorMapper.ts \
  core/admin/services/designerFigmaClient.ts \
  core/admin/ui/designer/imports/FigmaImportSlotControls.tsx \
  tests/vitest/designer/designIrToDesignerDraft.test.ts \
  tests/vitest/designer/figmaDesignerImportService.test.ts \
  tests/vitest/admin/designer/figma-import-flow.test.tsx \
  tests/integration/routes/designer-figma.test.ts \
  tests/integration/designer/figma-designer-import.test.ts \
  tests/security/designerFigmaRoutes.security.test.ts
git diff --check
```

Every touched production/test file must be at most 1,000 physical lines. Record
the exact receipts and final terminal helper names for closure; do not change
task state or changelog from this leaf.

## Documentation Updates Required

This implementation leaf does not edit user/developer/internal docs, task
indexes, or changelog. It hands TASK-414-11-L01 the exact route/permission/rate/
error matrix, OAuth scope and redirect behavior, import limits, mapping
diagnostics, generic import-slot screenshots, staging/privacy/idempotency/
recovery behavior, and targeted receipts. TASK-414-02-L02 is the sole final
writer of `docs/develop/assistant.md`, relevant `docs/guide/` corpus pages, and
generated capability/docs bytes. TASK-414-11-L01 owns the assigned non-corpus
Figma amendments to `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
`_docs/PREVIEW_SPEC.md`, `_docs/MEDIA_SPEC.md`, and
`_docs/ASSISTANT_SITE_BUILDER.md`, plus task/board state and changelog 1266.
