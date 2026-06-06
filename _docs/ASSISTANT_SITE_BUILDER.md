# Assistant Site Builder

## Purpose

Assistant Site Builder is a typed guided entry point for Coderso setup:

`intake -> plan -> actions -> execute -> validate`

It is designed for non-technical users: every recommendation is mapped to explicit system actions before execution.

It now runs through the same `LLM Guide` action engine as the floating assistant panel:

`prompt -> typed plan -> dry-run -> execute`

The admin site-builder intake UI owns its local progress through
`assistantSiteBuilderIntakeUiState.ts`. That reducer is deliberately client-only:
submitted-answer acknowledgements from the server are authoritative, background
revalidation preserves the dirty marker for the current unsaved step, stale cache
is discarded, and restored state contains only the bounded redacted browser
snapshot. The reducer gates `review -> plan -> dry-run -> execute` transitions
before the existing action engine receives a handoff. It does not add a parallel
route payload or persist raw answers, provider text, provider keys, signed URLs,
upload bytes, cookies, or auth material in browser storage.

The reviewed intake handoff is version-bound. The server derives a deterministic
review hash from the normalized non-review answers, the UI must echo that hash
when the user confirms the final review, and any later answer change marks the
confirmation stale. The final review summary covers pages, menu/footer, hero,
homepage sections, subpages, content engines, beginner custom screens, media
policy, SEO defaults, lead capture, and visible gates. The backend reuses the
same review-summary gate contract before compiling the session to `siteKit`, so
blocking review gates cannot be bypassed by crafting a direct plan request.
Only after that reviewed handoff returns a strict `site_kit` action plan can the
normal dry-run and execute controls appear.

The current reviewed intake surface lives in the floating `LLM Guide` stepper.
TASK-407-06-L06 retired the older `AiSiteWizard` manual siteKit wizard, so the
admin UI no longer exposes a parallel plan/apply/rerun/clone/rollback handoff.
Solution Kits remains a read-only catalog surface with a CTA that opens the
reviewed `LLM Guide` site-builder intake.

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
  the window and SPA route transitions. The cache rejects stale, oversized, or
  unknown-key payloads, redacts prompt-poisoning phrases and signed URLs, and
  drops secret-like text before writing to localStorage.

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
  - `solution-kits:read` when planning reviewed site-builder intake or
    dry-running `site-kit.*` actions
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
- `core/admin/ui/assistant/AssistantPanel.tsx` renders the floating `LLM Guide`
  stepper and review/dry-run/execute controls.
- `core/admin/ui/assistant/assistantPanelEvents.ts` exposes the typed event used
  by admin CTAs to open the panel in `llm-guide` mode.
- `core/admin/ui/kits/SolutionKitsPage.tsx` keeps kit details read-only and
  offers `Open LLM Guide` instead of a direct manual wizard.

The retired legacy wizard files are intentionally absent:
- `core/admin/ui/setup/AiSiteWizard.tsx`
- `core/admin/ui/setup/AiSiteWizardSteps.tsx`
- `core/admin/ui/setup/aiSiteWizardValidation.ts`

Reviewed stages:
1. Intake answers in Basic or Advanced mode
2. Review summary with gates
3. Strict action-plan assembly from a reviewed active session
4. Dry-run preview
5. Execute with validation evidence

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
- `hero`
- `homepage-sections`
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
then compile the reviewed result into the backend-owned strict siteKit input.

Media intake is policy-based:
- `curated` allows backend-owned curated media profiles with documented public
  image licenses.
- `library` uses only existing media-library assets.
- `placeholder` creates reviewable media slots without external media.

Advanced design presets are also backend-owned. The `designPresets` option
registry exposes `modern`, `editorial`, `retro`, `minimal`, `bold`, `luxury`,
and `utilitarian`; each maps to supported tone, contrast, density, typography,
image-treatment, spacing, corner-radius, accent, and section-role facts in
`assistantSiteBuilderIntakeDesignPresets.ts`. Advanced `design-preset` answers
may choose only one registry id plus bounded plain-language notes; notes are
accepted only when tied to a selected backend preset. Unknown ids, remote URLs,
HTML/CSS/script fragments, admin/action ids, and executable style directives
fail closed before review. Preset facts include review-only `themeTokenHints`
that pass the existing `DesignTokenOverrides` key contract, but current preset
facts intentionally carry the `theme-application-pending` gap until later leaves
apply those hints through the reviewed SiteKit/action adapter.

Advanced layout options are backend-owned in
`assistantSiteBuilderIntakeAdvancedOptions.ts`. The `advancedMenuBehaviors`,
`advancedHeroVariants`, and `advancedSectionVariants` registries expose only
stable ids for existing Navigation, Hero, Form, Listings, Engagement, and CTA
widget capabilities. Advanced menu choices resolve to Navigation widget facts
such as `sticky`, `transparent`, `mobileMode`, reviewed menu structure, and a
CTA target page role; arbitrary CTA hrefs are rejected. Advanced hero choices
resolve to current Hero widget variants (`centered`, `split`, `media-left`,
`media-center`). Advanced section choices resolve to existing widget variants
backed by `modulePackMatrix.assistantPageSections`; mismatched section roles,
design-preset support gaps, or conflicting menu choices become review gates
instead of invented widgets, CSS, layout code, or executor actions.

Advanced reference intake is bounded by
`assistantSiteBuilderIntakeReferencePolicy.ts`. Session answers may carry
plain-language `referenceNotes`, `textBrief`, existing `mediaAssetIds`, and
temporary reference ids; arbitrary `remoteUrls` are not accepted as session
answers and are converted to explicit gates only inside the backend reference
policy. Candidate media/temp ids stay answer-local until they are validated by
`normalizeSafeReferenceInput` with injected deps; they are not promoted into
provider facts by the synchronous session normalizer. Existing media-library
ids must be resolved through injected readable media deps before use. Temporary
references influence design evidence only when they are scanned, supported by
type, size-bounded, and converted to safe digests. Filenames, EXIF/metadata, OCR
text, alt text, extracted text, signed URLs, cookies, and token-like values are
redacted before facts or provider context. Provider context never includes raw
reference material, bytes, raw metadata, signed URLs, or raw reference ids; it
exposes only redacted text-reference presence, a stable digest, and
`rawIncluded:false`.

Reviewed reference design briefs are owned by
`assistantSiteBuilderIntakeReferenceBrief.ts`. A sanitized `SafeReferenceInput`
can produce only enumerated color, layout, density, typography, and
image-treatment hints plus redacted warning/gate metadata. The brief source is
represented by a digest-only fingerprint that excludes raw reference ids,
filenames, OCR/extracted text, metadata, and URLs. Reference brief facts are not
merged into `AssistantSiteBuilderIntakeFacts` until
`mergeReviewedReferenceDesignBrief` receives explicit confirmation; otherwise a
`reference_review_required` gate is returned. Provider context receives only the
reviewed enum ids, warning/gate codes, source digest, and `rawIncluded:false`;
reference briefs never emit executable actions, media imports, CSS, RBAC/CSRF
changes, or review-bypass instructions.

Unknown mode, step, option-registry, or option ids must fail closed through the
service-owned registry helpers before route validation, provider planning, or
execution.

Basic planner progression is owned by
`core/services/assistant/assistantSiteBuilderIntakeBasicFlow.ts`. Broad
full-site setup prompts such as "website for ..." or "strona dla ..." enter
Basic mode as a typed `needs_input` plan before provider drafting or executable
action assembly. The response carries `metadata.siteBuilderIntake` with the
schema version, mode, status, current/next step ids, visible step ids, answered
step ids, missing required step ids, readiness flags, and per-step labels plus
registry-owned `answerFields`. Answer fields include accepted keys, control
types, required flags/groups, bounds, option registry ids, and concrete option
values for select controls, including required `business-profile.locale`.
Basic required steps are `business-profile`, `site-goals`, `site-map`, `menu`,
`hero`, `homepage-sections`, `media-policy`, and `review`; `subpages` stays
visible but optional. Direct route payloads with `context.siteKit` are rejected
by schema, and direct service calls with `context.siteKit` return a gated
`needs_input` plan. A reviewed `siteBuilderIntakeState.activeSession` is the
only admin route handoff that can compile to `site-kit.*` actions. Backend-only
planner state can also carry requested Basic/Advanced mode and active intake
session state; this is not a route-owned `context.siteBuilderIntake` payload.

The Basic admin controls render in the existing floating LLM Guide review path
from those server-owned step fields. Each save sends one normalized answer
through `/assistant/actions/plan` with `context.siteBuilderIntakeState.activeSession`;
the browser strips derived facts from the request session and does not persist
raw answers in assistant conversation localStorage. Restored plans that no
longer have in-memory answer state show a restart message rather than silently
continuing from incomplete data. Revalidation that updates unrelated server
state must not wipe the current unsaved form draft; a submitted-step
acknowledgement may replace the draft with the normalized server answer.

Advanced planner progression is owned by
`core/services/assistant/assistantSiteBuilderIntakeAdvancedFlow.ts`. It uses the
same session schema and `/assistant/actions/plan` route as Basic, but starts
only from explicit backend-only planner state such as `requestedMode:
"advanced"` or an active session with `mode: "advanced"`. Basic remains the
default for broad nontechnical full-site prompts.

Advanced admin controls reuse the same server-owned `answerFields` metadata and
show the additional controlled menu behavior, CTA target, hero variant, section
variant, content-engine, design-preset, and reference-intake steps. Switching
from Basic to Advanced requires an explicit confirmation in the UI. Step chips
are selectable so optional Advanced steps can be reviewed without inventing a
free-form prompt surface. The request session remains stripped to
`version/mode/currentStepId/answers`; derived facts, raw reference material,
provider text, secrets, signed URLs, and upload bytes are not persisted or sent
from browser cache.

Basic site-map defaults are advisory facts owned by
`core/services/assistant/assistantSiteBuilderIntakeBasicDefaults.ts`. They
provide deterministic beginner-friendly suggestions for page roles, stable
role-derived routes, simple/grouped menu items, and homepage section roles while
the required Basic answers still come from normalized user input. Default page
roles are generic (`home`, `services`, `portfolio`, `testimonials`, `about`,
`faq`, `contact`) and section suggestions are keyed by broad goals such as
booking, sales, portfolio/work, content, and trust rather than specific
industries. Custom labels are accepted only as bounded display hints keyed by
page role; they cannot change paths, action ids, or route targets and unsafe
URL/script/admin/action-like or secret-like strings fail closed.

Basic review facts are owned by
`core/services/assistant/assistantSiteBuilderIntakeBasicReview.ts`. The helper
turns completed Basic facts into review-only pages, menu items, supported
homepage widget candidates, content-engine candidates, contact path, media
policy, gates, and a bounded redacted summary. Widget support resolves through
`modulePackMatrix` `assistantPageSections`; unsupported section roles become
`widget_alias_unsupported` gates instead of invented widgets. Content-engine
decisions resolve through `assistantSiteBuilderIntakeContentEngines.ts` for
explicit choices, page roles, section roles, and bounded text signals. Supported
engines are services, products, portfolio/projects, case studies,
posts/editorial, team, locations, FAQ, and testimonials/proof; static-only page
roles stay static, text-only signals create scope questions, and unsupported
event/jobs/course-like engines become gates instead of arbitrary schemas or
plugins. Media-library needs remain advisory gates until later adapters choose
existing media-library ids. Review facts require Basic review readiness plus
required non-review steps, Basic defaults, hero, and media policy; incomplete
facts fail closed. `featured-items` stays a generic `content-list` widget
candidate and does not imply a portfolio content engine unless the page roles
include portfolio.

Answer normalization and fact derivation are service-owned:
- `core/services/assistant/assistantSiteBuilderIntakeErrors.ts`
- `core/services/assistant/assistantSiteBuilderIntakeNormalizer.ts`
- `core/services/assistant/assistantSiteBuilderIntakeFacts.ts`

The UI can submit structured answers, but it cannot author trusted facts. A
normalized session derives facts from answers every time, ignores client-supplied
`facts` as a source of truth, and rejects unknown answer keys before planner or
provider handoff. User text is bounded content data only: prompt-injection-like
phrases can remain as sanitized copy context, while secret-like values and
provider tokens are redacted from normalized answers and derived facts.

Review readiness is split deliberately:
- `readyForReview` means required non-review answers are present and the user
  can inspect the generated summary.
- `readyForExecution` additionally requires the review answer to include
  `confirmed: true`; a client-supplied `reviewState: "confirmed"` alone is not
  enough.

Reviewed intake handoff is compiled by
`core/services/assistant/assistantSiteBuilderIntakeCompiler.ts`. The compiler
normalizes the active session, verifies explicit review confirmation, and builds
an internal strict siteKit handoff:

```ts
{
  prompt: "...",
  context: {
    siteKit: AssistantSiteKitPlanInput
  }
}
```

The HTTP route accepts only the stripped
`context.siteBuilderIntakeState.activeSession` shape and no public/admin
`context.siteKit` field. The compiled `AssistantSiteKitPlanInput` remains
schema-exact inside the planner:
`businessType`, `goals`, `locale`, optional `region`, `siteName`,
`preferredKitId`, `selectedKitId`, and `enabledStepIds`. Review-only facts such
as page roles, section roles, media policy, content engines, design preset,
advanced layout, reference design brief, hero/menu choices, references, gates,
and diagnostics stay out of `context.siteKit` and remain compiler/review
metadata for later adapters.
`reviewFacts.contentEngineDecisions` is part of that metadata. Unsupported
content-engine gates block reviewed action-plan handoff before a `siteKit`
request is created.

`reviewFacts.customScreenDecisions` is also metadata-only. It is resolved by
`assistantSiteBuilderIntakeCustomScreens.ts` from supported content-engine
decisions and declares beginner editing surfaces that later action leaves may
turn into `custom-screen.upsert` actions. Candidates are backend-owned internal
admin surfaces with exact `/admin/advanced/custom-screens/{screenKey}/entries`
paths, canonical collection roles, `editor-view` create/row-click behavior, and
the existing `content:read` plus `content:write` permission pair. User text,
provider output, references, and Basic/Advanced answers cannot introduce custom
routes, permissions, write methods, plugins, runtime extensions, or public write
endpoints; backend route or permission drift becomes a blocking custom-screen
gate before action-plan handoff.

Follow-up target scoping for guided site-builder work lives in
`assistantSiteBuilderFollowUpResolver.ts`. The user prompt becomes only a
target/change hint; the resolver builds or accepts a strict CMS operation draft,
then resolves the actual target through the existing active admin surface and
server-derived resource catalog path in `cmsTargetResolver.ts`. Exact matches
return a scoped refinement kind (`static-page`, `content-engine`, `listing`,
`detail-page`, or `custom-screen`), ambiguous matches return `needs_input`, and
stale, spoofed, non-site-builder, or unsupported targets return `needs_input`
or `gated` without exposing raw prompt text.

Static site-shell coverage for reviewed siteKit handoff is checked by
`assistantSiteBuilderIntakeStaticActions.ts`. The production siteKit planner
first requires a reviewed active intake session, builds the existing
`site-kit.recommend` / `site-kit.install` action path, then the helper inspects
the install preview for deterministic page resources,
primary/footer menus,
lead-capture forms, SEO defaults for generated pages, action ids, and same-plan
`target:resourceKey` locators. Missing coverage becomes a blocking review gate;
the existing solution-kit installer remains the only mutation owner for
page/menu/form/SEO resources.

Reviewed siteKit runtime contracts are covered by
`assistantSiteBuilderIntakePlanner.test.ts`,
`assistantSiteBuilderIntakeDryRun.test.ts`, and the Bun public catalog runtime
proof in `assistantHouseProjectsCatalogPublicSite.test.ts`. The planner test
normalizes generated siteKit and content-engine action plans through the strict
action schema, proves repeated reviewed-intake output stable, checks static
same-plan locators, and rejects unknown generated install fields before
dry-run/execute. The Bun dry-run test calls `dryRunAssistantActionPlan` for the
reviewed siteKit handoff and proves repeated previews stable. The Bun runtime
proof uses `buildReviewedContentEngineActionPlanFromIntake` with scoped DB
fixtures and the real HTTP server to confirm one reviewed content-engine
scenario dry-runs, executes, and renders both the public catalog page and a
route-linked entry detail page. These tests add no new assistant endpoints; they
exercise existing internal assistant action contracts plus public read-only
runtime routes.

TASK-407-07-L01 reran the pre-live validation lane on 2026-06-06 before manual
Playwright E2E. The closed lane passed core lint/typecheck, `git diff --check`,
34 targeted Vitest assistant/admin/UI files with 354 tests, 5 targeted Bun
assistant runtime/route files with 104 tests, `bun run gates:coderso` with no
DB-gated skips, `bun run precommit`, and `bun run scan:security:strict`
covering Semgrep, Bun audit, Trivy, and Gitleaks. This validation is a static
and automated runtime gate only; live Basic/Advanced/follow-up Playwright E2E
remains owned by TASK-407-07-L02 through TASK-407-07-L05.

TASK-407 intake redaction is owned by
`core/services/assistant/assistantSiteBuilderIntakeRedaction.ts`.
Diagnostics expose only schema version, mode/current step, answered step ids,
readiness booleans, warning codes, and a deterministic facts hash. Provider
planning may receive `siteBuilderIntakeFacts` only through
`buildSiteBuilderIntakeProviderContext`; that package is provider-only,
advisory, non-executable, raw-reference-free, and explicitly denies schema/RBAC,
media-gate, or confirmation overrides. It does not create a
`context.siteBuilderIntake` route contract.

Browser-local intake restore is a separate bounded snapshot contract in
`core/admin/ui/setup/assistantSiteBuilderIntakeBrowserState.ts`. It stores no
answers, raw facts, plans, actions, files, run-option patches, references,
provider keys, cookies, CSRF/session values, or signed URLs. Restore accepts only
the current schema version, strict known keys, a bounded serialized size, and a
fresh expiry window; invalid state is discarded and the server-normalized
session remains the source of truth.

The screenshot-facing warning/review UI uses the same safety redaction family as
assistant diagnostics. Reference/media gates and final review items remain useful
for the operator, but prompt-poisoning phrases, signed URLs, raw reference text,
OCR-like secret text, tokens, cookies, and auth material are filtered before they
can appear in rendered DOM or test snapshots.

Basic prompt-poisoning guards are regression-tested before planner/action work.
Free text in Basic profile, goals, hero, media notes, and review notes remains
bounded content data; it cannot change mode, step ids, widget aliases, action
families, media URL policy, route paths, RBAC/CSRF/schema rules, or execution
state. Hostile unknown keys, unsupported ids, unsafe custom labels, arbitrary
media URL policy attempts, and Basic/Advanced step-boundary violations fail
closed through intake-domain errors. Broad confused-user prompts still enter
Basic `needs_input` and bypass provider drafting until the guided facts are
reviewed.

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
