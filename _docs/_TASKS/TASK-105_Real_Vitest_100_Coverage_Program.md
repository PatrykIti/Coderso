# TASK-105: Real Vitest 100% Coverage Program
# FileName: TASK-105_Real_Vitest_100_Coverage_Program.md

**Priority:** High  
**Category:** QA + Platform + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-102, TASK-104  
**Status:** In Progress (2026-03-06)

---

## Overview

Drive the shipped Vitest lane to real `100%` coverage without manipulating the metric.

This task starts after `TASK-104`:
- runner ownership is now cleaner,
- Bun-free suites have been moved to Vitest,
- Bun baseline is no longer carrying most Bun-free UI load.

The remaining work is explicit:
- add missing real tests,
- cover still-unexecuted Vitest-owned code,
- avoid cheating via artificial `exclude` expansion.

## Business Context

After `TASK-104`, the repo can finally treat Vitest coverage as a serious product-quality signal for Bun-free code.
Right now the Vitest lane is broad but still far from full coverage.

Initial Vitest coverage snapshot (from `bun run test:coverage` on 2026-03-06):
- `% Stmts`: `38.01`
- `% Branch`: `33.57`
- `% Funcs`: `31.52`
- `% Lines`: `40.18`

Current Vitest coverage snapshot after the latest implemented waves (from `coverage/vitest/coverage-summary.json` on 2026-03-06):
- `% Stmts`: `43.21`
- `% Branch`: `38.55`
- `% Funcs`: `37.69`
- `% Lines`: `45.61`

Re-baseline before the next closure slices (from `bun run test:coverage` on 2026-03-08):
- `% Stmts`: `47.56`
- `% Branch`: `42.37`
- `% Funcs`: `42.21`
- `% Lines`: `50.18`
- raw files under `100%`: `385`
- infrastructure-noise files at `0%` (`types.ts`, `index.ts`): `11`
- real backlog files under `100%` after filtering those infra files: `374`
- backlog already covered by open wave clusters `TASK-105-04..07`: `161`
- backlog still outside the original wave clusters and therefore not yet represented by the task split: `213`

Current snapshot after the latest forms, listings, themes, and booking follow-up slices (from `bun run test:coverage` on 2026-03-08):
- `% Stmts`: `51.04`
- `% Branch`: `44.91`
- `% Funcs`: `45.79`
- `% Lines`: `53.66`
- `core/admin/ui/forms/FormBuilderPage.tsx` -> `81.25%` lines, `65.95%` branches
- `core/admin/ui/forms/FormActionsPanel.tsx` -> `87.24%` lines, `63.12%` branches
- `core/admin/ui/forms/FormActionLogsPage.tsx` -> `96.42%` lines, `77.27%` branches
- aggregate `core/admin/ui/forms/*` -> `86.06%` lines, `66.93%` branches
- `core/admin/ui/listings/ListingEditorPage.tsx` -> `89.79%` lines, `72.99%` branches
- `core/admin/ui/listings/components/BindingEditor.tsx` -> `91.04%` lines, `74.13%` branches
- `core/admin/ui/listings/ListingTemplateManager.tsx` -> `86.20%` lines, `72.22%` branches
- aggregate `core/admin/ui/listings/*` -> `87.53%` lines, `65.00%` branches
- `core/admin/ui/booking/BookingPage.tsx` -> `90.11%` lines, `63.25%` branches
- `core/admin/ui/booking/bookingHelpers.ts` -> `84.48%` lines, `67.39%` branches
- aggregate `core/admin/ui/booking/*` -> `65.04%` lines, `77.41%` branches
- `core/admin/ui/themes/ThemeTemplateDrawer.tsx` -> `62.04%` lines, `71.79%` branches
- aggregate `core/admin/ui/themes/*` -> `81.86%` lines, `64.99%` branches

This means the next stage is not runner cleanup anymore.
It is real test authoring across still-uncovered Vitest-owned surfaces.

## Hard Rule

`100%` here means:
- add or improve real tests,
- cover actual branches, render states, and behaviors,
- do not expand `coverage.exclude` except for true infrastructure noise,
- do not shrink ownership just to make the number look better.

## High-Level Hotspots

### Remaining low-coverage hotspots

- `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` -> `6.53%`
- `core/admin/ui/audit/AuditTable.tsx` -> `8.33%`
- `core/admin/ui/popups/components/PopupEditorForm.tsx` -> `13.04%`
- `core/admin/ui/users/UserDetailsDrawer.tsx` -> `18.18%`
- `core/admin/ui/settings/SessionsPage.tsx` -> `21.62%`
- `core/admin/ui/themes/ThemesPage.tsx` -> `30.50%`

### Zero-gap waves already cleared

- `packages/sdk/src/pluginManifest.ts`
- `core/services/customScreens/customScreenService.ts`
- `core/admin/utils/sessionCache.ts`
- `core/admin/services/webhooksClient.ts`
- `core/admin/services/apiKeysClient.ts`
- `core/admin/services/emailClient.ts`
- `core/admin/services/integrationsClient.ts`
- `core/admin/services/taxonomyClient.ts`
- `core/admin/ui/themes/ThemeEditorPage.tsx`
- `core/admin/ui/redirects/RedirectsPage.tsx`

### Current large low-coverage area clusters

| Area | Current line coverage | Notes |
|------|-----------------------|-------|
| `core/admin/ui/booking` | `26.37%` | shell-heavy page and helper branches still mostly open |
| `core/admin/ui/widgets/editors` | `39.72%` | still the largest editor-only backlog in the Vitest lane |
| `core/admin/ui/settings` | `40.22%` | large admin surface not represented by the original wave split |
| `core/admin/ui/forms` | `50.34%` | builder shell, action panel, and logs page remain open |
| `core/admin/ui/listings` | `50.67%` | editor flow and binding editor still branch-light |
| `core/admin/ui/pages` | `74.50%` | page builder internals remain under-tested despite shell waves |
| `core/admin/ui/entries` | `65.33%` | list, renderer, and table branches still open |
| `core/admin/ui/posts/editor` | `49.68%` | canvas, richtext adapter, inspectors, and hook branches remain wide |

## Goals

1. Raise Vitest lane coverage to real `100%`.
2. Cover real user-facing and domain-facing behavior, not synthetic snapshots only.
3. Keep Bun/Vitest ownership stable while adding missing tests.
4. Turn remaining low-coverage files into explicit wave-based work, not random cleanup.

## Non-Goals

1. Artificially shrinking the Vitest lane to force `100%`.
2. Moving runtime-coupled files out of scope just to improve percentages.
3. Replacing meaningful coverage with snapshot-only noise.

## Workstreams

1. Coverage matrix and invariants freeze.
2. Zero-coverage admin service/client wave.
3. Small UI/support component wave.
4. Themes/booking/listings/forms wave.
5. Entries/pages/posts editor shell wave.
6. Widget/editor deep coverage wave.
7. SDK/custom screens domain wave.
8. Final branch/statement gap closure.
9. QA/docs/changelog/board closure.

## Progress

Completed waves:
- admin service zero-coverage clients and `sessionCache`
- SDK `pluginManifest`, `client`, and `server`
- custom screens service coverage
- small UI leafs (`BlockLibrary`, `FormCanvas`, `MediaDetailsPanel`, `PluginFilters`, theme route/token editors)
- themes leaf cards and `ThemeEditorPage`
- redirects page leaf coverage
- booking tab leaf coverage
- plugin/media/site leaf coverage
- analytics/settings/entries/seo leaf coverage
- menu leaf coverage
- post-editor/settings/storage/api-key utility leaf coverage
- `recaptcha` and `blockDnD` utility coverage
- first substantial `listings` wave (`filters`, `search`, `list`, `template manager`, hooks)
- forms support wave (`useForms`, list/create flow, settings/runtime panels)
- direct builder, automation, and action-log coverage for `FormBuilderPage`, `FormActionsPanel`, and `FormActionLogsPage`
- direct editor coverage for `ListingEditorPage`
- direct interaction coverage for `BindingEditor`
- deeper branch coverage for `ListingTemplateManager`
- direct create/edit/save/invert coverage for `ThemeTemplateDrawer`
- shell-level action coverage for `BookingPage`

Remaining large clusters:
- forms builder pages and panels
- entries/pages/posts editor shells
- widgets editor suites
- deeper `listings` editor/page flows
- settings, popups, audit, users, content-types, media, auth, and other non-wave admin surfaces now quantified by `TASK-105-10`

## Sub-Tasks

1. `TASK-105-01_Vitest_Coverage_Matrix_and_Invariants.md`
2. `TASK-105-02_Admin_Services_Zero_Coverage_Wave.md`
3. `TASK-105-03_Small_UI_and_Support_Component_Wave.md`
4. `TASK-105-04_Themes_Booking_Listings_Forms_Wave.md`
5. `TASK-105-05_Entries_Pages_Posts_Editor_Wave.md`
6. `TASK-105-06_Widget_Editor_New_Tests_Wave.md`
7. `TASK-105-07_SDK_PluginManifest_and_Custom_Screens_Service_Wave.md`
8. `TASK-105-08_Final_Per_File_100_Gap_Closure.md`
9. `TASK-105-09_QA_Docs_Changelog_and_Closure.md`
10. `TASK-105-10_Coverage_Gap_Rebaseline_and_Lane_Backlog.md`

## Implementation Order

1. Freeze the coverage matrix and target files.
2. Clear zero-coverage small files first.
3. Attack medium admin areas by product surface.
4. Attack large editor/widget clusters in waves.
5. Finish with strict per-file gap closure and QA sync.

## Pseudocode

```ts
const vitestReport = parseCoverage("coverage/vitest/lcov.info");
const backlog = prioritize(vitestReport, {
  strategy: ["zero-first", "small-files", "product-clusters", "branch-gaps"],
});

for (const wave of backlog) {
  addRealTests(wave.files);
  validateVitestCoverage();
}
```

## Acceptance Criteria

1. The Vitest-owned surface reaches real `100%` without dishonest exclusions.
2. Every coverage wave names concrete files/modules and real behavior to test.
3. Final closure documents what changed and what `100%` actually covers.

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd store lint`
- `./node_modules/.bin/tsc -p packages/sdk/tsconfig.json --noEmit`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `tests/README.md`
- `tests/RUNNER_OWNERSHIP.md`
- `_docs/_CHANGELOG/*.md`
