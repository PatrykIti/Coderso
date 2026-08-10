# TASK-414-07-L03: Designer Workspace List, Shell, and Draft Lifecycle UI
# FileName: TASK-414-07-L03-Designer-Workspace-List-Shell-And-Draft-Lifecycle-UI.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-07
**Priority:** High
**Category:** Designer / Admin UI / Draft Lifecycle
**Estimated Effort:** Large
**Dependencies:** TASK-414-07-L01, TASK-414-07-L02, TASK-414-03-L03 terminal
handoff, TASK-548-03-L01 terminal, TASK-548-03-L03 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Build the Designer-only workspace list and full-screen workspace shell for
creating, saving, reopening, and reviewing durable drafts. Designer is a
separate product surface, not an AssistantPanel tab, Agent mode, modal wizard,
or variation of Guide. This leaf builds route-ready UI modules but does not
mount them in shared Admin routing or navigation; TASK-414-09-L03 owns that
integration after all generation, preview, and promotion capabilities exist.


## Sub-Tasks

None; this is an executable leaf.
## Exact Ownership

This leaf is the sole writer for:

- `core/admin/services/designerClient.ts`
- `core/admin/services/designerCache.ts`
- `core/admin/ui/designer/DesignerWorkspaceListPage.tsx`
- `core/admin/ui/designer/DesignerWorkspaceShell.tsx`
- `core/admin/ui/designer/designerWorkspaceReducer.ts`
- `core/admin/ui/designer/useDesignerWorkspace.ts`
- `core/admin/ui/designer/components/DesignerWorkspaceHeader.tsx`
- `core/admin/ui/designer/components/DesignerDraftEditor.tsx`
- `core/admin/ui/designer/components/DesignerRevisionRail.tsx`
- `core/admin/ui/designer/components/DesignerStateNotice.tsx`
- `core/services/designer/imports/designerImportRegistry.ts`
- `core/services/designer/imports/designerImportConfig.ts`
- `core/admin/ui/designer/imports/DesignerImportSourceSlot.tsx`
- `tests/vitest/admin/designer/designer-client.test.ts`
- `tests/vitest/admin/designer/designer-workspace-list.test.tsx`
- `tests/vitest/admin/designer/designer-workspace-shell.test.tsx`
- `tests/vitest/admin/designer/designer-workspace-reducer.test.ts`
- `tests/vitest/designer/designer-import-registry.test.ts`
- `tests/vitest/designer/designer-import-config.test.ts`
- `tests/vitest/admin/designer/designer-import-source-slot.test.tsx`

It must not edit `AdminApp.tsx`, `AssistantPanel.tsx`, `adminPaths`, route
descriptor/registry modules, navigation, prefetch registries, permission
catalogs, server route mounts, public preview modules, compiler/promotion UI,
task indexes, or changelog files. Later leaves add components beneath separate
Designer subdirectories and compose them through TASK-414-09-L03.

## Generic Import Slot and Configuration Contract

This leaf lands the neutral import seam before any source-specific adapter. The
seam is source-neutral: it contains no Figma DTO, no preview-handoff type, and
no runtime or preview dependency. `DesignerPreviewHandoffInputV1` and the
separate preview client/UI ownership live in TASK-414-08-L03; Figma-specific
Admin client and source-slot integration live in TASK-414-10-L02 after its
L01/L02 types exist. This leaf never imports either family.

```ts
export type DesignerImportSourceIdV1 = "figma";

// Pure descriptor contribution only. The registry stores no route function, so
// no function requiring source-specific deps can be stored under a narrower
// deps type (strict-function variance is impossible by construction).
export type DesignerImportSourceContributionV1 = Readonly<{
  sourceId: DesignerImportSourceIdV1;
  descriptor: DesignerImportSourceDescriptorV1;
}>;

export type DesignerImportSourceStateV1 =
  | "available"
  | "disconnected"
  | "unavailable";

export type DesignerImportSourceDescriptorV1 = Readonly<{
  sourceId: DesignerImportSourceIdV1;
  enabled: boolean;
  state: DesignerImportSourceStateV1;
  unavailableReasonCode: string | null; // always present when state is "unavailable"
  knownScopeLabel: string | null;
  acceptedSourceInputFields: readonly string[];
  limitsSummary: readonly string[];
}>;

// Minimal source-neutral route deps. A source that needs more deps exports its
// own exact `*RouteDeps` extending this base and is never stored here.
export type DesignerImportRouteDepsV1 = Readonly<{
  availabilityState: DesignerImportSourceStateV1;
  responsePolicy: RouteResponsePolicyV1;
}>;

// Route materialization is proof-bound and source-owned. A source exports its
// own factory typed with its exact deps; the integration owner invokes it with
// those deps and keeps only the resulting deps-erased mount, so no function
// requiring a source-specific deps type is ever stored as
// `(DesignerImportRouteDepsV1) => void`.
export type DesignerImportRouteMountV1 = (router: Router) => void;

export type DesignerImportConfigV1 = Readonly<{
  figmaEnabled: boolean;
}>;

export function readDesignerImportConfig(
  env: Readonly<Record<string, string | undefined>>
): DesignerImportConfigV1;

export function composeDesignerImportContributions(
  input: readonly DesignerImportSourceContributionV1[]
): DesignerImportRegistryV1;
```

`CODERSO_DESIGNER_FIGMA_ENABLED` is the exact backend-only environment key. It
accepts only canonical `true | false`, defaults to `false`, and fails startup on
any other present value. It is never accepted from an HTTP body, persisted in
browser storage, or inferred from OAuth/config presence. The closed source-ID
union is deliberate for v1; adding another source must update this owner and the
capability/cookbook gates rather than injecting arbitrary route code.

The registry is pure, static, duplicate rejecting, and accepts only the exact
descriptor type. It performs no directory scan, dynamic import, side-effect
registration, provider I/O, or authorization. The UI slot consumes only
browser-safe descriptors, preserves dirty workspace state, and renders a typed
disabled/disconnected/unavailable/ready state. It never stores source
credentials, raw imported bytes, or a source document. TASK-414-10 supplies the
Figma contribution; TASK-414-09-L03 is the sole final mount/rate-policy writer.
The pure contribution and its browser-safe descriptor are always composed in
the registry - including disconnected/unavailable states - so the slot can
always render the descriptor and its unavailable reason; availability gates
only route mounting, I/O dependencies, and materialization. Descriptor
visibility and zero-I/O gating are therefore both true.

The slot always composes and renders the safe descriptor - including
`unavailableReasonCode` when `state === "unavailable"` - from the pure
registry; availability gates only route mounting, I/O dependencies, and
materialization. `DesignerImportSourceDescriptorV1` and
`DesignerImportRouteDepsV1` are the exact types TASK-414-10-L02 consumes:
its `figmaDesignerSourceDescriptor` conforms to the descriptor, and its
`buildFigmaDesignerImportRouteMount` produces only deps-erased
`DesignerImportRouteMountV1` values for TASK-414-09-L03. These types live in
`designerImportRegistry.ts`.

The slot is purely presentational and source-neutral: it renders the safe
descriptor and a source-owned controls contribution. It contains no
source-specific action shapes — no OAuth, no source-grant, no raw
file/URL/node/depth, no import-selection payloads — and no preview-handoff
type. TASK-414-08-L03 owns
`DesignerPreviewHandoffInputV1`, the preview-create/bind client method, and the
preview UI; TASK-414-10-L02 owns the Figma controls component, the Figma Admin
client, and every Figma DTO mapping (including the separate preview handoff
call after import returns a ready revision):

```ts
// core/admin/ui/designer/imports/DesignerImportSourceSlot.tsx
// Source-owned controls contribution: the source registers one renderable
// controls surface. All OAuth/source-grant/import behavior, DTO mapping, and
// client wiring live inside that contribution (TASK-414-10-L02 for Figma);
// the generic slot never sees source-specific payloads.
export type DesignerImportSlotControlsV1 = Readonly<{
  sourceId: DesignerImportSourceIdV1;
  render: () => ReactNode; // typed render slot; the Figma source provides its slot controls export `designerImportSlotControls` from TASK-414-10-L02
}>;

export type DesignerImportSlotPropsV1 = Readonly<{
  descriptor: DesignerImportSourceDescriptorV1; // always composed/shown
  workspaceId: string | null;
  dirtyWorkspace: boolean;
  controls: DesignerImportSlotControlsV1;       // source-owned; absent -> inert disabled state
}>;

// core/admin/services/designerClient.ts
export type DesignerImportClientTransportV1 = Readonly<{
  status(): Promise<DesignerImportSourceDescriptorV1>;
}>;
```

The slot preserves dirty workspace state while composing the descriptor and the
controls contribution, renders a typed disabled/disconnected/unavailable/ready
state, and never imports Figma DTOs, source clients, or preview modules.
TASK-414-10-L02 owns the Figma-specific
Admin client (`core/admin/services/designerFigmaClient.ts`), the Figma controls
component (`core/admin/ui/designer/imports/FigmaImportSlotControls.tsx`), and
the source-slot wiring, mapping the exact `FigmaOAuth*`/`FigmaSourceGrant*`/
`FigmaImport*` DTOs and calling
TASK-414-08-L03's separate preview-create/bind flow only after import returns a
ready revision. The import action never claims that import created a preview.

## UX Contract

The workspace list shows only title, state, owner-safe metadata, active
revision, last update, and permitted actions. It uses bounded keyset
pagination, deterministic loading/empty/error states, and a visible distinction
between saved drafts, generation failures, ready reviews, pending promotions,
and terminal outcomes.

The full-screen shell contains stable regions for brief, private inputs,
revision history, generation status, preview, validation, and approval. This
leaf implements the draft/revision shell and named slots; later leaves supply
generation/preview/promotion panels without modifying the shell's state owner.

Required behavior:

- cache hydrate once, then background revalidate only while the local state is
  clean;
- preserve dirty user text and selected inputs across revalidation responses;
- save with `expectedState` and `expectedVersion`, then replace local state only
  with the authoritative response;
- on conflict, keep edits visible and offer reload/compare rather than retrying
  blindly;
- never persist briefs, assets, package data, preview bind secrets, or approval
  material in `localStorage`, session storage, URL state, telemetry, or debug
  snapshots;
- use an in-memory, authenticated-actor/deployment-epoch-scoped Designer cache
  family; this single-installation product has no caller-supplied site/tenant
  cache key;
  invalidate and broadcast exact workspace/list keys after successful writes;
- no mount-force refetch loop and no synchronous `setState` inside effect
  bodies; use reducer events, lazy initialization, subscriptions, and explicit
  async boundaries compatible with the full React Hooks preset.

## Implementation Pseudocode

```ts
type DesignerWorkspaceEvent =
  | { readonly type: "hydrate"; readonly value: WorkspaceDetail }
  | { readonly type: "edit_brief"; readonly brief: DesignerBriefDraft }
  | { readonly type: "save_started"; readonly requestId: string }
  | { readonly type: "save_succeeded"; readonly requestId: string; readonly value: WorkspaceDetail }
  | { readonly type: "save_conflicted"; readonly requestId: string; readonly current: WorkspaceVersionView }
  | { readonly type: "revalidated"; readonly value: WorkspaceDetail };

export function designerWorkspaceReducer(state: WorkspaceUiState, event: DesignerWorkspaceEvent) {
  if (event.type === "revalidated" && state.dirty) return state;
  if (event.type === "save_succeeded" && event.requestId !== state.activeRequestId) return state;
  return reduceDesignerWorkspaceEvent(state, event);
}

export async function saveDesignerDraftFromUi(state: WorkspaceUiState, client: DesignerClient) {
  const command = buildStrictSaveCommand({
    expectedState: state.server.state,
    expectedVersion: state.server.version,
    brief: state.editableBrief,
  });
  return client.saveDraft(state.server.id, command);
}
```

Use canonical `AdminLink` for links rendered inside these components. The
actual Designer path helper and route descriptor are introduced only by
TASK-414-09-L03, then injected as props during composition; this leaf does not
hand-build or register an Admin href.

## Data Flow

```text
Designer API no-store projection
  -> authenticated-actor/deployment-epoch-scoped memory cache
  -> reducer-owned server snapshot + editable draft
  -> explicit user edit/save event
  -> strict client command with CAS fields + CSRF
  -> cache invalidation/broadcast after success
  -> authoritative response replaces clean snapshot
```

Revision restore is an explicit confirmation that creates a new revision. The
UI never implies that an old revision was mutated and never restores while an
unsaved edit is hidden.

## Machine-Readable Errors

The client preserves server codes for deliberate UI states:

- `designer_request_invalid`
- `designer_workspace_not_found`
- `designer_forbidden`
- `designer_workspace_conflict`
- `designer_workspace_state_invalid`
- `designer_revision_not_found`
- `designer_revision_limit_exceeded`
- `designer_rate_limited`
- `designer_capability_unavailable`

Unknown failures render one sanitized retry state. Raw response bodies,
provider errors, tokens, digests, and stack traces are not shown or logged.

## Security Contract

| Concern | Contract |
|---|---|
| Visibility | This UI calls only internal `/admin/api/designer/*` endpoints. Drafts render only inside the authenticated Designer surface and never in Guide/Agent or public CMS UI. |
| Authentication | The shared Admin session is required; loss of session clears all Designer memory-cache entries and sensitive reducer state. |
| RBAC | List/detail use `designer:read`; create/save/restore use `designer:write`. Controls are hidden/disabled for UX, while server RBAC remains authoritative. |
| CSRF | The client sends the shared CSRF credential on every POST/PUT/PATCH/DELETE and never retries a failed mutation without a fresh explicit user action. |
| Rate limits | Reads use `admin_read`; ordinary draft writes use `admin_write`. Generation, preview, and promotion use the dedicated `designer-generation`, `designer-preview`, and `designer-promotion` buckets. Figma status reads use `admin_read`; Figma OAuth/source-grant/import mutations use the dedicated `designer-figma` bucket, with import also charging `designer-generation`. The UI honors bounded retry metadata without loops. |
| Validation | The client constructs exact request objects, bounds local text before dispatch, validates server projections, and rejects unknown/missing response fields rather than hydrating corrupt state. |
| Anti-abuse | No public write exists. Session + CSRF + RBAC + CAS protect mutations; nonce/HMAC and reCAPTCHA are not applicable. No sensitive draft or credential enters persistent browser storage. |

## Regression-Test Shape

React/Vitest tests cover:

- bounded pagination, empty/loading/error states, and each lifecycle label;
- create, save, reload, and restore-as-new-revision interactions;
- cache hydration followed by one background revalidation;
- dirty-state protection against late revalidation and out-of-order saves;
- a conflict preserving edits and exposing reload/compare actions;
- denied permissions removing mutation controls without hiding safe status;
- session loss clearing cache and rendered sensitive state;
- no `localStorage`/session-storage writes and no token/draft URL serialization;
- keyboard/focus semantics, labelled status regions, reduced motion, light and
  dark mode, narrow viewport, and no console errors;
- a source/import guard proving no dependency on `AssistantPanel` and no edits
  to shared route/navigation modules.
- exact `false` default, strict env parsing, duplicate/unknown source rejection,
  static contribution order, disabled route omission, and a generic slot that
  preserves unsaved workspace state without source-specific imports.
- the generic slot always composes and renders the safe descriptor - including
  `unavailableReasonCode` when `state === "unavailable"` - while availability
  gates only route mounting, I/O dependencies, and materialization; the slot is
  purely presentational and renders only the source-owned controls
  contribution, and the Figma controls/DTO mapping is covered by
  TASK-414-10-L02's own suite; the preview
  handoff is absent from this seam and lives in TASK-414-08-L03; the pure
  contribution/descriptor stays composed in unavailable states with zero
  routes, dependencies, and I/O;
- a source-neutral import guard: `designerImportRegistry.ts`,
  `DesignerImportSourceSlot.tsx`, and `designerClient.ts` contain no Figma
  DTO, no OAuth/source-grant/node/depth/import-selection action shape, no
  preview-handoff type, and no reference to TASK-414-08-L03 or
  TASK-414-10 modules (byte-level import inventory test); absent controls
  render an inert disabled state without any source behavior;
- the exact `DesignerImportSourceDescriptorV1` and `DesignerImportRouteDepsV1`
  types are consumed by the Figma contribution without redefinition; the
  registry stores no route function, so no function requiring
  `DesignerFigmaRouteDeps` is ever stored as `(DesignerImportRouteDepsV1) =>
  void` (compile/type-level guard); the Figma DTOs are imported from L01's
  `figmaContracts.ts` owner only; `DesignerPreviewHandoffInputV1` is defined
  only in TASK-414-08-L03's `designerPreviewClient.ts`;

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/admin/designer/designer-client.test.ts \
  tests/vitest/admin/designer/designer-workspace-list.test.tsx \
  tests/vitest/admin/designer/designer-workspace-shell.test.tsx \
  tests/vitest/admin/designer/designer-workspace-reducer.test.ts \
  tests/vitest/designer/designer-import-registry.test.ts \
  tests/vitest/designer/designer-import-config.test.ts \
  tests/vitest/admin/designer/designer-import-source-slot.test.tsx
bun run check:admin-boundary
git diff --check
wc -l core/admin/services/designerClient.ts \
  core/admin/ui/designer/DesignerWorkspaceListPage.tsx \
  core/admin/ui/designer/DesignerWorkspaceShell.tsx \
  core/admin/ui/designer/designerWorkspaceReducer.ts \
  core/admin/ui/designer/useDesignerWorkspace.ts \
  core/admin/ui/designer/components/DesignerWorkspaceHeader.tsx \
  core/admin/ui/designer/components/DesignerDraftEditor.tsx \
  core/admin/ui/designer/components/DesignerRevisionRail.tsx \
  core/admin/ui/designer/components/DesignerStateNotice.tsx \
  core/services/designer/imports/designerImportRegistry.ts \
  core/services/designer/imports/designerImportConfig.ts \
  core/admin/ui/designer/imports/DesignerImportSourceSlot.tsx \
  tests/vitest/admin/designer/designer-client.test.ts \
  tests/vitest/admin/designer/designer-workspace-list.test.tsx \
  tests/vitest/admin/designer/designer-workspace-shell.test.tsx \
  tests/vitest/admin/designer/designer-workspace-reducer.test.ts \
  tests/vitest/designer/designer-import-registry.test.ts \
  tests/vitest/designer/designer-import-config.test.ts \
  tests/vitest/admin/designer/designer-import-source-slot.test.tsx
```

## Documentation Updates Required

Provide final screenshots, state labels, draft conflict behavior, cache/privacy
notes, and user-facing create/save/reopen instructions to the closure leaf.
Do not edit `docs/guide`, TASK indexes, or changelog 1266 here; the route is not
publicly documented until final integration and runtime smoke pass.
