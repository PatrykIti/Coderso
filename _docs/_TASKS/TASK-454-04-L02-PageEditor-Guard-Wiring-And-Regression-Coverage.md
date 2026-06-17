# TASK-454-04-L02: PageEditor Guard Wiring And Regression Coverage
# FileName: TASK-454-04-L02-PageEditor-Guard-Wiring-And-Regression-Coverage.md

**Parent Subtask:** TASK-454-04
**Priority:** High
**Category:** Pages / Page Editor / Dirty State
**Estimated Effort:** Medium
**Dependencies:** TASK-454-04-L01, TASK-454-03-L01
**Status:** ⏳ To Do

---

## Overview

Wire the shared dirty-navigation guard into `PageEditor`. The guard blocks
navigation when the editor has local unsaved changes and, after TASK-454-03-L01,
when a recoverable autosave prompt is pending.

## Sub-Tasks

- [ ] Register Page Editor dirty state with the shared guard.
- [ ] Include recoverable autosave state in the block condition.
- [ ] Confirm navigation discards local editor state for the transition only.
- [ ] Add Vitest coverage for SPA navigate, AdminLink/sidebar click, popstate,
      and `beforeunload`.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/PageEditor.tsx` | Dirty guard wiring and dialog copy. |
| `tests/vitest/ui/page-editor-v2-flow.test.tsx` | Page Editor navigation guard tests. |

## Implementation Pseudocode

```tsx
const navigationBlocked = hasUnsavedChanges || Boolean(recoverableAutosave);

const { dialog, requestNavigation } = useAdminDirtyNavigationGuard({
  blocked: navigationBlocked,
  title: recoverableAutosave
    ? "Leave without recovering draft version?"
    : "Discard unsaved page changes?",
  description: recoverableAutosave
    ? "A saved draft version is available. Cancel to recover it, or continue and leave it in history."
    : "Cancel to keep editing, or discard local changes and continue.",
  confirmLabel: "Discard and continue",
  onConfirmDiscard: () => {
    setHasUnsavedChanges(false);
    setRecoverableAutosave(null);
  },
});

return (
  <>
    <EditorShell ... />
    {dialog}
  </>
);
```

Data flow:

- Page Editor state feeds shared guard.
- Router handles all admin SPA transitions.
- Confirming does not call autosave discard; it only permits navigation.

Error handling:

- If navigation target is current editor route, do not prompt.
- If no router context exists in a direct Page Editor test host, the shared
  guard no-ops for SPA blocking and must not throw. Tests that assert routing
  behavior must wrap `AdminRouterProvider`.

Regression-test shape:

```tsx
test("dirty PageEditor blocks SPA navigation until confirmed", async () => {
  mount(
    <AdminRouterProvider initialPath="/admin/pages/page-1">
      <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />
      <NavButton href="/admin/pages" />
    </AdminRouterProvider>
  );
  addSection();
  click("Go pages");
  expect(path()).toBe("/admin/pages/page-1");
  expect(screenText()).toContain("Discard unsaved page changes?");
  click("Discard and continue");
  expect(path()).toBe("/admin/pages");
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** unchanged.
- **Anti-abuse controls:** not applicable.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/admin-router-context-blocker.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` if final docs cover Page Editor dirty guard.

## Acceptance Criteria

1. Dirty Page Editor SPA navigation is blocked by the shared router blocker.
2. Browser hard navigation has a warning while blocked.
3. Confirmed navigation never deletes server autosave revisions.
