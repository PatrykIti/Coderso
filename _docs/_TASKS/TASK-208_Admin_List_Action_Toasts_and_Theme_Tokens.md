# TASK-208: Admin List Action Toasts and Theme Tokens
# FileName: TASK-208_Admin_List_Action_Toasts_and_Theme_Tokens.md

**Priority:** High
**Category:** Admin/UI + CMS Lists + Design Tokens
**Estimated Effort:** Large
**Dependencies:** TASK-198, TASK-199, TASK-200, TASK-205, TASK-207
**Status:** To Do

---

## Overview

Make floating admin notifications consistent for list-screen state changes in
Pages, Posts, Menus, Coderso Engine content types, and Coderso Entries.

This task is about list screens only, not editor save/publish flows. When an
admin creates, publishes, unpublishes/drafts, or deletes an item from one of
these list screens, the action must emit a top-right Admin UI toast after the
real mutation has completed. Delete remains a two-step destructive flow:
clicking `Delete` opens the token-backed confirmation dialog, and the floating
toast appears only after the user confirms and the delete mutation succeeds or
fails.

The task also fixes the visual source of truth for these floating toasts. The
current shared `sonner` toaster is mounted in `AdminApp`, but its `richColors`
state treatment can still resolve to Sonner's default hard-coded black, green,
red, yellow, and blue palettes instead of the active Admin UI Theme. Sonner's
documented `richColors` prop is the correct trigger for typed success, error,
warning, and info state selectors, but the shared wrapper must override the
Sonner state CSS variables with Admin UI Theme variables. All normal, success,
warning, info, and error toast surfaces must be driven by Admin UI Theme tokens
and shared admin CSS variables. Those variables must remain dynamic: when an
operator changes or creates an Admin UI Theme mode, the shared toaster must pick
up the active mode parameters through CSS variables so every toast and
token-backed UI surface changes together.

The behavioral source of truth must also be shared. Resource screens should not
copy their own bulk result math, error normalization, or success/error message
rules. Add one generic list-action toast system and use resource-specific
adapters or parameters for labels, action names, counts, and mutation result
metadata. The generic system owns notification semantics; resource components
own their existing mutations, refresh/cache invalidation, selection cleanup, and
navigation behavior.

## Current Repo Findings

The previous popup/token work shipped the shared confirmation dialog and removed
native confirms from the targeted list surfaces, but the floating notification
contract is still uneven:

| Surface | Existing list-screen notification behavior | Gap |
|---------|--------------------------------------------|-----|
| Pages | create, publish, unpublish, delete, and bulk actions mostly use inline state/error feedback | no consistent top-right toast for create/publish/unpublish/delete success or failure |
| Posts | bulk success has inline feedback; create, publish, unpublish, delete, and row errors do not consistently toast | no consistent top-right toast contract for list mutations |
| Menus | create dialog/list lifecycle actions use local or inline errors | no top-right toast for create/publish/unpublish/delete success or failure |
| Engine content types | create, duplicate, and row delete already use `toast`; bulk publish/draft/delete mostly rely on inline feedback or error only | bulk state changes do not consistently toast; create errors remain local-only |
| Entries | duplicate, bulk update, and delete already use `toast`; create success/error is not fully covered | create from list needs the same top-right success/error contract |
| Shared toaster | `AdminApp` mounts one top-right `<Toaster richColors />`; `sonner.tsx` maps only normal toast colors | success/error/warning/info variables still fall back to Sonner defaults unless the wrapper overrides the documented rich-color state variables with Admin UI Theme tokens |

## Scope

In scope:

- list surfaces only:
  - `core/admin/ui/pages/PageListPage.tsx`,
  - `core/admin/ui/posts/PostsListPage.tsx`,
  - `core/admin/ui/menus/MenuListPage.tsx`,
  - `core/admin/ui/content-types/ContentTypeList.tsx`,
  - `core/admin/ui/entries/EntryList.tsx`;
- list create popup/drawer/dialog error paths where the list owns the action
  result:
  - `PageCreateDrawer`,
  - `PostsCreateDrawer`,
  - `MenuCreateDialog`,
  - `ContentTypeCreateDrawer`,
  - `EntryCreateDrawer`;
- shared toast host and token mapping:
  - `core/admin/app/AdminApp.tsx`,
  - `core/admin/components/ui/sonner.tsx`,
  - `core/admin/styles/globals.css` only if CSS token selectors are needed;
- shared list-action toast contract:
  - `core/admin/ui/shared/listActionToasts.ts`,
  - one resource-neutral API for list action success, error, and bulk-result
    notifications;
  - resource adapters/parameters for Pages, Posts, Menus, Content Types, and
    Entries;
  - adapter config can stay inline when one component owns the action path; if a
    list and drawer/dialog both need the same resource copy, extract a small
    resource-local adapter file such as `entryListToastAdapter.ts` or
    `contentTypeListToastAdapter.ts`;
  - adapters must stay thin: labels, action copy, fallback errors, and optional
    message overrides only. They must not own mutation execution, cache refresh,
    navigation, selection trimming, or styling.
- existing list confirmation dialogs and shared popup primitives when a toast
  change exposes hard-coded styling.

Out of scope:

- editor save/publish toasts, except where a shared toaster token fix affects
  them automatically;
- adding new publish/unpublish row actions to a surface that does not currently
  expose that action;
- changing API route behavior, permissions, payload schemas, or cache ownership;
- replacing the existing Entries all-items read model. `GET /content-entries`
  remains the API/read-model endpoint owned by `contentEntryRoutes` and consumed
  by `entriesClient.listAllEntries()`; editor navigation keeps using the
  existing admin route aliases;
- replacing inline partial-failure feedback. Inline feedback can stay, but it
  must be supplemented by the shared top-right toast where the action is a
  list-screen state mutation.

## Sub-Tasks

- [ ] `TASK-208-01_Shared_Sonner_Token_Contract.md`
  - [ ] `TASK-208-01-01_AdminApp_Toaster_Host_and_Rich_Color_Removal.md`
  - [ ] `TASK-208-01-02_Sonner_State_Token_Style_Mapping.md`
  - [ ] `TASK-208-01-03_Shared_Toaster_Token_Regression_Tests.md`
- [ ] `TASK-208-02_Pages_and_Posts_List_Toast_Parity.md`
  - [ ] `TASK-208-02-01_Pages_List_Mutation_Toasts.md`
  - [ ] `TASK-208-02-02_Posts_List_Mutation_Toasts.md`
  - [ ] `TASK-208-02-03_Pages_Posts_Toast_Regression_Tests.md`
- [ ] `TASK-208-03_Menus_List_Toast_Parity.md`
  - [ ] `TASK-208-03-01_Menus_Create_Row_Lifecycle_Toasts.md`
  - [ ] `TASK-208-03-02_Menus_Bulk_Toasts_and_Regression_Tests.md`
- [ ] `TASK-208-04_Engine_Content_Type_List_Toast_Parity.md`
  - [ ] `TASK-208-04-01_Content_Type_Create_Error_Toasts.md`
  - [ ] `TASK-208-04-02_Content_Type_Bulk_Toasts_and_Regression_Tests.md`
- [ ] `TASK-208-05_Entries_List_Toast_Parity.md`
  - [ ] `TASK-208-05-01_Entry_Create_Toasts.md`
  - [ ] `TASK-208-05-02_Entry_Bulk_Delete_Toast_Audit_and_Tests.md`
- [ ] `TASK-208-06_Docs_Changelog_and_Closure.md`
  - [ ] `TASK-208-06-01_Content_List_and_Design_Token_Docs.md`
  - [ ] `TASK-208-06-02_Validation_Changelog_and_Task_Board_Closure.md`

## Implementation Leaf Matrix

| Round | Owner files | Primary tests | Docs updated in round |
|-------|-------------|---------------|-----------------------|
| TASK-208-01 | `AdminApp.tsx`, `sonner.tsx`, optional `globals.css` | `tests/vitest/admin/adminApp.test.tsx`, `tests/vitest/admin/sonner.test.tsx` | `_docs/DESIGN_TOKENS.md` |
| TASK-208-02 | `listActionToasts.ts`, `PageListPage.tsx`, `PostsListPage.tsx`, create drawers only if needed | `tests/vitest/ui/list-action-toasts.test.ts`, `tests/vitest/ui/page-post-list-wave.test.tsx` | `_docs/CONTENT_LIST_UX.md` |
| TASK-208-03 | `listActionToasts.ts`, `MenuListPage.tsx`, `MenuCreateDialog.tsx` | `tests/vitest/ui/list-action-toasts.test.ts`, `tests/vitest/ui/menu-list-page-actions.test.tsx` | `_docs/CONTENT_LIST_UX.md` |
| TASK-208-04 | `listActionToasts.ts`, `ContentTypeList.tsx`, `ContentTypeCreateDrawer.tsx` | `tests/vitest/ui/list-action-toasts.test.ts`, `tests/vitest/ui/content-type-list-parity.test.tsx` | `_docs/CONTENT_LIST_UX.md` |
| TASK-208-05 | `listActionToasts.ts`, `EntryList.tsx`, `EntryCreateDrawer.tsx` | `tests/vitest/ui/list-action-toasts.test.ts`, `tests/vitest/ui/entry-list-wave.test.tsx` | `_docs/CONTENT_LIST_UX.md` |
| TASK-208-06 | docs/changelog/task board | validation command list below | `_docs/DESIGN_TOKENS.md`, `_docs/CONTENT_LIST_UX.md`, `_docs/_CHANGELOG/README.md`, `_docs/_TASKS/README.md` |

## Dependency Order

1. `TASK-208-01-*` must land first. It prevents every new resource toast from
   inheriting the wrong Sonner default/rich colors.
2. Add the generic list-action toast helper before wiring individual resources.
   The helper owns shared result/error/count behavior; each resource passes
   adapter parameters such as singular/plural labels and action copy. The helper
   returns or emits toast messages only; it must not replace the existing list
   orchestration in each screen.
3. `TASK-208-02-*` can land after the shared toaster contract and proves the
   pattern on the largest existing shared Pages/Posts test suite.
4. `TASK-208-03-*` follows with Menus because it has a separate create dialog
   and list-first routing contract.
5. `TASK-208-04-*` follows with Engine content types because some toasts already
   exist and the work is mostly gap filling.
6. `TASK-208-05-*` follows with Entries because bulk/delete toasts already exist
   and the work is an audit plus create gap closure.
7. `TASK-208-06-*` closes docs, changelog, task board, and validation after all
   implementation leaves are complete.

## Security Contract

- Visibility: internal admin UI only.
- Auth model: existing authenticated admin session/API key model used by the
  current list clients and routes.
- RBAC:
  - create/update/delete require the existing content/menu/page/post write
    permissions for the target resource;
  - publish transitions continue to require the existing publish permissions.
- CSRF: unchanged; use existing admin client helpers and route contracts.
- Rate-limit bucket: existing admin write buckets remain authoritative.
- Reject-unknown validation: no new payload schemas are introduced by this task;
  existing route schemas remain the validation source of truth.
- Anti-abuse:
  - destructive delete remains gated by the shared token-backed confirmation
    dialog;
  - no public write endpoint, nonce, signature, HMAC, or reCAPTCHA contract is
    introduced or weakened.

## Files to Change

Shared toaster and token layer:

- `core/admin/app/AdminApp.tsx`
  - keep one top-right toaster and keep Sonner's documented `richColors` state
    selector path only after the shared wrapper makes the rich-color variables
    token-backed.
- `core/admin/components/ui/sonner.tsx`
  - own the token-backed style mapping for toast state surfaces.
- `core/admin/styles/globals.css`
  - add Sonner state selectors only if component-level style variables are not
    enough to override default Sonner state colors.
- `tests/vitest/admin/adminApp.test.tsx`
  - assert the shared toaster remains top-right, accessible, closeable, and
    intentionally rich-color enabled through the shared token-backed wrapper.
- `tests/vitest/admin/sonner.test.tsx`
  - render the shared wrapper directly and assert token-backed dynamic style
    variables for normal, success, error, warning, and info states.

Shared list-action feedback:

- `core/admin/ui/shared/listActionToasts.ts`
  - own resource-neutral success/error/bulk result helpers for list mutation
    feedback.
  - accept resource adapter parameters for labels, action names, counts,
    fallback errors, and settled mutation results.
  - expose helpers that can normalize `unknown` errors and summarize
    `Promise.allSettled` output into a typed result such as
    `{ ok, action, message, succeededCount, failedCount, failedTargets }`.
    Resource screens may use the returned `failedTargets` for selection cleanup
    and the returned `message` for existing inline feedback, but they must not
    rebuild the same count, pluralization, or partial-failure copy locally.
  - expose one emit helper for the final `toast.success`/`toast.error` call so
    resource screens do not branch into local `toast.success` / `toast.error`
    calls for targeted list actions.
  - do not call list clients, mutate component state, refresh caches, clear
    selection, or navigate.
  - emit through the shared `sonner` toast API; do not style individual
    resource toasts.
- Resource-local adapter modules only where needed by multiple components:
  - keep single-consumer adapter config inline in the list file,
  - extract shared adapter config beside the resource list/drawer when both need
    the same copy and fallback behavior.
  - do not create per-resource formatter utilities that duplicate the shared
    bulk count, partial-failure, or error-normalization logic.
- `tests/vitest/ui/list-action-toasts.test.ts`
  - cover single action success/error, bulk full success, partial failure, and
    pluralization/count behavior without importing runtime/Bun-only modules.

List surfaces:

- `core/admin/ui/pages/PageListPage.tsx`
- `core/admin/ui/pages/PageCreateDrawer.tsx`
- `core/admin/ui/posts/PostsListPage.tsx`
- `core/admin/ui/posts/PostsCreateDrawer.tsx`
- `core/admin/ui/menus/MenuListPage.tsx`
- `core/admin/ui/menus/MenuCreateDialog.tsx`
- `core/admin/ui/content-types/ContentTypeList.tsx`
- `core/admin/ui/content-types/ContentTypeCreateDrawer.tsx`
- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/entries/EntryCreateDrawer.tsx`

Tests:

- `tests/vitest/ui/page-post-list-wave.test.tsx`
- `tests/vitest/ui/menu-list-page-actions.test.tsx`
- `tests/vitest/ui/content-type-list-parity.test.tsx`
- `tests/vitest/ui/entry-list-wave.test.tsx`
- any adjacent create drawer/dialog test that already owns validation/error
  feedback for these list-created resources.

Docs and governance:

- `_docs/CONTENT_LIST_UX.md`
- `_docs/DESIGN_TOKENS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Implementation Order

1. Update the shared `sonner` wrapper and `AdminApp` toaster configuration first
   so Sonner's documented `richColors` state selectors read Admin UI Theme token
   variables instead of Sonner's bundled palettes.
2. Add the shared `listActionToasts` helper and its Bun-free Vitest coverage.
3. Add list-action toast calls in Pages and Posts through the shared helper,
   preserving the existing refresh/cache behavior, inline feedback, and delete
   confirmation sequence.
4. Add Menus list-action toast calls through the shared helper, including create
   dialog success/failure.
5. Fill Engine content type bulk-action toast gaps and create error toast gaps
   through the shared helper.
6. Fill Entries create toast gaps, keep `GET /content-entries` as the all-entry
   API read model, and verify existing bulk/delete toast behavior.
7. Add focused tests per surface, then update docs/changelog/task board.

## Testing Requirements

Run the targeted Vitest lane for the touched Bun-free admin/UI surfaces:

```bash
bun run test:vitest -- tests/vitest/admin/adminApp.test.tsx tests/vitest/admin/sonner.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx tests/vitest/ui/content-type-list-parity.test.tsx tests/vitest/ui/entry-list-wave.test.tsx
```

Run the required repo checks:

```bash
bun --cwd core lint
bun --cwd core lint:types
```

If create drawer/dialog tests are changed outside the listed suites, include the
adjacent focused Vitest suite in the same validation run.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
  - document that list-screen create/publish/unpublish/delete actions emit the
    shared top-right Admin UI toast after mutation completion.
  - document that delete toasts fire only after confirmed delete execution.
- `_docs/DESIGN_TOKENS.md`
  - document that shared Admin UI toasts use Sonner `richColors` with
    token-backed state variables and must not rely on Sonner's default hard-coded
    state palettes.
  - document that toast variables are dynamic Admin UI Theme variables, so
    custom modes update all token-backed toast states without per-component
    rewrites.
- `_docs/_TASKS/README.md`
  - move this task through To Do/In Progress/Done and keep statistics synced.
- `_docs/_CHANGELOG/{next}-2026-04-24-task-208-admin-list-action-toasts.md`
  - add on completion with implementation and validation evidence.

## Acceptance Criteria

1. Pages, Posts, Menus, Engine content types, and Entries list screens emit a
   top-right success toast after successful create, publish, unpublish/draft,
   and delete actions that are available on that list surface.
2. The same list-screen actions emit a top-right error toast when the mutation
   fails, without removing existing inline field/drawer/partial-failure feedback.
3. Delete actions still require the shared token-backed confirmation dialog, and
   the floating toast appears only after the confirmed delete mutation completes.
4. The admin app still has exactly one shared toaster host mounted from
   `AdminApp` with top-right positioning, `richColors`, close button, duration,
   and accessible notification labeling.
5. Normal, success, error, warning, and info toast visuals are controlled by
   Admin UI Theme tokens through the shared Sonner CSS variable map. Light themes
   must not render Sonner's default rich-color palette unless the active theme
   tokens explicitly define that look.
6. List action feedback is routed through a generic shared helper plus
   resource-specific adapter parameters; resource screens do not duplicate bulk
   result math or error normalization.
7. Targeted list-action toasts are emitted through the shared helper/adapters,
   not through new resource-local `toast.success` / `toast.error` branches.
8. No resource-specific toaster, hard-coded Tailwind color family, or native
   `window.confirm()` is introduced for the targeted list action feedback.
9. Targeted Vitest suites plus `bun --cwd core lint` and
   `bun --cwd core lint:types` pass or any unrelated pre-existing failure is
   isolated and documented before closure.
