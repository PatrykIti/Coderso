# TASK-569-01: Split actionExecutorService.ts Modularity

**Status:** ✅ Done
**Started:** 2026-08-17
**Completed:** 2026-08-18
**Changelog:** 1291 (inherits parent TASK-569 pin)
**Priority:** High
**Size:** Large

# FileName: TASK-569-01-Split-Action-Executor-Service-Modularity.md

**Parent Task:** TASK-569
**Source Findings:** Gate failure found during TASK-569 closure review: TASK-569 added 7 lines to `core/services/assistant/actionExecutorService.ts` (6771 lines) without the mandatory modularity split required by AGENTS.md ("If a legacy file already exceeds 1,000 lines, split it by cohesive responsibility as part of the same substantive change before adding further behavior").

## Purpose

`core/services/assistant/actionExecutorService.ts` is 6771 lines (was 6765 at the
pre-batch baseline `1e9f271d`). It is a legacy monolith containing the assistant
action execution engine: execution cache/metrics, catalog read models, the
`ActionExecutorDeps` type and `defaultDeps`, ~60 domain preview builders, ~50
execute handlers, the `actionHandlers` registry, and the two public exports
`dryRunAssistantActionPlan` / `executeAssistantActionPlan`.

The repo modularity gate (File Size and Modularity section of AGENTS.md) treats
any touched production module above 1,000 physical lines as a failed gate.
TASK-569 must not close until this split lands.

## Public Contract (MUST stay byte-stable)

Only TWO names are imported from `core/services/assistant/actionExecutorService`
by consumers:

- `dryRunAssistantActionPlan`
- `executeAssistantActionPlan`

Consumers: `core/server/routes/assistantRoutes.ts`, 15 test files under
`tests/unit/assistant/` (`actionExecutor*.test.ts`,
`assistantSiteBuilderIntakeDryRun.test.ts`),
`tests/unit/assistant/support/actionExecutorTestDeps.ts`,
`tests/integration/server/assistantHouseProjectsCatalogPublicSite.test.ts`, and
`tests/integration/assistant-live/liveCmsHarness.ts`. ALL consumers import the
two names from the SAME module path
`core/services/assistant/actionExecutorService`. The split MUST keep that
module path as the public entry that re-exports both functions with identical
signatures. No consumer import changes are allowed.

## Target Module Map

Split the 6771-line file into the following cohesive modules under
`core/services/assistant/`. The function-name lists below are the AUTHORITATIVE
module map; the line ranges are approximate guidance only (the symbol-outline
tool reports unreliable ranges in this file — e.g. `readListingQueryContentTypeId`
is a short helper, not 310 lines). The implementer MUST read the actual file
with `sed -n`/`grep -an` and move functions by NAME, matching their true
locations. Each new file must be < 1000 physical lines.

### Shared modules (no cross-domain preview/handler coupling)

1. **`actionExecutorTypes.ts`** — every shared type: `ActionExecutorDeps`,
   `CustomScreenRecord`, `ListingQueryRecord`, `ExecutionCacheEntry`,
   `ListingResourceReferenceTarget`, `ListingResourceReference`,
   `ScreenBlockDataPatchResult`, `ActionHandlerContext`, `AssistantActionHandler`.
   Type-only imports only; no runtime coupling.

2. **`actionExecutorCache.ts`** — execution cache + metrics (current lines
   197-408): `executionCache`, `executionCacheTtlMs`, `cleanupExecutionCache`,
   `readMemoryExecutionResult`, `countExecutionOperations`, `hasCuratedMediaUrl`,
   `reconcileLaunchReadinessAfterExecution`. Imports types + `assistantMetrics`
   (`recordAssistantActionMetric` stays with its callers, see main module).

3. **`actionExecutorCatalogReads.ts`** — catalog/page read helpers (current
   lines 409-767): `isRecord`, `readString`, `readCatalogBlockSource`,
   `readStoredPageCollectionLink`, `readPageCatalogSource`, `readFormEmbedSource`,
   `valueReferencesListingResource`, `collectListingResourceReferences`,
   `formatListingReferenceSummary`, `buildCatalogPageData`, `buildSimplePageData`,
   `readListingQueryContentTypeId`, `resolveAssistantPageCollectionLink`.
   Imports types + page/widget/media/blueprint contracts only (no previews).

4. **`actionExecutorResourceIds.ts`** — resource-id resolution helpers (current
   lines 2721-2941): `normalizeSeoSlugForAction`, `normalizePageActionSlug`,
   `isSamePlanLocator`, `resourceIdInputKey`, `findPriorPlannedStableSlugAction`,
   `findPriorActionResultDependency`, `findPriorPlannedListingQueryAction`,
   `findPriorPlannedListingTemplateAction`, `findPriorPlannedFormAction`,
   `resolveStableSlugResourceId`, `findMenuByLocation`, `resolveResourceIdInput`,
   `resolveActionResultPreviewResourceId` (2604-2614, MOVED HERE per audit
   HIGH-3: called by `buildLocatorPreviewDependency` at 2929; its only
   dependency is `findMenuByLocation`), `buildLocatorPreviewDependency`.
   Imports types + menus service + cache (`normalizeSitePath`).

5. **`actionExecutorScreenOps.ts`** — custom-screen document operations (current
   lines 1210-1382, 1502-1518, 2063-2067): `getExistingCustomScreenDefinition`,
   `customScreenTargetMatches`, `customScreenMissingConflict`,
   `withCustomScreenDefinition`, `addBlockToScreenSection`,
   `setCustomScreenBinding`, `isRecordValue`, `readScreenDataPath`,
   `setScreenDataPath`, `applyScreenBlockDataPatch`, `applyCustomScreenUpdatePatch`,
   `normalizeAssistantPagePatchBlock`. Imports types + customScreens schema/ops +
   widgets types.

### Domain modules (preview + execute handlers colocated per domain)

6. **`actionExecutorContent.ts`** — content route + content type (current lines
   1015-1161 previews, 4016-4039 route helpers, 4040-4171 handlers):
   `buildContentRoutePreview`, `buildContentTypePreview`,
   `buildContentTypeFieldAddPreview`, `buildContentTypeDeletePreview`,
   `mergeContentRoute`, `buildContentRouteRecord`,
   `executeContentRouteAction`, `executeContentTypeAction`,
   `executeContentTypeFieldAddAction`, `executeContentTypeDeleteAction`.
   Imports types + actionDiffService + settings + content services.

7. **`actionExecutorScreens.ts`** — custom screens (current lines 1162-1747
   previews, 1417-1463 `executeCustomScreenDefinitionAction`, 4172-4492
   handlers): `buildCustomScreenPreview`, `buildCustomScreenDefinitionActionPreview`,
   `executeCustomScreenDefinitionAction`, `buildCustomScreenDeletePreview`,
   `buildCustomScreenUpdatePreview`, `buildCustomScreenSectionAddPreview`,
   `buildCustomScreenBlockAddPreview`, `buildCustomScreenBlockPatchPreview`,
   `buildCustomScreenBlockMovePreview`, `buildCustomScreenBlockRemovePreview`,
   `buildCustomScreenBindingSetPreview`, `buildCustomScreenListViewPatchPreview`,
   `findExistingCustomScreenForUpsert` (932-1007, MOVED HERE per audit HIGH-2:
   called at 1166 and 4177 only), `executeCustomScreenAction`,
   `executeCustomScreenDeleteAction`, `executeCustomScreenUpdateAction`,
   `executeCustomScreenSectionAddAction`, `executeCustomScreenBlockAddAction`,
   `executeCustomScreenBlockPatchAction`, `executeCustomScreenBlockMoveAction`,
   `executeCustomScreenBlockRemoveAction`, `executeCustomScreenBindingSetAction`,
   `executeCustomScreenListViewPatchAction`. Imports types + screenOps +
   customScreens services + actionDiffService.

8. **`actionExecutorListings.ts`** — listing queries + templates (current lines
   1748-2062 previews, 4493-4851 handlers): `buildListingQueryPreview`,
   `buildListingQueryDeletePreview`, `buildListingQueryFiltersPatchPreview`,
   `buildListingQueryUpdatePreview`, `buildListingTemplatePreview`,
   `buildListingTemplateDeletePreview`, `buildListingTemplateCardPatchPreview`,
   `buildListingTemplateUpdatePreview`, `findListingQueryNameMatches` (846-851,
   MOVED HERE per audit HIGH-1: called at 1752 and 4503 only),
   `listingQueryNameConflict` (852-858, called at 1760 only),
   `executeListingQueryAction`, `executeListingQueryDeleteAction`,
   `executeListingQueryFiltersPatchAction`, `executeListingQueryUpdateAction`,
   `executeListingTemplateAction`, `executeListingTemplateDeleteAction`,
   `executeListingTemplateCardPatchAction`, `executeListingTemplateUpdateAction`.
   Imports types + catalogReads + actionDiffService.

9. **`actionExecutorForms.ts`** — forms + entries (current lines 2063-2496
   previews, 4852-5258 handlers): `buildFormAutomationPreview`, `buildFormPreview`,
   `buildFormDeletePreview`, `buildFormArchivePreview`, `buildFormUpdatePreview`,
   `buildEntryUpsertDraftPreview`, `buildEntryPublicHref`, `readEntrySeoForPreview`,
   `buildEntrySampleCreatePreview`, `buildEntryDeletePreview`,
   `buildEntryUpdatePreview`, `executeFormAutomationAction`, `executeFormAction`,
   `executeFormDeleteAction`, `executeFormArchiveAction`, `executeFormUpdateAction`,
   `executeEntryUpsertDraftAction`, `executeEntrySampleCreateAction`,
   `executeEntryDeleteAction`, `executeEntryUpdateAction`. Imports types +
   forms/entries services + actionDiffService.

10. **`actionExecutorMenusSeo.ts`** — menus + SEO (current lines 2497-2603,
    2615-2720, 2942-3148 previews, 5259-5570 handlers): `flattenMenuNodes`,
    `findMenuItemForAction`, `collectMenuItemDeleteIds`, `buildMenuUpsertPreview`,
    `buildNextMenuItem`, `buildMenuItemPreview`, `resolveMenuItemExecutionOperation`,
    `buildMenuItemDeletePreview`, `buildMenuItemUpdatePreview`, `loadSeoActionTarget`,
    `buildSeoNextValue`, `buildSeoDocumentPreview`, `buildSeoDocumentDeletePreview`,
    `buildSeoDocumentUpdatePreview`, `executeMenuUpsertAction`,
    `executeMenuItemAction`, `executeMenuItemDeleteAction`,
    `executeMenuItemUpdateAction`, `executeSeoDocumentAction`,
    `executeSeoDocumentDeleteAction`, `executeSeoDocumentUpdateAction`.
    NOTE: `resolveActionResultPreviewResourceId` is NOT here (moved to
    resourceIds per audit HIGH-3). Imports types + resourceIds + menus/seo
    services + actionDiffService.

11. **`actionExecutorMediaPages.ts`** — media reference + pages + detail pages
    (current lines 3149-3744 previews, 5533-5874 handlers):
    `attachMediaReferenceValue`, `buildMediaReferenceNextData`,
    `buildMediaReferencePreview`, `buildPagePreview`, `summarizeDetailPageDocument`,
    `resolveDetailPageActionDocument`, `buildDetailPagePreview`,
    `applyPageUpdatePatch`, `buildPageUpdatePreview`, `buildPageDeletePreview`,
    `executeMediaReferenceAction`, `executePageAction`, `executeDetailPageAction`,
    `executePageUpdateAction`, `executePageDeleteAction`. Imports types +
    resourceIds + catalogReads + pages/detail/media services + actionDiffService.
    AUDIT MEDIUM: this module is the largest (938 body lines + ~35 import
    lines ≈ 973) with < 3% headroom. CONTINGENCY: if `wc -l` lands ≥ 950,
    split `buildPagePreview` + `buildPageUpdatePreview` + `buildPageDeletePreview`
    + `applyPageUpdatePatch` (3618, called by buildPageUpdatePreview:3653 and
    executePageUpdateAction:5792/5815 — re-audit LOW) + `executePageAction` +
    `executePageUpdateAction` + `executePageDeleteAction` into a separate
    `actionExecutorPages.ts` module (pages domain), leaving
    `actionExecutorMediaPages.ts` with media reference + detail pages only
    (≈ 550 lines). Both modules then satisfy the 1000-line gate. Do this
    preemptively if the 973 estimate is exceeded during implementation.

12. **`actionExecutorWidgetsSiteKit.ts`** — widget templates + site-kit (current
    lines 3745-3985 previews, 5875-6108 handlers): `buildWidgetTemplateDeletePreview`,
    `applyWidgetTemplateSettingsPatch`, `applyWidgetTemplateUpdatePatch`,
    `buildWidgetTemplateUpdatePreview`, `buildWidgetTemplateBlockPatchPreview`,
    `buildSiteKitRecommendPreview`, `buildSiteKitInstallPreview`,
    `buildSiteKitValidatePreview`, `executeWidgetTemplateDeleteAction`,
    `executeWidgetTemplateUpdateAction`, `executeWidgetTemplateBlockPatchAction`,
    `executeSiteKitRecommendAction`, `executeSiteKitInstallAction`,
    `executeSiteKitValidateAction`. Imports types + screenOps
    (`normalizeAssistantPagePatchBlock`, called at 5985) + widgets/site-kit
    services + actionDiffService.

### Registry + main entry

13. **`actionExecutorRegistry.ts`** — the `actionHandlers` registry (current
    lines 6109-6587) + `buildPreviewForAction` (6588-6600) +
    `hasBlockingPreviewConflicts` (6601-6603) + `unexpectedAction` (4016-4019,
    used by every registry entry). Imports every domain module (6-12) + types +
    actionRegistry. `assertAssistantActionPlan` stays in main (used by
    `dryRunAssistantActionPlan`).

14. **`actionExecutorService.ts`** (main, stays, must end < 1000 lines) —
    imports + `defaultDeps` (860-931) + `assertAssistantActionPlan` +
    `dryRunAssistantActionPlan` (6604-6625) + `executeAction` (6626-6640) +
    `executeAssistantActionPlan` (6641-6771). `findListingQueryNameMatches` +
    `listingQueryNameConflict` (846-858) and `findExistingCustomScreenForUpsert`
    (932-1007) move OUT to their domain modules (see 7 and 8) — they are not
    used by `defaultDeps` or the public exports (audit HIGH-1/HIGH-2). Re-exports
    `dryRunAssistantActionPlan` and `executeAssistantActionPlan` only (no other
    export additions or removals).

## Implementation Pseudocode

1. **Read the current file fully** at HEAD `0eb414f9` (the file is byte-identical
   at the current HEAD `6e5e810d` — verified by the pre-implementation audit;
   either HEAD is a valid baseline for the split)
   (`core/services/assistant/actionExecutorService.ts`, 6771 lines). The file is
   misdetected as binary by `rg`; use `sed -n`/`Read`/`grep -an` only.
2. **Create `actionExecutorTypes.ts`** first (no runtime deps). Move the 9
   shared types. Export all of them; keep `ActionExecutorDeps` exported so every
   module imports it from here.
3. **Create shared modules 2-5** in dependency order: `cache` → `catalogReads`
   → `resourceIds` → `screenOps`. Each imports only types + external services.
   Do NOT import any preview/handler/registry module from these.
4. **Create domain modules 6-12.** Each imports types + shared modules it needs
   + the relevant services + `createPreviewChange` from `./actionDiffService`.
   Move the exact function bodies byte-for-byte (change only `const` → `export
   const` / `export async function` as needed). Preserve all internal call
   relationships: where a domain function calls a shared helper, import that
   helper from the shared module; where it calls a cross-domain helper, verify
   the helper is in the shared modules. Cross-domain helpers identified by the
   pre-implementation audit and their homes: `resolveActionResultPreviewResourceId`
   → resourceIds; `findListingQueryNameMatches` + `listingQueryNameConflict` →
   listings; `findExistingCustomScreenForUpsert` → screens.
   AVOID domain→main or shared→domain imports at all costs (that is the
   circular-import failure mode the audit caught).
5. **Create `actionExecutorRegistry.ts`**: move `actionHandlers`,
   `buildPreviewForAction`, `hasBlockingPreviewConflicts`. Import all domain
   modules. `getAssistantActionHandler` / `createAssistantActionRegistry` come
   from `./actionRegistry`.
6. **Rewrite `actionExecutorService.ts`**: keep imports, `defaultDeps`,
   `assertAssistantActionPlan`, the two public exports + `executeAction`.
   Import `buildPreviewForAction` and `hasBlockingPreviewConflicts` from
   `./actionExecutorRegistry`. Re-export the two public functions. Target
   ~500-700 lines.
7. **Do NOT change** `tests/unit/assistant/*` or
   `core/server/routes/assistantRoutes.ts` (their imports stay valid via the
   main re-export).
8. **Typecheck + lint + run every actionExecutor test suite** (see Gates).

## Error Handling / Invariants

- Behavior must be byte-identical at runtime: the split is pure module
  relocation. No logic changes, no new features, no reordering of side effects.
- `defaultDeps` must remain fully typed and identical.
- Every `execute*` handler and `build*Preview` keeps its exact signature and
  body (only `export` keyword added where the name must cross a module
  boundary).
- No circular imports: shared modules (1-5) must never import domain modules
  (6-12); registry (13) imports domains; main (14) imports registry + shared +
  types only.

## Gates (mandatory before closure)

Run from repo root with `set -a && source .env && set +a`. NOTE: `bun --cwd
core test` is a NO-OP (`core/package.json` test script is literally `echo core
test`) — never use it as a gate. Use root `bun test <paths>` instead (the
runner used by `scripts/run-bun-parallel.ts`).

- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun test tests/unit/assistant/actionExecutorService.test.ts tests/unit/assistant/actionExecutor*.test.ts tests/unit/assistant/assistantSiteBuilderIntakeDryRun.test.ts tests/unit/assistant/actionExecutorService.db.test.ts tests/unit/assistant/actionExecutorService.detailPage.db.test.ts tests/integration/server/assistantHouseProjectsCatalogPublicSite.test.ts` (all 14 actionExecutor suites + intake dry-run + integration consumer; DB suites need `export TMPDIR=/tmp`)
- `bun test tests/unit/assistant/` (entire assistant unit lane)
- Root `tsc` via pre-commit (untracked new files must type-check)
- Line-count gate: `wc -l` on every new module + rewritten main; ALL < 1000.
- `git diff --check`

## Regression Tests

No test file changes were made for the split itself. The 14 actionExecutor
test files + `assistantSiteBuilderIntakeDryRun.test.ts` + assistant route
registration tests are the regression contract and stayed green.

## Completion Notes

- Implemented by delegated agent (evergreen, ds/deepseek-v4-flash) and
  independently verified by the orchestrator: all 15 files < 1000 lines (main
  rewritten at 274 lines); public contract byte-stable (only
  `dryRunAssistantActionPlan` + `executeAssistantActionPlan` re-exported from
  the same module path; all consumers untouched).
- All audit placements verified on disk: `findListingQueryNameMatches` +
  `listingQueryNameConflict` in `actionExecutorListings.ts` (HIGH-1),
  `findExistingCustomScreenForUpsert` in `actionExecutorScreens.ts` (HIGH-2),
  `resolveActionResultPreviewResourceId` in `actionExecutorResourceIds.ts`
  (HIGH-3), `unexpectedAction` in `actionExecutorRegistry.ts`.
- Contingency applied: mediaPages module split preemptively into
  `actionExecutorMediaPages.ts` (317) + `actionExecutorPages.ts` (635).
- `tests/unit/assistant/support/actionExecutorTestDeps.ts` imports only local
  helpers (`actionExecutorContentDeps`, `actionExecutorEngagementDeps`, …),
  not the new modules; the single `actionExecutorService` dynamic import stays
  the public module path. No test-file change required.
- Gates: `bun --cwd core lint` ✓, `lint:types` ✓, 81 targeted tests across 16
  files ✓, full assistant lane 103 tests ✓, `git diff --check` ✓, pre-commit
  hook (format + lint + types + sdk tsc) ✓ at commit `7769530e`.

## Security Contract

Not applicable: internal refactor only. No route, schema, RBAC, rate-limit,
or anti-abuse surface changes. The assistant execution path keeps its existing
auth/RBAC gate in `assistantRoutes.ts` unchanged.

## Acceptance

- `actionExecutorService.ts` < 1000 lines; all 14 new modules < 1000 lines.
- Public contract stable: only `dryRunAssistantActionPlan` +
  `executeAssistantActionPlan` exported from the same module path.
- All gates green.
- No behavioral test changes.
