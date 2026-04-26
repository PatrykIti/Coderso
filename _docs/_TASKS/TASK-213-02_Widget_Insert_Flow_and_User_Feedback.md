# TASK-213-02: Widget Insert Flow and User Feedback
# FileName: TASK-213-02_Widget_Insert_Flow_and_User_Feedback.md

**Priority:** High
**Category:** Widget Library + Admin/UI + Notifications
**Estimated Effort:** Large
**Dependencies:** TASK-213, TASK-208, TASK-211-02
**Status:** Done (2026-04-26)

---

## Overview

Repair `BUG-1`, `BUG-5`, and the card-click confusion from the Widget Library
report.

Successful widget insert currently mutates a page or template and closes the
dialog without visible confirmation. The card also exposes a card-level details
click and a separate `Insert` button that enters a different flow. Editors need
a single clear path:

1. choose a widget;
2. configure/inspect it in the drawer;
3. choose placement;
4. receive visible success/error feedback with a link to the target editor.

## Sub-Tasks

- `TASK-213-02-01_Insert_Widget_Toasts_and_Editor_Deep_Links.md`
- `TASK-213-02-02_Widget_Card_Drawer_Entry_Point_Consolidation.md`

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetCard.tsx`
- `core/admin/ui/widgets/WidgetDetailsDrawer.tsx`
- `core/admin/ui/widgets/WidgetInsertDialog.tsx`
- `core/admin/ui/shared/actionToasts.ts`
- `core/admin/ui/shared/listActionToasts.ts` only if the shared helper is
  extended instead of adding a widget-local adapter
- `core/admin/services/pagesClient.ts` only if returned page metadata is needed
  for editor links
- `core/admin/services/widgetTemplatesClient.ts` only if returned template
  metadata is needed for editor links
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/widget-card.test.tsx`
- `tests/vitest/ui/dialogs.test.tsx`
- shared action toast/admin toaster tests when helper behavior changes

## Implementation Direction

Keep the actual mutation owner in `WidgetLibraryPage`, but make it return a
typed outcome so the UI can emit truthful feedback after the awaited mutation.

Pseudocode:

```ts
type WidgetInsertResult = {
  targetType: "page" | "template";
  targetId: string;
  targetLabel: string;
  href: string;
};

async function handleInsert(payload): Promise<WidgetInsertResult | null> {
  const result = await mutatePageOrTemplate(payload);
  widgetActionToasts.success("insert", {
    title: `Widget added to ${result.targetLabel}.`,
    action: { label: "Open editor", href: result.href },
  });
  return result;
}
```

Card behavior should no longer advertise two competing insert paths. Preferred
repo-compatible flow:

- card click opens `WidgetDetailsDrawer`;
- card primary action is renamed to `Configure` or `Details`;
- `Insert Widget` lives in the drawer as the configured insert entry point;
- templates keep `Edit Template` as their row/card action.

Do not implement one-click insertion without a selected target because that
would either hide placement decisions or create page-specific defaults outside
the current contract.

## Security Contract

- Visibility: internal admin Widget Library only.
- Auth model: existing admin session/API-key path for page and template writes.
- RBAC:
  - existing content/page write permission for page insertion;
  - `widgets:write` for template insertion.
- CSRF: existing `updatePage` and `updateWidgetTemplate` writes keep CSRF.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: inserted blocks must be created through
  `createBlock(insertWidget.id)` and validated by existing widget definitions;
  no route-side widget defaults are duplicated.
- Anti-abuse:
  - toast copy must not include raw API errors, tokens, stack traces, or private
    page/template payload data;
  - editor deep links must use `resolveAdminHref`, not hand-built admin paths;
  - insert into slots must keep the existing allowed-types and max-items checks.

## Testing Requirements

- `tests/vitest/ui/widget-library.test.tsx`
  - core widget card action opens the configured drawer path;
  - insert success emits a shared toast payload with target label/link;
  - insert failure emits bounded error feedback and keeps truthful state.
- `tests/vitest/ui/widget-card.test.tsx`
  - card action label and click semantics are unambiguous;
  - template action remains edit-only.
- `tests/vitest/ui/dialogs.test.tsx`
  - insert dialog submit awaits `onInsert` before closing or displays a pending
    state if the mutation is in flight.
- Manual Playwright:
  - insert as new section shows success toast and `Open editor`;
  - insert into existing block shows success toast and preserves slot checks;
  - failed insert leaves the user with visible error feedback.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `docs/coderso/widget-library.md`
- `_docs/WIDGETS.md` if the configured insert path is formalized
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Successful widget insertion produces visible, accessible feedback.
2. Insert failures do not close silently or pretend success.
3. Card, drawer, and dialog entry points are clear and do not duplicate the same
   action under different semantics.
4. Editor links use canonical admin href helpers.
