# TASK-414-02-L01: Strict Manifest, Permissions, and Product Boundaries
# FileName: TASK-414-02-L01-Strict-Manifest-Permissions-And-Product-Boundaries.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-02
**Priority:** Critical
**Category:** Capability Contract / RBAC / Extensions / Security
**Estimated Effort:** Large
**Dependencies:** TASK-414-01 `✅ Done`; complete TASK-547 and TASK-548
families terminal before implementation
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414 closure only)

---

## Overview

Own the pure `CmsCapabilityManifestV1` contract, its fail-closed normalizer and
extension merge, and the exact RBAC additions required by Agent and Designer.
The result must describe three products without granting behavior:

- Guide remains TASK-548's provider-free, deterministic, read-only product;
- Agent is provider-backed and is unavailable without an explicitly configured,
  usable provider and exact model;
- Designer generation is separately capability-gated and writes only private
  staged state until reviewed promotion.

This leaf defines claims and references. It does not execute tools, resolve a
provider, persist sessions/workspaces, expose routes, generate the checked-in
manifest, or implement UI.

## Sub-Tasks

None; this is an executable leaf.

## Exclusive File Ownership

The implementer must verify final dependency paths before editing and then is
the sole writer for these files:

- new `core/services/cmsCapabilities/cmsCapabilityManifestV1.ts` — pure schema,
  TypeScript types, discriminators, enums, bounds, and stable identity helpers;
- new `core/services/cmsCapabilities/cmsCapabilityManifestNormalizer.ts` —
  strict recursive normalization and deterministic sorting;
- new `core/services/cmsCapabilities/cmsCapabilitySourceAdapters.ts` — pure
  descriptor types for Guide, permission, action, route, package, and extension
  source adapters; no runtime registry imports;
- new `core/services/cmsCapabilities/cmsNativeFeatureSourceRegistry.ts` — the
  exhaustive core native resource/schema/read/mutation source registry and
  `CMS_NATIVE_FEATURE_SOURCE_REGISTRY_V1` export;
- new `core/services/cmsCapabilities/cmsAdminControlSourceRegistry.ts` — the
  exhaustive non-React Admin route/control source projection and
  `CMS_ADMIN_CONTROL_SOURCE_REGISTRY_V1` export;
- new `core/services/cmsCapabilities/cmsCapabilitySourceInventory.ts` — exact
  source-file/export inventory joining those registries with terminal
  TASK-548 composition descriptors, TASK-547 package kinds, Assistant actions,
  Core/page widgets, Dashboard widgets, and installed plugin contributions;
- new `core/services/cmsCapabilities/cmsCapabilityExtensionMerge.ts` — strict
  owner-scoped extension validation and merge;
- new `core/services/cmsCapabilities/cmsExtensionCapabilityPackV1.ts` — pure
  strict pack/reference schema, limits, canonical serializer and digest;
- new `core/services/cmsCapabilities/index.ts` — explicit pure exports only;
- `core/services/admin/permissionsCatalog.ts` — canonical server permission
  definitions;
- `core/admin/ui/roles/permissionCatalog.ts` — browser-safe labels/groups that
  project the canonical permission IDs;
- `core/admin/ui/roles/rolePermissionRisk.ts` — shared high-risk classification;
- `packages/sdk/src/pluginManifest.ts` — only the minimum strict optional
  capability-contribution declaration needed to bind installed extension
  metadata to a server adapter;
- new `tests/vitest/cms-capabilities/cmsCapabilityManifestV1.test.ts`;
- new `tests/vitest/cms-capabilities/cmsCapabilityExtensionMerge.test.ts`;
- new `tests/vitest/cms-capabilities/cmsExtensionCapabilityPackV1.test.ts`;
- new `tests/vitest/cms-capabilities/cmsCapabilityPermissionParity.test.ts`;
- new `tests/vitest/cms-capabilities/cmsCapabilitySourceContributionV1.test.ts`
  — the closed source-contribution union pinned in this contract;
- existing
  `tests/vitest/admin/permissionsCatalog.test.ts`,
  `tests/vitest/sdk/pluginManifest.test.ts`, and
  `tests/unit/plugins/pluginManifest.test.ts` when their assertions change.

Do not add rows to a generated artifact or change CI, route, provider, session,
Designer, package-execution, Guide corpus, cookbook, task-board, or changelog
files. TASK-414-02-L02 exclusively owns generated parity and cookbooks.

If a listed legacy production or test file is already over 1,000 physical lines
at implementation time, split it by cohesive ownership before adding behavior
and preserve its public exports. `actionFamilyContracts.ts` is a source read by
an adapter and is not an edit target for this leaf.

## Canonical Pure Contract

### Root and stable identity

The root discriminator is exactly `coderso.cms-capabilities@v1`:

```ts
type CmsCapabilityManifestV1 = {
  schema: "coderso.cms-capabilities@v1";
  generatedFrom: readonly CmsCapabilitySourceRefV1[];
  features: readonly CmsFeatureCapabilityV1[];
  workflows: readonly CmsComposedWorkflowRefV1[];
};
```

`featureId` is immutable and owner-scoped:

- core: `core:<domain>/<feature>`;
- plugin: `plugin:<normalized-plugin-id>/<feature>`;
- package: `package:<normalized-package-id>/<feature>`.

IDs are lowercase ASCII, bounded, path-safe, and cannot contain empty segments,
dot segments, encoded separators, whitespace, control characters, or Unicode
confusables. Core IDs are permanently reserved. Display labels, route paths,
prompt text, model names, and localized titles are never identities.

The normalizer recursively rejects unknown keys, duplicates after normalization,
invalid enum members, unsafe strings, empty required arrays, and values above
declared size/count bounds. Arrays whose order is non-semantic are sorted by
stable ID. Input objects are never mutated. The pure module must have no import-
time coupling to Bun, DB, settings, providers, routes, plugin loading, or server
adapters.

### Feature row

Each `CmsFeatureCapabilityV1` contains exactly:

```ts
type CmsFeatureCapabilityV1 = {
  featureId: CmsFeatureIdV1;
  owner: CmsCapabilityOwnerV1;
  lifecycle: "active" | "deprecated";
  guide: {
    productAreaCapabilityId: DocsCapabilityIdV1;
    atomicControls: readonly GuideAtomicCapabilityRefV1[];
    composedWorkflows: readonly CmsWorkflowIdV1[];
  };
  agent: {
    inspect: AgentCapabilityStateV1;
    research: AgentCapabilityStateV1;
    plan: AgentCapabilityStateV1;
    mutate: AgentCapabilityStateV1;
  };
  designer: {
    stage: DesignerCapabilityStateV1;
    preview: DesignerCapabilityStateV1;
    validate: DesignerCapabilityStateV1;
    promote: DesignerCapabilityStateV1;
  };
  native: {
    resourceKind: CmsNativeResourceKindV1;
    schemaOwnerId: CmsSchemaOwnerIdV1;
    schemaIds: readonly CmsNativeSchemaIdV1[];
    readModelOwnerIds: readonly CmsReadModelOwnerIdV1[];
    mutationOwnerIds: readonly CmsMutationOwnerIdV1[];
    permissionIds: readonly PermissionId[];
    actionAdapterIds: readonly CmsActionAdapterIdV1[];
    packageAdapterIds: readonly CmsPackageAdapterIdV1[];
    routeAdapterIds: readonly CmsRouteAdapterIdV1[];
  };
  modalities: {
    acceptedInputs: readonly CmsInputModalityV1[];
    producedOutputs: readonly CmsOutputModalityV1[];
  };
  evidence: {
    contractIds: readonly CmsContractEvidenceIdV1[];
    testIds: readonly CmsTestEvidenceIdV1[];
    cookbookIds: readonly CmsCookbookEvidenceIdV1[];
  };
};
```

`DocsCapabilityIdV1` remains TASK-548's 33-key product-area identity and appears
only as `productAreaCapabilityId`. Exact atomic/workflow identities import the
terminal TASK-548 contracts without aliases:

```ts
type GuideAtomicCapabilityRefV1 = Readonly<{
  atomicControlId: DocsAtomicControlIdV1; // exact docs.control.* identity
  sections: readonly [DocsCapabilitySectionIdentityV1,
    ...DocsCapabilitySectionIdentityV1[]];
}>;
type CmsWorkflowIdV1 = DocsComposedWorkflowIdV1; // exact docs.workflow.* identity
```

Every active feature has at least one exact atomic-control reference and at
least one composed-workflow reference; there is no `workflow-not-applicable`
escape for an active product feature. A non-user-facing technical mechanism is
source-inventory/exclusion evidence, not a falsely active feature. Atomic refs
join exact localized `(docId, locale, sectionId)` identities and cannot be an
area ID, URL, search phrase, title, or best-effort match. A composed workflow
contains at least two ordered atomic steps and declares every participating
feature. L02 validates both directions and complete closure.

Modalities are exact bounded enums (`text`, `structured`, `image`, `pdf`,
`docx`, `xlsx`, `pptx`, `csv`) and describe contract support, not the currently
configured model. Evidence IDs point to exact source-owned contracts, focused
tests, and cookbook sections; active supported claims require non-empty matching
evidence. No prose, filename-only claim, or generic family test satisfies them.

Deprecated rows remain explicit while compatibility support exists. They must
link the migration Guide workflow and may not claim new mutation or promotion
support merely because an old renderer still reads them.

### Supported versus unavailable

Agent and Designer use closed discriminated unions, never booleans with optional
metadata:

```ts
type BoundedSupportV1 = {
  state: "supported";
  adapterIds: readonly [CmsNativeAdapterIdV1, ...CmsNativeAdapterIdV1[]];
  permissionIds: readonly PermissionId[];
  bounds: CmsCapabilityBoundsV1;
};

type UnavailableSupportV1 = {
  state: "unavailable";
  reason: CmsUnavailableReasonV1;
};
```

The reason enum is exact and machine-readable:

- `product_not_applicable`;
- `provider_capability_required`;
- `strict_structured_output_required`;
- `native_adapter_missing`;
- `permission_mapping_missing`;
- `guide_coverage_missing`;
- `designer_stage_missing`;
- `preview_adapter_missing`;
- `validation_adapter_missing`;
- `promotion_adapter_missing`;
- `extension_not_installed`;
- `extension_adapter_unverified`;
- `deprecated_read_only`.

Do not add `unknown` or a free-form fallback. A parser failure is a manifest
error, not a supported or unavailable feature row. Human explanations belong in
Guide/cookbook docs keyed by the stable reason.

`supported` requires all named adapters to exist, match the same owner, and
declare compatible bounds. Mutation support additionally requires an executable
typed action and its native permissions. Designer promotion additionally
requires stage, preview, and validation support plus a TASK-547 native package
or action adapter. A permission ID alone never proves executability.

### Product separation invariants

- Guide references can be loaded and rendered with every provider disabled.
- No Agent support state may name a Guide retriever/composer as its execution
  adapter or a deterministic plan as a successful provider result.
- No Designer state may reuse Agent session/transcript storage as its workspace.
- Agent and Designer may link stable Guide evidence IDs, but that link does not
  copy content or convert Guide into a provider fallback.
- A handoff is explicit, normalized, user-selected, and carries only stable
  resource references or bounded intent. It never carries settings, credentials,
  hidden permissions, raw transcripts, attachment payloads, or staged documents.
- Provider/model runtime availability is not serialized into this build-time
  manifest. TASK-414-03-L01 intersects manifest support with fresh verified
  provider capabilities at request time.

## Native Adapter References

Adapter descriptors are exact facts projected from authoritative owners:

- `permission` — canonical permission ID and catalog owner;
- `action` — typed action ID, input/output schema IDs, target resource kind,
  execution owner, and required permissions;
- `package` — TASK-547 resource kind, reference schema, stage/validate/promote
  operation IDs, and required permissions;
- `route` — canonical admin route ID and read/write classification;
- `guide` — TASK-548 capability and section identity;
- `extension-runtime` — installed extension owner/version plus server registry
  adapter ID.

Descriptors do not contain function objects and do not import runtime modules.
The later source adapter resolves a descriptor against the owning registry.
Names must match byte-for-byte; title, route-prefix, or action-name inference is
forbidden.

## Exhaustive Source Registry Contract

`cmsCapabilitySourceInventory.ts` is a closed list of exact file/export pairs,
not a glob-derived feature guess. Its initial mandatory sources are:

- `cmsNativeFeatureSourceRegistry.ts#CMS_NATIVE_FEATURE_SOURCE_REGISTRY_V1` for
  every core backend resource/schema/read/mutation owner, including a
  backend-only resource with no Admin route;
- `cmsAdminControlSourceRegistry.ts#CMS_ADMIN_CONTROL_SOURCE_REGISTRY_V1` plus
  terminal TASK-548's exact pure Admin route/control descriptor exports;
- `core/services/assistant/actionRegistry.ts#assistantActionTypes` through a
  pure descriptor adapter;
- `core/widgets/core/index.ts#createCoreWidgetDefinitions` and
  `core/services/pages/pageEditorControlRegistry.ts#pageBlockControlRegistry`
  through a stable pure widget/control projection;
- `core/services/dashboard/dashboardWidgetContract.ts#dashboardWidgetConfigSchemas`
  and `core/services/dashboard/dashboardDataSources.ts#dashboardWidgetResolvers`
  through one Dashboard capability projection;
- terminal TASK-547's exact resource/reference/adapter registry exports frozen
  by its contract;
- terminal TASK-548's packaged final
  `DocsCapabilityCompositionCatalogV1` and exact localized section identities;
  and
- `packages/sdk/src/pluginManifest.ts` contribution plus the installed server
  plugin/widget/route/action adapter projections.

Before implementation, replace any terminal TASK-547/TASK-548 descriptive
anchor above with its exact landed path and export in this contract; a missing
or renamed source fails the inventory test. L01 adapters may project runtime-
coupled owners into strict pure descriptors in tests/build tooling but may not
duplicate their enum values or infer features from labels/files. The inventory
also pins all expected `*.admin-route-descriptor.ts` and capability-
contribution modules, so adding an unlisted module is drift rather than silent
absence.

Every native source row must resolve to exactly one feature row or one closed,
tested non-user-facing/compatibility exclusion owned by L02. Conversely, every
feature/adapter/control/widget/package/plugin row must resolve back to one
authoritative source. Final `--check` mutation fixtures add independently: a
backend-only resource/schema owner, Admin control, Assistant action, page
widget/control, Dashboard widget/data source, TASK-547 package kind, and plugin
contribution. Each mutation must fail until native ownership, Guide atom +
workflow, Agent/Designer state, permissions, modalities, focused tests, and
cookbook evidence are complete.

## Closed Source Contribution Union

This leaf freezes the one exact closed, exported source-contribution union that
terminal TASK-489 and then TASK-555 (and later `TASK-556`-style contributors)
consume read-only. It is the terminal shape for "which capability rows does this
family contribute". Contributors never declare a parallel or combined
route/control compatibility shape and never widen the union. The union, its
closed kind enum, and its fail-closed normalizers are exact exports of
`core/services/cmsCapabilities/cmsCapabilitySourceAdapters.ts`, re-exported
through `core/services/cmsCapabilities/index.ts`:

```ts
export type CmsCapabilitySourceContributionKindV1 =
  | "feature"
  | "route"
  | "control"
  | "native"
  | "cache"
  | "smoke";

export type CmsCapabilitySourceContributionV1 = Readonly<
  | CmsFeatureSourceContributionV1
  | CmsRouteSourceContributionV1
  | CmsControlSourceContributionV1
  | CmsNativeSourceContributionV1
  | CmsCacheSourceContributionV1
  | CmsSmokeSourceContributionV1
>;

export function isCmsCapabilitySourceContributionV1(
  value: unknown,
): value is CmsCapabilitySourceContributionV1;

export function normalizeCmsCapabilitySourceContributionV1(
  input: unknown,
): Result<CmsCapabilitySourceContributionV1, CmsCapabilityContractError>;

export function validateCmsCapabilitySourceContributionSetV1(
  input: readonly unknown[],
): Result<readonly CmsCapabilitySourceContributionV1[], CmsCapabilityContractError>;
```

Row shapes are exact; every value is a stable ID only — never a function
object, display label, route path, model name, URL, or runtime value. The
existing permission/action/package/route/guide/extension-runtime descriptor
references from the Native Adapter References section remain authoritative and
are referenced, not redefined, by these rows:

```ts
export type CmsFeatureSourceContributionV1 = Readonly<{
  kind: "feature";
  featureId: CmsFeatureIdV1;
  owner: CmsCapabilityOwnerV1;
  lifecycle: "active" | "deprecated";
  guide: Readonly<{
    productAreaCapabilityId: DocsCapabilityIdV1;
    atomicControlIds: readonly [
      DocsAtomicControlIdV1,
      ...DocsAtomicControlIdV1[],
    ];
    composedWorkflowIds: readonly [CmsWorkflowIdV1, ...CmsWorkflowIdV1[]];
  }>;
  permissionIds: readonly PermissionId[];
}>;

export type CmsRouteSourceContributionV1 = Readonly<{
  kind: "route";
  routeId: CmsRouteAdapterIdV1;
  readWrite: "read" | "write";
  extension: Readonly<{ pluginId: string; adapterId: string }> | null;
}>;

export type CmsControlSourceContributionV1 = Readonly<{
  kind: "control";
  controlId: CmsAdminControlIdV1; // exact CMS_ADMIN_CONTROL_SOURCE_REGISTRY_V1 row
  routeId: CmsRouteAdapterIdV1;
  extension: Readonly<{ pluginId: string; adapterId: string }> | null;
}>;

export type CmsNativeSourceContributionV1 = Readonly<{
  kind: "native";
  resourceKind: CmsNativeResourceKindV1;
  schemaOwnerId: CmsSchemaOwnerIdV1;
  actionAdapterIds: readonly CmsActionAdapterIdV1[];
  packageAdapterIds: readonly CmsPackageAdapterIdV1[];
}>;

export type CmsCacheSourceContributionV1 = Readonly<{
  kind: "cache";
  cacheFamilyId: CmsCacheFamilyIdV1; // exact shared server-cache family key
}>;

export type CmsSmokeSourceContributionV1 = Readonly<{
  kind: "smoke";
  suiteId: CmsSmokeSuiteIdV1; // exact runtime-smoke suite ID
  flowId: CmsSmokeFlowIdV1;   // exact runtime-smoke scenario ID
}>;
```

`CmsAdminControlIdV1`, `CmsCacheFamilyIdV1`, `CmsSmokeSuiteIdV1`, and
`CmsSmokeFlowIdV1` follow the same bounded lowercase-ASCII, path-safe stable-ID
rules as `CmsFeatureIdV1` and resolve only through the terminal source
inventory: control rows through `CMS_ADMIN_CONTROL_SOURCE_REGISTRY_V1`, cache
rows through the shared server-cache family contract, and smoke rows through
the runtime-smoke registry's exact suite/scenario IDs.

`normalizeCmsCapabilitySourceContributionV1` rejects unknown kinds and unknown
fields, unsafe IDs, empty/missing Guide refs, and any value that is not a
stable ID. `validateCmsCapabilitySourceContributionSetV1` additionally rejects
duplicate stable IDs (duplicate `featureId`/`routeId`/`controlId`/
`cacheFamilyId` or duplicated `(suiteId, flowId)` pairs), cross-owner extension
rows, and every ref missing from the terminal source inventory. TASK-489/
TASK-555 pass their row sets through these exports before TASK-414-02-L02
compiles them; a contributor that declares a local combined route/control shape
or a seventh kind fails the exact inventory/contribution tests below. These
codes are reused from the Machine-Readable Errors list: unknown fields and
kinds map to `cms_capability_unknown_field`; malformed roots to
`cms_capability_manifest_invalid`; duplicates to `cms_capability_id_duplicate`;
missing permission/action/package/route/control/extension refs to
`cms_capability_permission_unknown`, `cms_capability_adapter_unknown`, or
`cms_capability_extension_contribution_mismatch`; and empty feature Guide refs
to `cms_capability_guide_ref_missing` / `cms_capability_workflow_ref_missing`.

### Agent tool and Agent UI contribution types

The same exact module also exports two bounded, product-neutral contribution
types consumed by the TASK-414 Agent leaf exports: tool contributions
(TASK-414-04-L03) and Agent UI slot contributions (TASK-414-05-L03). They are
pure value descriptors — stable IDs, exact permission IDs, and closed slot
enum members only; never functions, provider/model names, route paths, or
runtime values. Consumers import these types by name from
`core/services/cmsCapabilities/cmsCapabilitySourceAdapters.ts` (re-exported
through `core/services/cmsCapabilities/index.ts`) and never redefine a parallel
shape:

```ts
export type AgentToolContributionV1 = Readonly<{
  id: string;                     // stable lowercase-ASCII contribution ID
  toolId: string;                 // exact registered tool family ID
  enabled: boolean;               // false when a permission/integration/budget is missing
  permissions: readonly string[]; // exact RBAC permission IDs, non-empty, deduplicated
}>;

export type Task414AgentUiSlotV1 = "post-editor" | "handoff" | "research";

export type Task414AgentUiContributionV1 = Readonly<{
  id: string;                     // stable lowercase-ASCII contribution ID
  slot: Task414AgentUiSlotV1;     // exact closed Agent UI slot
  label: string;                  // bounded display label
}>;

export function isAgentToolContributionV1(
  value: unknown,
): value is AgentToolContributionV1;

export function normalizeAgentToolContributionV1(
  input: unknown,
): Result<AgentToolContributionV1, CmsCapabilityContractError>;

export function validateAgentToolContributionSetV1(
  input: readonly unknown[],
): Result<readonly AgentToolContributionV1[], CmsCapabilityContractError>;

export function isTask414AgentUiContributionV1(
  value: unknown,
): value is Task414AgentUiContributionV1;

export function normalizeTask414AgentUiContributionV1(
  input: unknown,
): Result<Task414AgentUiContributionV1, CmsCapabilityContractError>;

export function validateTask414AgentUiContributionSetV1(
  input: readonly unknown[],
): Result<readonly Task414AgentUiContributionV1[], CmsCapabilityContractError>;
```

`normalizeAgentToolContributionV1` and `normalizeTask414AgentUiContributionV1`
reject unknown fields, unsafe IDs, unknown slot members, and empty/duplicate
permission lists; the set validators additionally reject duplicate
contribution IDs. They reuse the same Machine-Readable Error codes: unknown
fields map to `cms_capability_unknown_field`, malformed roots to
`cms_capability_manifest_invalid`, duplicates to `cms_capability_id_duplicate`,
and missing permission refs to `cms_capability_permission_unknown`.

## Extension Contract

The plugin manifest exposes exactly ONE extension surface (no duplicate inline
feature rows and no second declaration shape): a bounded optional
`cmsCapabilityPack` reference plus bounded capability IDs declared in an
explicitly extended `provides` section. There is no optional inline
`cmsCapabilities` feature declaration; capability rows live only inside the
signed pack referenced by `cmsCapabilityPack` and are never embedded in
`plugin.json`. The extended `provides` section carries only bounded stable IDs
(the pack's feature/adapter IDs it contributes) and cannot carry feature rows,
descriptors, prose, or runtime values. The reference and the declared IDs are
parsed by the existing strict plugin manifest schema and reject unknown keys.
They cannot:

- claim a core/package owner or duplicate any normalized ID;
- declare a permission absent from its normalized permission contribution;
- claim a route, action, package kind, or resource kind it did not register;
- enable Agent or Designer from descriptive metadata alone;
- lower core bounds, RBAC, CSRF, rate limits, validation, review, or anti-abuse;
- expose a public write or provider/settings data;
- shadow, weaken, delete, or reorder a core feature.

At merge time, a non-core row is accepted only when normalized installed
manifest owner/version/contribution IDs and a server-registered adapter match
exactly. Invalid extension rows are rejected atomically for that extension with
a bounded diagnostic. They do not partially merge and do not make core
capabilities unavailable.

### Signed runtime extension pack

This leaf also owns the pure, runtime-independent pack and manifest-reference
contract consumed later by TASK-414-02-L03. `packages/sdk/src/pluginManifest.ts`
adds exactly one optional `cmsCapabilityPack` reference plus bounded capability
IDs in the explicitly extended `provides` section; it does not embed the pack,
capability rows, or descriptors in `plugin.json`:

```ts
type CmsExtensionCapabilityPackRefV1 = Readonly<{
  schema: "coderso.cms-extension-capability-pack-ref@v1";
  path: string;       // normalized relative package path
  sha256: string;     // lowercase 64-hex over exact pack bytes
  packVersion: string; // exact SemVer
}>;
```

`provides` carries only the bounded pack-contributed feature/adapter IDs (each
validated as `plugin:<pluginId>/...`); it is the manifest-side ID allowlist for
the pack reference and contains no feature rows, descriptors, prose, or
runtime values. There is no other inline capability surface in `plugin.json`.

```ts
type CmsExtensionCapabilityPackRefV1 = Readonly<{
  schema: "coderso.cms-extension-capability-pack-ref@v1";
  path: string;       // normalized relative package path
  sha256: string;     // lowercase 64-hex over exact pack bytes
  packVersion: string; // exact SemVer
}>;

type CmsExtensionCapabilityPackV1 = Readonly<{
  schema: "coderso.cms-extension-capability-pack@v1";
  owner: Readonly<{
    kind: "plugin";
    pluginId: string;
    pluginVersion: string;
    targetApiVersion: string;
    targetCoreVersion: string;
    packVersion: string;
  }>;
  sourceHash: string;
  features: readonly CmsFeatureCapabilityV1[];
  guide: Readonly<{
    documents: readonly DocsDocumentV2[];
    composition: DocsCapabilityCompositionCatalogV1;
  }>;
  adapters: readonly ExtensionAdapterDescriptorV1[];
}>;
```

The exact pack limits are 16 MiB canonical UTF-8 JSON, 256 feature rows, 512
adapter descriptors, 256 Guide documents, 4,096 sections, 16,384 chunks, 8,192
visual/example records, 2 MiB aggregate normalized text, 512 composition rows,
and 64 permissions/adapters per feature. Every individual string uses its owning
L01/TASK-548 bound; the pack cannot raise either contract's limit. Canonical
serialization is UTF-8 JSON with deterministic key/order rules, LF, and one
final newline. `sourceHash` is lowercase SHA-256 over the canonical normalized
pack with the `sourceHash` field omitted under the fixed domain separator
`coderso.cms-extension-capability-pack@v1\0`.

Pack identity is owner/version scoped. Every feature, Guide doc, atomic control,
workflow, and adapter ID must use `plugin:<pluginId>/...`; Core/package/cross-
plugin IDs and references are forbidden. Guide documents must contain both
`assistant` and `embedded-help`, carry exact permission requirements drawn from
the plugin manifest's declared permission set, and use confined package asset
paths only. The pack contains no image bytes, URLs, executable functions,
provider/model config, credentials, routes, raw plugin settings, user content,
or canonical CMS data.

`normalizeCmsExtensionCapabilityPackV1`,
`canonicalCmsExtensionCapabilityPackBytesV1`, and
`digestCmsExtensionCapabilityPackV1` are Bun/DB/filesystem-free exports. They
recursively reject unknown fields, duplicate IDs, owner/version mismatch,
undeclared permission/contribution/adapter references, unsupported states,
cross-owner relations, invalid publication targets, over-budget input, and any
attempt to override Core. Descriptive metadata never proves that a runtime
callable exists; TASK-414-02-L03 must join every supported adapter descriptor to
one exact server registration before activation.

## Permission Additions

Add exactly these canonical IDs and keep server/browser catalogs in parity:

| Permission | Grants | Explicitly does not grant |
| --- | --- | --- |
| `assistant:use` | Agent availability, own durable sessions, bounded inspect/plan requests | Settings access, provider configuration, research egress, or a CMS resource permission |
| `assistant:research` | Declared research-tool use when `assistant:use` and native read permissions also pass | Arbitrary network access, secrets, mutation, or Settings |
| `designer:read` | Current user's private workspace/revision/preview metadata and content | Another user's workspace or live-resource reads without native permission |
| `designer:write` | Private stage/generate/validate operations | Live CMS mutation, promotion, or Settings |
| `designer:promote` | Request promotion of an exact reviewed/validated revision | Automatic promotion or bypass of every target's native permissions |

Existing roles are not migrated or silently expanded. The existing `*` grant
retains its central semantics; all custom/non-wildcard roles need explicit new
grants. `assistant:research`, `designer:write`, and `designer:promote` are
high-risk permissions. Permission labels/descriptions may be localized in the
UI, but IDs and semantics remain server-owned.

## Security Contract

- **Endpoint visibility:** this leaf adds no endpoint. Its manifest contract is
  pure/local. Any future consumer is an internal Admin route; Guide remains the
  existing read-only product surface. Extension metadata cannot create a public
  route.
- **Auth model:** build/test normalization requires no auth. Runtime support is
  evaluated only after the existing authenticated Admin session resolves; no
  API-key, public bearer-token, or provider credential is accepted here.
- **RBAC:** the five new permissions are exact product gates and are always
  additive to native resource permissions. None implies `settings:read` or
  `settings:write`. Missing/unknown adapters or permissions invalidate a
  supported claim.
- **CSRF:** no HTTP mutation exists in this leaf. Later internal writes must use
  the shared CSRF middleware; metadata cannot opt out.
- **Rate-limit bucket:** none is consumed by pure normalization. Runtime Agent,
  Designer, and native action buckets are owned by TASK-414-03-L03 and cannot be
  changed by an extension row.
- **Reject unknown:** all root, feature, state, Guide, workflow, native adapter,
  extension, owner, and bounds objects recursively reject unknown fields. Input
  is bounded before sorting or diagnostic collection.
- **Anti-abuse:** no public write exists, so nonce, signature/HMAC, and reCAPTCHA
  are not applicable. The manifest cannot authorize a public write.
- **Secrets/privacy:** types, fixtures, diagnostics, and browser-safe catalogs
  exclude settings values, API keys, provider metadata payloads, cookies,
  transcripts, user content, attachments, signed URLs, and staged Designer
  documents.

## Implementation Pseudocode

```ts
export function normalizeCmsCapabilityManifestV1(
  input: unknown,
): Result<CmsCapabilityManifestV1, CmsCapabilityContractError> {
  const parsed = strictCmsCapabilityManifestV1Schema.safeParse(input);
  if (!parsed.success) return err(contractError("cms_capability_manifest_invalid"));

  enforceBoundedCountsBeforeSort(parsed.data);
  assertUniqueStableIds(parsed.data);
  assertGuideRefsAreExact(parsed.data.features);
  assertSupportedStatesHaveCompleteNativeEvidence(parsed.data.features);
  assertModalitiesAndFocusedEvidenceComplete(parsed.data.features);
  assertProductBoundaries(parsed.data.features);
  return ok(canonicalSortAndFreeze(parsed.data));
}

export function mergeCmsCapabilityExtensions(args: {
  core: CmsCapabilityManifestV1;
  installed: readonly NormalizedInstalledExtension[];
  adapters: readonly ExtensionAdapterDescriptorV1[];
}): Result<CmsCapabilityManifestV1, CmsCapabilityExtensionError> {
  const coreIds = new Set(args.core.features.map((row) => row.featureId));
  const accepted: CmsFeatureCapabilityV1[] = [];
  for (const extension of sortByOwner(args.installed)) {
    const rows = normalizeOwnerRows(extension.cmsCapabilities);
    verifyOwnerVersionAndContributionIds(extension, rows, args.adapters);
    verifyNoCoreOverrideOrCrossOwnerReference(coreIds, rows);
    verifyDeclaredPermissionsAndRuntimeAdapters(extension, rows, args.adapters);
    accepted.push(...rows); // append only after the whole extension validates
  }
  return normalizeCmsCapabilityManifestV1({ ...args.core, features: [
    ...args.core.features,
    ...accepted,
  ] });
}

export function permissionRisk(id: PermissionId): PermissionRisk {
  if (id === "assistant:research" || id === "designer:write" ||
      id === "designer:promote") return "high";
  return existingPermissionRisk(id);
}
```

Data flow:

1. Authoritative registries expose pure descriptors; they do not call the
   manifest normalizer.
2. Strict schemas validate and bound core and extension data before work grows
   with input size.
3. The normalizer validates identities, Guide references, support evidence, and
   product invariants, then returns immutable canonically ordered data.
4. Extension merge joins installed metadata to the server adapter descriptors
   and appends an extension only after all of its rows pass.
5. L02 consumes only the normalized exports to generate parity artifacts.

## Machine-Readable Errors

Use one bounded error shape `{ code, path?, ownerId?, featureId? }`; never echo
raw input or secrets. Required codes:

- `cms_capability_manifest_invalid`;
- `cms_capability_unknown_field`;
- `cms_capability_limit_exceeded`;
- `cms_capability_id_invalid`;
- `cms_capability_id_duplicate`;
- `cms_capability_guide_ref_missing`;
- `cms_capability_workflow_ref_missing`;
- `cms_capability_support_incomplete`;
- `cms_capability_product_boundary_invalid`;
- `cms_capability_permission_unknown`;
- `cms_capability_adapter_unknown`;
- `cms_capability_extension_owner_mismatch`;
- `cms_capability_extension_version_mismatch`;
- `cms_capability_extension_core_override`;
- `cms_capability_extension_contribution_mismatch`.

These are contract errors, not `ApiError`; a later route maps only the subset it
can encounter at its boundary.

## Regression-Test Shape

Add independently runnable focused tests that prove:

- a valid core fixture round-trips to byte-stable normalized JSON without Bun,
  DB, settings, provider, or server side effects;
- unknown keys at every nested level, over-limit arrays/strings, duplicate IDs,
  unsafe owner IDs, and unsupported enum members reject;
- every active feature needs exact atomic and composed Guide refs;
- area IDs cannot occupy atomic/workflow fields; exact `docs.control.*` and
  `docs.workflow.*` IDs plus localized section identities round-trip strictly;
- every supported Agent/Designer state needs exact adapters, permissions, and
  bounds; mutation/promotion have their stronger evidence; native resource/
  schema/read/mutation ownership, modalities, contract/test/cookbook IDs all
  round-trip and recursively reject unknown keys;
- exact source inventory mutation tests cover a backend-only resource, Admin
  control, Assistant action, page widget/control, Dashboard widget, package
  kind, and plugin contribution;
- Guide stays valid with providers absent and cannot be named as Agent execution;
- extension core override, cross-owner refs, stale version, undeclared
  permission, unknown runtime adapter, passive-metadata-only enablement, and
  partial merge all reject;
- invalid extension rows do not alter the normalized core output;
- all five permission IDs are present in server/browser catalogs, do not imply
  Settings, have intended risk, and do not appear in existing role defaults;
- plugin manifest strict parsing and normalize/serialize round trips preserve a
  valid `cmsCapabilityPack` reference plus the bounded `provides` ID allowlist,
  reject unknown fields, and reject any inline capability/feature rows in
  `plugin.json`;
- runtime pack round-trip/digest/limit tests cover every nested owner, Guide,
  composition, feature, adapter, permission and cross-owner failure without
  filesystem/DB/runtime imports;
- the closed source-contribution union in
  `tests/vitest/cms-capabilities/cmsCapabilitySourceContributionV1.test.ts`
  proves all six kinds round-trip byte-stably; unknown kinds/fields, function
  values, unsafe IDs, and empty feature Guide refs reject with the exact codes;
  a TASK-489-style set containing `route` + `control` + `cache` + `smoke` rows
  normalizes as four distinct union members with no combined route/control
  compatibility shape; duplicate stable IDs, cross-owner extension rows, and
  refs missing from the terminal inventory fail
  `validateCmsCapabilitySourceContributionSetV1`; a seventh kind and any
  contributor-declared local combined shape are compile/type-level rejects;
- touched production/test modules remain at or below 1,000 physical lines.

## Testing Requirements

Run after dependencies are terminal and paths are re-verified:

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/cms-capabilities/cmsCapabilitySourceContributionV1.test.ts \
  tests/vitest/cms-capabilities \
  tests/vitest/admin/permissionsCatalog.test.ts \
  tests/vitest/sdk/pluginManifest.test.ts
bun test tests/unit/plugins/pluginManifest.test.ts
tsc -p packages/sdk/tsconfig.json --noEmit
bun run check:admin-boundary
set -a && source .env && set +a && bun run gates:coderso
git diff --check
```

Also run a physical line-count check over every production/test file changed by
this leaf. If the repository's final lane names differ after dependencies land,
use the owning lanes documented by `tests/README.md` and record the exact
replacement commands; do not omit equivalent coverage.

## Documentation Updates Required

This leaf adds no end-user or contributor prose beyond source-owned schema docs.
It hands L02 the exact discriminator, type exports, unavailable-reason enum,
permission IDs, adapter descriptor IDs, extension normalization API, and focused
test fixtures. L02 owns generated/cookbook documentation. TASK-414-03 owns
provider, persistence, route, UI, security, and operational documentation.

Do not edit TASK-414/TASK-548/TASK-547/TASK-551 contracts, task-board rows,
changelog files, or changelog 1266 during this leaf.

## Done Criteria

- The pure strict contract and extension merge enforce all three product
  boundaries and are independently importable.
- Supported claims cannot exist without exact Guide, permission, and native
  adapter evidence.
- The five product permissions exist in server/browser catalogs with no Settings
  implication or silent role migration.
- All negative fixtures fail closed with bounded machine-readable errors.
- Focused tests, typecheck, lint, SDK check, gates, diff check, and touched-file
  line counts pass.
