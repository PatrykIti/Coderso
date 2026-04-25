# TASK-211-02: Page Editor Shared Toast Feedback
# FileName: TASK-211-02_Page_Editor_Shared_Toast_Feedback.md

**Priority:** High
**Category:** CMS/Pages + Admin/UI + Notifications
**Estimated Effort:** Medium
**Dependencies:** TASK-211, TASK-208
**Status:** To Do

---

## Overview

Move Page editor save/publish feedback onto the same central Admin UI
notification system used by `/admin/pages` list actions.

`PageEditor` may keep inline error/status alerts where they add context, but
success and failure notifications must emit through the shared Sonner host in
`AdminApp`. The editor should plug in through a thin adapter instead of raw
ad-hoc `toast.success` / `toast.error` calls scattered in the component.

## Sub-Tasks

- [ ] TASK-211-02-01: Admin Action Toast Adapter for Editor Mutations
- [ ] TASK-211-02-02: Page Editor Save Publish Toast Wiring

## Files to Change

- `core/admin/ui/shared/listActionToasts.ts`
- `core/admin/ui/shared/actionToasts.ts` if a generic non-list adapter is
  extracted.
- `core/admin/ui/pages/PageEditor.tsx`
- `tests/vitest/ui/list-action-toasts.test.ts`
- `tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `tests/vitest/admin/adminApp.test.tsx`
- `tests/vitest/admin/sonner.test.tsx`

## Implementation Direction

- Preserve the single `AdminApp` `Toaster` host.
- Do not mount a toaster inside `PageEditor`.
- Prefer a shared generic action-toast adapter that list and editor adapters can
  both use. If the current `listActionToasts` helper remains list-specific,
  add a sibling shared helper such as `actionToasts.ts` and keep
  `listActionToasts.ts` delegating to it.
- Add a Pages editor adapter/config for:
  - `saveDraft`: success `Draft saved.`, fallback error
    `Failed to save draft.`;
  - `publish`: success `Page published.`, fallback error
    `Failed to publish page.`;
  - `update`: success `Page updated.` only if the editor needs a separate
    update branch for already-published pages.
- Keep inline `Alert` only for persistent contextual state if needed. The
  floating toast is the primary transient confirmation.

## Pseudocode

```ts
const pageEditorToasts = createAdminActionToastAdapter({
  actions: {
    saveDraft: {
      success: "Draft saved.",
      failure: "Failed to save draft.",
    },
    publish: {
      success: "Page published.",
      failure: "Failed to publish page.",
    },
  },
});

await updatePage(pageId, payload);
pageEditorToasts.success("saveDraft");
```

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged; this task changes feedback routing.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - toasts fire only after awaited mutations resolve or reject;
  - error normalization must not expose tokens, cookies, headers, or privileged
    settings;
  - no optimistic success toast before the API completes.

## Testing Requirements

- `tests/vitest/ui/list-action-toasts.test.ts`
  - existing list adapter behavior remains stable if a generic helper is
    extracted.
- Add or update adapter tests:
  - success emits `toast.success`;
  - error emits `toast.error`;
  - API client errors use bounded message text;
  - generic errors use fallback copy.
- `tests/vitest/ui/page-editor-shell-wave.test.tsx`
  - save draft success emits central toast;
  - publish success emits central toast;
  - save/publish failures emit error toast and keep visible inline error.
- `tests/vitest/admin/adminApp.test.tsx` / `tests/vitest/admin/sonner.test.tsx`
  - only if the shared host/token contract changes.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md` if generalized notification adapter behavior is
  documented there.
- `_docs/DESIGN_TOKENS.md` only if toast host/token behavior changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Page editor save/publish outcomes use the central Sonner notification host.
2. The adapter pattern matches the Pages list approach from `TASK-208`.
3. No duplicate toaster host or Pages-editor-only notification system is added.
4. Existing list toast tests stay green.
