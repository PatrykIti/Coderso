# TASK-105-08-07: Assistant Services and UI
# FileName: TASK-105-08-07-assistant.md

**Priority:** High  
**Category:** QA + Coverage  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-08-11 (splits the blueprint-action-assembler suite before this leaf extends it)  
**Parent Task:** TASK-105-08  
**Status:** ⏳ To Do

---

## Overview

Close every line gap in `core/services/assistant/**` (25 files) and
`core/admin/ui/assistant/**` (9 files). The service layer is Bun-free pure logic
(schema, planner, blueprint resolvers/mergers, providers); the UI layer is the assistant
panel and intake steppers. Test-only: no API surface, no production change.

## Scope

Uncovered-line budget: **468** (299 services + 169 UI), 34 files.

`core/services/assistant/**`:

| File | Covered/Total | Line% |
|---|---|---:|
| `actionPlanHeuristics.ts` | 113/115 | 98.3% |
| `actionPlanSchema.ts` | 576/625 | 92.2% |
| `actionPlannerService.ts` | 453/508 | 89.2% |
| `adminContextService.ts` | 201/212 | 94.8% |
| `modelCapabilities.ts` | 25/26 | 96.2% |
| `blueprints/blueprintActionAssembler.ts` | 207/264 | 78.4% |
| `blueprints/blueprintAdminSurfaceComposer.ts` | 61/64 | 95.3% |
| `blueprints/blueprintCandidateResolver.ts` | 52/58 | 89.7% |
| `blueprints/blueprintCapabilityRegistry.ts` | 41/43 | 95.3% |
| `blueprints/blueprintCapabilitySchema.ts` | 116/120 | 96.7% |
| `blueprints/blueprintCapabilityTypes.ts` | 16/20 | 80.0% |
| `blueprints/blueprintCardConfigMerger.ts` | 46/49 | 93.9% |
| `blueprints/blueprintComposerShadow.ts` | 67/70 | 95.7% |
| `blueprints/blueprintCompositionGraph.ts` | 32/34 | 94.1% |
| `blueprints/blueprintCompositionMetadata.ts` | 32/33 | 97.0% |
| `blueprints/blueprintConflictResolver.ts` | 80/86 | 93.0% |
| `blueprints/blueprintExistingResourceMatcher.ts` | 125/144 | 86.8% |
| `blueprints/blueprintFacetMerger.ts` | 78/87 | 89.7% |
| `blueprints/blueprintPageSectionComposer.ts` | 31/33 | 93.9% |
| `blueprints/blueprintPromptSignals.ts` | 66/67 | 98.5% |
| `blueprints/blueprintSchemaMerger.ts` | 83/97 | 85.6% |
| `blueprints/genericMarkdownCatalogBlueprint.ts` | 72/76 | 94.7% |
| `providers/index.ts` | 24/34 | 70.6% |
| `providers/openAiProvider.ts` | 66/80 | 82.5% |
| `providers/openRouterProvider.ts` | 117/134 | 87.3% |

`core/admin/ui/assistant/**`:

| File | Covered/Total | Line% |
|---|---|---:|
| `AssistantAvatar.tsx` | 18/21 | 85.7% |
| `AssistantEmptyState.tsx` | 3/4 | 75.0% |
| `AssistantMessage.tsx` | 29/30 | 96.7% |
| `AssistantPanel.tsx` | 306/412 | 74.3% |
| `assistantConversationState.ts` | 83/91 | 91.2% |
| `assistantRuntimeStateCache.ts` | 25/26 | 96.2% |
| `useAssistantAdminContext.ts` | 144/152 | 94.7% |
| `components/ActionPlanReview.tsx` | 56/58 | 96.6% |
| `components/SiteBuilderIntakeBasicStepper.tsx` | 123/162 | 75.9% |

## Single-Writer File Ownership

- This leaf is the SOLE writer of the 34 source files above and of its test files
  under `tests/vitest/assistant/*` and `tests/vitest/ui/*` (assistant UI suites).
- Existing suites it may extend (owned by this leaf, ONLY after TASK-105-08-11 splits
  it): the split pieces of `tests/vitest/assistant/blueprint-action-assembler.test.ts`
  (1050 lines today). Also `actionPlannerService.test.ts`, `action-plan-schema*.test.ts`,
  `action-plan-heuristics.test.ts`, `admin-context-service.test.ts`,
  `openAiProvider.test.ts`, `openRouterProvider.test.ts`, `model-capabilities.test.ts`,
  `blueprint-*.test.ts`, and UI suites `assistant-panel*.test.tsx`,
  `assistant-site-builder-intake-*.test.tsx`, `assistant-conversation-state.test.ts`.
- New suites per remaining module. No other leaf may edit these test files.

## Pseudocode

Mock seams: providers use a narrow fetch/provider seam already extracted in
TASK-105-12; the planner/service take provider + schema deps (inject via default
params). UI calls `@/services/assistantClient` and the conversation/intake state modules.

```ts
import { describe, it, expect, vi } from "vitest";

// provider seam: inject a fake fetch, assert request shape + response mapping
const fetchImpl = vi.fn();
const provider = new OpenRouterProvider({ apiKey: "test", fetchImpl });
```

Assertion shape per module:

1. Schema (`actionPlanSchema` 49 uncovered): table-driven accept/reject over every
   field shape, media vocabulary, and strict reject-unknown branch.
2. Planner (`actionPlannerService` 55): plan → actions → execute across each resource
   family (content-type, form, menu, seo, page, listing, posts), error recovery, and
   provider fallback/recovery branches.
3. Blueprint resolvers/mergers (`blueprintActionAssembler` 57, `blueprintSchemaMerger`,
   `blueprintExistingResourceMatcher`, `blueprintFacetMerger`, `blueprintConflictResolver`,
   etc.): table-driven fixtures for every merge/conflict/resolution branch.
4. Providers (`providers/index.ts`, `openAiProvider`, `openRouterProvider`): request
   shape, stream mapping, error mapping, and retry/backoff branches.
5. UI: `AssistantPanel` (106) covers conversation send/receive, action-plan render,
   redaction, empty/error states; `SiteBuilderIntakeBasicStepper` (39) covers every step
   + validation; small presentational components get focused suites.

Work order (worst first): `AssistantPanel` (106), `blueprintActionAssembler` (57),
`actionPlannerService` (55), `actionPlanSchema` (49), `SiteBuilderIntakeBasicStepper` (39),
`blueprintExistingResourceMatcher` (19), `openRouterProvider` (17), `openAiProvider` (14),
`blueprintSchemaMerger` (14), `adminContextService` (11), then the rest.

## Validation Gates

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest, one file per invocation:
  `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts`
- `git diff --check`
- line-count gate ≤ 1000 per added/modified file.

## 1000-Line Rule

The 1050-line `blueprint-action-assembler.test.ts` is split by TASK-105-08-11 into
named, independently runnable suites before this leaf extends it.
`action-planner-service-provider-recovery.test.ts` (932) is near the gate — split before
extending.

## Security Contract

Test-only, no API surface.

## Acceptance Criteria

1. All 34 files reach `100%` lines.
2. Every schema reject branch and every provider error branch is behavior-asserted.
