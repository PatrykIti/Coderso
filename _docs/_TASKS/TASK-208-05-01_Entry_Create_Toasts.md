# TASK-208-05-01: Entry Create Toasts
# FileName: TASK-208-05-01_Entry_Create_Toasts.md

**Priority:** High
**Category:** CMS Entries + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-208-05, TASK-208-01
**Status:** To Do

---

## Overview

Add missing top-right toast feedback for Entries list create success and create
failure.

Entry duplicate, bulk update, and delete already use `toast`; this leaf should
not rewrite those flows.

Do not remove or rename the existing all-entries API read model. The list uses
`entriesClient.listAllEntries()` which calls `GET /content-entries`; the server
route exists in `core/server/routes/contentEntryRoutes.ts`. That API contract is
separate from the admin editor navigation route.

## Sub-Tasks

No child task files.

## Implementation Checklist

- In `core/admin/ui/entries/EntryList.tsx`, emit a shared success toast from
  `handleEntryCreated` after the list/cache state is updated.
- In `core/admin/ui/entries/EntryCreateDrawer.tsx`, emit a shared error toast
  in the create catch path while preserving the drawer-local error alert.
- Emit the top-right error toast only for rejected `createEntry` mutations/API
  failures. Local drawer validation such as missing content type, title, or slug
  remains inline/disabled-state feedback and must not emit a floating toast.
- Route create success/error copy through the shared list-action toast helper
  with an Entries adapter/config.
- Because both `EntryList` and `EntryCreateDrawer` need the Entries adapter,
  extract a small resource-local adapter module if needed instead of duplicating
  the same config in both components.
- Keep `openAfterCreate` navigation behavior unchanged.
- Keep the selected/current content type scope unchanged.
- Keep `GET /content-entries` as the all-entry list read model and keep editor
  navigation on the existing `/entries/:type/:id` alias unless another task
  changes routing.
- Do not add a manual all-entries upsert helper in the list. `createEntry`
  already updates the Entries caches and broadcasts the all-entries cache event;
  the list currently refreshes entries and content types after create, and that
  flow should remain the owner.

## Pseudocode

```tsx
// core/admin/ui/entries/EntryList.tsx
// Shared by the list and create drawer, for example from
// core/admin/ui/entries/entryListToastAdapter.ts.
const entriesToast = createListActionToastAdapter({
  resourceSingular: "entry",
  resourcePlural: "entries",
  actions: {
    create: { success: "Entry created.", fallbackError: "Failed to create entry." },
    delete: { success: "Entry deleted.", fallbackError: "Failed to delete entry." },
  },
});

const handleEntryCreated = (created, typeSlug, openAfterCreate) => {
  void refreshEntries({ force: true, background: true });
  void refreshTypes({ force: true, background: true });
  entriesToast.success("create");

  if (openAfterCreate) {
    navigate(`/entries/${encodeURIComponent(typeSlug)}/${encodeURIComponent(created.id)}`);
  }
};
```

```tsx
try {
  const created = await createEntry(typeSlug, payload);
  onCreated?.(created, typeSlug, openAfterCreate);
} catch (error) {
  const message = entriesToast.errorMessage(error, "create");
  setError(message);
  entriesToast.error(message);
}
```

## Testing Requirements

- `tests/vitest/ui/entry-list-wave.test.tsx`
  - in the existing create-in-current-type test, assert the final success toast,
  - add or extend create failure coverage and assert the final error toast,
  - current coverage uses a success-only `EntryCreateDrawer` mock; extend that
    mock to trigger a rejected create path, or add a focused `EntryCreateDrawer`
    test that renders the real drawer and proves the local drawer error plus the
    top-right error toast,
  - assert local disabled/required-field validation does not emit a top-right
    error toast when that validation path is covered,
  - ensure navigation assertions for `openAfterCreate` still pass.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - Entries create feedback contract.
- `_docs/_TASKS/TASK-208-05*.md`
  - status and validation notes.

## Acceptance Criteria

1. Entry create success emits a shared top-right toast.
2. Entry create mutation/API failure emits a shared top-right error toast and
   keeps local drawer error feedback.
3. Existing create navigation/scope behavior is unchanged.
4. `GET /content-entries` stays the list read-model API; it is not treated as
   the editor navigation route.
5. Create success/error copy and fallback handling come from the shared
   list-action toast helper/adapter.
6. Local missing-field or disabled-state validation remains inline-only and does
   not emit floating toasts.
