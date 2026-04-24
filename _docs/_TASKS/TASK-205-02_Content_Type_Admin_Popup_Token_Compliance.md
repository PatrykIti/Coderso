# TASK-205-02: Admin Popup Token Compliance for Content Types, Pages, Posts, and Menus
# FileName: TASK-205-02_Content_Type_Admin_Popup_Token_Compliance.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI + Design Tokens
**Estimated Effort:** Large
**Dependencies:** TASK-205
**Status:** To Do

---

## Overview

Audit every targeted Content Types, Pages, Posts, and Menus popup/action surface
and make sure Admin UI Theme template changes affect the visual treatment.

The content type area already uses shared `Dialog`, `Sheet`, `Button`, `Alert`,
and `toast` primitives, but destructive and warning callouts in the delete and
field-remove dialogs currently use hard-coded rose/amber Tailwind palettes. This
breaks the Admin UI Theme token contract documented in `_docs/DESIGN_TOKENS.md`
and mapped in `core/admin/styles/globals.css`.

Pages, Posts, and Menus also still use native `window.confirm()` for row/bulk
delete and revision restore/discard flows. Those confirmations cannot be themed
from Admin UI Themes, so this task replaces them with shared Admin UI dialog
surfaces while preserving the existing service/client/API contracts.

## Sub-Tasks

No child task files.

## Popup Inventory

Content Types:

- `core/admin/ui/content-types/ContentTypeList.tsx`
  - delete content type dialog,
  - row action dropdown trigger and destructive item,
  - duplicate/delete toast feedback.
- `core/admin/ui/content-types/ContentTypeEditor.tsx`
  - delete type dialog,
  - remove field dialog,
  - mobile field details sheet,
  - mobile schema preview sheet,
  - duplicate/save/publish/delete toast feedback.
- `core/admin/ui/content-types/ContentTypeCreateDrawer.tsx`
  - create drawer sheet,
  - duplicate name/slug validation feedback,
  - API error alert.

Pages:

- `core/admin/ui/pages/PageListPage.tsx`
  - row delete confirmation,
  - bulk delete confirmation,
  - bulk success/partial-failure feedback.
- `core/admin/ui/pages/PageCreateDrawer.tsx`
  - create drawer sheet,
  - create validation and API error alerts.
- `core/admin/ui/pages/PageRevisionDrawer.tsx`
  - restore revision confirmation,
  - discard autosave confirmation.

Posts:

- `core/admin/ui/posts/PostsListPage.tsx`
  - row delete confirmation,
  - bulk delete confirmation,
  - bulk success/partial-failure feedback.
- `core/admin/ui/posts/PostsCreateDrawer.tsx`
  - create drawer sheet,
  - create validation and API error alerts.
- `core/admin/ui/posts/editor/PostRevisionDrawer.tsx`
  - restore revision confirmation.

Menus:

- `core/admin/ui/menus/MenuListPage.tsx`
  - row delete confirmation,
  - bulk delete confirmation,
  - bulk partial-failure feedback.
- `core/admin/ui/menus/MenuCreateDialog.tsx`
  - create dialog,
  - create validation and API error alerts.
- `core/admin/ui/menus/MenuItemDeleteDialog.tsx`
  - keep existing editor delete dialog token-compliant if shared variants change.

## Files to Change

- `core/admin/ui/content-types/ContentTypeList.tsx`
  - replace hard-coded destructive callout palette with token-backed shared
    surface.
- `core/admin/ui/content-types/ContentTypeEditor.tsx`
  - replace hard-coded destructive and warning callout palettes with token-backed
    shared surfaces.
- `core/admin/ui/content-types/ContentTypeCreateDrawer.tsx`
  - verify sheet and validation feedback use token-backed classes.
- `core/admin/ui/pages/PageListPage.tsx`
  - replace native row/bulk delete confirms with token-backed shared dialog
    state.
- `core/admin/ui/pages/PageCreateDrawer.tsx`
  - audit sheet and validation feedback for token-backed classes.
- `core/admin/ui/pages/PageRevisionDrawer.tsx`
  - replace native restore/discard confirmations with token-backed shared dialog
    state.
- `core/admin/ui/posts/PostsListPage.tsx`
  - replace native row/bulk delete confirms with token-backed shared dialog
    state.
- `core/admin/ui/posts/PostsCreateDrawer.tsx`
  - audit sheet and validation feedback for token-backed classes.
- `core/admin/ui/posts/editor/PostRevisionDrawer.tsx`
  - replace native restore confirmation with token-backed shared dialog state.
- `core/admin/ui/menus/MenuListPage.tsx`
  - replace native row/bulk delete confirms with token-backed shared dialog
    state.
- `core/admin/ui/menus/MenuCreateDialog.tsx`
  - audit dialog and validation feedback for token-backed classes.
- `core/admin/ui/menus/MenuItemDeleteDialog.tsx`
  - keep existing shared dialog compatible with any shared variant changes.
- `core/admin/ui/shared/*`
  - add a small shared confirmation component only if it removes real
    duplication across these resources while keeping resource-specific copy.
- `core/admin/components/ui/alert.tsx`
  - add a token-backed `warning` variant if needed.
- `core/admin/components/ui/dialog.tsx`
  - update only if the shared dialog lacks a token-backed semantic hook.
- `core/admin/components/ui/sonner.tsx`
  - update only if content type toasts bypass shared toaster semantics.
- `core/admin/styles/globals.css`
  - update only if a missing Admin UI state token must be mapped.
- `tests/vitest/ui/content-type-editor.test.tsx`
  - assert delete/remove-field callouts do not render hard-coded rose/amber
    palette classes.
- `tests/vitest/ui/content-type-list-parity.test.tsx`
  - create this focused suite if it does not exist yet, and assert the list
    delete dialog does not render hard-coded rose/amber palette classes.
- `tests/vitest/ui/content-type-table.test.tsx`
  - keep dropdown/action rendering covered.
- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - assert Pages/Posts row and bulk delete use shared dialog state instead of
    `window.confirm()`.
- `tests/vitest/ui/menu-list-page-actions.test.tsx`
  - assert Menus row and bulk delete use shared dialog state instead of
    `window.confirm()`.
- `tests/vitest/ui/page-settings-drawer.test.tsx` or adjacent revision drawer
  coverage
  - update if `PageRevisionDrawer` confirmation behavior changes.
- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx` or adjacent revision
  drawer coverage
  - update if `PostRevisionDrawer` confirmation behavior changes.
- `tests/vitest/admin/adminApp.test.tsx`
  - update only if toaster/theme application behavior changes.

## Implementation Direction

Do not create content-type-only popup styles. Prefer either:

- existing shared variants like `Alert variant="destructive"`,
- a shared token-backed `Alert variant="warning"` using
  `--admin-state-warning`,
- semantic classes derived from shadcn/Admin UI variables such as
  `bg-card`, `text-card-foreground`, `text-destructive`, `border-border`, and
  `text-muted-foreground`.

Remove content type popup classes like:

```txt
border-rose-200 bg-rose-50/70 text-rose-900
border-amber-200 bg-amber-50/70 text-amber-900
```

Do not leave native `window.confirm()` in the targeted Pages, Posts, and Menus
flows. Confirmation state should be explicit React state so the dialog can use
shared Admin UI theme tokens, accessible titles/descriptions, focus management,
and destructive button variants.

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged; this task changes presentation and
  confirmation UI, not write authorization.
- Reject-unknown validation: unchanged.
- Anti-abuse: destructive actions still require explicit confirmation and keep
  exact target context in the dialog copy.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/content-type-editor.test.tsx tests/vitest/ui/content-type-table.test.tsx tests/vitest/ui/content-type-list-parity.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx`
- Add a focused shared `Alert` variant test if `components/ui/alert.tsx` gains a
  new variant.

## Documentation Updates Required

- `_docs/DESIGN_TOKENS.md` only if a new shared warning/destructive variant is
  added.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Content Types delete and field-remove dialogs no longer use hard-coded
   rose/amber palette classes.
2. Pages, Posts, and Menus row, bulk, restore, and discard destructive
   confirmations no longer use native `window.confirm()`.
3. Targeted dialog/sheet surfaces continue to use shared Admin UI primitives.
4. Toasts continue to flow through the global Admin toaster.
5. A changed Admin UI Theme template can affect popup background, foreground,
   border, destructive, and warning colors through tokens.
