# TASK-540-04-L04: Guard Screen Builder Drafts

# FileName: TASK-540-04-L04-Guard-Screen-Builder-Drafts.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-04
**Priority:** High
**Category:** Custom Screens / Builder / Data Safety
**Estimated Effort:** Small
**Dependencies:** TASK-540-04-L03
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- compatibility-expectation updates required before this source gate in
  `tests/vitest/ui/custom-screens-page.test.tsx` and
  `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`

## Grounded anchors

- Dirty state and diagnostics: `CustomScreenEditorPage.tsx:255-321`.
- `markDirty`: `:336-349`.
- Save/clear path: `:396-410`.
- Cache hydration dirty protection: `:467-482`.
- Shell receives badge only: `:970`.
- Shared guard: `AdminDirtyNavigationGuard.tsx:17-105`.

## Implementation Pseudocode

```tsx
const { dialog: dirtyNavigationDialog } = useAdminDirtyNavigationGuard({
  blocked: hasUnsavedChanges,
  title: "Discard unsaved Screen changes?",
  description: "The Screen document or bindings have local changes.",
  confirmLabel: "Discard and continue",
  cancelLabel: "Keep editing",
  onConfirmDiscard: () => setHasUnsavedChanges(false),
});

function handlePatchBinding(blockId, propPath, patch) {
  if (patch.field === "") {
    // TASK-540-02's explicit clear sentinel: delete exactly this binding.
    updateEditorView({
      document: current.editorView.document,
      bindings: current.editorView.bindings.filter(
        (binding) => !(binding.blockId === blockId && binding.propPath === propPath)
      ),
    });
    return; // never create or persist an empty-field binding
  }
  existing create/update binding flow;
}

return <>
  <CustomScreenShell ... />
  {dirtyNavigationDialog}
</>;
```

Keep existing `markDirty`, save-success clearing, and dirty cache-hydration guard.
Do not introduce a second router blocker or custom `beforeunload`; the shared
hook owns both. Do not change `CustomScreenShell.tsx` merely to host the dialog.

## Error/compatibility flow

- Cancel stays in builder with draft intact.
- Confirm clears the local flag and performs the pending navigation once.
- Save failure remains dirty; save success becomes clean.
- Same-route/query/hash normalization follows the shared guard unchanged.
- Background cache events never overwrite a dirty document.
- Clearing Button href binding through `{field:""}` removes exactly that binding,
  preserves static href data and every other binding, marks the builder dirty, and never
  persists the sentinel. Bind→clear→rebind remains deterministic.

## Gate tests owned here; aggregate additions owned by TASK-540-06

Extend Custom Screen page/editor integration coverage for internal navigation,
beforeunload, cancel/confirm, save error, clean navigation, and cache refresh while
dirty. Before this source gate, also update the existing binding flow for visible
bind→clear→rebind and assert no empty-field binding reaches the saved definition.
TASK-540-06 may add aggregate smoke coverage but must not re-baseline these assertions.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/ui/custom-screens-page.test.tsx \
  tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx
```

Rerun a named failing file once in isolation.
