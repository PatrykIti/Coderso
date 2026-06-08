# The AI Assistant

Coderso ships with an in-product assistant that helps operators understand and configure their site. It matters to you as a contributor because it is grounded in our own documentation: the docs you write are the corpus the assistant answers from, and the actions it can take are strictly typed code paths you can extend.

The assistant lives behind a floating panel in the admin UI (`core/admin/ui/assistant/AssistantPanel.tsx`) and runs in two distinct modes.

## Two modes at a glance

| Mode | What it does | Needs an API key? | Can it change your site? |
| --- | --- | --- | --- |
| **Docs Assistant** | Deterministic RAG over the `docs/guide` corpus | No | No — read-only answers |
| **LLM Guide** | Plan, dry-run, review, execute, and validate typed setup actions | Yes (OpenAI / OpenRouter) | Yes — via strict typed actions, RBAC, and review |

The two modes share infrastructure but have very different trust models. Docs Assistant is the safe default that always works; LLM Guide is an opt-in upgrade that requires a configured provider.

## Mode 1: Docs Assistant (deterministic RAG, no key required)

This is the "documentation logic underneath." It runs entirely on the DB-backed corpus and works with no LLM provider configured. The flow is fully deterministic — same corpus and query produce the same answer.

The runtime is split into focused services under `core/services/assistant/`:

| Service file | Responsibility |
| --- | --- |
| `docsIngestService.ts` | Ingests the `docs/guide` corpus into the DB |
| `docsDbRetriever.ts` | DB-backed ranking and search |
| `docsAnswerComposer.ts` | Content-first deterministic answer templates |
| `assistantService.ts` | DB-only assistant runtime (`POST /assistant/chat`) |

A few behaviors worth knowing as a contributor:

- **Retrieval is intent-aware.** It blends BM25 with section/path priors and metadata signals (`productArea`, `title`, `keywords`), plus exact module/screen phrase boosts and cross-area penalties. Confidence factors in domain alignment and query coverage, not just the top score.
- **Answers are doc-first.** The composer picks the dominant document, then the best section. The user-facing `surface` label comes from the canonical doc `title`, not a section heading, and the answer is built from full chunk content rather than the short retrieval snippet.
- **Depth levels:** `basic`, `medium`, `instruction`, `advanced`. Helper guide modes: `troubleshooting`, `decision_guide`, `checklist`, `security` (requested via optional `detailLevel` / `guideMode`). Procedural "how / use" questions prefer `Instruction`; `Basic` / `Medium` are supporting context.
- **It does not hallucinate.** When top docs are ambiguous it returns a `clarifying_question`; with no hit it returns `missing_answer`.
- **It is read-only.** Docs-only answers never return executable action plans.
- **It needs a seeded corpus.** If the DB corpus is empty the runtime returns `not ready` — there is no filesystem fallback.

The `POST /assistant/chat` route requires the `settings:read` permission.

## Mode 2: LLM Guide (provider-backed setup planning)

Plug in an OpenAI or OpenRouter provider to enable typed setup planning. This is **not** raw prompt execution. The flow is:

```
prompt -> typed plan -> dry-run -> review -> execute -> validate
```

Every step operates over a strict, whitelisted action set. The orchestration is split across:

| Service file | Responsibility |
| --- | --- |
| `actionPlannerService.ts` | Turns a prompt into a typed plan |
| `actionPlanSchema.ts` | Strict nested schema validation |
| `actionRegistry.ts` | Whitelisted action handlers |
| `actionExecutorService.ts` | Executes plans by reusing existing domain services |
| `actionExecutionStore.ts` | Replay-safe idempotency results in the DB |

The internal endpoints live under `/admin/api/*`, are session-protected, CSRF-guarded on POST, and behind the `assistant` rate limit:

```
POST /assistant/actions/plan
POST /assistant/actions/dry-run
POST /assistant/actions/execute
```

Planner responses are tagged so the UI can render without parsing prompt text: `docs`, `inspection`, `action_plan`, `needs_input`, or `gated`.

Generic CMS refinements stay in this typed action path. For existing content
types, `content-type.field.add` can add supported scalar/select/media fields
from a resolved target and a field list while preserving the rest of the schema.
Nested object arrays and repeater-style fields are gated until the CMS field
contract, editor, and runtime validation support them end to end.

For new catalog setup, nontechnical markdown briefs can become reviewed typed
plans when the prompt clearly asks for a catalog and provides an explicit field
list. The planner derives an industry-neutral catalog preset from the pasted
fields and returns the existing catalog action set: content type, custom admin
screen, listing query/template, public catalog page, and detail route. Do not
add branch-specific catalog shortcuts for single industries; extend the generic
field inference or typed catalog contract instead.

Current setup blueprints are deterministic typed plans. Architecture-studio
prompts that ask for a complete service site route to
`service-business-full-site`, which creates the required public pages, services
and portfolio catalogs, route-linked detail templates, six published sample
entries, primary/footer navigation, a lead-capture form, page SEO, and launch
readiness metadata. Site-builder blueprints may attach backend-owned curated
media profile URLs to explicit string fields and page blocks so the first public
site is visually populated with industry/theme-appropriate assets. Media
upload/generation and arbitrary provider/user remote media remain gated
workflows; `xFieldType: "media"` fields still require trusted media-library
asset IDs. The curated media contract is shaped for future media kinds such as
video, but TASK-405 ships image assets only; video remains gated until a profile,
renderer, and validation contract are added together.

Acceptance tests for this flow must not stop at a successful plan. They need to
dry-run, execute, and verify public runtime pages, populated listings, working
detail routes, navigation/footer links, SEO basics, and desktop/mobile layout.

TASK-407 guided site-builder intake is a service-owned layer over the same
site-kit action path. The intake session is normalized and reviewed in
`core/services/assistant/assistantSiteBuilderIntake*.ts`, then
`assistantSiteBuilderIntakeCompiler.ts` builds an internal strict
`AssistantSiteKitPlanInput` for the planner. Browser and route payloads must not
send `context.siteKit`; `/assistant/actions/plan` accepts the stripped
`context.siteBuilderIntakeState.activeSession` shape instead, and schema
validation rejects direct `siteKit` fields. Direct service calls that still carry
`context.siteKit` are defensive-gated as `needs_input` plans with no executable
actions. Supported registry-derived Advanced runtime choices may compile into
optional internal `advancedRuntimeOverrides` for existing menu/Navigation,
Hero, and section widget surfaces. Page roles, section roles, media policy,
content-engine candidates, raw design/reference facts, gates, arbitrary URLs,
CSS, prompt text, and review metadata remain outside the executable siteKit
input.

Reviewed static shell plans pass through
`assistantSiteBuilderIntakeStaticActions.ts`. It keeps the existing
`site-kit.recommend` / `site-kit.install` action family as the executable
contract and validates the install preview for pages, primary/footer menus,
lead-capture forms, SEO defaults, action ids, and same-plan
`target:resourceKey` locators before execution. Missing coverage is a gate, not
a parallel ad-hoc mutation path.

TASK-407-07-L05 adds the live reset/rebuild proof for this path. The Playwright
CLI harness installs a `medical-clinic` site, fetches the authoritative
solution-kit run manifest, rolls it back with explicit `sourceRunId`, verifies
created resources are removed by id and updated resources are restored, clears
assistant state, then installs a different `beauty-salon` starter from a fresh
beginner prompt. The final public runtime check covers `/`, `/offers`, and
`/contact`, navigation/footer, the booking form, SEO basics, curated media
registry URLs, desktop/mobile screenshots, and absence of previous-kit or
generic widget-default copy bleed. This proves selected-kit starter reuse,
curated starter media, and scoped rollback safety; it does not imply arbitrary
prompt-specific theme or media generation.

TASK-407-07-L06 closes the guided site-builder family. The final drift pass
resolved duplicated Advanced Navigation option literals by making the Navigation
widget contract the single runtime owner for variant and mobile-mode ids, and
added validator coverage for produced Advanced Navigation, Hero, and section
blocks. Curated media profile selection now requires an industry/vertical match
before theme keywords can influence ranking, which keeps the adapter generic
for multiple businesses instead of matching unrelated profiles by broad words
such as booking.

Intake diagnostics and provider context are separate from the route payload.
`assistantSiteBuilderIntakeRedaction.ts` emits diagnostics with stable ids and a
facts hash only, while `buildSiteBuilderIntakeProviderContext` packages bounded
advisory facts for provider classification without raw references, files,
secrets, signed URLs, or executable instructions. Browser-local restore uses
`assistantSiteBuilderIntakeBrowserState.ts`; it stores a small versioned
snapshot only and discards stale, oversized, unknown-version, or unknown-key
payloads.

Basic full-site prompts are intentionally routed into deterministic intake
before provider drafting or action assembly. `assistantSiteBuilderIntakeBasicFlow.ts`
recognizes broad setup prompts, creates a Basic `needs_input` plan with no
actions, and exposes typed `metadata.siteBuilderIntake` for UI rendering. The
metadata reports the current/next step, visible steps, answered steps, missing
required steps, readiness flags, accepted answer fields, control kinds, option
registry ids, and concrete option values. This path is generic: it asks for
business/site facts and maps later adapters to backend-owned roles instead of
hardcoding one industry. A reviewed active intake session is the only admin
handoff that can compile to `site-kit.*`; backend-only planner state can also
mark requested Advanced mode or an active intake session without adding a
route-owned `context.siteBuilderIntake` payload.

Basic site-map/menu/section defaults live in
`assistantSiteBuilderIntakeBasicDefaults.ts`. They are advisory facts only:
`facts.basicDefaults` can suggest generic page roles, role-derived routes, menu
items, and homepage section roles, but it does not mark required intake steps as
answered. Custom labels are bounded display hints keyed by backend page roles
and cannot influence paths, action ids, or route targets.

Basic review facts live in `assistantSiteBuilderIntakeBasicReview.ts`. They map
completed Basic facts to review-only pages, menus, supported widget candidates,
content-engine candidates, media policy, contact path, and gates. Widget aliases
must resolve through `modulePackMatrix` `assistantPageSections`; content-engine
decisions resolve through `assistantSiteBuilderIntakeContentEngines.ts` and stay
as review metadata until later custom-screen/action leaves. Supported engines
cover services, products, portfolio/projects, case studies, posts/editorial,
team, locations, FAQ, and testimonials/proof. Unsupported event/jobs/course-like
engine needs become gates and block reviewed action-plan handoff instead of
creating arbitrary schemas, plugins, routes, or public writes. The helper fails
closed before review output when Basic review readiness, required non-review
steps, Basic defaults, hero, or media policy are missing, and `featured-items`
does not imply a portfolio content engine by itself.

Beginner editing surface decisions live in
`assistantSiteBuilderIntakeCustomScreens.ts`. They derive custom-screen
candidates only from supported content-engine decisions, expose them under
`reviewFacts.customScreenDecisions`, and keep them out of `context.siteKit`.
Each candidate is a backend-owned internal admin surface for the existing
`custom-screen.upsert` family: exact `/admin/advanced/custom-screens/{screenKey}/entries`
path, canonical collection role, `editor-view` create/row-click behavior, and
the existing `content:read` plus `content:write` permission pair. Unsupported
screen adapters, unsafe route drift, permission drift, plugins, runtime
extensions, or public write endpoints become gates instead of generated actions.

Guided follow-up target scoping lives in
`assistantSiteBuilderFollowUpResolver.ts`. It treats prompt text as a hint only,
uses `buildCmsOperationDraftFromPrompt` or a validated CMS operation draft, and
resolves real mutation targets through active admin context or the server-derived
resource catalog via `cmsTargetResolver.ts`. Exact trusted site-builder matches
become scoped refinement kinds (`static-page`, `content-engine`, `listing`,
`detail-page`, or `custom-screen`); ambiguous targets ask for input, while
stale, spoofed, non-site-builder, unsupported, or unsupported-operation
requests gate or ask before any action assembly.
The production planner wires this resolver ahead of the generic CMS action
mapper for guided follow-up mutations, including validated provider drafts.
Nontechnical setup-like prompts on an already active generated page are routed
to the same target question when they are really asking to add or refine a page
section, gallery, or project surface.

Reviewed SiteKit planner/runtime contracts are tested before admin UI execution
work continues. `assistantSiteBuilderIntakePlanner.test.ts` compiles a reviewed
intake session into the existing siteKit and content-engine action paths,
normalizes generated plans through strict schemas, proves repeated output
stable, checks static same-plan locators, and rejects unknown install payload
fields. `assistantSiteBuilderIntakeDryRun.test.ts` calls
`dryRunAssistantActionPlan` for the reviewed siteKit handoff and proves repeated
previews stable. The Bun public runtime proof in
`assistantHouseProjectsCatalogPublicSite.test.ts` executes a scoped
reviewed-intake content-engine fixture and renders both the public catalog page
and route-linked entry detail page through the real HTTP server.

Advanced design presets live in
`assistantSiteBuilderIntakeDesignPresets.ts`. The `designPresets` registry is a
backend-owned set of visual directions (`modern`, `editorial`, `retro`,
`minimal`, `bold`, `luxury`, `utilitarian`) with supported token facts and
section-role support. Advanced answers may select only a registry id; free-form
design notes are accepted only when tied to that selected backend preset. Notes
are bounded text and reject remote URLs, HTML/CSS/script fragments,
admin/action ids, and executable style directives before provider or planner
use. Preset facts include review-only `themeTokenHints` validated against the
existing `DesignTokenOverrides` key contract and currently expose an explicit
`theme-application-pending` gap until later SiteKit/action leaves apply them
after review.

Advanced menu, hero, and section options live in
`assistantSiteBuilderIntakeAdvancedOptions.ts`. They are controlled ids only:
menu behavior maps to existing Navigation widget behavior fields such as
`sticky`, `collapseOnScroll`, `transparent`, and `mobileMode` plus trusted CTA
page-role targets, hero variants map to current Hero widget variants, and section
variants map to existing widget variants backed by
`modulePackMatrix.assistantPageSections`. Unknown ids, raw CTA URLs, conflicting
menu surface choices, missing section roles, and design-preset support gaps fail
closed or become review gates; they never add `context.siteBuilderIntake`,
provider-authored actions, CSS, or custom layout code to the planner request.

Advanced reference intake lives in
`assistantSiteBuilderIntakeReferencePolicy.ts`. It accepts only bounded text,
candidate media-library ids, and candidate temporary reference ids. Candidate
ids stay answer-local until `normalizeSafeReferenceInput` resolves them through
injected readable-media and scanned-reference deps; the synchronous session
normalizer does not promote them into provider facts. Raw remote media URLs are
unsupported unless a future backend-owned trusted adapter owns that source.
Filenames, EXIF/metadata, OCR/extracted text, alt text, cookies, tokens, and
signed URLs are redacted before any design evidence can reach facts or provider
context. Provider context exposes redacted text-reference presence and a digest
only; raw bytes, raw metadata, raw URLs, and raw reference ids stay out of
diagnostics, browser state, and prompt packages.

Reference design briefs live in
`assistantSiteBuilderIntakeReferenceBrief.ts`. They convert a sanitized
`SafeReferenceInput` into enum-only color, layout, density, typography, and
image-treatment hints plus redacted warning/gate codes. The brief source is
digest-only and excludes raw ids, filenames, OCR/extracted text, metadata, and
URLs. `mergeReviewedReferenceDesignBrief` must receive explicit confirmation
before those hints are merged into intake facts; otherwise it returns a
`reference_review_required` gate. Provider context projects reviewed hints only
as enum ids/codes with `rawIncluded:false` and never as actions, media imports,
CSS, or policy overrides.

Basic prompt-poisoning coverage lives in
`assistantSiteBuilderIntakeBasicSecurity.test.ts`. Free text can be preserved as
bounded copy/context, but it cannot set action families, route paths, media trust,
RBAC/CSRF/schema policy, provider instructions, or execution readiness. Unknown
keys/ids, unsafe labels, external-media policy attempts, and Basic/Advanced
step-boundary violations fail closed before provider or planner execution.

### RBAC per step

| Step | Required permissions |
| --- | --- |
| `plan` / `dry-run` | `settings:read` + `content:read` |
| `execute` | `settings:write` + `content:write` + `content:publish` |
| Site-kit plan / dry-run | adds `solution-kits:read` |
| Site-kit execute | adds `solution-kits:write` |

Site-kit work additionally requires `llmAvailable=true` — it must never run as a docs-only fallback.

### Safety guarantees

The provider is treated as untrusted. The backend reconstructs any executable plan locally from policy and trusted context:

- **Operation-draft-only output.** Provider-supplied `actions[]`, ids, and executor payloads are rejected or ignored. The generic CMS path makes this explicit: the provider produces only a `CmsOperationDraft`, validated and repaired locally by `cmsOperationDraftSchema.ts`, `assistantOperationPolicy`, and `cmsTargetResolver.ts` before any action runs.
- **Strict schemas** reject unknown fields before persistence, render, or cache. Idempotency is enforced via `actionExecutionStore.ts`.
- **Edits and deletes are reviewed operations** (typed plan + dry-run + conflict-aware execution), never shortcuts. Targets resolve only from active context or server-side catalogs — a browser-supplied `context.resourceCatalog` is not trusted and is only hydrated when `includeResourceCatalog=true`.
- **Gated domains** (booking, checkout/payment, webhook automation, nested page-widget patches, installed solution-kit refinements) return `needs_input` / `gated` with no executable actions until adapters and permissions land.
- **Secrets never leak.** Provider keys, cookies, auth headers, upload bytes,
  signed URLs, and raw media must not appear in provider packages, diagnostics,
  cache, or action payloads. Diagnostics log a prompt hash, not prompt text;
  media-library fields reference trusted asset ids only, while curated profile
  media references are selected from a backend-owned catalog of public
  license-documented `https://` URLs.

The provider only runs when retrieval returns snippets; a missing or failed provider falls back to `docs-only`. Per-user and optional global limits are enforced by `assistantQuota.ts`, and `assistantMetrics.ts` / `assistantRedaction.ts` record request, error, fallback, no-hit, and latency signals without leaking secrets.

Assistant Settings can ask the backend for OpenRouter model metadata through `POST /assistant/model-metadata`. The provider adapter reads OpenRouter's model list, applies published input/output limits when present, and returns conservative editable defaults when the provider does not publish those values.
LLM Guide action planning also uses provider-reported metadata when available:
the HTTP route keeps only a high transport abuse cap, while provider prompt
packaging derives its effective character budget from the model input-token
capacity. Trusted full content-type schemas stay server-side for dry-run and
execute merges; provider-facing resource context includes only bounded field
summaries.

## Admin site-builder intake state

The guided site-builder admin UI keeps local interaction state in
`assistantSiteBuilderIntakeUiState.ts`. The reducer is a client-only companion to
the backend intake/session contract: submitted-answer acknowledgements from the
server replace local drafts, background revalidation preserves the dirty marker
for the current unsaved step, stale browser snapshots are discarded, and
restored state contains only the bounded redacted session snapshot from
`assistantSiteBuilderIntakeBrowserState.ts`.

Planning is available only after confirmed review, dry-run only after a strict
ready plan, and execute only after that plan has completed dry-run. The UI state
machine does not create a new assistant route payload and must not store raw
answers, provider text, provider keys, signed URLs, upload bytes, cookies, or
auth state in browser storage.

The floating assistant also persists a bounded conversation cache via
`assistantConversationState.ts`. That cache stores only sanitized transcript
text, active plan shells, previews, executions, planning-state hints, and the
selected assistant mode. It rejects unknown top-level keys, stale or oversized
payloads, redacts prompt-poisoning phrases and signed URLs, and drops
secret-like text before writing to localStorage.

Basic full-site intake controls render inside the floating LLM Guide action-plan
review path from `metadata.siteBuilderIntake.steps[].answerFields[]`. The UI
submits one normalized answer at a time through the existing
`/assistant/actions/plan` route with `context.siteBuilderIntakeState.activeSession`;
no public endpoint or parallel site-builder payload is introduced. Basic answer
drafts stay in React state only, restored plans without answer state show a
restart message, and the backend re-normalizes the session before returning the
next server-owned step.

Advanced full-site intake controls use the same route and session contract.
`assistantSiteBuilderIntakeAdvancedFlow.ts` emits `needs_input` metadata only
for explicit Advanced requests or active Advanced sessions; broad confused-user
prompts still enter Basic first. The floating LLM Guide stepper requires
confirmation before switching from Basic to Advanced, renders only backend-owned
options for menu behavior, CTA page role, hero variant, section variants,
content engines, design presets, and references, and keeps optional Advanced
steps selectable from the server-owned step list. Browser requests send only the
stripped intake session (`version`, `mode`, `currentStepId`, `answers`), never
derived facts, raw references, provider text, secrets, signed URLs, or upload
bytes.

## Keeping assistant capabilities in sync

The assistant does not infer new CMS or widget behavior from prompt text. A new
capability becomes assistant-safe only when it is exposed through the same typed
contracts used by the runtime, admin UI, planner, and tests. When a widget,
solution kit, content-engine capability, or admin workflow changes, use this
checklist before claiming that the assistant can guide users through it.

| Change type | Required assistant sync |
| --- | --- |
| Backward-compatible widget field/default | Update the widget schema, defaults, and `normalize<Name>Data`; if existing assistant output still normalizes through `normalizeWidgetBlock`, no assistant option change is required. |
| New widget variant or mode | Add the id to the widget-owned contract (`variants`, schema enum, or a shared contract module when multiple layers consume it). If the assistant may offer it, add a backend-owned option/registry entry and regression tests proving strict action normalization rejects unknown ids. |
| New layout behavior or CTA/media setting | Add a bounded assistant mapping from reviewed intake facts to existing widget fields. The mapping must use ids/page roles/media policy from registries, not arbitrary prompt text, CSS, raw URLs, or provider output. |
| New widget type available to beginner site generation | Register the widget, metadata, docs, and module-pack coverage first. Then add assistant page-section aliases or solution-kit usage only when `normalizeWidgetBlock` accepts the produced block and the module pack remains valid. |
| New solution-kit starter or industry profile | Add starter content, menu/footer/form/SEO coverage, curated media profile entries when media is used, and installer/rollback regression coverage. Prompt-specific copy, uploads, video, and arbitrary remote media remain gated unless a typed adapter lands. |
| New content engine or custom screen decision | Extend the service-owned decision registry and compiler tests before the UI exposes it. Unsupported engines must return `needs_input` or `gated` with no executable actions. |
| User-facing admin workflow/docs change | Update `docs/guide` and reindex the assistant corpus after deployment or through `POST /assistant/reindex`; developer-only `_docs` and `docs/develop` changes are not retrieved by the product assistant. |

Do not duplicate option ids in assistant code, admin editors, and widget runtime
schemas. Create or reuse a single owner when more than one layer needs the same
ids. `navigationContract.ts` is the current pattern: the Navigation widget,
strict action schema, intake types/options, and admin Navigation editor all read
the same variant and mobile-mode ids. Labels and descriptions can remain local
to the UI, but key them by the shared id type so TypeScript catches drift.

The assistant may automatically benefit from a widget change only when all of
these are true:

1. Existing generated blocks still validate through `normalizeWidgetBlock`.
2. Existing assistant mappings do not need new option ids or new action payload
   fields.
3. The public renderer remains backward-compatible for saved blocks and
   solution-kit starter pages.
4. The change is not something the assistant must explain to end users from the
   docs corpus.

If any condition is false, update the assistant contract deliberately:

1. Extend the backend-owned registry or normalizer that owns the new option.
2. Map reviewed facts to typed `siteKit` or CMS action input; never pass raw
   prompt/reference/provider text into executable payloads.
3. Keep route/action schemas strict and reject unknown fields/options.
4. Update admin UI controls from server-owned metadata or shared contract ids.
5. Update solution-kit starter data when generated pages need the capability.
6. Update `docs/guide` and reindex when users should ask the assistant about the
   new behavior.
7. Add targeted tests for the domain/service contract, strict action schema,
   widget normalization/rendering, admin UI metadata when touched, and a live
   Playwright lane when the user-facing assistant flow changes.

If a changed CMS capability is not yet assistant-safe, document it as gated and
make the assistant ask for clarification or return a non-executable gate instead
of inventing actions.

## How the corpus is ingested

The source-of-truth root is `docs/guide`. This is hard-coded in two services:

- `docsIngestService.ts`: `const DEFAULT_INTERNAL_DOCS_ROOT = "docs/guide"`
- `assistantService.ts`: `const DEFAULT_ASSISTANT_SOURCE_ROOT = "docs/guide"`

Markdown files under `docs/guide/*.md` are ingested into three DB tables:

| Table | Holds |
| --- | --- |
| `assistant_docs` | Per-document metadata |
| `assistant_doc_chunks` | Retrievable content chunks (queried at runtime) |
| `assistant_doc_ingest_runs` | Ingest run records |

Normal Docker startup runs `core/server/startupAssistantDocs.ts` after migrations and before serving traffic. The helper fingerprints markdown files in `docs/guide`, records the completed image/docs fingerprint in `assistant.docs.startupReindexState`, and skips later starts until the image version or docs fingerprint changes. It can be disabled with `CODERSO_ASSISTANT_DOCS_REINDEX_ON_START=false`; `CODERSO_ASSISTANT_DOCS_SOURCE_ROOT` overrides the source root for controlled deployments.

Manual recovery still runs through `POST /assistant/reindex` (route in `core/server/routes/assistantRoutes.ts`, validated by `assistantReindexSchema`, CSRF protected, and requires `settings:write`). In the admin UI the same operation is kept as **Run support reindex** under `Settings -> Assistant -> Advanced`, not as a routine configuration step.

Reindex also prunes orphaned `assistant_docs` whose source file was removed (`pruneStaleAssistantDocs`), so stale DB-only records stop surfacing, and writes a best-effort `assistant.docs.reindex` audit event.

## How to extend the corpus

To teach the assistant about a new screen or workflow, add a doc to the corpus and reindex.

1. **Create a markdown file** under `docs/guide/` in the right subdir — `getting-started/`, `screens/`, `coderso/`, `solution-kits/`, or `playbooks/`. Every major admin route should map to one canonical doc; check `docs/guide/_COVERAGE_MATRIX.md` to find gaps.
2. **Add YAML frontmatter** with the required keys (see `docs/guide/_TEMPLATE.md`):

```yaml
---
title: "Document Title"
audience: "admin"        # admin | editor; use "developer" only when truly needed
productArea: "area-name"
language: "en"
keywords:
  - keyword-one
  - keyword-two
---
```

3. **Author the multi-level sections.** Required: `Basic`, `Medium`, `Instruction`, `Advanced`. Recommended optional: `Troubleshooting`, `Decision Guide`, `Checklist`, `Security`. The legacy pack (`What Is It`, `When To Use`, `Step By Step`, `Examples`, `Common Mistakes`) is still ingest-compatible, but new docs should use the multi-level pack.
4. **Follow the writing rules** (per `docs/guide/README.md`): English, product language over developer shorthand, real route and screen names, practical examples and failure modes — and do not document unshipped roadmap behavior.
5. **Seed the DB corpus.** In Docker deployments this happens on startup when the image/docs fingerprint changes. In local development or support recovery, use `POST /assistant/reindex` or `Settings -> Assistant -> Advanced -> Run support reindex` to seed it into the DB and make it retrievable.

Section selection is deterministic via the intent-to-section mapping in `docs/guide/README.md` — for example "what is this" maps to `Basic`, "how do I configure" maps to `Instruction`, an error or fix maps to `Troubleshooting`, "which option" maps to `Decision Guide`, launch checks map to `Checklist`, and security questions map to `Security`.

> `docs/guide/` is the user-facing product corpus and is intentionally separate from `_docs/`, which holds architecture notes, task tracking, and the changelog.

## Provider keys live in encrypted Integrations

Provider credentials are **not** in env vars or planner code. `providers/index.ts` resolves them at runtime via `getIntegrationRuntimeConfig("openai")` / `getIntegrationRuntimeConfig("openrouter")` from `core/services/integrations/integrationsService.ts`. If no `apiKey` is present, the provider resolves to `null` — LLM Guide is unavailable, but Docs Assistant still works.

Configure providers in the admin UI under `Settings -> Integrations`. Both adapters (`openAiProvider.ts`, `openRouterProvider.ts`) sit behind the same planner contract.

Integration secret fields are encrypted at rest: stored via `encryptSecret` and read via `decryptSecret` / `decryptIntegrationConfig` in `core/services/security/secretStore.ts`, guarded by `hasValidSecretMasterKey()` (which throws `secret_master_key_invalid` if the key is missing). This depends on `MEDIA_SECRET_MASTER_KEY` being set in the environment.

> For automated tests only, the `test:assistant:live:*` lanes read `TEST_OPENAI_API_KEY` / `TEST_OPENROUTER_API_KEY` (and matching `*_MODEL`) from the environment. Production never uses these — see [`./testing.md`](./testing.md).

## Where to go deeper

- [`_docs/ASSISTANT_GUIDE.md`](../../_docs/ASSISTANT_GUIDE.md) — the assistant runtime spec.
- [`_docs/ASSISTANT_SITE_BUILDER.md`](../../_docs/ASSISTANT_SITE_BUILDER.md) — typed actions, RBAC matrix, and site-kit flow.
- [`_docs/BLUEPRINT_COMPOSER.md`](../../_docs/BLUEPRINT_COMPOSER.md) — blueprint and composition internals.
- Sibling pages: [`./content-and-widgets.md`](./content-and-widgets.md), [`./security.md`](./security.md), and [`./testing.md`](./testing.md).
