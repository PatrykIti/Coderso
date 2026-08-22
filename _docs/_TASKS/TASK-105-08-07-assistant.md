# TASK-105-08-07: Assistant Services and UI
# FileName: TASK-105-08-07-assistant.md

**Priority:** High  
**Category:** QA + Coverage  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-08-11 (splits the blueprint-action-assembler suite before this leaf extends it)  
**Parent Task:** TASK-105-08  
**Status:** ✅ Done
**Started:** 2026-08-21
**Completed:** 2026-08-22

---

## Overview

Close every line gap in `core/services/assistant/**` (25 files) and
`core/admin/ui/assistant/**` (9 files). The service layer is Bun-free pure logic
(schema, planner, blueprint resolvers/mergers, providers); the UI layer is the assistant
panel and intake steppers. Test-only: no API surface, no production change.

## Scope

Uncovered-line budget: **468** (299 services + 169 UI), 34 files.

Final state after the test-only wave (assistant + UI + admin + pages + ui-integration
lanes, 924 files / 7419 tests, green). Files at 100% lines are marked ✓; the few
remaining lines are all verified unreachable (see Residual Analysis below).

`core/services/assistant/**`:

| File | Covered/Total | Line% |
|---|---|---:|
| `actionPlanHeuristics.ts` | 115/115 | 100.0% ✓ |
| `actionPlanSchema.ts` | 622/625 | 99.5% (165, 1850, 1859 unreachable) |
| `actionPlannerService.ts` | 499/508 | 98.2% (9 lines unreachable) |
| `adminContextService.ts` | 212/212 | 100.0% ✓ |
| `modelCapabilities.ts` | 26/26 | 100.0% ✓ |
| `blueprints/blueprintActionAssembler.ts` | 261/264 | 98.9% (159, 263, 792 unreachable) |
| `blueprints/blueprintAdminSurfaceComposer.ts` | 64/64 | 100.0% ✓ |
| `blueprints/blueprintCandidateResolver.ts` | 53/58 | 91.4% (37-40, 223 unreachable) |
| `blueprints/blueprintCapabilityRegistry.ts` | 41/43 | 95.3% (34 unreachable) |
| `blueprints/blueprintCapabilitySchema.ts` | 120/120 | 100.0% ✓ |
| `blueprints/blueprintCapabilityTypes.ts` | 20/20 | 100.0% ✓ |
| `blueprints/blueprintCardConfigMerger.ts` | 49/49 | 100.0% ✓ |
| `blueprints/blueprintComposerShadow.ts` | 70/70 | 100.0% ✓ |
| `blueprints/blueprintCompositionGraph.ts` | 33/34 | 97.1% (57 unreachable) |
| `blueprints/blueprintCompositionMetadata.ts` | 33/33 | 100.0% ✓ |
| `blueprints/blueprintConflictResolver.ts` | 85/86 | 98.8% (163 unreachable) |
| `blueprints/blueprintExistingResourceMatcher.ts` | 144/144 | 100.0% ✓ |
| `blueprints/blueprintFacetMerger.ts` | 86/87 | 98.9% (75 unreachable) |
| `blueprints/blueprintPageSectionComposer.ts` | 33/33 | 100.0% ✓ |
| `blueprints/blueprintPromptSignals.ts` | 67/67 | 100.0% ✓ |
| `blueprints/blueprintSchemaMerger.ts` | 93/97 | 95.9% (63, 94, 104 unreachable) |
| `blueprints/genericMarkdownCatalogBlueprint.ts` | 76/76 | 100.0% ✓ |
| `providers/index.ts` | 34/34 | 100.0% ✓ |
| `providers/openAiProvider.ts` | 80/80 | 100.0% ✓ |
| `providers/openRouterProvider.ts` | 134/134 | 100.0% ✓ |

`core/admin/ui/assistant/**`:

| File | Covered/Total | Line% |
|---|---|---:|
| `AssistantAvatar.tsx` | 21/21 | 100.0% ✓ |
| `AssistantEmptyState.tsx` | 4/4 | 100.0% ✓ |
| `AssistantMessage.tsx` | 30/30 | 100.0% ✓ |
| `AssistantPanel.tsx` | 408/412 | 99.0% (803, 825, 894, 953 unreachable) |
| `assistantConversationState.ts` | 91/91 | 100.0% ✓ |
| `assistantRuntimeStateCache.ts` | 26/26 | 100.0% ✓ |
| `useAssistantAdminContext.ts` | 150/152 | 98.7% (93, 207 unreachable) |
| `components/ActionPlanReview.tsx` | 58/58 | 100.0% ✓ |
| `components/SiteBuilderIntakeBasicStepper.tsx` | 161/162 | 99.4% (158 unreachable) |

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

## Residual Analysis (verified unreachable, evidence-backed)

Every remaining uncovered line was probed through the public entry points with
dedicated scratch suites (removed after probing) and fresh per-file coverage
runs; all reported hit counts were 0 across independent runs and the code path
was traced to confirm no reachable caller exists. None of these lines carry UI,
security, auth/RBAC, persistence, or API impact; they are defensive/dead guards.

### actionPlannerService.ts (9)

- **188** — `default: return null` in `buildReadyPlanForIntentFamily` switch. The
  switch is only invoked with `service_business_full_site` (line 1722; the second
  call site at 1816 is itself unreachable, see below), which is handled by its
  own case. Every `AssistantIntentFamily` has a case; the default can never fire.
- **237** — `field.includes("clientname")` facet matcher in
  `buildRefinementPlanForIntentFamily`. `PORTFOLIO_PROJECTS_PRESET` refinement
  facets are `data.serviceType`, `data.deliveryYear`, `data.projectStatus`; no
  available facet field contains `clientname`, so the branch is never selected.
- **823** — gated fallback after `mapCmsOperationToActionPlan` returns null in
  `buildResolvedSiteBuilderFollowUpPlan`. The site-builder follow-up resolver
  emits `gated` statuses (`operation_unsupported`, `target_family_unsupported`,
  `target_required`) directly from `resolveSiteBuilderFollowUpTarget`, so every
  unsupported operation resolves to a gated plan before mapping; probes for
  menu delete/update and page follow-ups all returned the resolver gated intents
  (`menu-delete-gated`, `menu-update-gated`) without reaching line 823.
- **887** — `mapCmsOperationToActionPlan` fallback in
  `buildGenericCmsPlanningStateFollowUpPlan`. Planning-state drafts always resolve
  an inspection plan (880) or a site-builder follow-up plan (882) first; probes
  with menu/post/page planning states (update and delete operations) all returned
  earlier intents (`generic-guide-needs-input`, `menu-delete-gated`,
  `lead_capture`).
- **1798** — draftless site-builder follow-up return in the non-setup path. The
  generic mutation plan (1778) or the planning-state/inspection plans (1754/1762)
  always produce a plan first for surface follow-up prompts; probes on a page
  surface returned `page-update-needs-input` or
  `site-builder-follow-up-target_family_unsupported` before line 1792.
- **1816 / 1821 / 1822** — later `service_business_full_site` ready-plan branch.
  The EARLY block at 1714-1729 catches every `service_business_full_site`
  prompt before the later block; `docs_question` prompts skip the later block's
  `setup_request` condition. The later branch (1816/1821/1822) is dead.
- **2074** — broad-destructive provider-draft re-plan. The
  `isBroadDestructivePromptWithPolicy` guard at line 1966 returns the local
  broad-blocked plan BEFORE the provider drafting block is entered; a provider
  draft with destructive actions for an "usuń wszystkie strony" prompt returns
  `cms-page-delete-broad-blocked` from line 1966 without reaching 2074.

### actionPlanSchema.ts (3)

- **165** — `throw error` after the media-trust catch. The only throw inside
  `assertTrustedAssistantMediaReferences` is
  `assistant_media_reference_untrusted`, which the catch handles via `fail()` at
  line 164; no other error can surface, so the rethrow is dead.
- **1850 / 1859** — `catch { return fail() }` in the advanced hero/section
  variant readers. `readEnum` validates the variant id against the enum list
  BEFORE the try (line 1846/1855); valid enum ids always resolve through
  `resolveSiteBuilderIntakeAdvancedHeroVariant` /
  `resolveSiteBuilderIntakeAdvancedSectionVariant`, which map every enum member.
  The catch can never fire.

### Blueprint residuals (verified by the TASK-105-08-11 split-suite sessions)

`blueprintActionAssembler` 159/263/792, `blueprintCandidateResolver` 37-40/223,
`blueprintCapabilityRegistry` 34, `blueprintCompositionGraph` 57,
`blueprintConflictResolver` 163, `blueprintFacetMerger` 75,
`blueprintSchemaMerger` 63/94/104 — all verified unreachable in the earlier
blueprint wave (assembler merge guards, single-writer candidate dedupe with
distinct priorities, registry pack presence guards, graph cycle fallbacks,
conflict non-match fallbacks, facet dedupe guards, schema coercion fallbacks).
See the TASK-105-08-11 split-suite session records for the per-line evidence.

### AssistantPanel.tsx (4)

- **803** — `.catch(() => undefined)` on `submitMessage` in
  `handleFollowUpSelect`. `submitMessage` has an internal try/catch that appends
  the error entry (770-777) and never rejects. Confirmed empirically: a
  rejecting follow-up `sendAssistantMessage` renders the error entry
  (`follow_up_request_failed`) and the outer catch never fires.
- **825 / 894 / 953** — `if (!baseSession) throw ...` guards after
  `createSiteBuilderIntakeSession(intakeMetadata, null)`. The factory always
  returns `normalizeAssistantSiteBuilderIntakeSession(...)`, which THROWS
  (`fail()`) on invalid metadata and never returns null; the null guard is dead.

### useAssistantAdminContext.ts (2)

- **93** — fallback `return false` in `activeSurfaceMatchesRoute`. The
  `AssistantActiveSurfaceContext` union is exactly `page | custom-screen |
  detail-page`; all three kinds return above, so the fallback is unreachable by
  type.
- **207** — `return null` in the private `action()` sanitizer. Every call site in
  `actionsForRoute` passes a non-empty id/label and a valid kind from the fixed
  action matrix; the defensive reject is unreachable via the public
  `buildAssistantAdminRuntimeSnapshot` surface.

### components/SiteBuilderIntakeBasicStepper.tsx (1)

- **158** — `return selected` no-op in `toggleStringSelection` when `checked` is
  truthy and the value is already selected. The controlled Radix `Checkbox`
  emits `false` when an already-checked option is clicked and the stepper never
  passes `indeterminate`; the third branch is unreachable via UI interaction.

## Validation Evidence

- Assistant + UI + admin + pages + ui-integration lanes: **924 files / 7419
  tests green** (one unrelated flaky suite, `custom-screen-editor-settings-wave`,
  excluded; passes in isolation).
- Full-suite vitest runs reached 1117-1118 files / 9717-9729 tests; failures
  were unrelated concurrent flakes (DB env in a background shell and other
  agents' suites), each passing in isolation.
- `tsc -p tsconfig.json --noEmit` clean for all touched test files.
- ESLint clean for all touched test files; `git diff --check` clean.
- Line-count gate: all touched files ≤ 1000 lines (planner residual suite 232,
  provider-resolver edge 437, model-capabilities 101, follow-up analysis
  removed).
