# TASK-208-06-01: Content List and Design Token Docs
# FileName: TASK-208-06-01_Content_List_and_Design_Token_Docs.md

**Priority:** Medium
**Category:** Docs/Admin UI
**Estimated Effort:** Small
**Dependencies:** TASK-208-01, TASK-208-02, TASK-208-03, TASK-208-04, TASK-208-05
**Status:** To Do

---

## Overview

Update source-of-truth documentation after the implementation leaves land.

## Sub-Tasks

No child task files.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
  - Pages: list create/publish/unpublish/delete top-right toast contract.
  - Posts: list create/publish/unpublish/delete top-right toast contract.
  - Menus: list create/publish/unpublish/delete top-right toast contract.
  - Content Types/Engine: create, row delete, bulk publish/draft/delete toast
    contract.
  - Entries: create, bulk status/archive, and delete toast contract.
  - Entries: preserve `GET /content-entries` as the all-entries API/read model
    used by `entriesClient.listAllEntries()` and do not document it as the
    editor navigation route.
  - Explicitly state delete toasts fire after confirmation and mutation
    completion.
- `_docs/DESIGN_TOKENS.md`
  - shared Admin UI toaster uses Sonner `richColors` plus Admin UI Theme token
    variables,
  - Sonner rich/default hard-coded palettes are not allowed to remain the visual
    source of truth for admin toasts,
  - normal/success/error/warning/info states map through shared tokens,
  - custom Admin UI Theme modes update toast visuals dynamically through CSS
    variables.
- Document the generic list-action toast helper:
  - shared helper/adapter owns success/error/bulk result message behavior,
  - resource screens pass labels, action names, counts, and mutation results,
  - resource screens do not own toast styling or duplicate generic bulk/error
    math,
  - resource screens keep owning mutation execution, cache/list refresh,
    selection cleanup, and navigation.

## Pseudocode

Docs wording direction:

```md
List action feedback:
- Create, publish, unpublish/draft, and delete actions emit the shared
  top-right Admin UI toast after the mutation settles.
- Delete actions first require the shared confirmation dialog; no toast is shown
  on the first delete click.
- Inline partial-failure details remain visible for bulk operations.
```

Design token wording direction:

```md
Shared toasts:
- `core/admin/app/AdminApp.tsx` keeps one documented `richColors` Sonner host.
- `core/admin/components/ui/sonner.tsx` owns toast state token mapping.
- `core/admin/ui/shared/listActionToasts.ts` owns list action success/error and
  bulk result message helpers.
- Resource screens pass adapter parameters and mutation results; they do not
  style toast state or duplicate generic count/error logic.
- The helper does not call list clients, mutate state, refresh caches, or
  navigate; those stay in the existing list components.
- Success/error/warning states use `--admin-state-*` tokens.
```

## Testing Requirements

No docs-only test is required for this leaf, but it must be completed after the
implementation test suites for TASK-208-01 through TASK-208-05 pass.

## Acceptance Criteria

1. Content list UX docs match the implemented list toast behavior.
2. Design token docs name the shared Sonner/Admin UI Theme token contract.
3. Docs do not describe editor-only flows as part of this list-screen task.
4. Docs keep `/content-entries` as the Entries API/read-model endpoint and do
   not confuse it with editor navigation.
5. Docs state that custom Admin UI Theme modes propagate toast colors through
   dynamic CSS variables.
