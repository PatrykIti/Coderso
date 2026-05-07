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
  - supported mixed-capability and primary-plus-gated setup prompts now route through the composed planner path, while single-pack setup/refinement and deeper detail/media/no-duplicate cutover work still remain on the later leaves
  - compatible `content-type.upsert` fragments now merge server-side through `blueprintSchemaMerger.ts` plus the existing content schema validator, so additive field/enum extensions stay in one strict action instead of surfacing as duplicate-resource drift
  - compatible listing facet/card fragments now merge through schema-backed listing owners, and the assembler widens `listing-query.upsert.fields` automatically so merged filters/card bindings keep the runtime projection fields they need
  - assistant-facing page section aliases and merge slots now resolve through a deterministic library over the current page-builder widget registry and alias-specific `modulePackMatrix` helper mappings; unsupported aliases stay gated instead of inventing a second section catalog
  - page section seed data still normalizes through the widget owner, but raw media URLs stay gated until the assistant has trusted media-library ids rather than arbitrary external/upload payloads
  - catalog capabilities can already describe latent `detail-page` intent in metadata, but executable detail-page/runtime/admin flows remain deferred to later `TASK-190` slices
  - provider prompt packaging now carries bounded capability summaries for setup/composer evaluation, while generic provider planning still uses the current `cms_operation_draft` response contract
  - candidate shadow diagnostics can be exposed only through a local/test env gate; they remain metadata-only even though the bounded mixed-setup cutover is now live

Current capability limits:
- `docs-only` answers are read-only and never return executable action plans.
- `LLM Guide` can plan, dry-run, and execute only the strict typed actions
  listed in `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`.
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
  - `core/services/assistant/blueprints/blueprintActionAssembler.ts`
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
- site-kit actions require `LLM Guide` availability (`llmAvailable=true`) and must not run as docs-only fallback

Security:
- CSRF required on all POST endpoints
- Rate limit:
  - `assistant`: action-plan / dry-run / execute endpoints

## Admin UI

Primary UI:
- `core/admin/ui/setup/AiSiteWizard.tsx` (state/orchestration)
- `core/admin/ui/setup/AiSiteWizardSteps.tsx` (step rendering)

Wizard stages:
1. Business profile
2. Goals
3. Recommendation
4. Plan review (step toggles + explainable action map)
5. Execute (apply/dry-run + validation checks + unresolved list)

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
