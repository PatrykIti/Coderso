# TASK-101-09-03: LLM Guide Planner and Typed Plan Schema
# FileName: TASK-101-09-03_LLM_Guide_Planner_and_Typed_Plan_Schema.md

**Priority:** High
**Category:** Core/Assistant + Validation
**Estimated Effort:** Large
**Dependencies:** TASK-101-09-01, TASK-101-09-02
**Status:** Done (2026-04-12)

---

## Overview

Planner ma zamieniac prompt + docs/admin context na strict typed plan albo na follow-up questions.
Po ostatnich taskach planner ma juz duzo bogatszy input:
- route/module context,
- `resourceCatalog`,
- `runtimeSnapshot`,
- site-kit context,
- existing deterministic catalog family blueprints.

Ten task nie dodaje drugiego flow. Wszystko nadal ma zasilac istniejace:

```txt
/assistant/actions/plan
  -> classify prompt
  -> normalize/repair provider or local draft
  -> strict typed plan
  -> dry-run
  -> execute
```

## Current Repo Context

Istniejace elementy do reuse:
- `core/services/assistant/actionPlanTypes.ts`
  - owns current typed actions and `AssistantActionPlan`,
  - includes catalog, form/page/listing actions, `site-kit.*`, `resourceCatalog`, `runtimeSnapshot`.
- `core/services/assistant/actionPlannerService.ts`
  - currently owns prompt classification, setup/refinement routing, local heuristic routing, and site-kit plan construction,
  - is too large and mixes classification, heuristics, and plan assembly.
- `core/services/assistant/blueprints/catalogFamilyBlueprint.ts`
- `core/services/assistant/blueprints/catalogFamilyPresets.ts`
- `core/services/assistant/blueprints/houseProjectsCatalogBlueprint.ts`
- `core/services/assistant/siteBuilderPlanAdapter.ts`
- `core/server/validation/assistantActionSchemas.ts`
  - currently validates top-level action plan route payload,
  - does not own a strict nested action-plan JSON schema.
- `tests/vitest/assistant/actionPlannerService.test.ts`
  - already covers current deterministic families and enriched context acceptance.

## Target Architecture

Split planner concerns into import-safe pure modules:

```txt
actionPlannerService.ts
  -> orchestrates only

actionPlanSchema.ts
  -> strict nested schema + validate/normalize plan

actionPlanHeuristics.ts
  -> local intent/context repair and follow-up questions

actionPlanProviderAdapter.ts
  -> maps provider JSON draft into local draft shape, no network calls
```

Provider execution remains backend-only and must not be introduced into admin/UI. Tests for provider output use mocked provider JSON, not live network.

## Security Contract

- Visibility: internal only through existing `/admin/api/assistant/actions/plan`.
- New public endpoints: none.
- Auth: existing admin session through current assistant action route.
- RBAC:
  - route still enforces `settings:read` + `content:read`,
  - `site-kit.*` still requires `solution-kits:read/write` in existing routes,
  - planner output never authorizes execution; dry-run/execute routes remain authority.
- CSRF: existing `POST /assistant/actions/plan` CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation:
  - provider draft schema and normalized plan schema reject unknown fields,
  - action `input` is validated per action family before returning a `ready` plan.
- Anti-abuse:
  - no public write surface,
  - no nonce/HMAC/reCAPTCHA because endpoint is internal-only.
- Secret handling:
  - provider prompt/context must use already-redacted `resourceCatalog` and advisory `runtimeSnapshot`,
  - no provider/API keys in prompt/debug payloads,
  - no raw form submissions, entry values, session/cookie/CSRF data, roles, or raw permissions.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts` (update, schema-facing helper types if needed)
- `core/services/assistant/actionPlanSchema.ts` (new, pure strict schema/normalizer)
- `core/services/assistant/actionPlanHeuristics.ts` (new, pure context-aware local heuristics)
- `core/services/assistant/actionPlanProviderAdapter.ts` (new, pure mocked-provider draft adapter)
- `core/services/assistant/actionPlannerService.ts` (update, orchestration only)
- `core/server/validation/assistantActionSchemas.ts` (update only if route payload contract changes)
- `tests/vitest/assistant/action-plan-schema.test.ts` (new)
- `tests/vitest/assistant/action-plan-heuristics.test.ts` (new)
- `tests/vitest/assistant/action-plan-provider-adapter.test.ts` (new)
- `tests/vitest/assistant/actionPlannerService.test.ts` (update)
- `tests/integration/routes/assistant.test.ts` (only if route schema changes)

## Sub-Tasks

- `TASK-101-09-03-01_Prompt_Normalization_Intent_Extraction_and_Strict_Plan_Schema.md`
- `TASK-101-09-03-02_Local_Heuristics_Plan_Repair_and_Missing_Context_Questions.md`
- `TASK-101-09-03-03_Provider_Draft_Plan_Adapter_and_Malformed_Output_Recovery.md`
- `TASK-101-09-03-04_Planner_Test_Docs_and_Closure.md`

## Test Matrix

### 1. Strict Schema Tests

Runner: `Vitest`.

Files:
- `tests/vitest/assistant/action-plan-schema.test.ts`

Must cover:
- valid existing catalog family plan passes strict schema,
- valid `site-kit.*` plan passes strict schema,
- unknown top-level plan fields fail,
- unknown action fields fail,
- malformed action input fails per action family,
- `needs_input` plan requires questions and no ready-only assumptions,
- confidence clamping and deterministic id/title normalization.

### 2. Heuristic/Repair Tests

Runner: `Vitest`.

Files:
- `tests/vitest/assistant/action-plan-heuristics.test.ts`

Must cover:
- resource catalog helps infer existing content type/listing/form names,
- runtime snapshot selected resource helps refinement routing,
- missing critical context returns typed questions,
- safe defaults are explicit assumptions,
- deterministic outputs for identical prompt/context,
- docs-only prompt remains non-mutating.

### 3. Provider Draft Adapter Tests

Runner: `Vitest` with mocked JSON only.

Files:
- `tests/vitest/assistant/action-plan-provider-adapter.test.ts`

Must cover:
- provider draft maps to local draft action families,
- unknown action types are rejected or converted to questions,
- malformed JSON/draft returns typed recovery question,
- provider draft cannot inject secrets/debug payloads,
- provider draft cannot bypass action schema.

### 4. Planner Regression Tests

Runner: `Vitest`.

Files:
- `tests/vitest/assistant/actionPlannerService.test.ts`

Must cover:
- existing house-projects prompt unchanged,
- product/portfolio/services prompt families unchanged,
- state-aware refinement prompt unchanged,
- site-kit context unchanged,
- enriched `resourceCatalog` + `runtimeSnapshot` is accepted and used only as context.

### 5. Route Tests

Runner: `Bun` only if `assistantActionSchemas.ts` changes.

Files:
- `tests/integration/routes/assistant.test.ts`

Must cover:
- strict request validation remains reject-unknown,
- `includeResourceCatalog` and `runtimeSnapshot` still validate,
- `site-kit.*` LLM guard still works.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bunx vitest run tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/action-plan-heuristics.test.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts tests/vitest/assistant/actionPlannerService.test.ts --config vitest.config.ts`
- `bun test tests/integration/routes/assistant.test.ts` if route validation changes.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md` if action plan schema/route payload changes
- `_docs/SECURITY_SPEC.md`

## Completion Notes (2026-04-12)

- Added strict nested action-plan schema/normalizer.
- Moved prompt/context heuristics into `actionPlanHeuristics.ts`.
- Added provider draft adapter that treats provider output as untrusted and recovers malformed output into typed questions.
- `planAssistantActions` now normalizes returned plans through strict schema.
- Existing catalog family, refinement, site-kit, resource catalog, and runtime snapshot planner paths remain covered by regression tests.

## Validation (2026-04-12)

- `bunx vitest run tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/action-plan-heuristics.test.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts tests/vitest/assistant/actionPlannerService.test.ts --config vitest.config.ts`
- `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
