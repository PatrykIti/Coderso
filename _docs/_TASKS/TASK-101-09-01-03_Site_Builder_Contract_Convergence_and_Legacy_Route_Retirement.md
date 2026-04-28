# TASK-101-09-01-03: Site Builder Contract Convergence and Legacy Route Retirement
# FileName: TASK-101-09-01-03_Site_Builder_Contract_Convergence_and_Legacy_Route_Retirement.md

**Priority:** High  
**Category:** Core/Assistant + Admin/UI + Runtime Contracts  
**Estimated Effort:** Large
**Dependencies:** TASK-101-09-01-02  
**Status:** Done (2026-04-11)

---

## Overview

Obecny `assistant/site-builder` to juz typed guided workflow. Nie mozemy po prostu dolozyc obok niego
drugiego, osobnego `llm-guide` execution flow.

Ten leaf ma doprowadzic do konwergencji:
- current site-builder becomes a preset/specialization of the generic guide engine,
- review/execute UX and route shapes are moved to the shared guide contract,
- standalone legacy contracts are removed after the migration, not kept as a parallel supported surface.

Updated product decision:
- Site kits belong to `LLM Guide`, not to basic docs-only RAG.
- Docs-only assistant may explain where kit docs/settings live, but it must not recommend or execute kits.
- `LLM Guide` is the only assistant mode that should choose a kit for a scenario, because it has provider-backed reasoning and can use docs/admin context.

This means the target is a single execution model:

```txt
LLM Guide prompt
  -> docs + admin/resource context
  -> typed plan
  -> dry-run
  -> confirm
  -> execute

where typed plan may contain:
  - site-kit.recommend
  - site-kit.install
  - site-kit.validate
  - catalog/content/page/form/custom-screen actions
```

## Existing Code to Reuse

- `core/services/assistant/siteBuilderPlanner.ts`
- `core/services/assistant/siteBuilderExecutor.ts`
- `core/server/routes/assistantRoutes.ts`
- `core/admin/services/assistantClient.ts`
- `core/admin/ui/setup/AiSiteWizard.tsx`
- `core/admin/ui/setup/AiSiteWizardSteps.tsx`
- `_docs/ASSISTANT_SITE_BUILDER.md`

## Legacy to Replace or Retire

- `/assistant/site-builder/plan`
- `/assistant/site-builder/execute`
- `/assistant/site-builder/validate`

Target state:
- do not keep `/assistant/site-builder/*` as final API routes,
- move site-kit planning, dry-run, execution, and validation to `/assistant/actions/*`,
- remove route registration and client exports for the old site-builder route family once the shared flow covers equivalent behavior,
- keep `siteBuilderPlanner.ts` / `siteBuilderExecutor.ts` only as internal implementation adapters if they remain useful,
- stop growing wizard-only execution logic in parallel,
- the site-builder UI may remain only as a guided entry point that calls the shared `LLM Guide` action contract.

Migration rule:
- temporary aliases are allowed only inside the same implementation branch while tests are being moved,
- a task cannot be marked `Done` while `/assistant/site-builder/*` is still a supported route surface,
- public/admin documentation must describe `/assistant/actions/*` as the single assistant mutation flow.

## Mode Contract

- `docs-only`:
  - can answer questions about available site kits,
  - cannot recommend a kit as a plan,
  - cannot dry-run or execute site-kit mutations.
- `llm-guide`:
  - requires assistant LLM provider availability (`assistant.llm.enabled=true`, provider configured, API key configured through integration settings),
  - can recommend a site kit for a business scenario,
  - can dry-run and execute site-kit install through typed actions,
  - can choose not to use a kit and instead generate a custom catalog/page/form flow.

If LLM is unavailable:
- `/assistant/actions/plan` must not silently run kit recommendation in docs-only mode,
- UI should show that LLM Guide must be configured before kit reasoning/execution,
- removed `/assistant/site-builder/*` routes must not remain as a docs-only fallback,
- any retained UI entry point must route the user to configure `LLM Guide` instead of running kit selection through RAG.

## Target Action Families

Add typed site-kit actions to the generic action engine:

```ts
type SiteKitRecommendAction = {
  type: "site-kit.recommend";
  input: {
    businessType?: string;
    goals: string[];
    locale: string;
    siteName?: string | null;
  };
};

type SiteKitInstallAction = {
  type: "site-kit.install";
  input: {
    selectedKitId: SolutionKitId;
    enabledStepIds: SiteBuilderPlanStepId[];
    dryRun?: boolean;
    continueOnError?: boolean;
    settingsPatch?: Record<string, unknown>;
    notes?: string[];
  };
};

type SiteKitValidateAction = {
  type: "site-kit.validate";
  input: {
    runId: string;
  };
};
```

Implementation note:
- These should wrap/reuse `siteBuilderPlanner.ts` and `siteBuilderExecutor.ts`.
- Do not duplicate solution-kit install logic inside new assistant-only code.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts` (update, site-kit action types)
- `core/services/assistant/actionPlannerService.ts` (update, route kit-intent prompts)
- `core/services/assistant/actionExecutorService.ts` (update, dispatch site-kit actions)
- `core/services/assistant/siteBuilderExecutor.ts` (update/extract shared adapter where needed)
- `core/server/routes/assistantRoutes.ts` (update, remove `/assistant/site-builder/*`, keep `/assistant/actions/*`)
- `core/admin/services/assistantClient.ts` (update, migrate/remove site-builder-specific client methods)
- `core/admin/ui/setup/AiSiteWizard.tsx` (update, call generic action contract)
- `_docs/ASSISTANT_SITE_BUILDER.md` (update)

## Pseudocode

```ts
const plan = await planAssistantActions({
  prompt,
  mode: "llm-guide",
  context,
});

if (plan.actions.some((action) => action.type === "site-kit.install")) {
  const dryRun = await dryRunAssistantActionPlan({ plan });
  return dryRun;
}
```

## Sub-Tasks

1. Add site-kit action types to the generic action plan contract.
2. Wrap current `siteBuilderPlanner` / `siteBuilderExecutor` through generic action executor adapters.
3. Move site-kit plan/dry-run/execute/validate route behavior to `/assistant/actions/*`.
4. Remove `/assistant/site-builder/*` route registration after generic route parity is covered.
5. Remove or migrate `assistantClient` site-builder-specific methods to generic action methods.
6. Update `AiSiteWizard` to reuse the shared action review/execute contract as a guide entry point.
7. Add explicit route-retirement tests proving old site-builder routes are not supported as a parallel flow.
8. Add docs/security/API notes for LLM-only guide behavior.

## Test Matrix

### 1. Planner Unit Tests

Runner: `Vitest`

Must cover:
- kit-suitable prompts route to site-kit plan family when mode/context says `llm-guide`,
- docs-only questions about kits return docs/needs-input behavior, not mutation plan,
- no LLM provider state produces a clear unavailable/needs-config path for kit planning,
- non-kit prompts still route to existing catalog/action families.

Suggested files:
- `tests/vitest/assistant/site-kit-action-planner.test.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`

### 2. Action Executor Tests

Runner: `Bun` for runtime-coupled executor behavior.

Must cover:
- `site-kit.install` delegates to `executeGuidedSiteBuilder` / solution kit install service,
- `site-kit.validate` delegates to `validateGuidedSiteBuilderRun`,
- dry-run uses the same selected kit/step filtering as current site-builder flow,
- idempotency and audit contract match current action executor behavior.

Suggested files:
- `tests/unit/assistant/actionExecutorService.test.ts`
- `tests/unit/assistant/siteBuilderExecutor.test.ts`

### 3. Route Integration Tests

Runner: `Bun`

Must cover:
- equivalent `/assistant/actions/plan` can produce site-kit actions,
- `/assistant/actions/dry-run` and `/assistant/actions/execute` can process site-kit actions,
- `/assistant/site-builder/plan`, `/assistant/site-builder/execute`, and `/assistant/site-builder/validate` are not registered as supported routes after migration,
- known site-kit planner/executor errors map consistently through the generic action route error mapper.

Suggested files:
- `tests/integration/routes/assistant.test.ts`
- optionally `tests/integration/routes/assistant-site-kit-actions.test.ts`

### 4. UI Tests

Runner: `Vitest`

Must cover:
- `AiSiteWizard` still renders as a guided entry point and calls generic action client methods,
- `AssistantPanel` can show site-kit recommendation/dry-run/execute plan,
- LLM unavailable state blocks guide kit planning with explicit copy,
- no duplicate review UI behavior between wizard and generic guide card,
- no imports of removed site-builder-specific client methods remain.

Suggested files:
- `tests/vitest/ui/ai-site-wizard.test.tsx`
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`

### 5. DB/Runtime Acceptance

Runner: `Bun`, DB conditional.

Must cover:
- site-kit install via generic action path persists the same resources as current site-builder execution,
- generic action path does not create divergent run metadata compared with the existing site-builder executor contract,
- rollback/validate behavior remains readable from existing run records.

Suggested files:
- `tests/unit/assistant/siteBuilderExecutor.test.ts`
- optional DB-backed suite if existing solution-kit tests provide safe cleanup helpers.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest planner/UI suites listed above.
- Bun route/executor suites listed above.
- DB-backed validation only when `DATABASE_URL` is reachable and cleanup is safe.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/SECURITY_SPEC.md`

## Completion Notes (2026-04-11)

- Added `site-kit.recommend`, `site-kit.install`, and `site-kit.validate` to the generic assistant action plan contract.
- Moved AI Site Wizard planning/execution to `/assistant/actions/*` through generic action client helpers.
- Removed `/assistant/site-builder/*` route registration and site-builder-specific admin client methods.
- Added route-layer LLM availability guard for `site-kit.*`, so site kits cannot run as docs-only/RAG fallback.
- Kept `siteBuilderExecutor.ts` as an internal adapter around the existing solution-kit installer instead of duplicating installer logic.
- Added `siteBuilderPlanAdapter.ts` so Bun-free planner code can build site-kit plans without import-time DB/runtime coupling.
- Updated source-of-truth docs to describe `/assistant/actions/*` as the only assistant mutation flow.

## Validation (2026-04-11)

- `bun test tests/integration/routes/assistant.test.ts`
- `bun test tests/unit/assistant/actionExecutorService.test.ts`
- `bun test tests/unit/assistant/siteBuilderExecutor.test.ts`
- `bunx vitest run tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/admin/assistantClient.test.ts tests/vitest/ui/ai-site-wizard.test.tsx --config vitest.config.ts`
- `bunx vitest run tests/vitest/assistant/siteBuilderPlanner.test.ts --config vitest.config.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
