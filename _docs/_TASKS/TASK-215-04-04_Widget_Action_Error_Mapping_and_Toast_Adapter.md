# TASK-215-04-04: Widget Action Error Mapping and Toast Adapter
# FileName: TASK-215-04-04_Widget_Action_Error_Mapping_and_Toast_Adapter.md

**Priority:** High
**Category:** Coderso Widgets + Admin/UI + Error Handling
**Estimated Effort:** Medium
**Dependencies:** TASK-215-04, TASK-208
**Status:** To Do

---

## Overview

Create or extend a shared Widget Library action feedback owner so table/grid
actions do not duplicate toast/error copy. Route mapping work is only required
where UI-visible template errors depend on stable API codes.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/widgetActionToasts.ts` if extracted.
- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/shared/actionToasts.ts` only if a generic helper extension is
  justified.
- `core/admin/ui/shared/listActionToasts.ts` only if the list helper is the
  better owner.
- `core/server/routes/widgetTemplateRoutes.ts` only if `mapWidgetTemplateError`
  must be extended/exported for coverage.
- `core/server/routes/widgetTemplateCategoryRoutes.ts` only if category
  error mapping becomes UI-visible or needs exported coverage.
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/action-toasts.test.ts`
- `tests/vitest/ui/list-action-toasts.test.ts`
- `tests/integration/routes/widgetTemplates.test.ts` if route mapping changes.
- `tests/integration/routes/widgetTemplateCategories.test.ts` if category route
  mapping changes.

## Security Contract

- Visibility: internal admin UI and existing internal Widgets template APIs.
- Auth model: unchanged.
- RBAC: unchanged per action.
- CSRF: unchanged per mutating client.
- Rate-limit buckets: unchanged.
- Reject-unknown validation: action errors must not weaken existing
  `widgetSchemas.ts` validation.
- Anti-abuse: toast/error copy must be bounded, must not include stack traces,
  raw payloads, secrets, preview tokens, or privileged settings.

## Pseudocode

```ts
type WidgetLibraryToastAction =
  | "insert"
  | "favorite-add"
  | "favorite-remove"
  | "template-duplicate"
  | "template-delete"
  | "template-bulk-delete";

export const widgetLibraryToasts = createListActionToastAdapter({
  labels: { singular: "widget", plural: "widgets" },
  actions: {
    insert: {
      pastTense: "inserted",
      failureVerb: "insert",
    },
    "favorite-add": {
      pastTense: "added to favorites",
      failureVerb: "save favorites for",
      singleSuccessMessage: () => "Added to favorites.",
      errorFallback: "Failed to save favorites.",
    },
    "favorite-remove": {
      pastTense: "removed from favorites",
      failureVerb: "save favorites for",
      singleSuccessMessage: () => "Removed from favorites.",
      errorFallback: "Failed to save favorites.",
    },
    "template-duplicate": {
      pastTense: "duplicated",
      failureVerb: "duplicate",
      singleSuccessMessage: ({ targetLabel }) =>
        targetLabel ? `Template "${targetLabel}" duplicated.` : "Template duplicated.",
      errorFallback: "Failed to duplicate template.",
    },
    "template-delete": {
      pastTense: "deleted",
      failureVerb: "delete",
      singleSuccessMessage: ({ targetLabel }) =>
        targetLabel ? `Template "${targetLabel}" deleted.` : "Template deleted.",
      errorFallback: "Failed to delete template.",
    },
    "template-bulk-delete": {
      pastTense: "deleted",
      failureVerb: "delete",
      bulkSuccessMessage: ({ succeededCount }) =>
        succeededCount === 1 ? "Template deleted." : `${succeededCount} templates deleted.`,
      bulkPartialMessage: ({ succeededCount, failedCount }) =>
        `Deleted ${succeededCount}; failed ${failedCount}.`,
      bulkFailureMessage: ({ failedCount }) =>
        failedCount === 1 ? "Failed to delete 1 template." : `Failed to delete ${failedCount} templates.`,
    },
  },
});

function toWidgetLibraryError(error: unknown, fallback: string) {
  return resolveAdminActionErrorMessage(error, fallback);
}
```

## Testing Requirements

- Core insert, favorite, template duplicate, template delete, and bulk delete
  feedback use one helper/adapter owner.
- Known `widget_template_*` errors map to stable user-facing copy.
- Known `widget_template_category_*` errors remain stable if category failures
  become visible in the table/grid action flow.
- Unknown failures use bounded fallback copy.
- If route mapping changes:
  - `set -a && source .env && set +a`
  - `bun test tests/integration/routes/widgetTemplates.test.ts`
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/ui/action-toasts.test.ts tests/vitest/ui/list-action-toasts.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/CMS_API.md` if route error behavior changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Widget Library action feedback has one owner.
2. UI-visible errors are stable and bounded.
3. Route mapping changes, if any, are covered in the Bun route lane.
