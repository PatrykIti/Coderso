# TASK-101-09: Assistant Action Engine (LLM Guide + Typed Actions)
# FileName: TASK-101-09_Assistant_Action_Engine_RAG_Typed_Actions.md

**Priority:** High  
**Category:** Core/Assistant + Admin/UI + CMS Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-04, TASK-101-05, TASK-101-07, TASK-101-08  
**Status:** Done (2026-04-12)

---

## Overview

Ten task po doprecyzowaniu kierunku nie dotyczy podstawowego assistant RAG.

Docelowy podzial:
- `docs-only` pozostaje read-only assistantem od dokumentacji i nawigacji po systemie,
- `llm-guide` staje sie trybem reasoning/planning, ktory widzi aktualny kontekst admina,
- mutacje sa realizowane dopiero przez typed action engine z `dry-run` + `confirm`.

Przyklad docelowego flow:
- user pisze: "potrzebuje strony z katalogiem projektow domow",
- `llm-guide` analizuje aktywny admin context, dostepne moduly, schema surfaces i uprawnienia,
- planner buduje typed plan: content type + fields + entries/custom screen + listing + runtime page,
- backend robi `dry-run` i pokazuje plan/diff,
- user zatwierdza,
- executor uruchamia tylko whitelistowane, typowane akcje przez istniejace serwisy.

Zasada architektoniczna:
- LLM nie wykonuje dowolnych komend,
- LLM nie omija obecnych route/service contracts,
- docs assistant nie zaczyna mutowac zasobow,
- `llm-guide` planuje i uzasadnia,
- action engine wykonuje tylko to, co przeszlo walidacje, RBAC, audyt i confirm.

---

## Clarified Product Direction

1. `docs-only`:
   - odpowiada na pytania "gdzie co jest" i "jak to dziala",
   - korzysta z docs corpus,
   - nie buduje planu mutacji.
2. `llm-guide`:
   - korzysta z docs corpus i live admin context snapshot,
   - analizuje ekran, schema, widoczne akcje, widgety, custom screens, listings i uprawnienia,
   - buduje typed plan lub follow-up questions.
3. `typed actions`:
   - sa warstwa wykonawcza dla `llm-guide`,
   - wspieraja `plan`, `dry-run`, `execute`,
   - wymagaja confirm, audit trail, revision hooks i idempotency.

## Scope

1. Rozdzielenie kontraktu trybow `docs-only` vs `llm-guide`.
2. Admin context snapshot dla `llm-guide`:
   - aktualna trasa i modul,
   - widoczne affordances,
   - schema/resource catalogs,
   - permission envelope,
   - budgeted, redacted live context.
3. Planner intentow (`prompt -> typed action plan`) oparty o docs + admin context.
4. Typed action registry (np. `content-type.upsert`, `custom-screen.upsert`, `listing.upsert`, `page.upsert`).
5. Execution engine z trybem:
   - `dry-run` (preview zmian / diff),
   - `execute` (po potwierdzeniu).
6. Confirm flow w Assistant UI (lista krokow + wynik walidacji + error mapping).
7. Audit log + revision hooks dla kazdej mutujacej akcji.
8. Guardrails:
   - brak arbitralnego kodu,
   - limity budzetu i rate limit,
   - idempotency key dla akcji mutujacych.
9. Blueprint presets dla common intents, np. "katalog projektow domow", tak aby `llm-guide`
   generowal UX oparty o istniejace moduły Coderso zamiast recznie projektowanego panelu.

## Non-Goals

- Pelna autonomia bez potwierdzenia usera.
- Bezposrednie wykonywanie "free-form" komend modelu poza typed registry.
- Mieszanie podstawowego docs assistant z mutujacym trybem planowania.
- Omijanie obecnych endpointow i warstw walidacji.
- Generowanie bespoke admin paneli tam, gdzie produkt ma uzyc `Engine`, `Entries`,
  `Custom Screens`, `Listings`, `Forms` i `Widgets`.

---

## Architecture

```
docs-only assistant
  -> docs retrieval
  -> explanation / navigation answer

llm-guide
  -> docs retrieval
  -> admin context snapshot
  -> intent extraction
  -> typed plan draft
  -> follow-up questions when context is insufficient

typed action engine
  -> plan schema validation
  -> dry-run diff
  -> confirm
  -> execute through existing services
  -> audit + revision + idempotency
```

## Existing Runtime Contracts to Reuse

This task must be grounded in the current repo implementation. The first delivery must reuse existing
domain/services and current assistant flows instead of inventing a parallel assistant-only backend.

Primary existing contracts to reuse:
- assistant runtime:
  - `core/services/assistant/assistantService.ts`
  - `core/server/validation/assistantSchemas.ts`
  - `core/server/routes/assistantRoutes.ts`
  - `core/admin/services/assistantClient.ts`
- current typed guided workflow foundation:
  - `core/services/assistant/siteBuilderPlanner.ts`
  - `core/services/assistant/siteBuilderExecutor.ts`
  - `core/admin/ui/setup/AiSiteWizard.tsx`
  - `core/admin/ui/setup/AiSiteWizardSteps.tsx`
  - `_docs/ASSISTANT_SITE_BUILDER.md`
- content modeling and entry management:
  - `core/services/content/typeService.ts`
  - `core/services/content/entryService.ts`
  - `core/server/routes/contentTypeRoutes.ts`
  - `core/server/routes/contentEntryRoutes.ts`
- custom screens:
  - `core/services/customScreens/customScreenService.ts`
  - `core/server/routes/customScreenRoutes.ts`
- listings:
  - `core/services/content/listingQueriesService.ts`
  - `core/services/content/listingTemplatesService.ts`
  - `core/server/routes/listingsRoutes.ts`
- pages:
  - `core/services/pages/pageService.ts`
  - `core/server/routes/pageRoutes.ts`
- forms:
  - `core/services/forms/formsService.ts`
- kit/install and typed review patterns:
  - `core/services/kits/solutionKitsService.ts`
  - `core/services/kits/solutionKitsInstallService.ts`
  - `core/services/kits/kitInstaller.ts`

Rule:
- new assistant action handlers should call existing services where those contracts already exist,
- if some current install flow only exists as direct DB logic, extract reusable helper(s) from that flow,
  then make both site-builder and llm-guide depend on the same helper,
- do not introduce a third write path for the same resource.

## Legacy Contracts to Replace, Converge, or Retire

This task is intentionally not "add one more assistant layer". It must simplify the runtime contract.

Legacy that should be converged or retired:
- `llm-rag` naming:
  - keep read compatibility temporarily,
  - but canonical product/runtime naming becomes `llm-guide`.
- standalone assistant site-builder contract:
  - current planner/review/execute shape is valuable,
  - but the long-term owner should be the generic `llm-guide` action engine,
  - specialized `/assistant/site-builder/*` routes should become either:
    - thin aliases to the generic action engine, or
    - deprecated and removed after parity lands.
- duplicate write logic:
  - no new assistant-only direct DB mutators for content types, pages, custom screens, listings, or forms,
  - if current kit installer contains resource-specific direct DB logic that blocks reuse,
    extract shared domain upsert helpers and stop growing the legacy direct-only path.

## Business Requirement Coverage

Final implementation must cover this business flow end-to-end:

Prompt:
- "potrzebuje strony na ktore bede mogl prezentowac swoje produkty czyli projekty domow, caly katalog"

Expected `llm-guide` outcome:
1. understand this is a `catalog_showcase` / structured-catalog intent,
2. propose or directly draft a `house_projects`-like content model,
3. define explicit fields for the business case:
   - title
   - slug
   - gallery
   - hero image
   - area / size
   - rooms
   - bathrooms
   - floors
   - price / price-from or request-for-quote mode
   - location / delivery region
   - project status
   - short summary
   - long description
   - downloadable assets / attachments when needed
4. create the admin management surface through existing product modules:
   - `Engine` content type,
   - `Entries` resource,
   - optional `Custom Screen` for friendlier data entry,
   - `Listings` query + template for catalog rendering,
   - `Page` for catalog landing page,
   - optional `Form` for lead capture / project inquiry,
5. show the full dry-run plan and generated resources before execution,
6. execute through typed actions,
7. leave the site owner with a working admin workflow and runtime catalog surface,
8. support further follow-up prompts like:
   - "dodaj filtr po metrazu i liczbie pokoi"
   - "na liscie pokaz cene od i status projektu"
   - "dodaj formularz zapytania do strony szczegolowej"

The business acceptance is not satisfied by "assistant answered with advice".
It is satisfied only when `llm-guide` can produce and execute a real structured setup through existing modules.

## Implementation Order

1. Normalize assistant modes and retire `llm-rag` as the canonical user-facing contract.
2. Introduce budgeted admin context snapshot from existing admin screens.
3. Converge site-builder planner/review/execute patterns into the generic guide flow.
4. Add typed action adapters that call current domain services:
   - content type
   - entry
   - custom screen
   - listing query
   - listing template
   - page
   - form
5. Extract reusable install/upsert helpers from current kit installer where current write logic is direct-DB and blocks reuse.
6. Ship the `house projects catalog` blueprint as the first business-complete guide flow.
7. Reuse or absorb current `AiSiteWizard` review/execute UX patterns instead of shipping a second competing assistant execution UI.
8. Deprecate redundant standalone site-builder contracts once generic guide parity is proven.

## Files to Change (Target)

- `core/services/assistant/assistantService.ts` (update, ~120-220 LOC)
- `core/services/assistant/actionPlannerService.ts` (new, ~220-320 LOC)
- `core/services/assistant/actionPlanTypes.ts` (new, ~180-260 LOC)
- `core/services/assistant/actionPlanHeuristics.ts` (new, ~160-240 LOC)
- `core/services/assistant/adminContextService.ts` (new, ~220-340 LOC)
- `core/services/assistant/actionRegistry.ts` (new, ~160-240 LOC)
- `core/services/assistant/actionExecutorService.ts` (new, ~220-320 LOC)
- `core/services/assistant/actionDiffService.ts` (new, ~140-220 LOC)
- `core/services/assistant/actions/*` (new executors per domain, ~400-700 LOC)
- `core/services/assistant/blueprints/*` (new presets, ~250-450 LOC)
- `core/server/routes/assistantRoutes.ts` (update, ~120-220 LOC)
- `core/server/validation/assistantActionSchemas.ts` (new, ~180-260 LOC)
- `core/admin/services/assistantClient.ts` (update, ~120-220 LOC)
- `core/admin/ui/assistant/AssistantPanel.tsx` (update, ~140-260 LOC)
- `core/admin/ui/assistant/AssistantModeSwitch.tsx` (update, ~40-80 LOC)
- `core/admin/ui/assistant/components/ActionPlanReview.tsx` (new, ~180-280 LOC)
- `core/admin/ui/assistant/components/ActionExecutionResult.tsx` (new, ~120-220 LOC)
- `core/admin/ui/assistant/components/GuideQuestionCard.tsx` (new, ~80-140 LOC)
- `tests/vitest/assistant/*action*` (new/update)
- `tests/vitest/ui/assistant-actions*.test.tsx` (new)
- `tests/integration/routes/assistant-actions.test.ts` (new)
- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`

## Security Contract

- Visibility: `internal` only under `/admin/api/assistant/actions/*`.
- Auth model: admin session cookie.
- RBAC:
  - `plan` / `dry-run`: authenticated admin + route floor permission `settings:read`,
  - `execute`: authenticated admin + route floor permission `settings:write`,
  - each typed action must additionally pass domain-specific permission checks before execution.
- CSRF: required for all `POST` writes and dry-run requests originating from admin UI.
- Rate-limit bucket:
  - planning endpoints: `assistant`,
  - execute endpoint: `assistant` with execution concurrency guard and idempotency key.
- Validation: strict reject-unknown JSON schemas for all action payloads.
- Anti-abuse controls:
  - no public write surface,
  - no nonce/HMAC path because endpoint is internal-only,
  - no arbitrary code execution,
  - context snapshot must be redacted and size-budgeted before reaching the LLM.

---

## Sub-Tasks (Planned)

- `TASK-101-09-01_Assistant_Mode_Split_and_Runtime_Contracts.md`
- `TASK-101-09-02_Admin_Context_Snapshot_and_Safe_Surface_Observers.md`
- `TASK-101-09-03_LLM_Guide_Planner_and_Typed_Plan_Schema.md`
- `TASK-101-09-04_Typed_Action_Registry_Dry_Run_and_Execution_Pipeline.md`
- `TASK-101-09-05_Generated_Catalog_Blueprints_and_Admin_Surface_Composition.md`
- `TASK-101-09-06_Assistant_UI_API_Security_Tests_and_Closure.md`

---

## Pseudocode

```ts
const mode = normalizeAssistantMode(request.mode); // "docs-only" | "llm-guide"

if (mode === "docs-only") {
  return answerDocsQuestionOnly(request);
}

const adminContext = await buildAssistantAdminContext({
  actorId,
  route: request.context?.route,
  uiSnapshot: request.context?.uiSnapshot,
});

const plan = await buildAssistantActionPlan({
  prompt,
  docsContext: await getDocsContext(prompt),
  adminContext,
  model: "reasoning-llm",
});

validateActionPlan(plan); // strict JSON schema

const preview = await runActionPlan(plan, {
  mode: "dry-run",
  actor,
});

// UI confirm
if (confirmed) {
  const result = await runActionPlan(plan, {
    mode: "execute",
    actor,
    idempotencyKey,
  });
  return result;
}
```

---

## Acceptance Criteria

1. `docs-only` nadal dziala jako read-only docs assistant bez regresji.
2. `llm-guide` potrafi budowac plan na podstawie docs + live admin context.
3. User moze poprosic asystenta o utworzenie/edycje zasobow CMS przez typed actions.
4. Kazda mutacja wymaga confirm i jest poprzedzona dry-run z czytelnym diffem.
5. Actions dzialaja przez istniejace walidatory/serwisy (brak bypassu warstw).
6. Kazda akcja mutujaca ma audit trail i wspiera bezpieczny retry (idempotency).
7. Product-level intents, np. "katalog projektow domow", sa mapowane na beginner-safe
   blueprint wykorzystujacy aktualne surfaces Coderso.
8. Full "tested end-to-end" claim for the shipped slice additionally requires the second-wave
   coverage tracked in `TASK-101-09-06-04` (deep UI interaction, DB-backed parity, runtime/public acceptance).

## Current Implementation Notes (2026-04-10)

- The current shipped slice is business-complete for `house-projects-catalog`:
  - typed plan,
  - dry-run,
  - execute,
  - review UI,
  - public catalog page,
  - public detail route.
- `TASK-101-09-06-04` is now complete, so this first vertical slice is tested end-to-end.
- The main remaining gap is no longer "does the shipped slice work?";
  it is "how to generalize the planner beyond the single house-projects blueprint".

## Completion Notes (2026-04-12)

- The LLM Guide action engine shipped as one `/assistant/actions/*` flow.
- Site-kit convergence, admin context snapshots, resource catalog context, runtime snapshot context, strict planner schema, provider draft recovery, registry dispatch, persistent idempotency, and canonical `llm-guide` mode cleanup are complete for the current scope.
- Future product expansion should use new task IDs instead of reopening the legacy `llm-rag` action-engine framing.

## Next Generic Wave

The next product step is tracked under:
- `TASK-101-09-07_Generic_LLM_Guide_Intent_Families_and_State_Aware_Planning.md`

That wave covers:
- intent-family routing,
- generic blueprint generation,
- multi-domain presets,
- state-aware follow-up refinement without duplicate setups.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest unit for Bun-free modules only:
  - mode normalization and backward compatibility,
  - admin context builders and redaction budgets,
  - planner output sanitization,
  - action schema validation,
  - generated catalog blueprints.
- Execution-layer unit ownership:
  - use Vitest only after extraction removes import-time DB/settings/runtime coupling,
  - otherwise keep executor/adapters in Bun-owned unit or integration suites until the seam is pure.
- Bun integration:
  - `/assistant/actions/plan`,
  - `/assistant/actions/dry-run`,
  - `/assistant/actions/execute`.
- Acceptance integration:
  - `house projects catalog` prompt -> typed plan -> dry-run -> execute -> validation,
  - assert created content type, optional custom screen, listing query/template, page, and optional form surfaces.
- Vitest UI:
  - review + confirm flow,
  - follow-up question states,
  - error states (validation, permission, conflict),
  - partial success rendering.

---

## Documentation Updates Required

- `_docs/CMS_API.md` (assistant action endpoints + payload contracts)
- `_docs/ARCHITECTURE.md` (docs-only vs llm-guide split + action engine layer)
- `_docs/SECURITY_SPEC.md` (guardrails, confirmation, idempotency, audit)
- `_docs/ASSISTANT_SITE_BUILDER.md` (guide mode and generated blueprints)
- `_docs/_CHANGELOG/*.md`
