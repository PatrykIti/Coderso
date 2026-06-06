# TASK-407: Assistant Guided Site Builder Intake Flows
# FileName: TASK-407_Assistant_Guided_Site_Builder_Intake_Flows.md

**Priority:** High
**Category:** Assistant + Site Builder + UX + Security + Runtime QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-404, TASK-405
**Related Tasks:** TASK-406
**Status:** 🚧 In Progress
**Started:** 2026-06-05

---

## Overview

TASK-405 makes the first curated media profile safe, but it does not make the
assistant a generic WordPress-competitor site generator by itself. A generic CMS
assistant must not jump from "create this service" directly to a fixed
architecture-studio blueprint for every user. It needs a guided intake flow that
turns broad user intent into structured, reviewable configuration before any
typed action plan is generated.

TASK-407 defines and implements that guided flow:

- **Basic mode** for less technical users, with a rigid, low-choice sequence of
  questions. Free text is treated as business/content description only, never as
  executable instruction. The assistant chooses widgets and explains the
  proposed homepage, menu, subpages, and content models before planning actions.
- **Advanced mode** for users who understand design and CMS structure, with
  controlled choices for visual style, layout presets, hero/section variants,
  menu behavior, content engines, custom screens, SEO/media policy, and optional
  reference-image/file intake.
- **Follow-up refinement flow** for prompts such as "I want to change the
  projects page". The assistant must scope the change to a trusted active
  resource or server-derived candidate, then decide whether a static page
  update, content engine, listing/detail route, or custom screen is appropriate.

The core product decision is: the assistant can help with arbitrary service
verticals only when it asks bounded questions, maps answers to supported
capabilities, and explicitly gates unsupported needs. It must not pretend that a
single local blueprint can satisfy every website request.

The new flow must extend the existing solution-kit/site-builder subsystem rather
than creating a parallel planner. The existing backend handoff remains
`context.siteKit` (`AssistantSiteKitPlanInput`) and the existing execution owners
remain `previewGuidedSiteBuilderPlan`, `executeGuidedSiteBuilder`,
`validateGuidedSiteBuilderRun`, `siteBuilderPlanStepIds`, `AiSiteWizard*`, and
the solution-kit routes. TASK-407 adds a generic structured intake layer that
compiles Basic/Advanced answers into the existing `siteKit` contract. If a
temporary `context.siteBuilderIntake` payload is needed, it must be pre-execution
metadata only, strictly validated by the intake owner, and compiled to
`context.siteKit` before action planning.

## Agent Review Inputs

- User direction: create a full guided assistant flow with Basic and Advanced
  modes, structured questions for menu/hero/sections/subpages, guarded image/file
  reference intake, and task drift audit before implementation.
- Existing TASK-404/TASK-405 evidence: full-service architecture site generation
  and curated media profile adapter are safe but not broad enough for every
  service vertical.
- TASK-406 is related reset QA after TASK-405, not a predecessor for TASK-407.
  TASK-407-07 carries the stronger guided-flow cleanup and second-theme E2E
  requirement so this family can proceed without waiting for TASK-406 closure.
- Claude/agent review is required twice:
  - first over the TASK-407 task breakdown before implementation begins,
  - later over the implemented admin UI, planner contract, public runtime, and
    Playwright evidence before closure.
- Initial draft review on 2026-06-05:
  - agent review recommended one guided flow with Basic as the default,
    Advanced as controlled expansion, strict structured context, and user
    text/files/images treated as data rather than instructions,
  - Claude found a blocking dependency drift because TASK-407 depended on
    To-Do TASK-406 while already In Progress; TASK-407 now depends only on
    TASK-404/TASK-405 and records TASK-406 as related QA.
- Granularity review on 2026-06-05:
  - agent review found TASK-407-02 through TASK-407-07 too broad for direct
    implementation and proposed `TASK-407-NN-LNN-*` execution leaves,
  - 29 physical leaves now split schema, Basic, Advanced/reference, planner,
    UI, and E2E/closure work into bounded implementation units,
  - Claude re-audit found no blocking task-plan drift after fact-shape and
    step-id vocabulary fixes.
- Site-builder subsystem re-audit on 2026-06-05:
  - Claude found a blocking drift: the task plan initially ignored the existing
    `siteKit`/solution-kit planner and proposed a parallel `GuidedSiteBuilder*`
    contract,
  - TASK-407 now explicitly treats `AssistantSiteBuilderIntake*` as the new
    Basic/Advanced intake layer and keeps existing `GuidedSiteBuilder*` names for
    the already-shipped plan/executor result types.

## Existing Site-Builder Integration Contract

- Schema owner for final execution handoff: existing `AssistantSiteKitPlanInput`
  and `SiteBuilderPlanInput` types.
- Existing step owner: `siteBuilderPlanStepIds` in
  `core/services/kits/solutionKitTypes.ts`.
- Existing planner/executor owners:
  `core/services/assistant/siteBuilderPlanner.ts`,
  `core/services/assistant/siteBuilderPlanAdapter.ts`, and
  `core/services/assistant/siteBuilderExecutor.ts`.
- Existing admin UX owners:
  `core/admin/ui/setup/AiSiteWizard.tsx`,
  `core/admin/ui/setup/AiSiteWizardSteps.tsx`, and
  `core/admin/ui/setup/aiSiteWizardValidation.ts`.
- Existing admin client/route handoff:
  `core/admin/services/assistantClient.ts`,
  `core/server/validation/assistantActionSchemas.ts`,
  `core/server/routes/assistantRoutes.ts`, and
  `core/services/assistant/actionPlannerService.ts`.
- New TASK-407 modules must not create a second full-site mutation route or a
  second full-site executor. They may add a Bun-free intake compiler, richer UI
  state, option registries, and review metadata that normalize into `siteKit`.

## Security Contract

- Endpoint visibility: use existing internal admin assistant endpoints under
  `/admin/api/assistant/actions/*`; add new internal endpoints only if the
  session/intake state cannot fit the current action-plan route contract.
- Auth model: existing admin session.
- RBAC:
  - guided intake read/plan/dry-run requires existing assistant read permissions
    and resource read permissions for any server-derived catalogs,
  - execute requires action-specific write/publish permissions from
    `actionFamilyContracts`,
  - file/reference inspection requires explicit media/file read permission if it
    reads uploaded media metadata or temporary attachment records.
- CSRF: required for every POST route.
- Rate-limit bucket: existing `assistant` bucket for guided-intake, plan,
  dry-run, execute, and any reference-analysis route.
- Reject unknown validation:
  - every guided-intake answer schema must reject unknown keys,
  - every step id, option id, widget alias, page role, menu behavior, and design
    preset must resolve from backend-owned registries,
  - free-text answers must be normalized as bounded content hints, not as
    executable instruction text.
- Anti-abuse:
  - no public assistant write endpoint,
  - no autonomous mutation before dry-run/review/execute,
  - no prompt-injection instruction from user text, uploaded files, images,
    EXIF, OCR, alt text, filenames, or linked references may override system
    rules, action schemas, RBAC, CSRF, media gates, or user confirmation.
- Media/reference trust:
  - uploaded images/files may be used as design/reference evidence only after
    size/type scanning and metadata redaction,
  - reference extraction returns a structured design brief for user review,
    never executable actions,
  - arbitrary remote media URLs remain gated unless a backend-owned curated
    media profile or media-library asset owns them.
- Secret handling:
  - provider keys, cookies, CSRF tokens, auth headers, session ids, raw auth
    state, file bytes, EXIF secrets, OCR secrets, signed URLs, and raw
    secret-like user text must not be stored in browser localStorage, provider
    prompts, diagnostics, task evidence, screenshots, or changelog.

## Sub-Tasks

| ID | Title | Status | Executable Leaves |
|---|---|---|---|
| TASK-407-01 | Task Contract Drift Audit and Scope Freeze | Done (2026-06-05) | None; this is the pre-implementation drift gate. |
| TASK-407-02 | Guided Intake Mode and Session Contract | Done (2026-06-05) | TASK-407-02-L01 through TASK-407-02-L04 |
| TASK-407-03 | Basic Mode Structured Site Flow | Done (2026-06-05) | TASK-407-03-L01 through TASK-407-03-L04 |
| TASK-407-04 | Advanced Mode Design Presets and Reference Intake | Done (2026-06-05) | TASK-407-04-L01 through TASK-407-04-L04 |
| TASK-407-05 | SiteKit Plan and Content Engine Decisions | Done (2026-06-06) | TASK-407-05-L01 through TASK-407-05-L06 |
| TASK-407-06 | Admin UI Review and Prompt-Poisoning Hardening | In Progress (2026-06-06) | TASK-407-06-L01 through TASK-407-06-L06 |
| TASK-407-07 | E2E Live Validation Docs and Closure | To Do | TASK-407-07-L01 through TASK-407-07-L06 |

## Granular Execution Leaves

| ID | Title | Status |
|---|---|---|
| TASK-407-02-L01 | Session Types and Step Registry | Done (2026-06-05) |
| TASK-407-02-L02 | Answer Normalization and Fact Derivation | Done (2026-06-05) |
| TASK-407-02-L03 | Assistant Context and Route Validation Handoff | Done (2026-06-05) |
| TASK-407-02-L04 | Guide Redaction and Browser State Contract | Done (2026-06-05) |
| TASK-407-03-L01 | Basic Step Definitions and Progression | Done (2026-06-05) |
| TASK-407-03-L02 | Basic Site Map and Section Role Defaults | Done (2026-06-05) |
| TASK-407-03-L03 | Basic Widget and Review Fact Selection | Done (2026-06-05) |
| TASK-407-03-L04 | Basic Prompt Poisoning Regression Guards | Done (2026-06-05) |
| TASK-407-04-L01 | Advanced Design Preset Registry | Done (2026-06-05) |
| TASK-407-04-L02 | Advanced Menu Hero and Section Options | Done (2026-06-05) |
| TASK-407-04-L03 | Reference Input Validation and Redaction | Done (2026-06-05) |
| TASK-407-04-L04 | Reference Design Brief and Review Gate | Done (2026-06-05) |
| TASK-407-05-L01 | Intake Facts to SiteKit Plan Adapter | Done (2026-06-05) |
| TASK-407-05-L02 | Static Pages Navigation Lead Capture and SEO Actions | Done (2026-06-05) |
| TASK-407-05-L03 | Content Engine Decision Rules | Done (2026-06-06) |
| TASK-407-05-L04 | Custom Screen and Beginner Editing Surface Decisions | Done (2026-06-06) |
| TASK-407-05-L05 | Follow Up Refinement Target Resolution | Done (2026-06-06) |
| TASK-407-05-L06 | Dry Run Idempotency and Runtime Contract Tests | Done (2026-06-06) |
| TASK-407-06-L01 | Site Builder Intake UI State Machine | Done (2026-06-06) |
| TASK-407-06-L02 | Basic Stepper Controls | Done (2026-06-06) |
| TASK-407-06-L03 | Advanced Stepper Controls | Done (2026-06-06) |
| TASK-407-06-L04 | Review Summary and Execution Gating | Done (2026-06-06) |
| TASK-407-06-L05 | UI Warnings Local State and Redaction | Done (2026-06-06) |
| TASK-407-06-L06 | Legacy AI Site Wizard Reviewed Intake Convergence | To Do |
| TASK-407-07-L01 | Targeted Validation Lanes and Release Gates | To Do |
| TASK-407-07-L02 | Basic Live Playwright E2E | To Do |
| TASK-407-07-L03 | Advanced Live Playwright E2E | To Do |
| TASK-407-07-L04 | Follow Up Refinement and Fail Closed E2E | To Do |
| TASK-407-07-L05 | Scoped Cleanup and Second Theme Rebuild E2E | To Do |
| TASK-407-07-L06 | Final Docs Changelog Board and Drift Audit | To Do |

## Implementation Order

1. Complete TASK-407-01 first. Patch the physical task files until Claude and
   agents report no blocking task-plan drift.
2. Implement TASK-407-02 leaves in order before any Basic or Advanced UI work.
3. Implement TASK-407-03 leaves as the safe Basic default with the narrowest
   useful choices.
4. Implement TASK-407-04 leaves as an additive Advanced expansion over the same
   step schema, not as a separate free-form prompt path.
5. Implement TASK-407-05 leaves to connect completed intake sessions to the
   existing solution-kit/siteKit planner, action engine, and content-engine
   decision layer. Blueprint-composer changes are optional adapters only when the
   existing solution-kit contract cannot express an agreed capability.
6. Implement TASK-407-06 leaves to harden admin review UI, prompt-poisoning
   boundaries, and reference intake.
7. Implement TASK-407-07 leaves: restart helper, run Playwright CLI live E2E for
   Basic, Advanced, and
   follow-up refinement, run a scoped cleanup plus a second from-scratch site in
   a different industry/theme, then run final Claude/agent drift review before
   closure.

## Files To Change

| Area | Likely files |
|---|---|
| Intake contracts | New Bun-free `core/services/assistant/assistantSiteBuilderIntake*.ts` files that own Basic/Advanced intake schemas, option registries, facts, redaction, and compile-to-siteKit helpers |
| Existing siteKit contracts | `core/services/kits/solutionKitTypes.ts`, `core/services/assistant/siteBuilderPlanner.ts`, `core/services/assistant/siteBuilderPlanAdapter.ts`, `core/services/assistant/siteBuilderExecutor.ts`, `core/services/assistant/actionPlanTypes.ts` |
| Route validation | `core/server/validation/assistantActionSchemas.ts` only if a temporary `context.siteBuilderIntake` payload is carried; final plan handoff must keep using strict `context.siteKit` |
| Planner/composer | `core/services/assistant/actionPlannerService.ts` for choosing/receiving `context.siteKit`; `core/services/assistant/blueprints/*` only for optional composition capabilities not already expressible by solution kits |
| Admin UI | `core/admin/ui/setup/AiSiteWizard.tsx`, `core/admin/ui/setup/AiSiteWizardSteps.tsx`, `core/admin/ui/setup/aiSiteWizardValidation.ts`, plus assistant/floating-panel entry points if full-site intent starts the wizard |
| Reference/media policy | `core/services/media/curatedMediaProfiles.ts`, media/reference validation services if introduced |
| Tests | `tests/vitest/assistant/*`, `tests/vitest/ui/assistant-*`, `tests/unit/assistant/*`, `tests/integration/routes/assistant.test.ts`, Playwright CLI scripts under `.tmp/` during local validation |
| Docs/closure | `_docs/ASSISTANT_SITE_BUILDER.md`, `docs/develop/assistant.md`, task files, board, changelog |

## Implementation Pseudocode

```ts
type AssistantSiteBuilderIntakeMode = "basic" | "advanced";

type AssistantSiteBuilderIntakeStepId =
  | "business-profile"
  | "site-goals"
  | "site-map"
  | "menu"
  | "homepage-sections"
  | "hero"
  | "subpages"
  | "media-policy"
  | "content-engine"
  | "design-preset"
  | "reference-intake"
  | "review";

type AssistantSiteBuilderIntakeAnswer = {
  stepId: AssistantSiteBuilderIntakeStepId;
  values: Record<string, unknown>;
};

type AssistantActionContextWithIntake = AssistantActionContext & {
  siteBuilderIntake?: AssistantSiteBuilderIntakeSession;
  siteKit?: AssistantSiteKitPlanInput;
};

function normalizeAssistantSiteBuilderIntakeAnswer(
  step: AssistantSiteBuilderIntakeStepDefinition,
  value: unknown
) {
  rejectUnknownKeys(value, step.schema.allowedKeys);
  return step.schema.normalize(value, {
    maxTextLength: step.freeTextMax,
    optionRegistry: step.optionRegistry,
  });
}

function resolveNextSiteBuilderIntakeStep(session: AssistantSiteBuilderIntakeSession) {
  const steps = getSiteBuilderIntakeStepDefinitionsForMode(session.mode);
  const missing = steps.find((step) => !isStepSatisfied(step, session.answers));
  return missing ?? "review";
}

function buildReviewedSiteKitPlanFromIntake(session: AssistantSiteBuilderIntakeSession) {
  const normalized = normalizeAssistantSiteBuilderIntakeSession(session);
  if (!normalized.readyForPlan) return buildNeedsInputPlan(normalized.nextStep);

  const facts = deriveAssistantSiteBuilderIntakeFacts(normalized);
  const providerClassification = maybeClassifyFactsWithProvider({
    facts,
    providerContext: buildPolicyBoundedProviderContext(facts),
  });

  const compileResult = buildSiteBuilderIntakeCompileResult(facts, {
    providerClassification,
    supportedSteps: siteBuilderPlanStepIds,
    existingSolutionKits: solutionKitRegistry,
  });
  const siteKit = compileResult.siteKit;

  const conflicts = validateCompiledSiteKitPlanInput(siteKit);
  if (conflicts.blocking.length > 0) return buildNeedsInputPlan(conflicts);

  return buildSiteKitActionPlanFromExistingPath({
    siteKit,
    preview: buildGuidedSiteBuilderPlanResult(siteKit),
  });
}
```

Data flow:

- User prompt starts a guided-intake session when it asks for a new full site or
  broad site restructuring.
- The assistant asks one structured step at a time; each answer is schema
  normalized and stored as bounded session state.
- The reviewed intake session compiles into `AssistantSiteKitPlanInput` and is
  submitted through existing `context.siteKit`; prompt text is not the source of
  truth.
- A temporary `context.siteBuilderIntake` field is allowed only for
  server-normalized pre-execution metadata and must not bypass or replace
  `context.siteKit`.
- Basic mode exposes fewer choices and lets the backend choose widget presets.
- Advanced mode exposes additional design/content-model options from the same
  backend registries.
- Reference images/files are converted into a bounded design brief only after
  scanning/redaction; the user confirms the extracted brief before it influences
  planning.
- The final review step shows pages, menu structure, selected widgets,
  content-engine/custom-screen decisions, media readiness, and gated items.
- Only the final reviewed session can become a strict `siteKit` action plan
  through the existing planner/executor path.

Error handling:

- Missing required answers return `needs_input` with the next structured step.
- Unknown option ids, secret-like fields, unsafe URLs, unsupported widget aliases,
  unsupported media/reference types, or prompt-injection markers fail closed.
- Unsupported business requirements become explicit gates or follow-up
  questions, not invented actions.
- `AssistantPlanQuestion` can remain for simple clarifications, but guided
  site-builder intake needs a richer step model with option groups, single/multi
  choice controls, bounded text areas, derived summaries, and review metadata.
- If a follow-up prompt is ambiguous, the assistant must inspect/re-resolve
  trusted resources and ask for a target instead of mutating from free text.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Root precommit checks before commit: `bun run precommit`
- Targeted contract tests:
  - guided-intake answer normalization,
  - intake facts compiling into `AssistantSiteKitPlanInput`,
  - `assistantActionPlanRequestSchema` still accepting strict `context.siteKit`
    and rejecting unknown `siteKit` fields,
  - route tests for `context.siteBuilderIntake` only if that temporary metadata
    field is introduced,
  - mode/step transitions,
  - Basic/Advanced step visibility,
  - unknown-key rejection,
  - prompt-poisoning/reference-instruction rejection,
  - final session -> typed action plan assembly.
- Targeted planner/executor tests:
  - broad prompt returns `needs_input` when required Basic answers are missing,
  - complete Basic flow produces a dry-runnable plan,
  - complete Advanced flow preserves selected design/menu/hero/section options,
  - follow-up "change projects page" scopes to a trusted page/content engine.
- Admin UI tests for the guided-intake stepper, review summary, Basic/Advanced
  toggles, dirty-state preservation, and execute disabled until review.
- Route tests for any new internal route family, including auth, RBAC, CSRF,
  rate-limit bucket, and reject-unknown validation.
- Playwright CLI after helper restart:
  - Basic full-site flow from a nontechnical prompt,
  - Advanced design-heavy flow,
  - scoped cleanup of generated E2E resources followed by a second full-site
    flow in a different industry/theme from another nontechnical prompt,
  - reference-image/file intake if implemented,
  - follow-up refinement for a generated subpage/content engine,
  - public pages/details/menu/contact/mobile/console checks.
- Live OpenRouter lane when credentials are available, with sanitized output in
  task closure and no provider keys or cookies recorded.
- Claude/agent drift loops:
  - task-plan drift audit before implementation,
  - implementation/UX/security/E2E drift audit before closure.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/assistant.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` if action coverage or gates change.
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` for live Basic/Advanced coverage.
- `_docs/MEDIA_SPEC.md` if reference/media intake changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New changelog entry for completed TASK-407.
- When TASK-407 leaves are moved to `Done`, each closed leaf must be listed in
  either a standalone changelog entry or the family TASK-407 changelog entry.

## Acceptance Criteria

- Basic mode asks a bounded sequence of structured questions and can produce a
  reviewed full-site plan without requiring the user to understand widgets,
  content types, or routes.
- Advanced mode uses the same safe session contract while exposing controlled
  design, layout, hero, section, menu, media/reference, and content-engine
  decisions.
- Free text, files, images, OCR, EXIF, and provider output cannot override
  schema, RBAC, CSRF, media, or execution rules.
- The assistant explains selected widgets, pages, menu, subpages, content
  engines, custom screens, media policy, and gates before execution.
- Follow-up refinement prompts route into a scoped guided flow and can decide
  between static page edits, content engines, listings/details, and custom
  screens.
- Playwright CLI verifies Basic, Advanced, follow-up refinement, and a
  clean-second-site flow on a restarted helper with public runtime checks.
- Task-plan drift audit and final implementation drift audit have no blocking
  findings before closure.
