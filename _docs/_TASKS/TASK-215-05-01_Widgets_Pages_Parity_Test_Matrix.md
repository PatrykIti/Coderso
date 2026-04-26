# TASK-215-05-01: Widgets Pages-Parity Test Matrix
# FileName: TASK-215-05-01_Widgets_Pages_Parity_Test_Matrix.md

**Priority:** Medium
**Category:** QA + Coderso Widgets
**Estimated Effort:** Small
**Dependencies:** TASK-215-05
**Status:** To Do

---

## Overview

Create the implementation validation matrix for the Widgets Pages-style parity
work. The matrix must prove shell, dropdown sections, table/grid mode,
selection, actions, cache behavior, and route/client compatibility.

## Sub-Tasks

No child task files.

## Files to Change

- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/pageBuilder/widgetLibrary.test.tsx`
- `tests/vitest/ui/widget-card.test.tsx`
- `tests/vitest/ui/widgetLibraryUtils.test.ts`
- `tests/vitest/ui/widgetInsertUtils.test.ts`
- `tests/vitest/admin/widgetsClient.test.ts`
- `tests/vitest/admin/widgetTemplatesClient.test.ts`
- `tests/vitest/admin/widgetTemplateCategoriesClient.test.ts`
- `tests/vitest/admin/adminPrefetch.test.ts`
- `tests/integration/routes/widgets.test.ts` if route behavior changes.
- `tests/integration/routes/widgetTemplates.test.ts` if route behavior changes.
- `tests/integration/routes/widgetTemplateCategories.test.ts` if route behavior
  changes.

## Security Contract

- Visibility: test/docs only.
- Auth model: tests must match existing admin auth and route helper behavior.
- RBAC: route tests must assert existing `widgets:read` / `widgets:write`
  expectations if route registration changes.
- CSRF: mutating client tests must continue to prove CSRF where clients change.
- Rate-limit buckets: unchanged unless route contracts change.
- Reject-unknown validation: route/schema tests must remain strict when touched.
- Anti-abuse: tests must prove hidden selected rows cannot be mutated.

## Required Matrix

| Area | Required proof |
|---|---|
| Shell/dropdown | all old rail choices are available in section dropdown; left rail is not duplicated |
| Default table | `All Items` starts in table mode with checkbox rows |
| Grid mode | filter bar persists; grid rows match table visible ids; card click opens drawer |
| Selection | filter, section, pagination, and cache refresh trim hidden ids |
| Core actions | Preview placeholder is non-mutating; Edit opens drawer; Insert opens existing dialog |
| Favorites | add/remove/bulk add/bulk remove preserve `widgets.favorites` and max-50 behavior for core/template catalog rows |
| Templates | edit/duplicate/delete/category actions remain on existing route/client owners |
| Bulk template delete | confirmed, visible-scope, partial-failure safe |
| Cache/prefetch | `/coderso/widgets` warmup and cache-bus refresh remain covered, including template/category-triggered `widgetCatalog:list` invalidation without assuming direct `widgetsClient` broadcasts |
| Settings | user settings client/unit/route coverage runs if `widgets.favorites` typing, validation, or route behavior changes |
| Routes | Bun route coverage only when route/schema/error mapping changes |

## Pseudocode

```ts
const task215Matrix = [
  {
    area: "shell/dropdown",
    suites: ["tests/vitest/ui/widget-library.test.tsx"],
    proves: ["old rail options in dropdown", "no duplicate rail"],
  },
  {
    area: "table/grid/selection",
    suites: [
      "tests/vitest/ui/widget-library.test.tsx",
      "tests/vitest/ui/widget-card.test.tsx",
      "tests/vitest/ui/widgetLibraryUtils.test.ts",
      "tests/vitest/ui/list-pagination.test.tsx",
    ],
    proves: ["same visible ids", "hidden ids trimmed", "card checkbox isolation"],
  },
  {
    area: "actions/cache/routes",
    suites: [
      "tests/vitest/pageBuilder/widgetLibrary.test.tsx",
      "tests/vitest/admin/widgetsClient.test.ts",
      "tests/vitest/admin/widgetTemplatesClient.test.ts",
      "tests/vitest/admin/widgetTemplateCategoriesClient.test.ts",
      "tests/vitest/admin/adminPrefetch.test.ts",
    ],
    bunOnlyWhenTouched: [
      "tests/integration/routes/widgets.test.ts",
      "tests/integration/routes/widgetTemplates.test.ts",
      "tests/integration/routes/widgetTemplateCategories.test.ts",
    ],
  },
];
```

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/pageBuilder/widgetLibrary.test.tsx tests/vitest/ui/widget-card.test.tsx tests/vitest/ui/widgetLibraryUtils.test.ts tests/vitest/ui/widgetInsertUtils.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/widgetsClient.test.ts tests/vitest/admin/widgetTemplatesClient.test.ts tests/vitest/admin/widgetTemplateCategoriesClient.test.ts tests/vitest/admin/adminPrefetch.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/action-toasts.test.ts tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/list-pagination.test.tsx`
- If route/schema behavior changes:
  - `set -a && source .env && set +a`
  - `bun test tests/integration/routes/widgets.test.ts tests/integration/routes/widgetTemplates.test.ts tests/integration/routes/widgetTemplateCategories.test.ts`
- If `widgets.favorites` settings validation or route behavior changes:
  - `set -a && source .env && set +a`
  - `bun test tests/unit/settings/userSettingsService.test.ts tests/integration/routes/userSettings.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Record final commands/results in TASK-215 closure docs and changelog.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Every changed behavior has a concrete test owner.
2. Runtime/API route lanes are used only when touched, and skipped lanes are
   documented.
3. The implementation cannot close with only snapshot/static render coverage.
