# TASK-213-02-01: Insert Widget Toasts and Editor Deep Links
# FileName: TASK-213-02-01_Insert_Widget_Toasts_and_Editor_Deep_Links.md

**Priority:** High
**Category:** Widget Library + Notifications + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-213-02, TASK-208, TASK-211-02
**Status:** To Do

---

## Overview

Fix `BUG-1`: successful `Insert Widget` closes the dialog without visible
success feedback, and failed insert can be announced only through an `sr-only`
status.

Editors need a visible, accessible shared Admin UI toast that tells them which
page/template was changed and offers a canonical link to continue editing.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetInsertDialog.tsx`
- `core/admin/ui/shared/actionToasts.ts`
- `core/admin/ui/shared/listActionToasts.ts` only if the existing helper is the
  better shared owner
- `core/admin/ui/shared/AdminActionToast` related tests if helper shape changes
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/dialogs.test.tsx`
- `tests/vitest/admin/adminApp.test.tsx`
- `tests/vitest/admin/sonner.test.tsx`

## Implementation Direction

Make insert mutation return a typed result and emit feedback after the awaited
write succeeds.

Pseudocode:

```ts
type InsertTarget = {
  targetType: "page" | "template";
  targetId: string;
  targetLabel: string;
  href: string;
};

async function handleInsert(payload): Promise<void> {
  try {
    const target = await insertWidgetIntoTarget(payload);
    widgetInsertToasts.success({
      title: `Widget added to ${target.targetLabel}.`,
      action: { label: "Open editor", href: target.href },
    });
    setInsertOpen(false);
  } catch (error) {
    widgetInsertToasts.error(error, "Failed to insert widget.");
    setInsertError("Failed to insert widget.");
  }
}
```

Dialog close timing must not race the mutation. Either await `onInsert` inside
the dialog with a pending state, or keep the dialog open until the parent
confirms success.

## Security Contract

- Visibility: internal admin Widget Library only.
- Auth model: existing admin session/API-key path.
- RBAC: existing page/content write for page target and `widgets:write` for
  template target.
- CSRF: existing `updatePage` and `updateWidgetTemplate` calls keep CSRF.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: blocks are still created through widget registry
  defaults and validated by existing page/template update contracts.
- Anti-abuse:
  - toast title/action cannot include raw API payloads or stack traces;
  - deep links use `resolveAdminHref`;
  - target labels are bounded to page/template summary names.

## Testing Requirements

- `tests/vitest/ui/widget-library.test.tsx`
  - success branch emits shared toast with target label and href;
  - failure branch emits bounded error and does not close as success.
- `tests/vitest/ui/dialogs.test.tsx`
  - dialog submit can await async insertion and exposes disabled/pending state.
- Shared toaster tests remain green.
- Manual Playwright:
  - insert into page and template, then click/open the toast action link;
  - force a failed insert and verify bounded error feedback.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `docs/coderso/widget-library.md`

## Acceptance Criteria

1. Successful insert shows visible shared Admin UI feedback.
2. Toast action opens the canonical target editor.
3. Failed insert is visible and bounded.
4. The dialog does not close before mutation outcome is known.
