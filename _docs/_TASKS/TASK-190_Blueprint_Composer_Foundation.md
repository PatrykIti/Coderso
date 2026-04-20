# TASK-190: Blueprint Composer Foundation
# FileName: TASK-190_Blueprint_Composer_Foundation.md

**Priority:** High
**Category:** Assistant/Core + Product Architecture + Blueprint Planning
**Estimated Effort:** Very Large
**Dependencies:** TASK-172, TASK-178, TASK-188, TASK-189
**Status:** To Do

---

## Overview

Build the foundation that lets `LLM Guide` choose one blueprint when a prompt is
simple, but also compose fragments from multiple blueprint capabilities when the
user asks for a mixed business outcome.

Current state:
- The assistant is mostly preset-driven.
- Existing business packs can produce useful outcomes such as house projects,
  product catalog, portfolio, services directory, lead capture, editorial hub,
  and gated booking/payment paths.
- Shared typed actions already exist for content models, entries, custom screens,
  listings, pages, forms, menus, SEO, media references, and site kits.
- TASK-189 hardened the planner so CMS/admin operations route through operation
  policy instead of provider action arrays or planner-owned legacy branches.

Gap:
- The planner does not yet have a generic blueprint composition layer.
- It cannot reliably choose multiple blueprint fragments, merge their models,
  resolve conflicts, compose page/admin surfaces, and return one coherent action
  plan unless that specific combination is already hardcoded.

This task introduces a new layer above current blueprints:

```text
prompt + context
  -> candidate blueprint capabilities
  -> composition graph
  -> field/facet/page/admin merge
  -> strict typed action plan
  -> dry-run/review/execute
```

The goal is foundation first. Do not start by expanding individual presets such
as Mabudo-like house projects. Preset-specific enrichment comes after the
composer exists and can consume richer capabilities safely.

## Business Goal

Users should be able to describe outcomes in plain language, including hybrid
requests such as:

- "Build a Mabudo-like house-project catalog with inquiry forms, realization
  stories, blog guidance, and appointment booking."
- "Create a product catalog, but add service inquiry, portfolio proof, FAQ, and
  an admin screen for editors."
- "Set up a local service directory with filters, lead capture, testimonials,
  and a simple editorial content hub."

The assistant should not need one hardcoded preset per combination. It should:
- pick a primary blueprint capability,
- select secondary capabilities,
- merge fields/facets/page sections/admin surfaces,
- avoid duplicate resources,
- expose a clear review plan,
- gate missing adapter domains instead of pretending they can execute,
- keep all writes inside current action contracts.

## Target Architecture

### Existing Layer

The current builder layer remains valid:

- `core/services/assistant/blueprints/catalogFamilyBlueprint.ts`
- `core/services/assistant/blueprints/catalogFamilyPresets.ts`
- `core/services/assistant/blueprints/houseProjectsCatalogBlueprint.ts`
- `core/services/assistant/blueprints/leadCaptureBlueprint.ts`
- `core/services/assistant/blueprints/productInquiryBlueprint.ts`
- `core/services/assistant/blueprints/portfolioProjects...` through catalog presets
- `core/services/assistant/blueprints/editorialContentHubBlueprint.ts`
- `core/services/assistant/blueprints/bookingServiceBlueprint.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionExecutorService.ts`

### New Layer

Add a composer layer:

```text
blueprints/
  blueprintCapabilityTypes.ts
  blueprintCapabilityRegistry.ts
  blueprintCandidateResolver.ts
  blueprintCompositionGraph.ts
  blueprintConflictResolver.ts
  blueprintSchemaMerger.ts
  blueprintFacetMerger.ts
  blueprintPageSectionComposer.ts
  blueprintAdminSurfaceComposer.ts
  blueprintActionAssembler.ts
  blueprintCompositionFixtures.ts
```

### Contract Sketch

```ts
type BlueprintCapability = {
  id: string;
  family: AssistantIntentFamily | string;
  label: string;
  description: string;
  provides: BlueprintProvide[];
  requires: BlueprintRequirement[];
  resources: BlueprintResourceContribution[];
  sections: BlueprintPageSectionContribution[];
  admin: BlueprintAdminContribution[];
  gates: BlueprintGate[];
  mergePolicy: BlueprintMergePolicy;
};

type BlueprintCompositionRequest = {
  prompt: string;
  context: AssistantActionContext;
  primary?: string;
  candidates: BlueprintCandidate[];
};

type BlueprintCompositionPlan = {
  primary: BlueprintCandidate;
  selected: BlueprintCandidate[];
  graph: BlueprintCompositionGraph;
  conflicts: BlueprintConflict[];
  actions: AssistantPlannedAction[];
};
```

## Composition Principles

1. **Primary + adjunct model**
   - One blueprint owns the primary domain.
   - Adjunct blueprints provide optional modules such as lead capture, proof,
     editorial, booking, FAQ, CTA, testimonials, or search/filtering.

2. **Typed actions only**
   - Composer output must normalize to existing `AssistantActionPlan`.
   - No provider-defined actions.
   - No new executor path unless a leaf explicitly promotes a typed action.

3. **Merge before action assembly**
   - Fields, listing facets, cards, page sections, admin screen sections, and
     routes are merged into a deterministic graph before actions are emitted.

4. **Conflict policy is explicit**
   - Slug collision, field collision, route collision, widget incompatibility,
     and permission gaps must produce deterministic conflict resolution or
     `needs_input`.

5. **Gated domains stay gated**
   - Booking, commerce checkout/payment, plugin install, and any not-yet-typed
     domain can appear as a planned/gated module but cannot execute until the
     typed adapter exists.

6. **No duplicate setups**
   - Existing resource catalog and planning state must be used to update/reuse
     resources where possible.

7. **Manual CMS editing remains first-class**
   - Generated collection resources must remain editable through admin UI.
   - The composer must open or link to a collection workspace after execution.
   - Detail templates reuse the Page Builder shell in detail-template mode, not
     a parallel editor stack.

## Sub-Tasks

Business-area tasks:

- `TASK-190-01_Blueprint_Capability_Manifest_and_Registry.md`
- `TASK-190-02_Intent_to_Blueprint_Candidate_Planning.md`
- `TASK-190-03_Composition_Graph_and_Conflict_Policy.md`
- `TASK-190-04_Field_Facet_and_Card_Merge_Foundation.md`
- `TASK-190-05_Page_Section_and_Widget_Composer.md`
- `TASK-190-06_Admin_Surface_Composer.md`
- `TASK-190-07_Action_Assembly_Execution_and_No_Duplicate_Safety.md`
- `TASK-190-08_Evaluation_Docs_and_Closure.md`

Technical leaf tasks:

- `TASK-190-01-01_Capability_Types_Normalizer_and_Invariants.md`
- `TASK-190-01-02_Migrate_Current_Blueprints_to_Capability_Registry.md`
- `TASK-190-02-01_Prompt_Candidate_Extraction_and_Ranking.md`
- `TASK-190-02-02_Provider_Context_and_Structured_Composition_Draft.md`
- `TASK-190-02-03_Composer_Shadow_Mode_and_Routing_Cutover.md`
- `TASK-190-03-01_Composition_Graph_Contract_and_Deterministic_Order.md`
- `TASK-190-03-02_Conflict_Resolver_Stable_Keys_and_Needs_Input.md`
- `TASK-190-04-01_Content_Schema_Field_Merge_Engine.md`
- `TASK-190-04-02_Listing_Facet_and_Card_Config_Merge_Engine.md`
- `TASK-190-05-01_Page_Section_Library_and_Composition_Slots.md`
- `TASK-190-05-02_Page_Upsert_Composition_Adapter.md`
- `TASK-190-05-03_Detail_Page_Composition_and_Content_Route_Sections.md`
  - `TASK-190-05-03-01_Detail_Page_Model_and_Schema_Contract.md`
  - `TASK-190-05-03-02_Detail_Page_Bindings_and_Field_Resolver.md`
  - `TASK-190-05-03-03_Detail_Page_Runtime_Renderer_and_Route_Resolution.md`
  - `TASK-190-05-03-04_Detail_Page_Preview_Cache_and_Invalidation.md`
  - `TASK-190-05-03-05_Detail_Page_Action_Schema_and_Executor_Adapter.md`
  - `TASK-190-05-03-06_Detail_Page_Composer_Fixtures_and_Runtime_Acceptance.md`
- `TASK-190-06-01_Admin_Screen_Layout_Composer.md`
- `TASK-190-06-02_Admin_Bindings_Routes_and_Permission_Safety.md`
- `TASK-190-06-03_Collection_Workspace_and_Template_Editor.md`
- `TASK-190-07-01_Composition_Action_Assembler.md`
- `TASK-190-07-02_No_Duplicate_Idempotency_and_Existing_Resource_Reuse.md`
- `TASK-190-07-03_Composition_Review_Metadata_and_Diagnostics.md`
- `TASK-190-08-01_Composition_Fixture_Matrix_and_Red_Team_Corpus.md`
- `TASK-190-08-02_Docs_Changelog_and_Closure.md`
- `TASK-190-08-03_Capability_Authoring_Guide_and_Observability.md`

## Implementation Order

1. Freeze capability manifest and registry types.
2. Migrate current blueprint packs into manifest metadata without changing
   generated actions.
3. Add deterministic candidate extraction and ranking.
4. Run candidate-level composer shadow mode only; keep production routing on
   the existing planner.
5. Add composition graph and conflict model.
6. Add merge engines for schemas, facets, card config, page sections, admin
   surfaces, and the first-class detail page runtime contract.
7. Add action assembly that reuses current typed actions plus review diagnostics.
8. Add no-duplicate and existing-resource reuse checks.
9. Run full plan composer shadow/cutover only after graph, merge, action
   assembly, and no-duplicate fixtures pass.
10. Add fixtures, authoring docs, observability, and live/provider evaluation coverage.
11. Add manual collection workspace coverage so generated collections remain
    editable without the assistant.

## Security Contract

- Visibility: internal assistant planning and execution only.
- Auth model: existing admin session on `/admin/api/assistant/actions/*`.
- RBAC:
  - planning uses existing read permissions for touched resource families,
  - dry-run uses target family read permissions,
  - execute uses current action-specific write/publish/delete permissions.
- CSRF: no change; assistant action POST endpoints require CSRF.
- Rate-limit bucket: existing `assistant` bucket.
- Reject-unknown validation:
  - capability manifests pass strict normalizers,
  - composition drafts reject unknown fields,
  - assembled action plans pass `actionPlanSchema`,
  - domain payloads pass owner schemas/normalizers.
- Anti-abuse:
  - no public write endpoint,
  - no autonomous mutation before review,
  - provider output remains draft-only,
  - conflicts and gated domains return `needs_input` or `gated`,
  - destructive actions keep policy safety checks.
- Public-write hardening:
  - if a composed plan creates public forms, it must use existing form access
    evaluators, nonce/captcha patterns, and form-domain public write contracts.
- Secret handling:
  - capability manifests, provider context, plan previews, and audit payloads
    must not include provider keys, tokens, sessions, cookies, raw submissions,
    or secret-like values.

## Testing Requirements

- Vitest:
  - capability manifest normalization,
  - registry coverage,
  - prompt candidate scoring,
  - graph order and conflict resolution,
  - schema/facet/card/page/admin merge units,
  - action assembly fixtures,
  - provider structured composition draft validation.
- Bun:
  - DB-backed no-duplicate/reuse behavior,
  - dry-run/execute for composed plans,
  - route/security tests when contracts change,
  - live provider matrix for representative composition prompts.
- Baseline commands:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - targeted `bun run vitest run --config vitest.config.ts tests/vitest/assistant/...`
  - DB-backed Bun suites when `DATABASE_URL` is available.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/WIDGET_PACK_MATRIX.md` when section/widget pack completeness changes
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New changelog entries when implementation leaves are completed.

## Acceptance Criteria

1. Current single-blueprint flows continue to work unchanged.
2. Current generated actions remain strict and executable only through existing
   action contracts.
3. Multiple blueprint capabilities can be selected for one prompt.
4. Composer can produce one deterministic action plan from selected capabilities.
5. Field/facet/card/page/detail-page/admin conflicts are explicit and
   test-covered.
6. Gated domains are included only as non-executable plan items.
7. Existing resources are reused or updated rather than duplicated.
8. Provider planning can suggest composition drafts but cannot supply actions.
9. At least five representative mixed prompts are covered by fixture tests.
10. Composed catalog outcomes can render visually controlled public detail pages
    through the runtime, with legacy detail rendering preserved as fallback.
11. Composer cutover cannot happen before assembled plans pass
    `actionPlanSchema` and dry-run parity fixtures.
12. Full composed-plan routing also requires no-duplicate checks and fixture
    coverage for selected primary/adjunct/gated capability combinations.
13. Generated collection outputs remain manually editable through a collection
    workspace that reuses existing Page Builder, Entries, Custom Screen,
    Listing, Form, SEO, and route editors where possible.
