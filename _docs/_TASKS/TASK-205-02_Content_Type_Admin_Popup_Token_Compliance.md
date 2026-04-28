# TASK-205-02: Admin Popup Token Compliance for Content Types, Pages, Posts, and Menus
# FileName: TASK-205-02_Content_Type_Admin_Popup_Token_Compliance.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI + Design Tokens
**Estimated Effort:** Large
**Dependencies:** TASK-205
**Status:** Done (2026-04-24)

---

## Overview

Audit every targeted Content Types, Pages, Posts, and Menus popup/action surface
and make sure Admin UI Theme template changes affect the visual treatment.

This is a visual UI contract. Popup compliance means dialogs, sheets, drawers,
confirmation callouts, validation/error copy, destructive affordances, focus
rings, overlays, borders, backgrounds, and foreground colors must be driven by
the active Admin UI Theme tokens rather than fixed Tailwind color palettes. A
theme edited in the `Admin UI Theme` CMS section must be able to change these
popup surfaces consistently with the rest of the admin panel.

The content type area already uses shared `Dialog`, `Sheet`, `Button`, `Alert`,
and `toast` primitives, but destructive and warning callouts in the delete and
field-remove dialogs currently use hard-coded rose/amber Tailwind palettes. This
breaks the Admin UI Theme token contract documented in `_docs/DESIGN_TOKENS.md`
and mapped in `core/admin/styles/globals.css`.

The Menus editor item-delete dialog also uses a hard-coded destructive rose
palette. Pages, Posts, and Menus list/revision flows still use native
`window.confirm()` for row/bulk delete and revision restore/discard flows. Those
confirmations cannot be themed from Admin UI Themes, so this task replaces them
with shared Admin UI dialog surfaces while preserving the existing
service/client/API contracts.

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
- `core/admin/ui/menus/MenuItemDrawer.tsx`
  - menu item editor drawer,
  - delete affordance inside the drawer.
- `core/admin/ui/menus/MenuItemForm.tsx`
  - menu item validation feedback rendered inside the drawer.
- `core/admin/ui/menus/MenuItemDeleteDialog.tsx`
  - replace the hard-coded destructive callout palette with a token-backed shared
    surface,
  - preserve descendant-impact copy and existing editor delete behavior.

## Visual Token Contract

- Admin UI Theme is the visual source of truth for targeted popup surfaces.
- Popups must use shared primitives (`Dialog`, `Sheet`, `Alert`, `Button`,
  `toast`) or semantic classes backed by admin CSS variables.
- Fixed palettes such as `rose`, `amber`, `slate`, or other literal Tailwind
  color families are not allowed for popup background, border, foreground,
  destructive, warning, validation, or focus treatment when a shared token exists.
- Resource components may keep their own copy and action orchestration, but they
  may not introduce resource-specific popup style systems.
- If the current shared components cannot express warning/destructive popup
  states, extend the shared component/token mapping once and document the new
  token in `_docs/DESIGN_TOKENS.md`.

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
- `core/admin/ui/menus/MenuItemDrawer.tsx`
  - replace hard-coded destructive text classes with token-backed button or
    semantic destructive styling.
- `core/admin/ui/menus/MenuItemForm.tsx`
  - replace hard-coded validation error text classes with token-backed
    destructive/error text styling.
- `core/admin/ui/menus/MenuItemDeleteDialog.tsx`
  - replace the current hard-coded destructive callout palette with a
    token-backed shared surface while keeping the descendant-count copy.
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
- `tests/vitest/ui/menu-item-delete-dialog.test.tsx`
  - assert the menu-item delete dialog keeps descendant-impact copy and does not
    render hard-coded rose palette classes.
- `tests/vitest/ui/page-revision-drawer.test.tsx`
  - update when `PageRevisionDrawer` restore/discard confirmation behavior
    changes.
- `tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx`
  - update when `PostRevisionDrawer` restore confirmation behavior changes.
- `tests/vitest/admin/adminApp.test.tsx`
  - update only if toaster/theme application behavior changes.

## Owner Responsibilities

- Resource components own dialog state and resource-specific copy:
  `ContentTypeList`, `ContentTypeEditor`, `PageListPage`, `PageRevisionDrawer`,
  `PostsListPage`, `PostRevisionDrawer`, `MenuListPage`, and
  `MenuItemDrawer` / `MenuItemDeleteDialog`.
- Shared UI primitives own reusable token semantics. Add or extend
  `core/admin/components/ui/alert.tsx` or `core/admin/components/ui/dialog.tsx`
  only when the current shared variants cannot express the needed warning or
  destructive state.
- `core/admin/styles/globals.css` owns token mapping only when a required Admin
  UI Theme state variable is missing. Do not add one-off rose/amber/semantic
  palette classes in resource components.
- Existing clients, services, and routes remain the write contract owners. This
  task changes confirmation and token presentation, not route behavior.

## Implementation Direction

Do not create content-type-only, menu-only, or resource-only popup styles. Prefer
either:

- existing shared variants like `Alert variant="destructive"`,
- a shared token-backed `Alert variant="warning"` using
  `--admin-state-warning`,
- semantic classes derived from shadcn/Admin UI variables such as
  `bg-card`, `text-card-foreground`, `text-destructive`, `border-border`, and
  `text-muted-foreground`.

Treat popup token compliance as appearance binding, not as a route or permission
change. The implementation should make the active Admin UI Theme visibly affect
the targeted popup backgrounds, text, borders, overlays, destructive/warning
states, validation copy, and focus treatment.

Remove targeted popup classes like:

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
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/content-type-editor.test.tsx tests/vitest/ui/content-type-table.test.tsx tests/vitest/ui/content-type-list-parity.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx tests/vitest/ui/menu-item-delete-dialog.test.tsx tests/vitest/ui/page-revision-drawer.test.tsx tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx`
- Add a focused shared `Alert` variant test if `components/ui/alert.tsx` gains a
  new variant.
- Add or update focused Menus editor/drawer assertions if `MenuItemDrawer` or
  `MenuItemForm` markup changes while removing hard-coded popup colors.

## Documentation Updates Required

- `_docs/DESIGN_TOKENS.md` only if a new shared warning/destructive variant is
  added.

## Completion Notes

- Added a shared token-backed `ConfirmActionDialog` for targeted row, bulk, and
  revision confirmations.
- Added the shared `Alert` warning variant mapped to Admin UI state tokens and
  replaced targeted hard-coded rose/amber popup callouts with shared semantic
  surfaces.
- Pages, Posts, and Menus targeted row/bulk/revision confirmations now use
  React dialog state instead of native `window.confirm()`.
- No API, auth, RBAC, CSRF, or route contract changed.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Content Types delete/field-remove dialogs and Menus menu-item delete dialogs
   no longer use hard-coded rose/amber palette classes.
2. Pages, Posts, and Menus row, bulk, restore, and discard destructive
   confirmations no longer use native `window.confirm()`.
3. Targeted dialog/sheet surfaces continue to use shared Admin UI primitives.
4. Toasts continue to flow through the global Admin toaster.
5. A changed Admin UI Theme template can affect popup background, foreground,
   border, overlay, focus, validation/error, destructive, and warning colors
   through tokens.
6. No new resource-specific popup style system, route, or write contract is added
   to solve a theming problem.
