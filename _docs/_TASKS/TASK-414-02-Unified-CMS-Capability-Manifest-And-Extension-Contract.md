# TASK-414-02: Unified CMS Capability Manifest and Extension Contract
# FileName: TASK-414-02-Unified-CMS-Capability-Manifest-And-Extension-Contract.md

**Parent Task:** TASK-414
**Priority:** Critical
**Category:** CMS Capabilities / Guide / Agent / Designer / Extensions / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-01 `✅ Done`; complete TASK-547 and TASK-548
families terminal before implementation dispatch; TASK-485-03 terminal before
runtime plugin lifecycle activation
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414 closure only)

---

## Overview

Create one strict, pure, versioned CMS capability manifest that answers the
same questions for every core or extension-owned feature:

1. Where can an authenticated user learn the atomic operation in Guide?
2. Which composed Guide workflows include it?
3. What can Agent inspect, research, plan, or mutate, and why is any mode
   unavailable?
4. What can Designer stage, preview, validate, and promote, and why is any
   phase unavailable?
5. Which exact native permission, typed-action, and package/resource adapter
   enforces each supported claim?

The manifest is an inventory and trust contract, not another executor. Runtime
services continue to own native schemas, normalization, authorization,
transactions, cache invalidation, rendering, package installation, and audit.
The manifest may only point to those owners through stable adapter IDs.

This child closes the current drift gap where Guide coverage, assistant policy,
action families, solution/full-site packages, plugin contributions, and product
documentation can evolve independently. A feature is not considered complete
when only its renderer, editor, prompt wording, or manifest row exists. New or
changed capability bytes must fail generated parity until the owning docs,
native adapters, permissions, and composed-workflow cookbook are synchronized.

## Three Separate Products

The product boundary is locked:

- **Guide** is TASK-548's deterministic, provider-free, read-only product. It
  reads the DB-backed documentation corpus and never calls Agent tools, plans,
  Designer generation, or a provider. Provider/model absence cannot hide or
  downgrade Guide.
- **Agent** exists only when the server resolves an explicitly configured,
  usable provider and exact model with fresh verified capabilities. Agent never
  turns a Guide answer or deterministic local planner result into a successful
  Agent response. It may use local policy and native adapters only after a real
  provider turn, as validation and execution boundaries.
- **Designer** is a separate private workspace product. Generation is
  capability-gated, writes only staged private revisions, previews from staged
  state, and promotes through an explicit reviewed native core+sidecar bundle/
  action path.
  It is not an Agent conversation mode and never mutates live CMS resources
  during generation or preview.

No compatibility alias may collapse these products into one `mode` enum. A
handoff carries only explicitly selected, normalized user intent or stable
resource references and never silently copies Guide evidence, Agent transcript,
provider output, Designer staged payloads, permissions, or settings.

## Contract Boundaries

### Canonical manifest

The exact root type is `CmsCapabilityManifestV1` with discriminator
`coderso.cms-capabilities@v1`. TASK-414-02-L01 owns its schema, types, limits,
normalizer, extension merge rules, and native adapter descriptors. The manifest
is pure TypeScript/JSON and must remain importable in Vitest without Bun, DB,
settings, provider, server, plugin-loader, or runtime side effects.

Each normalized feature row has one stable `featureId`, one owner, one
Guide contract, explicit Agent mode states, explicit Designer phase states,
and exact native adapter references. Supported states require complete adapter
and permission evidence. Unsupported states require one bounded machine-readable
reason; missing fields, empty adapter arrays, optimistic defaults, or inferred
support fail closed.

### Source adapters

The initial manifest inventory must reconcile these authoritative sources after
their dependency leaves are terminal:

- TASK-548's byte-compatible area `DocsCapabilityIdV1` catalog, separate
  `DocsCapabilityCompositionCatalogV1`, exact localized
  `(docId, locale, sectionId)` identities, and generated documentation coverage;
- the canonical Admin route and permission catalogs;
- `assistantOperationPolicy`, executable `assistantActionTypes`, and
  `actionFamilyContracts`;
- Page, Post, Custom Screen, Form, Listing, Booking, Commerce, Media, Menu,
  Theme, Dashboard, content-model, and other domain-owned registries;
- TASK-547's closed full-site package resource-kind/reference graph and native
  resource adapters;
- normalized installed-plugin contribution and permission declarations, while
  preserving the existing plugin trust boundary.

The adapters project facts only. They cannot grant RBAC, register a route,
enable a hidden action, turn passive plugin metadata into authoring, or treat a
legacy compatibility renderer as a new product capability.

### Extension merge

Core IDs are globally reserved. Extension IDs are scoped to their normalized
owner (`plugin:<plugin-id>/...` or `package:<package-id>/...`) and cannot
override, shadow, weaken, or delete a core row. There is exactly one plugin
manifest surface: the optional `cmsCapabilityPack` reference plus bounded
capability IDs in the explicitly extended `provides` section; no inline feature
rows and no second declaration shape exist. Plugin/package metadata alone
never enables Agent or Designer support. A supported extension row requires a
server-registered adapter whose owner, version, permissions, resource kinds,
and contribution IDs match the normalized installed manifest exactly.

Unknown extension keys, duplicate IDs, undeclared permissions, missing runtime
adapters, stale package versions, unsafe routes, owner mismatch, or an attempted
core override reject the extension contribution. Core remains usable without
that extension; the invalid contribution is not partially merged.

## New Permission Boundary

Add exactly these catalog permissions:

- `assistant:use` — open Agent, use durable sessions, and request bounded
  provider-backed inspection/planning; it does not grant access to Settings or
  any CMS resource;
- `assistant:research` — allow explicitly declared provider/network research
  tools in addition to `assistant:use`; every tool still requires its native
  read permissions and redaction policy;
- `designer:read` — list/open the current user's private Designer workspaces,
  revisions, previews, decisions, and safe metadata;
- `designer:write` — create/edit private staged Designer state and invoke
  capability-approved generation/validation; it does not mutate live CMS data;
- `designer:promote` — request reviewed promotion of an exact validated
  revision; every native target permission remains additionally mandatory.

These permissions must not imply `settings:read` or `settings:write`, and the
Agent/Designer product APIs must not return the Settings object, provider key,
decrypted integration config, base URL credentials, quota configuration, or
other privileged settings. Existing custom role arrays are not silently
expanded. Full-access `*` keeps its existing semantics; all other roles require
an explicit grant. `assistant:research`, `designer:write`, and
`designer:promote` join the shared high-risk confirmation taxonomy.

## Security Contract

- **Endpoint visibility:** this child introduces a pure manifest/build contract,
  not a public endpoint. Later Agent and Designer routes are internal
  `/admin/api/*` routes only. TASK-548 Guide/Help remains read-only and keeps its
  existing visibility.
- **Auth model:** manifest generation/checking is local/CI. Runtime consumers
  use the existing authenticated Admin session; no generic API-key or public
  bearer-token path is added.
- **RBAC:** support claims name exact catalog permissions. `assistant:use`,
  `assistant:research`, `designer:read`, `designer:write`, and
  `designer:promote` never replace native resource permissions and never expose
  Settings. Invalid/missing permission adapters fail supported claims closed.
- **CSRF:** no CSRF applies to read-only local generation. Every later internal
  Agent/Designer POST/PUT/PATCH/DELETE and every existing assistant action write
  remains CSRF protected.
- **Rate-limit bucket:** no HTTP bucket is added here. Later Agent provider/tool
  calls remain in `assistant`; later Designer generation, preview, and promotion
  use the dedicated buckets owned by their route/integration leaves. Static/
  read-only manifest loading does not consume a request bucket.
- **Reject unknown:** root, feature, product-state, Guide reference, extension,
  adapter, permission, workflow, and generated output objects recursively reject
  unknown fields. All identifiers, counts, strings, arrays, and diagnostics are
  bounded and canonically sorted where order is not semantic.
- **Anti-abuse:** there is no public write, so nonce, signature/HMAC, and
  reCAPTCHA are not applicable. An extension cannot introduce a public write or
  lower anti-abuse requirements through manifest metadata.
- **Secrets/privacy:** generated/source manifests, Guide docs, cookbook rows,
  browser-safe projections, diagnostics, and CI output contain no provider keys,
  integration payloads, settings values, cookies, session/CSRF material, signed
  URLs, private attachments, transcripts, staged Designer payloads, or raw user
  data.

## Sub-Tasks

| ID | Exclusive responsibility | Status |
| --- | --- | --- |
| TASK-414-02-L01 | Pure manifest/schema/normalizer/extension contract, exact native permission/action/package adapter descriptors, product boundaries, and five new permission IDs | ⏳ To Do |
| TASK-414-02-L02 | Final post-feature deterministic artifact, TASK-548 regeneration handoff, source/docs/adapter/cookbook parity, CI/release gates, and contributor cookbook | ⏳ To Do |
| TASK-414-02-L03 | Signed/versioned runtime plugin capability-pack validation, transactional activation/deactivation, Guide search projection, adapter fencing, and lifecycle reconciliation without Core-byte mutation | ⏳ To Do |

**Land order:** `TASK-414-02-L01 -> TASK-414-03 -> TASK-489 -> TASK-555 ->
TASK-414-04..10 -> TASK-414-02-L02 -> TASK-414-02-L03 -> TASK-414-11`.
L02 is intentionally the final Core/static
reconciliation checkpoint after all feature contributions, not a prerequisite
for TASK-414-03. L03 then activates only runtime plugin overlays against those
frozen bytes and cannot mutate them.

L01 is the only writer of the shared manifest/extension-pack shape and
permission catalog changes. L02 imports those exact exports and must not
redefine types, limits, reasons, adapter IDs, permission semantics, or merge
behavior. L02 is the only writer of generated Core manifest bytes and parity
tooling. L03 consumes L01/L02 read-only, persists runtime extension releases,
and cannot edit tracked Core/TASK-548 registries or generated bytes. No leaf edits
TASK-414/TASK-548/TASK-547/TASK-551 task files, `_docs/_TASKS/README.md`, or
changelog files. Changelog 1266 remains reserved for later TASK-414 closure.

## Implementation Order

1. Wait for the named TASK-548/TASK-547 dependency leaves to be terminal, then
   re-read their final exports and correct every path/type hint in the leaf
   contract before source edits.
2. Land the pure strict contract, permission additions, extension merge rules,
   and source adapter descriptor interfaces.
3. Implement TASK-414-03 against L01's pure contribution contracts, then pause
   TASK-414 while TASK-489 and TASK-555 land serially against L03's transport.
   Both external families must emit L01-compatible pure contributions and leave
   their TASK-548 Guide source/generated bytes current; neither writes the final
   CMS capability artifact.
4. Implement TASK-414-04..10 after both external receipts are terminal. No
   feature leaf writes generated capability or TASK-548 output bytes.
5. Re-dispatch L02 after those terminal contributions, regenerate TASK-548
   outputs through its existing tools, enumerate the complete feature inventory
   and documentation composition relation, and reconcile all owners; no
   title/path/prompt heuristic is allowed.
6. Generate deterministic manifest bytes and add a read-only parity check that
   joins docs, permissions, actions, packages, routes, and cookbooks.
7. Add CI/release gating and contributor docs.
8. Land L03's signed runtime extension activation overlay, prove install/
   upgrade/enable/disable/rollback/uninstall behavior and no Core-byte mutation.
   TASK-414-11 may begin only after final L02 bytes/checks and L03 runtime gates
   are green.

## Acceptance Criteria

- Every active CMS feature is represented exactly once by stable owner-scoped
  identity or causes generated parity to fail.
- Every feature has valid Guide atomic coverage and explicit composed-workflow
  coverage/accounting against TASK-548 identities.
- Every Agent mode and Designer stage/preview/promotion phase is explicitly
  supported with exact adapters and bounds or unavailable with a machine code.
- No supported mutation or promotion exists without exact native permissions
  and an executable action/package adapter.
- Plugin/package extensions cannot override core, invent permissions, or become
  Agent/Designer executable from metadata alone.
- A newly installed signed compatible plugin can add authorized Guide evidence
  and registered Agent/Designer capabilities without rebuilding Core; disable,
  uninstall, rollback, or revocation fences the overlay without changing the
  static Core artifact.
- New/changed route, domain registry, permission, action family, package
  resource kind, docs reference, or cookbook workflow makes the generated check
  fail until all required counterparts are updated.
- Guide stays provider-free/read-only; Agent and Designer availability never
  fall back to Guide or deterministic local success.
- The five new permissions provide product access without granting or exposing
  Settings.

## Testing Requirements

- Pure Vitest contract/normalizer/extension/permission parity suites owned by
  L01.
- Deterministic two-generation byte comparison, stale-generated negative
  fixtures, TASK-548 docs identity joins, adapter exhaustiveness, and cookbook
  graph tests owned by L02.
- Bun plugin lifecycle, DB-fenced Guide/adapter projection, multi-process
  reconciliation, security, and indexed performance suites owned by L03.
- Plugin/package negative fixtures for owner spoofing, undeclared permission,
  unknown adapter, core override, stale version, and passive-metadata-only
  support claims.
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `tsc -p packages/sdk/tsconfig.json --noEmit` only if the SDK import surface is
  touched after dependency re-verification.
- `bun run gates:coderso` after the capability gate is registered.
- touched production/test line counts and `git diff --check`.

## Documentation Updates Required

L02 owns the new capability-manifest contributor/extension cookbook,
generated-gate documentation, existing TASK-548 corpus/outputs handoff, and the capability-specific updates to
the plugin/release-gate contracts. TASK-414-03..10 produce exact runtime API/
persistence/security/cache/UI documentation receipts; TASK-414-11 reconciles
only its assigned non-corpus docs and validates L02 outputs read-only. Final
board, status, and changelog synchronization is closure-only under pinned
changelog 1266.
