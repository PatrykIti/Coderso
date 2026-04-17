# TASK-178: LLM Guide Generic CMS Reasoning and Plan Orchestration
# FileName: TASK-178_LLM_Guide_Generic_CMS_Reasoning_and_Plan_Orchestration.md

**Priority:** High
**Category:** Assistant/Core + CMS Operations + Product UX
**Estimated Effort:** Large
**Dependencies:** TASK-101-09, TASK-170, TASK-171, TASK-172, TASK-173, TASK-174
**Status:** To Do

---

## Overview

Upgrade `LLM Guide` from mostly deterministic, family-specific planner paths into a generic CMS operation planner that can understand natural admin requests across the whole CMS:

- "czy widzisz strone 'pysiek mysiek' w pages i mi ja usun",
- "zmien tytul tej strony na ...",
- "jakie ekrany widzisz z prefixem House Projects",
- "usun formularz, ktory zbiera zapytania o wycene",
- "zmien layout listing card dla produktow".

The solution must not add one-off prompt cases for every resource. It must introduce reusable operation understanding:

`prompt + conversation state + active surface + resource catalog -> target resolution -> typed action plan or read-only inspection -> review -> execute`

## Sub-Tasks

- `TASK-178-01_Intent_Operation_Taxonomy_and_Planner_Contract.md`
- `TASK-178-02_CMS_Resource_Registry_and_Target_Resolver.md`
- `TASK-178-03_Provider_First_Planner_Context_and_Draft_Contract.md`
  - `TASK-178-03-01_LLM_Guide_Mode_Planning_Route_Contract.md`
  - `TASK-178-03-02_Provider_Operation_Draft_Prompt_and_Response_Schema.md`
  - `TASK-178-03-03_Model_First_Planner_Orchestration_and_Fallbacks.md`
  - `TASK-178-03-04_Planner_Response_Kinds_Docs_Inspection_Action_Needs_Input.md`
  - `TASK-178-03-05_Provider_Safety_Evaluation_and_Route_Coverage.md`
- `TASK-178-04_Generic_Read_Inspect_and_Candidate_Plans.md`
- `TASK-178-05_Generic_Mutation_Planning_and_Action_Mapping.md`
- `TASK-178-06_Conversation_State_and_Follow_Up_Target_Memory.md`
- `TASK-178-07_Evaluation_Fixture_Matrix_and_Red_Team_Corpus.md`
  - `TASK-178-07-01_OpenRouter_Live_Planner_Smoke.md`
  - `TASK-178-07-02_Model_Capability_Driven_Structured_Output_Strategy.md`
- `TASK-178-08_Review_UX_Docs_Gates_and_Closure.md`

## Architecture

The target architecture is a generic planning pipeline:

1. Normalize the user prompt into a small operation taxonomy:
   - `inspect`, `find`, `create`, `update`, `delete`, `archive`, `publish`, `configure`, `refine`.
2. Resolve resource intent through a `CmsResourceRegistry` instead of per-case prompt branches:
   - pages, entries, content types, custom screens, widgets/templates, listings, forms, menus, SEO, media, settings, solution kits.
3. Resolve targets through trusted context:
   - active surface,
   - server-side resource catalog,
   - bounded server-hydrated resource details,
   - previous assistant clarification state.
4. Convert provider/local drafts into strict typed actions:
   - no arbitrary commands,
   - no arbitrary DB paths,
   - no mutation outside registered action contracts,
   - unsupported actions return typed `needs_input` or gated plans.
5. Keep every mutation behind dry-run/review/execute/idempotency/audit.

This task intentionally avoids a keyword-only fix. Deterministic heuristics may still provide a safe fallback, but they cannot be the primary scalability model for CMS-wide natural language operations.

## Integration Contract with Existing Code

This wave must extend the current `LLM Guide` action engine. It must not create a second assistant flow, second execution route, or assistant-only resource mutation path.

Required integration points:

- Keep the same internal routes in `core/server/routes/assistantRoutes.ts`:
  - `POST /assistant/actions/plan`
  - `POST /assistant/actions/dry-run`
  - `POST /assistant/actions/execute`
- Keep `core/services/assistant/actionPlannerService.ts` as the orchestration entry point.
- Keep `core/services/assistant/actionPlanTypes.ts` and `core/services/assistant/actionPlanSchema.ts` as the strict plan contract boundary.
- Keep `core/services/assistant/actionRegistry.ts` and `core/services/assistant/actionFamilyContracts.ts` as the action allowlist and permission source.
- Reuse `core/services/assistant/adminContextCatalogs.ts`, `adminContextCatalogNormalizer.ts`, `adminContextService.ts`, and `activeSurfaceHydration.ts` for trusted context.
- Reuse `providerPlanningContext.ts` and `actionPlanProviderAdapter.ts`; expand them rather than adding another provider planner.
- Reuse `actionExecutorService.ts`, `actionDiffService.ts`, `actionExecutionStore.ts`, and undo manifest logic for dry-run/execute/audit/idempotency.
- Reuse the current admin UI shell in `core/admin/ui/assistant/AssistantPanel.tsx` and `components/ActionPlanReview.tsx`.
- Existing blueprint packs and resource-operation adapters remain valid adapters behind the generic planner. They are not replaced unless a smaller shared abstraction naturally absorbs them.

Non-goals:

- no new public assistant endpoint,
- no direct provider-to-executor path,
- no execution of provider drafts before strict local validation,
- no arbitrary patch/action format outside the typed action registry.

## Implementation Order

1. Add the generic operation draft schema and tests.
2. Add the CMS resource registry and target resolver over existing resource catalogs.
3. Wire provider-first operation draft planning through the current planner service.
4. Add read-only inspection/candidate plan support and UI rendering.
5. Add the operation-to-action mapper using existing typed actions.
6. Add bounded conversation follow-up state.
7. Add evaluation fixtures and security/redaction regression coverage.
8. Update docs, acceptance matrix, and gates.

## Acceptance Criteria

1. A single `LLM Guide` flow handles setup, read-only inspection, candidate resolution, and mutations through `/assistant/actions/*`.
2. Natural prompts are not handled by one-off keyword branches as the primary path.
3. Every mutation still maps to existing or explicitly promoted typed actions and requires dry-run/review/execute.
4. Read-only prompts return read-only/candidate responses and never expose execute controls.
5. Ambiguous resource matches return candidates or questions instead of guessing.
6. Provider reasoning improves understanding, but strict local validation remains the authority.

## Progress Notes

- 2026-04-16: Completed the first generic CMS planner foundation:
  - `TASK-178-01` operation draft contract,
  - `TASK-178-02` resource registry and target resolver,
  - `TASK-178-04` read-only inspection/candidate plans.
- The current implementation stays inside the existing `/assistant/actions/*` flow and reuses current planner/schema/executor/review UI contracts.
- Provider-first operation planning, generic mutation mapping beyond the first page delete/update slice, conversation target memory, fixture matrix expansion, and closure docs/gates remain open leaves.
- 2026-04-16: Completed `TASK-178-03-01` and `TASK-178-03-02`, and started `TASK-178-03-03`; `LLM Guide` mode now routes through action planning instead of a frontend keyword gate, and provider JSON can be validated as CMS operation drafts.
- 2026-04-17: Completed `TASK-178-03`; provider-first planning, planner response kinds, and provider safety fixtures are now in place. Remaining leaves are generic mutation mapping, conversation target memory, broader fixture matrix, and closure docs/gates.
- 2026-04-17: Completed `TASK-178-05`; generic CMS operation drafts can now map to existing typed actions for supported resource families without adding executor paths.
- 2026-04-17: Completed `TASK-178-06`; read-only inspection candidates can be reused safely in follow-up prompts through bounded advisory planning state.
- 2026-04-17: Added `TASK-178-07-02`; remaining evaluation work must include model/provider capability-driven structured output instead of provider-specific planner hardcode.
- 2026-04-17: Completed `TASK-178-07-02`; provider structured output now uses model capability profiles and provider-agnostic response contracts.

## Security Contract

- Visibility: internal-only admin endpoints under `/admin/api/assistant/*`.
- Auth model: existing admin session.
- RBAC:
  - planning/inspection requires read permission for the target family,
  - dry-run requires target-family read permissions,
  - execute requires write/delete/publish permissions per mapped typed action.
- CSRF: all assistant action POST endpoints keep existing CSRF protection.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation:
  - provider/local operation drafts must reject unknown fields,
  - mapped typed actions must pass `actionPlanSchema`,
  - client-supplied resource ids remain advisory and must be rehydrated server-side.
- Anti-abuse:
  - no public write endpoint,
  - no autonomous mutation without review,
  - ambiguous targets return candidate/clarification plans,
  - destructive operations require target count and dry-run warnings.
- Secret handling:
  - no secrets, submissions, cookies, CSRF tokens, provider keys, or signed URLs in planner context, review UI, audit metadata, or provider prompts.

## Testing Requirements

- Vitest:
  - generic intent taxonomy,
  - resource registry aliases,
  - target resolver ambiguity,
  - provider draft repair,
  - read-only inspection plans,
  - mutation mapping fixtures.
- Bun:
  - route permission matrix,
  - server-side resource rehydration,
  - execute idempotency/audit for mapped mutations,
  - DB-backed target conflict checks where resources are persisted.
- UI:
  - review states for read-only, needs-input, ready, blocked, and destructive plans.
- Security/perf:
  - assistant route rate-limit and redaction tests,
  - no provider prompt leakage of sensitive admin data.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- relevant `docs/` assistant corpus pages
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entries when leaves complete
