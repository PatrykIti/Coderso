# Assistant Site Builder

## Purpose

Assistant Site Builder is a typed guided entry point for Coderso setup:

`intake -> plan -> actions -> execute -> validate`

It is designed for non-technical users: every recommendation is mapped to explicit system actions before execution.

It now runs through the same `LLM Guide` action engine as the floating assistant panel:

`prompt -> typed plan -> dry-run -> execute`

The floating `LLM Guide` also supports reviewed resource operations for existing
admin resources through the same action engine. Those edits/deletes must resolve
targets from active context or server-side catalogs, preview conflicts before
execution, and remain inside the strict typed action set.

The same flow now has a generic CMS operation foundation:

`prompt -> policy-guided strict CMS operation draft -> target resolver -> read-only inspection or typed action plan`

Read-only inspection plans can list bounded CMS candidates, such as matching pages
or custom screens, without exposing dry-run or execute controls.
In `LLM Guide` mode the floating assistant sends prompts to `/assistant/actions/plan`
by default; `docs-only` remains the documentation chat path.
Planner responses can be tagged as `docs`, `inspection`, `action_plan`,
`needs_input`, or `gated` so the admin UI can render guidance, candidate lists,
reviewable actions, disabled clarification, or blocked states without guessing
from prompt text.
Read-only inspection candidate lists can be reused as short-lived planning state
for follow-up prompts such as "usun pierwszy" or "usun te dwa pierwsze"; the
server still re-resolves candidates before planning any mutation.

Current implemented guide blueprint:
- `house-projects-catalog`
- shared catalog-family business blueprint packs for:
  - house projects
  - product catalog
  - portfolio projects
  - services directory
- lead capture site pack:
  - public inquiry form
  - simple landing page with form embed
- booking service business pack:
  - registered as gated until booking action adapters are implemented
- product inquiry catalog pack:
  - product catalog
  - public inquiry form
  - checkout/payment remains gated
- portfolio case-study pack:
  - portfolio catalog
  - case-study result summary
  - testimonial field
- editorial content hub pack:
  - public hub page
  - posts-feed widget
  - no post mutations
- full-service architecture studio site pack:
  - seven public pages: `/`, `/uslugi`, `/portfolio`, `/o-nas`, `/proces`,
    `/referencje`, `/kontakt`
  - services and portfolio catalogs with route-linked detail templates
  - six published sample entries
  - primary and footer navigation
  - lead-capture form and page SEO
  - launch readiness metadata with curated media profile references; arbitrary
    media upload/import remains gated
- site-kit guide actions:
  - `site-kit.recommend`
  - `site-kit.install`
  - `site-kit.validate`
- solution-kit refinements:
  - gated until LLM Guide has server-derived installed-kit resource context
- creates:
  - content type
  - custom screen
  - listing query
  - listing template
  - public catalog page
  - public detail routes
- capability registry/composer foundation:
  - current packs and adjunct/gated modules now register through a strict capability manifest and registry layer
  - mixed setup prompts can now be analyzed into primary + adjunct capability candidates inside the foundation layer
  - composed graph/assembler helpers still reuse the current strict typed action families; no parallel blueprint executor was introduced
  - supported mixed-capability and primary-plus-gated setup prompts now route through the composed planner path; single-pack setup/refinement still uses the existing legacy pack builders outside this bounded mixed-setup cutover
  - architecture-studio/service prompts that mention portfolio, offer/services,
    and contact now route to a composed scaffold of `portfolio-projects`,
    `services-directory`, and `lead-capture-site` instead of collapsing to the
    house-projects catalog; each composed fragment builds from its own intent
    family so adjunct catalogs do not inherit the primary catalog preset
  - compatible `content-type.upsert` fragments now merge server-side through `blueprintSchemaMerger.ts` plus the existing content schema validator, so additive field/enum extensions stay in one strict action instead of surfacing as duplicate-resource drift
  - compatible listing facet/card fragments now merge through schema-backed listing owners, and the assembler widens `listing-query.upsert.fields` automatically so merged filters/card bindings keep the runtime projection fields they need
  - assistant-facing page section aliases and merge slots now resolve through a deterministic library over the current page-builder widget registry and alias-specific `modulePackMatrix` helper mappings; unsupported aliases stay gated instead of inventing a second section catalog
  - page section seed data still normalizes through the widget owner; arbitrary
    raw media URLs stay gated until the assistant has trusted media-library ids
    rather than provider/user external-upload payloads. Site-builder blueprints
    may use the shared backend-owned curated media profile adapter to attach
    license-documented public media URLs in explicit non-media fields and page
    blocks. The architecture-studio set is only the first profile.
  - blueprint graph conflicts now include media missing/ambiguous/upload/delete
    gates plus manifest permission gaps, so media and privileged boundaries
    return `needs_input`/`gated` before executable action assembly instead of
    silently becoming partial plans
  - canonical collection pages now compose listing/filter/form sections through `blueprintPageSectionComposer.ts`, and `page.upsert` persists `PageData.settings.collectionLink` through the existing page owner seam so workspace/no-duplicate slices resolve canonical links from owner metadata instead of route heuristics; assistant transport locators resolve back into those persisted ids before page writes land
  - final TASK-190 closure is documented through `_docs/BLUEPRINT_COMPOSER.md`, the fixture/live matrices, redacted diagnostics helpers, task board, and changelog; future pack enrichment must extend those owner seams instead of adding a parallel composer path
  - catalog admin review screens now compose their `screen-*` custom-screen
    blocks through `blueprintAdminSurfaceComposer.ts`; the helper merges admin
    groups deterministically, validates referenced content schema fields,
    rejects secret-like field references, and keeps output on the existing
    `custom-screen.upsert` `blocks` / `bindings` transport shape
  - catalog admin bindings now compose through `blueprintBindingComposer.ts`,
    which keeps the existing `widgetId + propPath + field + mode` contract while
    rejecting unsafe or secret-like paths; generated canonical screens persist
    `collectionRole` / `compositionKey` through the current custom-screen schema,
    service, admin cache, and assistant action executor seams
  - catalog capabilities can already describe `detail-page` intent in metadata, and the current `TASK-190` slices now cover persisted detail-page documents, published/runtime detail rendering, shared preview handling, the executable `detail-page.upsert` assistant action, `setting.content-route.upsert` `detailPageId` route-linking, the internal `/admin/api/detail-pages*` CRUD/lifecycle/revision route family, admin client/cache parity, local deterministic fixture/runtime acceptance, collection-workspace route/read/cache/UI shell, the manual detail-template editor, assistant follow-up context for workspace/detail-page surfaces, catalog-backed no-duplicate reuse, and generic `detail-page` resource vocabulary/policy/provider packaging through the current owner seams
  - generic CMS operation drafts may now inspect/find `detail-page` resources from server-derived catalog summaries or active detail-template context; free-text detail-page names are not trusted targets, and generic `detail-page` mutations remain gated so execution stays on the local `detail-page.upsert` assembler/executor path
  - `blueprintExistingResourceMatcher.ts` consumes the server-derived resource catalog before executor handoff: detail pages reuse stable/canonical linked ids, pages reuse persisted `PageData.settings.collectionLink`, custom screens use `collectionRole` / `compositionKey`, listing query name collisions block as `needs_input`, and media reuse stays exact-id only. During execute only, a single exact-name custom screen with null `collectionRole` and null `compositionKey` may be upgraded as a legacy compatibility fallback; same-name screens with other metadata still block as dependency conflicts.
  - `blueprintCompositionMetadata.ts` attaches strict
    `metadata.blueprintComposition` diagnostics to composed ready and
    needs-input plans: primary/adjunct/gated capability ids, merged resource
    ownership, existing-resource reuse matches, resolved/unresolved conflicts,
    and redacted deterministic candidate scores are available to review UI/tests
    without exposing raw provider output
  - `blueprintCompositionDiagnostics.ts` provides an internal/test-only support
    payload for prompt hashes, selected/gated capability ids, action assembly
    type/count traces, conflict snapshots, no-duplicate matcher decisions, and
    redacted provider-draft shape without raw prompt/provider snippets
  - provider prompt packaging now carries bounded capability summaries for setup/composer evaluation, while generic provider planning still uses the current `cms_operation_draft` response contract
  - candidate shadow diagnostics can be exposed only through a local/test env gate; they remain metadata-only even though the bounded mixed-setup cutover is now live

Current capability limits:
- `docs-only` answers are read-only and never return executable action plans.
- `LLM Guide` can plan, dry-run, and execute only the strict typed actions
  listed in `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`.
- Full-service architecture-studio prompts route to the
  `service-business-full-site` capability and emit a reviewed 49-action plan
  for pages, catalogs, route-linked detail templates, published samples,
  primary/footer navigation, lead capture, SEO, and launch readiness. E2E
  acceptance still must verify public runtime pages, listings, detail routes,
  SEO basics, and mobile/desktop layout after execution.
- Raw media upload/import/generation is not part of full-service execution yet.
  Site-builder plans can satisfy media readiness only through backend-owned
  curated media profiles with license-documented URLs stored in explicit string
  fields and page blocks. `xFieldType: "media"` fields such as `heroImage` and
  `gallery` remain media-library asset IDs. The profile contract can describe
  future media kinds, but current executable readiness covers curated images
  only; video remains gated until its renderer and validation contract ship.
- Booking resources, checkout/payment setup, webhook automation, nested page
  widget patches, and installed solution-kit refinements remain gated until
  their adapters, permissions, and hardening are explicit.
- No guide flow supports arbitrary code execution or autonomous mutation
  without review/confirm.
- Existing-resource edits/deletes are reviewed resource operations, not
site-builder shortcuts. They still require typed plans, dry-runs, per-action
permissions, idempotency, and conflict-aware execution.
- CMS inspection/find prompts are non-mutating. They can return candidate plans
  with no executable actions, and follow-up mutation still has to resolve to a
  reviewed typed action plan.
- Provider planning prefers a strict CMS operation draft response. The backend
  validates and repairs/falls back locally before any target resolution or action
  planning can proceed.
- Provider output is operation-draft-only. Provider-supplied `actions[]`, ids,
  and executor payloads are rejected or ignored; the backend must reconstruct any
  executable plan locally from policy and trusted context.
- Provider prompt guidance, provider-facing resource registry metadata, and the
  strict CMS operation draft JSON schema are generated from
  `assistantOperationPolicy`; gated/redacted surfaces are described from policy
  rather than duplicated prompt text.
- TASK-188 completed the policy cutover: resolver/filtering, action mapping,
  destructive/bulk safety, follow-up target memory, and live route coverage all
  read policy metadata before any strict action plan can be returned.
- Structured provider output is capability-driven per provider/model family. When
  strict JSON schema output is supported, the provider adapter can request it; when
  it is not supported, the planner falls back to prompt-only JSON plus repair and
  strict local validation.
- OpenAI direct and OpenRouter are provider adapters behind the same planner
  contract; provider credentials are configured through Settings -> Integrations.
- The floating assistant persists bounded browser-local conversation state so
  safe transcript, active plan context, and planning-state hints survive closing
  the window and SPA route transitions.

## Runtime Contract

Core domain service:
- `core/services/assistant/siteBuilderExecutor.ts`
- `core/services/assistant/siteBuilderPlanAdapter.ts`
- generic guide runtime:
  - `core/services/assistant/actionPlannerService.ts`
  - `core/services/assistant/actionExecutorService.ts`
  - `core/services/assistant/blueprints/blueprintCapabilitySchema.ts`
  - `core/services/assistant/blueprints/blueprintCapabilityRegistry.ts`
  - `core/services/assistant/blueprints/blueprintCandidateResolver.ts`
  - `core/services/assistant/blueprints/blueprintCompositionGraph.ts`
  - `core/services/assistant/blueprints/blueprintFacetMerger.ts`
  - `core/services/assistant/blueprints/blueprintCardConfigMerger.ts`
  - `core/services/assistant/blueprints/blueprintPageSectionTypes.ts`
  - `core/services/assistant/blueprints/blueprintPageSectionLibrary.ts`
  - `core/services/assistant/blueprints/blueprintPageSectionComposer.ts`
  - `core/services/assistant/blueprints/blueprintActionAssembler.ts`
  - `core/services/assistant/blueprints/blueprintCompositionMetadata.ts`
  - `core/services/assistant/blueprints/blueprintCompositionDiagnostics.ts`
  - `core/services/assistant/blueprints/blueprintProviderContext.ts`
  - `core/services/assistant/blueprints/blueprintCompositionDraftSchema.ts`
  - `core/services/assistant/blueprints/blueprintComposerShadow.ts`

Public functions:
- `previewGuidedSiteBuilderPlan(input)`
- `executeGuidedSiteBuilder(input)`
- `validateGuidedSiteBuilderRun({ runId })`

## Data Model

Plan result contains:
- `plan` (existing site builder recommendation output)
- `selectedKitId`, `selectedKitTitle`
- `enabledStepIds`
- `actions[]` where each action has:
  - `stepId`
  - `target` (`settings`, `content_type`, `form`, `page`, `menu`, `template`, `qa`)
  - `resourceKey`
  - `title`, `description`
  - `required`
- `modules` (`required`, `recommended`, `optional`)

Execute result extends plan result with:
- `execution` (solution kit install response)
- `validation`:
  - `status`: `ok | warning | failed`
  - `checks[]`
  - `unresolvedItems[]`

## Internal API

All endpoints are internal (`/admin/api/*`) and session-protected:

- `POST /assistant/actions/plan`
- `POST /assistant/actions/dry-run`
- `POST /assistant/actions/execute`

The old `/assistant/site-builder/*` route family is retired. Site-kit work is expressed as typed actions under `/assistant/actions/*`.

RBAC:
- base assistant action permissions:
  - `settings:read` + `content:read`: `plan`, `dry-run`
  - `settings:write` + `content:write` + `content:publish`: `execute`
- additional site-kit permissions:
  - `solution-kits:read` when planning or dry-running `site-kit.*` actions
  - `solution-kits:write` when executing `site-kit.*` actions
- site-kit actions require `LLM Guide` availability (`llmAvailable=true`) and
  must not run as docs-only fallback
- catalog-backed planning through `includeResourceCatalog=true` also requires
  `LLM Guide` availability and fails closed instead of degrading into an
  under-informed local mutation path
- active `detail-page` follow-up context requires `content:read` plus
  `widgets:read`; workspace follow-up packages are server-hydrated from the
  collection-workspace read model and browser payloads may send only the
  identity-only `collectionWorkspaceHint`

Security:
- CSRF required on all POST endpoints
- Rate limit:
  - `assistant`: action-plan / dry-run / execute endpoints

## Admin UI

Primary UI:
- `core/admin/ui/setup/AiSiteWizard.tsx` (state/orchestration)
- `core/admin/ui/setup/AiSiteWizardSteps.tsx` (step rendering)

Wizard stages:
1. Site/entity profile
2. Goals
3. Recommendation
4. Plan review (step toggles + explainable action map)
5. Execute (apply/dry-run + validation checks + unresolved list)

## Guided Intake Vocabulary

TASK-407 adds a shared service-owned intake vocabulary before UI-specific Basic
or Advanced flows are rendered. The source of truth is:

- `core/services/assistant/assistantSiteBuilderIntakeTypes.ts`
- `core/services/assistant/assistantSiteBuilderIntakeRegistry.ts`

Modes:
- `basic` is the guided default for non-technical users. It can ask simple
  questions and choose safe defaults for page roles, sections, menu, hero, and
  media policy.
- `advanced` uses the same session contract but exposes additional controlled
  choices for content-engine, design-preset, and reference-intake decisions.

Canonical step ids:
- `business-profile`
- `site-goals`
- `site-map`
- `menu`
- `homepage-sections`
- `hero`
- `subpages`
- `media-policy`
- `content-engine`
- `design-preset`
- `reference-intake`
- `review`

The canonical registry is intentionally generic. Page and section registries use
roles such as services, products, portfolio, blog, team, locations, FAQ, proof,
process, lead capture, and content feed instead of hardcoded industries. Later
normalizers and adapters map user answers and business context onto these roles,
then compile the reviewed result into the existing `context.siteKit` contract.

Media intake is policy-based:
- `curated` allows backend-owned curated media profiles with documented public
  image licenses.
- `library` uses only existing media-library assets.
- `placeholder` creates reviewable media slots without external media.

Unknown mode, step, option-registry, or option ids must fail closed through the
service-owned registry helpers before route validation, provider planning, or
execution.

## Auditability

Execution writes assistant metadata to run options (`assistantSiteBuilder`), including:
- selected kit
- enabled step IDs
- concrete actions

This keeps rerun/diagnostics deterministic and inspectable.

## Acceptance Matrix

The current `LLM Guide` acceptance matrix is maintained in
`_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`. It lists executable packs, gated packs,
route/security coverage, and the owning Bun/Vitest test lanes.
