# TASK-556-04-L01: Capability Boundary and Negative Authorization Tests
# FileName: TASK-556-04-L01-Capability-Boundary-And-Negative-Authorization-Tests.md

**Parent Task:** TASK-556
**Parent Subtask:** TASK-556-04
**Priority:** High
**Category:** Designer Capability Boundary / Security Tests
**Estimated Effort:** Medium
**Dependencies:** TASK-556 external terminal gate; TASK-556-03-L02; terminal TASK-548 Guide/capability write-check contract
**Start Receipt:** Complete TASK-556-03 reviewed landed receipts; terminal TASK-548 Guide/generator write-check commands, exact source-inventory schema/test, and terminal Designer/Agent/provider owners recorded; preview/promotion feature IDs equal the two pinned literals or the gate fails for contract correction
**Completion Receipt:** Reviewed final owned source/generated diff; terminal TASK-548 and CMS write/check sequence plus every command below green
**Status:** ⏳ To Do
**Changelog:** 1270 pinned

---

## Overview

Prove that landed static route/control/workflow evidence and terminal Designer
adapter facts remain descriptive, provider-free for the static lifecycle,
unavailable to Agent, and incapable of granting authorization. Join them through
terminal TASK-414's `CmsCapabilityManifestV1` source/compiler and exact Guide
composed-workflow relations; do not invent another schema, compiler, or generator.

## Sub-Tasks

None; this is an executable capability-reconciliation leaf.

## Exact Writer and Forbidden Paths

Sole writer paths:

- `core/services/designer/staticSources/staticSourceCapabilityContribution.ts`;
- exact additive file/export row in terminal
  `core/services/cmsCapabilities/cmsCapabilitySourceInventory.ts`:
  `core/services/designer/staticSources/staticSourceCapabilityContribution.ts#CODE_OWNED_STATIC_STARTER_CAPABILITY_SOURCE_CONTRIBUTIONS_V1`;
- exact additive records in terminal
  `docs/guide/capabilities/atomic-controls.v1.json`,
  `docs/guide/capabilities/composed-workflows.v1.json`, and
  `docs/guide/capabilities/section-bindings.v1.json`;
- exact TASK-556 sections in terminal
  `docs/guide/coderso/designer-workspaces-preview-and-promotion.md` and
  `docs/guide/coderso/solution-kits.md`;
- the complete tool-owned TASK-548 generated composition catalog, bundle,
  source-hash, coverage/link/route/publication projections emitted by the
  terminal write commands, never hand-edited;
- regenerated `core/generated/cms/coderso-cms-capabilities-v1.json` through the
  terminal CLI only;
- `tests/vitest/designer/designer-static-capability-boundary.test.ts`;
- `tests/vitest/assistant/cms-capabilities-static-source.test.ts`;
- exact additive inventory/manifest cases in terminal
  `tests/vitest/cms-capabilities/cmsCapabilityManifestV1.test.ts`;
- `tests/security/designerStaticCapabilityBoundary.security.test.ts`.

Read-only inputs are TASK-556's static source registry, terminal Designer source
registry, Agent action/tool/policy registries, provider policy, route/RBAC owners,
and architecture/security docs.

Forbidden paths: all other production source/routes/UI, external dependency
files, hand-edited generated output, root `package.json`, Assistant action/operation policy/
planner/executor/tool files, smoke/docs/closure metadata, task/changelog indexes,
`AGENTS.md`, `_TMP*`, and non-TASK-556 tasks. If a named terminal path/command
differs from the recorded handoff, stop and
amend this contract rather than creating a second inventory.

The inventory edit is exactly one additive normalized row for the literal
file/export pair above. It preserves every terminal row, field, relative order,
and export spelling byte-for-byte; no glob, directory scan, replacement row, or
inferred export is allowed. The terminal inventory test snapshots the complete
pre-TASK-556 row sequence and proves the final sequence is that same subsequence
plus exactly this one row at the terminal canonical sort position. If the landed
inventory schema/path/test differs, stop and freshly amend/audit this leaf before
any Guide, source, or generated write.

This leaf is the sole TASK-556 writer for every `docs/guide/**` source byte and
every generated capability/docs byte listed above. Finish all Guide/capability
source edits first. Then, without any intervening source mutation, run the exact
terminal TASK-548 `--write` commands recorded in the start receipt, run
`cms-capabilities:write`, run every corresponding TASK-548 read-only check, and
run `cms-capabilities:check`. A source correction after any write/check invalidates
the complete L01 receipt and restarts this sequence from the corrected final
source bytes. L02 cannot repair, rewrite, or regenerate this corpus.

## Exact Capability Contract

The machine identities are complete and literal before composition:

| Role | Exact identity |
|---|---|
| feature/source | `core:designer/code-owned-static-starter` |
| seed route evidence | `core.designer.static-starters.by-source-id.workspaces` |
| feature product area | `docs.area.solution-kits` |
| Solution Kits control | `docs.control.solution-kits.customize-static-starter-in-designer` |
| Setup control | `docs.control.setup.customize-static-starter-in-designer` |
| terminal Designer preview control consumed read-only | `docs.control.designer.preview` |
| terminal Designer promotion control consumed read-only | `docs.control.designer.promote` |
| terminal Designer preview feature row | `core:designer/workspace-preview` |
| terminal Designer promotion feature row | `core:designer/workspace-promotion` |
| composed workflow | `docs.workflow.solution-kits.customize-static-starter-preview-promote` |

The composed workflow's ordered atoms are exactly Solution Kits customize ->
terminal Designer preview -> terminal Designer promote. It is an explicit
cross-area documentation relation: the existing Designer atoms keep their
terminal product-area ownership and descriptors; TASK-556 neither renames nor
duplicates them. The exact participating existing feature IDs are frozen as
`core:designer/workspace-preview` and `core:designer/workspace-promotion`. If
terminal TASK-414/TASK-548 lands either atom or either feature row under a
different exact ID, the external gate fails and this contract must be corrected
and freshly audited before source editing; no closest-match, label/path lookup, or
new replacement row is allowed. Setup's alternative entry control is documented
and capability-linked but is not falsely inserted into the sequential Solution
Kits workflow.

Workflow reciprocity is an exact bounded exception to preexisting-row byte
identity. The new workflow ID is present in
`core:designer/code-owned-static-starter.guide.composedWorkflows` and is added to
`guide.composedWorkflows` on exactly the two pinned Designer rows above. For each
existing row, its prior workflow IDs remain the same ordered subsequence and only
`docs.workflow.solution-kits.customize-static-starter-preview-promote` is added at
the terminal canonical sort position. Every other field in those two rows,
including `guide.productAreaCapabilityId`, `guide.atomicControls`, Agent,
Designer, native, modality, evidence, owner, and lifecycle facts, is byte-
identical. Every other pre-TASK-556 feature/workflow/source row is wholly byte-
identical. A second changed field/row, missing reciprocal target, duplicate
workflow ID, or terminal-ID mismatch fails before generated output acceptance.

The two new localized section identities are exact:

```ts
const STATIC_STARTER_GUIDE_SECTIONS_V1 = Object.freeze({
  solutionKits: {
    docId: "coderso-solution-kits",
    locale: "en",
    sectionId: "customize-static-starter-in-designer",
  },
  designer: {
    docId: "coderso-designer-workspaces-preview-and-promotion",
    locale: "en",
    sectionId: "code-owned-static-starter-handoff",
  },
});
```

L01 appends headings carrying those exact native TASK-548 section IDs at the
next valid ordinal. The relation map is literal:

| Relation | Exact section identity |
|---|---|
| `docs.control.solution-kits.customize-static-starter-in-designer` | `STATIC_STARTER_GUIDE_SECTIONS_V1.solutionKits` |
| `docs.control.setup.customize-static-starter-in-designer` | `STATIC_STARTER_GUIDE_SECTIONS_V1.solutionKits` |
| `docs.workflow.solution-kits.customize-static-starter-preview-promote` | `STATIC_STARTER_GUIDE_SECTIONS_V1.designer` |

The two controls and feature use `docs.area.solution-kits`; the Setup host route
does not reclassify product ownership as Getting Started. Existing terminal
Designer preview/promotion atom section bindings remain byte-identical. L01
imports the route evidence export from 03-L01 and the two control descriptors
from 03-L02. No filename, title, path, label, or heading-slug inference is
permitted.

TASK-556 consumes terminal `CmsCapabilityManifestV1` exactly. There is no
`StaticSourceCapabilityFactsV1`, source-specific support union, new unavailable
reason, or provider-requirement field. This leaf joins the exact landed seed
route, both shipped Admin controls, Guide atomic sections/composed workflow,
focused tests, and terminal feature IDs reached by the FormaDom package reference
plan through the existing capability source inventory.

Seed/reopen are local route/control/workflow evidence, not invented members of
the terminal `designer` shape. The contribution adds exactly one active terminal
feature row with stable identity
`core:designer/code-owned-static-starter`. Its owner/native schema, read-model,
mutation, route, package, permission, modality, and evidence references are exact
projections of landed terminal owners; no label/path inference is allowed. It
does not replace any existing Designer row. The only permitted existing-row
delta is the reciprocal workflow-ID addition on the two exact pinned rows; no
other field changes.
Agent uses the exact terminal closed states below:

```ts
const STATIC_SOURCE_AGENT_STATES_V1 = Object.freeze({
  inspect: { state: "unavailable", reason: "product_not_applicable" },
  research: { state: "unavailable", reason: "product_not_applicable" },
  plan: { state: "unavailable", reason: "product_not_applicable" },
  mutate: { state: "unavailable", reason: "product_not_applicable" },
} satisfies CmsFeatureCapabilityV1["agent"]);
```

`designer.stage`, `designer.preview`, `designer.validate`, and
`designer.promote` are `state: "supported"` using the exact terminal adapter IDs,
permission IDs, and bounds already emitted by the terminal Designer owners.
The existing compiler cross-checks those facts against every FormaDom package
resource feature. The contribution projects the supported objects byte-for-byte
from terminal native/package/preview/validation/promotion descriptors and may
neither spell a replacement adapter ID nor widen a bound. A missing or
unavailable terminal fact fails `designer_adapter_drift`; it never falls back to
a static-specific fact.

Runtime authorization remains session + route RBAC + fenced owner checks. No
production route, control, action, tool, planner, executor, compiler, or provider
adapter may import capability output to permit behavior. Static seed/reopen/
stage/preview/validate/promote produces zero provider and Agent calls; only a
later explicit AI revision follows terminal Designer provider policy. Provider
availability is runtime policy and is not serialized into
`CmsCapabilityManifestV1`.

The terminal compiler must represent the shipped CTA/lifecycle through exact
route/control/Guide evidence, the one additive feature row, and one exact
composed workflow; this user-facing surface is not eligible for a non-user-facing
exclusion. The new row reuses existing terminal Designer adapter facts. Every
pre-TASK-556 manifest row remains byte-identical except the two pinned rows'
single additive `guide.composedWorkflows` member, and shuffled source order emits
the same sorted bytes.

## Implementation Pseudocode

```ts
test("keeps static capability descriptive and Designer-only", () => {
  const evidence = readExactStaticRouteControlWorkflowEvidence(
    "formadom-studio",
  );
  expect(evidence).toEqual(EXACT_ROUTE_CONTROL_WORKFLOW_EVIDENCE);
  expect(scanProductionImports(CAPABILITY_OWNER)).toEqual(ALLOWED_DESIGNER_READERS);
  expect(scanAgentAndProviderRegistries("formadom-studio")).toEqual([]);
  const manifest = compileCmsCapabilityManifestV1(loadPureInputs());
  requireExactInventoryAddition(
    manifest.generatedFrom,
    "core/services/designer/staticSources/staticSourceCapabilityContribution.ts#CODE_OWNED_STATIC_STARTER_CAPABILITY_SOURCE_CONTRIBUTIONS_V1",
  );
  const feature = requireFeature(
    manifest,
    "core:designer/code-owned-static-starter",
  );
  requireStaticDesignerWorkflow(manifest, feature.featureId);
  requireOnlyReciprocalWorkflowDelta(manifest, TERMINAL_MANIFEST_BASELINE, {
    featureIds: [
      "core:designer/workspace-preview",
      "core:designer/workspace-promotion",
    ],
    workflowId:
      "docs.workflow.solution-kits.customize-static-starter-preview-promote",
  });
  expect(feature.agent).toEqual(STATIC_SOURCE_AGENT_STATES_V1);
  expect(feature.designer).toEqual(readExactTerminalDesignerSupportedFacts());
});
```

**Data flow:** read frozen static route/control/workflow evidence + terminal Guide
relations/native Designer descriptors -> existing capability compiler ->
canonical generated manifest -> assert exact Agent unavailable and Designer
supported facts/workflow -> scan production import/registration graph -> prove
route/RBAC remains the only authorization owner. Generation is build-time
deterministic output, never runtime authorization.

**Errors:** tests fail with bounded file/symbol identifiers only. They must not
print package bodies, private stage documents, tokens, provider payloads, SQL,
environment values, or raw user data.

## Tests

- Exact source/route/two-control/workflow/ordered-atom/section evidence, deep
  freeze, terminal Designer supported facts, four Agent phases, and closed
  `product_not_applicable` reason. Mutating any exact ID or either localized
  section tuple fails before manifest generation.
- Negative graph proves no Agent action/tool/policy/planner/executor mapping.
- Negative graph proves no provider requirement on static lifecycle and no
  provider-offline fallback into Agent/Assistant/site-kit/direct installer.
- No route/control authorization imports capability facts; session/RBAC tests from
  03-L01 remain authoritative.
- Existing terminal Designer source/adapter fixtures and every pre-TASK-556
  manifest row remain byte-identical except the exact reciprocal workflow member
  on `core:designer/workspace-preview` and
  `core:designer/workspace-promotion`; exactly one active static-starter row is
  added and no capability schema is added. Tests remove only that one member and
  compare complete canonical row bytes to the terminal baseline.
- The source inventory contains exactly one new row for
  `staticSourceCapabilityContribution.ts#CODE_OWNED_STATIC_STARTER_CAPABILITY_SOURCE_CONTRIBUTIONS_V1`;
  every prior file/export row and relative order is byte-identical. Missing,
  duplicate, inferred, replaced, or extra rows fail.
- Terminal write/check is deterministic; shuffled input is byte-stable, all
  unrelated pre-existing manifest rows remain equal, and a missing route/adapter/
  Guide/evidence join or a terminal preview/promotion feature ID different from
  either pinned literal fails closed before write acceptance.

## Security Contract

- **Visibility:** pure build-time capability/Guide metadata and tests; no endpoint.
- **Authentication/RBAC:** metadata never authorizes; production route/domain checks remain authoritative.
- **CSRF/rate:** n/a; no endpoint or request.
- **Validation:** exact frozen object and bounded negative import/registration graph.
- **Anti-abuse/privacy:** no public write/runtime mutation/provider call/package
  body or sensitive generated evidence.

## Testing Requirements

After every final Guide/capability source edit, run the exact terminal TASK-548
generator `--write` commands recorded in the start receipt. Then run
`cms-capabilities:write`, every corresponding read-only TASK-548 composition/
bundle/source-hash/coverage/link/route/publication check, and finally
`cms-capabilities:check`. Do not guess a convenience alias or run migration/
publication/release producers. No source byte may change between this sequence
and the reviewed L01 receipt.

```bash
bun run cms-capabilities:write
bun run docs:check
bun run cms-capabilities:check
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/designer/designer-static-capability-boundary.test.ts tests/vitest/assistant/cms-capabilities-static-source.test.ts tests/vitest/cms-capabilities/cmsCapabilityManifestV1.test.ts
bun test tests/security/designerStaticCapabilityBoundary.security.test.ts
bun run check:admin-boundary
git diff --check
```

Run terminal docs checks plus `wc -l` on touched human-authored files and fail
above 1,000. Record exact graph and
negative-authorization receipts for TASK-556-04-L02.

## Documentation Updates Required

All required Guide/capability source corrections and generated bytes are completed
here before its final receipt. It hands bounded capability, negative-
authorization, generated-byte, and validation receipts to TASK-556-04-L02, which
may only read-check them while updating non-corpus family documentation and
closure metadata.
