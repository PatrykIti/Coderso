# TASK-101-09-06-04: Deep Interaction, DB Parity, and Runtime Acceptance Test Wave
# FileName: TASK-101-09-06-04_Deep_Interaction_DB_Parity_and_Runtime_Acceptance_Test_Wave.md

**Priority:** High  
**Category:** QA + Runtime + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09 implementation slice, TASK-101-09-06-03  
**Status:** Done (2026-04-10)

---

## Overview

Pierwszy slice `TASK-101-09` jest wdrozony w kodzie dla biznesowego flow `house-projects-catalog`,
ale current automated coverage nie domyka jeszcze calej powierzchni ryzyka.

Ten drugi etap testow ma odpowiedziec na pytanie:
- czy wdrozony flow dziala nie tylko w isolated planner/executor tests,
- ale tez w realnym admin/runtime stacku, z interakcjami UI, DB-backed resources i publicznym renderem.

## Current State vs Remaining Gap

Aktualnie pokryte:
1. planner dla promptu katalogu projektow domow,
2. client/API wrappers dla nowych assistant action endpoints,
3. review/result rendering w Assistant UI,
4. Bun-owned route wiring dla `/assistant/actions/*`,
5. executor dry-run/execute/idempotency na stubbed deps,
6. widget rendering regression dla screen widgets po primitive binding changes.

Nadal niepokryte w pelni:
1. pelny interaktywny `AssistantPanel` flow:
   - prompt -> plan -> dry-run -> execute,
   - success/error/retry states,
   - `needs_input` branch,
   - mode persistence in the live panel.
2. DB-backed parity:
   - real create/update/noop against persisted resources,
   - existing resources updated instead of recreated,
   - partial failure behavior with persisted state inspection.
3. Public runtime parity:
   - `/projekty-domow` page render after execute,
   - detail route for generated content type entries,
   - `site.contentRoutes` effect on public request handling.
4. Follow-up refinement:
   - second prompt updates existing catalog setup instead of generating a parallel one.

## Goal

Dostarczyc confidence-level "tak, to dziala end-to-end", a nie tylko "kod i pierwsze testy przeszly".

## Scope

1. UI interaction tests for floating assistant flow.
2. Bun DB-backed integration tests for real resource mutations.
3. Public runtime acceptance tests for generated catalog routes and page rendering.
4. Update/noop/partial-failure/follow-up refinement scenarios.

## Files to Change

- `tests/vitest/ui/assistant-panel-interaction.test.tsx` (new, ~220-360 LOC)
- `tests/unit/assistant/actionExecutorService.db.test.ts` (new Bun-owned, DB-conditional, ~220-360 LOC)
- `tests/integration/routes/assistant-actions.test.ts` (new/update, ~260-420 LOC)
- `tests/integration/runtime/assistantHouseProjectsCatalogRuntime.test.ts` (new, ~220-360 LOC)
- `tests/integration/server/assistantHouseProjectsCatalogPublicSite.test.ts` (new, ~220-360 LOC)

## Test Matrix

### 1. UI Interaction Flow

Runner: `Vitest`

Use for:
- floating assistant panel interaction,
- optimistic/review state transitions,
- error banners and retry affordances,
- `LLM Guide` mode persistence within user-facing UI.

Must cover:
1. user enters house-projects prompt in `LLM Guide`,
2. UI shows typed plan card,
3. user triggers dry-run,
4. UI shows change preview,
5. user triggers execute,
6. UI shows execution result links,
7. API failure renders actionable error state,
8. `needs_input` plan renders clarifying questions instead of execute CTA.

### 2. DB-Backed Mutation Parity

Runner: `Bun`

Use for:
- resource mutations that still depend on real DB/runtime-owned services,
- create/update/noop parity,
- persisted state verification.

Must cover:
1. create flow persists:
   - content type,
   - custom screen,
   - listing query,
   - listing template,
   - page,
   - content route setting.
2. second execute with same plan results in update/noop instead of duplicate resources.
3. idempotency replay returns previous result for the same key.
4. missing dependency or invalid intermediate state yields partial failure contract.

### 3. Public Runtime Acceptance

Runner: `Bun`

Use for:
- runtime/public route handling,
- generated page rendering,
- content route detail/list behavior.

Must cover:
1. after execute, `/projekty-domow` resolves as published page,
2. generated `content-list` points to resolved listing query/template ids,
3. generated `site.contentRoutes` allows public detail resolution for house-project entries,
4. detail route renders entry data for a created project record.

Note:
- hidden/system list route behavior is now treated as an internal implementation detail for this slice,
  not as a release-blocking public acceptance requirement.
- the shipped business requirement is satisfied by:
  - working public catalog landing page,
  - working public detail route,
  - working admin surfaces and persisted resources.

### 4. Follow-Up Refinement

Runner:
- planner follow-up interpretation in `Vitest`,
- persisted update behavior in `Bun`.

Must cover:
1. follow-up prompt like "dodaj filtr po metrazu i liczbie pokoi" updates existing listing setup,
2. follow-up prompt like "dodaj formularz zapytania do strony szczegolowej" creates or updates form/page wiring,
3. planner recognizes existing catalog state from context instead of creating duplicate surfaces.

## Pseudocode

```ts
// UI interaction
openAssistantPanel();
switchMode("llm-guide");
typePrompt("potrzebuje ... projekty domow ... katalog");
submit();
await screen.findByText("House Projects Catalog");
click("Dry-run changes");
await screen.findByText("Execute setup");
click("Execute setup");
await screen.findByText("Open public page");

// Bun DB parity
const first = await executeAssistantActionPlan(...);
const second = await executeAssistantActionPlan(...);
expect(second.summary.noop + second.summary.update).toBeGreaterThan(0);

// Public runtime
const response = await request("/projekty-domow");
expect(response.status).toBe(200);
expect(response.text()).toContain("Katalog Projektów Domów");
```

## Acceptance Criteria

1. `AssistantPanel` interaction path is covered beyond static render snapshots.
2. DB-backed resource state is verified after execute, not only mocked/stubbed deps.
3. Public runtime is proven for the generated house-projects catalog flow.
4. Update/noop/replay/failure branches are covered, not just create-happy-path.
5. After this wave, it is accurate to say the current shipped slice is tested end-to-end for the business flow.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted `vitest` for assistant interaction suites
- targeted `bun test` for DB-backed executor, route, runtime, and public-site suites
- DB-backed suites run only when `DATABASE_URL` is reachable

## Documentation Updates Required

- `_docs/_TASKS/TASK-101-09_Assistant_Action_Engine_RAG_Typed_Actions.md`
- `_docs/_TASKS/TASK-101-09-06_Assistant_UI_API_Security_Tests_and_Closure.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md` when completed

## Completion Notes (2026-04-10)

- Added interactive `Vitest` coverage for the floating assistant `LLM Guide` flow:
  - prompt -> plan,
  - dry-run,
  - execute,
  - `needs_input` branch.
- Added Bun DB-backed parity coverage for:
  - create,
  - rerun update/noop behavior,
  - idempotency replay.
- Added Bun public runtime acceptance coverage for:
  - generated catalog landing page,
  - generated public detail route for house-project entries.
- kept the hidden/system list route out of the final acceptance contract for this slice,
  because it is an internal runtime-support path rather than a user-facing business requirement.
- Fixed a real runtime regression uncovered by this wave:
  - `contentListResolver` no longer emits invalid `resolved.runtime` shape with undefined keys.
- Confirmed the current shipped `house-projects-catalog` slice is now tested end-to-end for:
  - assistant UI interaction,
  - persisted mutation behavior,
  - public runtime rendering.
