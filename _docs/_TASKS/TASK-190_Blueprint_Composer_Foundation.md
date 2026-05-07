# TASK-190: Blueprint Composer Foundation
# FileName: TASK-190_Blueprint_Composer_Foundation.md

**Priority:** High
**Category:** Assistant/Core + Product Architecture + Blueprint Planning
**Estimated Effort:** Very Large
**Dependencies:** TASK-172, TASK-178, TASK-188, TASK-189
**Status:** In Progress (2026-05-07)

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
- Public content list/detail rendering already has a working runtime seam through
  `site.contentRoutes`, `core/server/publicSite.tsx`, and
  `core/site/renderPublicEntry.tsx`; this is a runtime presentation contract, not
  the full assistant composition/orchestration layer.
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

The current delivered slice remains foundation-first. Capability manifests,
candidate ranking, graph fragments, and assembler helpers now drive the local
setup planner for supported mixed-capability and primary-plus-gated setup
requests, but single-pack setup/refinement routing plus the broader
detail/media/no-duplicate cutover stay deferred until the later rollout leaves
close.
Compatible `content-type.upsert` fragments can now also merge into one
validator-backed content schema action. Compatible listing facet/card fragments
can now also merge through schema-backed listing owners and widen
`listing-query.upsert.fields` automatically for the required projection paths,
while the later detail-page/workspace/no-duplicate slices remain deferred.

This task is not limited to theme templates or a narrow detail-template editor.
The business target remains full assistant-composed setup of a site/service
within the current typed action boundary:

- content model and route setup,
- public landing/list/detail pages,
- supporting modules such as forms, FAQ, editorial, proof, SEO, and menus,
- media-aware setup and edits: selecting existing gallery assets, attaching
  existing media to content/gallery fields, replacing/removing media references,
  and writing widget/page content that points at existing media ids,
- admin editing surfaces for the generated resources.

Where the repo already has an owner seam with the same business scope, TASK-190
must extend that seam instead of creating a parallel system. In practice this
means:

- generic CMS/admin operations continue to use `assistantOperationPolicy`,
- current executable blueprint packs remain the starting point,
- existing `site-kit` planning through `buildGuidedSiteBuilderPlanResult(...)`
  / `site-kit.recommend` / `site-kit.install` remains a separate explicit
  entrypoint owned by the current site-kit flow unless a later task
  intentionally converges those paths,
- current public content detail runtime is reused and extended where it matches
  the detail-page business need,
- detail-page domain types/schema/normalizer/runtime/admin API stay under one
  domain owner in `core/services/content/*`; blueprint code only composes inputs
  against that contract,
- public detail route ownership stays in `site.contentRoutes`; detail-page
  documents are linked from routes through `detailPageId` instead of defining a
  second runtime routing source of truth,
- current page/widget-template/custom-screen editor patterns are reused for
  manual editing surfaces,
- collection workspace and any assistant follow-up context must extend the
  current `adminPaths` / `prefetchAdminRoute` / admin-context seams rather than
  introducing parallel route-to-surface workflows,
- assistant media work must stay on existing media/content/page/widget seams:
  raw upload bytes are never provider/action payloads, newly attached user files
  must first become media-library assets through the media owner flow, and then
  the composer may reference those assets through `media.reference.attach`,
  entry/page/widget owner actions, or `needs_input` when the asset does not yet
  exist,
- assistant resource catalogs used by the composed blueprint/shadow cutover
  paths must be server-derived from current admin-context/catalog owners.
  Clients may request catalog inclusion through the reviewed flag, but they
  must not submit a trusted `resourceCatalog`, and catalog-backed LLM Guide
  planning for those cutover paths remains gated by the existing LLM
  availability checks,
- when a leaf widens an existing contract, it should name the concrete write
  owner, read/cache owner, and admin/UI transport owner for that widened seam
  instead of leaving responsibility implicit,
- planner/composer/workspace layers may compose and consume existing seams, but
  they must not become hidden persistence owners, sidecar transport owners, or
  second sources of truth for the same resource.

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
- compose the resulting public/admin resources into one coherent site/service
  setup,
- avoid duplicate resources,
- expose a clear review plan,
- gate missing adapter domains instead of pretending they can execute,
- keep all writes inside current action contracts.

## Target Architecture

### Existing Layer

The current builder layer remains valid:

- `core/services/assistant/blueprints/businessBlueprintTypes.ts`
- `core/services/assistant/blueprints/catalogFamilyBlueprint.ts`
- `core/services/assistant/blueprints/catalogFamilyPresets.ts`
- `core/services/assistant/blueprints/houseProjectsCatalogBlueprint.ts`
- `core/services/assistant/blueprints/leadCaptureBlueprint.ts`
- `core/services/assistant/blueprints/productInquiryBlueprint.ts`
- portfolio projects through `core/services/assistant/blueprints/catalogFamilyPresets.ts`
- `core/services/assistant/blueprints/editorialContentHubBlueprint.ts`
- `core/services/assistant/blueprints/bookingServiceBlueprint.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/assistant/operationPolicy/assistantOperationPolicy.ts`
- `core/services/assistant/adminContextCatalogs.ts`
- `core/services/assistant/activeSurfaceHydration.ts`
- `core/server/publicSite.tsx`
- `core/site/renderPublicEntry.tsx`
- `core/site/contentRouteMatcher.ts`

### New Layer

Add a composer layer:

```text
blueprints/
  blueprintCapabilityTypes.ts
  blueprintCapabilityRegistry.ts
  blueprintCandidateResolver.ts
  blueprintProviderContext.ts
  blueprintComposerShadow.ts
  blueprintCompositionGraph.ts
  blueprintConflictResolver.ts
  blueprintSchemaMerger.ts
  blueprintFacetMerger.ts
  blueprintPageSectionComposer.ts
  blueprintAdminSurfaceComposer.ts
  blueprintActionAssembler.ts
  blueprintExistingResourceMatcher.ts
  blueprintCompositionMetadata.ts
```

Test-only fixture corpus lives under the evaluation lane, not inside the
runtime/service layer:

```text
tests/vitest/assistant/fixtures/
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
   - Collection workspace must model canonical collection resources plus
     zero-many linked secondary resources instead of assuming every hybrid
     outcome collapses to one form/page/template per tab.

8. **Reuse existing owner seams**
   - Current blueprint setup remains the product foundation for full-site
     generation from complex prompts; the composer generalizes it instead of
     replacing it with theme-only templating.
   - Current content detail rendering remains the runtime entry point and theme
     override seam; any new detail-page document contract must plug into that
     flow rather than bypass it.
   - Detail-page domain contract stays owned by content services; blueprint
     manifests/composers may reference `detail-page` resources but must not
     define a second domain schema/normalizer for the same resource.
   - Existing `site-kit` routing in `actionPlannerService.ts` remains the owner
     of explicit site-kit setup. TASK-190 generalizes current blueprint-family
     packs; it does not silently replace the site-kit short-circuit with a
     second overlapping setup flow.
   - Runtime route ownership stays with `site.contentRoutes` plus
     `detailPageId`; detail-page documents do not become a second route registry.
   - Generic CMS/admin mutation planning remains owned by operation policy and
     `cms_operation_draft`; blueprint composition is a separate setup path, not a
     second generic mutation planner.

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
  - `TASK-190-05-03-07_Detail_Page_Route_Linking_and_Internal_Admin_API.md`
  - `TASK-190-05-03-08_Detail_Page_Generic_Assistant_Resource_Integration.md`
- `TASK-190-06-01_Admin_Screen_Layout_Composer.md`
- `TASK-190-06-02_Admin_Bindings_Routes_and_Permission_Safety.md`
- `TASK-190-06-03_Collection_Workspace_and_Template_Editor.md`
  - `TASK-190-06-03-01_Collection_Workspace_Route_Read_Model_and_Canonical_Resource_Linking.md`
  - `TASK-190-06-03-02_Detail_Template_Editor_Surface_and_Shared_Builder_Seams.md`
  - `TASK-190-06-03-03_Collection_Workspace_Assistant_Context_and_Follow_Up_Integration.md`
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
9. Add manual collection workspace coverage so generated collections remain
   editable without the assistant.
10. Add fixtures, authoring docs, observability, and live/provider evaluation
    coverage needed to prove cutover safety.
11. Run full composed-plan routing/cutover only after graph, merge, action
    assembly, no-duplicate checks, manual collection editability, and
    `TASK-190-08` evaluation coverage are green.

## Dependency Notes

- The detail-page owner wave is a hard prerequisite for downstream workspace and
  generic-resource slices. In practice `TASK-190-05-03-01`,
  `TASK-190-05-03-04`, `TASK-190-05-03-05`, and `TASK-190-05-03-07` must land
  before `TASK-190-06-03-*` and `TASK-190-05-03-08` start consuming those
  seams.
- `TASK-190-06-03-*` and `TASK-190-05-03-08` are consumer slices. They must not
  backfill detail-page model/schema, preview-token storage, action/executor
  ownership, or route-link/admin-API responsibilities that belong to the
  `TASK-190-05-03-*` owner wave.
- The dependency graph intentionally uses narrow direct blockers plus transitive
  blockers. For example `TASK-190-06-03-02` and `TASK-190-06-03-03` depend on
  `TASK-190-05-03-07`, which already depends on preview/action leaves; that does
  not make the workspace/editor/context wave safe to start before those
  transitive seams are physically in place.
- If deterministic collection-link metadata is missing during implementation,
  extend the current page/custom-screen/detail-page owner seams first and only
  then consume that metadata from workspace, matcher, assistant-context, or
  generic policy/resource slices.
- Do not shorten this order with browser-only or planner-only heuristics. If a
  consumer slice cannot resolve canonical links from existing owner seams yet, it
  should stay `unresolved`/gated until the upstream contract lands.
- Full composed-plan routing is the last rollout gate, not an intermediate
  milestone. Even if action assembly and no-duplicate checks are ready, do not
  flip user-visible composer routing before `TASK-190-06-03-*` keeps generated
  collections manually editable and `TASK-190-08` proves the rollout gates.
- Once `detail_page_documents.content_type_id` exists, content-type deletion must
  treat detail pages as real dependent resources. Auto-pruning
  `site.contentRoutes` placeholders is not enough: deleting a content type with
  linked detail-page documents must return a machine-readable
  `content_type_has_detail_pages`-style conflict unless a later task explicitly
  designs a safe cascade.

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
  - provider and client payloads cannot smuggle raw media bytes, signed media
    URLs, client-authored `resourceCatalog`, or executable action arrays,
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
  - provider structured composition draft validation,
  - server-derived resource catalog packaging/rejection of client-supplied
    catalogs,
  - media reference planning for existing gallery assets, widget/page refs, and
    `needs_input` for attached files that are not yet media-library assets.
- Bun:
  - DB-backed no-duplicate/reuse behavior,
  - dry-run/execute for composed plans,
  - route/security tests when contracts change,
  - content-type delete conflict coverage for content types that still own
    detail-page documents,
  - live provider matrix for representative composition prompts.
- Baseline commands:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - targeted `bun run vitest run --config vitest.config.ts tests/vitest/assistant/*.test.ts`
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
14. Detail page route linking, internal admin APIs, action registry/cache/UI
    labels, and capability manifests are explicit for `detail-page`.
