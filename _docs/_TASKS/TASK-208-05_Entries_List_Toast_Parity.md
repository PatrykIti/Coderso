# TASK-208-05: Entries List Toast Parity
# FileName: TASK-208-05_Entries_List_Toast_Parity.md

**Priority:** High
**Category:** CMS Entries + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-208-01, TASK-208-04
**Status:** To Do

---

## Overview

Close remaining Coderso Entries list toast gaps after TASK-207 list parity.

Entries already emit toasts for duplicate, bulk update, and delete flows. This
round must add missing create success/error feedback and verify that existing
bulk publish/draft/archive/delete toasts still align with the shared token-backed
toaster contract.

Entries have a distinct all-entries read model: `entriesClient.listAllEntries()`
calls `GET /content-entries`, which is implemented in
`core/server/routes/contentEntryRoutes.ts` and returns entries with content type
metadata. Keep that endpoint and read-model flow intact. Editor navigation still
uses the current admin route aliases (`/entries/:type/:id` and canonical
`/coderso/entries/:type/:id`) unless a separate routing task changes them.

Entries should also use the generic list-action toast helper/adapter for new and
audited feedback behavior rather than growing or preserving Entries-only
copy/count helpers for targeted list actions. Duplicate can keep its existing
flow unless it is touched, but create, bulk lifecycle, and delete feedback must
route through the shared helper once this task modifies them.

`EntryCreateDrawer` is reusable outside `EntryList` today, including custom
screen entry surfaces. Keep that reuse contract explicit: the drawer must not
hard-code a list-scope floating-toast policy for every consumer. If create error
toasts are emitted from inside the drawer because the drawer owns
`createEntry`, wire the behavior through an adapter-backed prop/callback from
`EntryList`, and keep non-participating consumers on their current local
inline-only error behavior unless this task also brings them into scope with
tests and docs.

## Sub-Tasks

- [ ] `TASK-208-05-01_Entry_Create_Toasts.md`
- [ ] `TASK-208-05-02_Entry_Bulk_Delete_Toast_Audit_and_Tests.md`

## Security Contract

- Visibility: internal admin Entries list.
- Auth model: existing admin session/API key.
- RBAC: existing `content:write` and `content:publish` permissions.
- CSRF: existing `entriesClient` helpers.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: unchanged.
- Anti-abuse: delete remains gated by shared confirmation dialogs.

## Files to Change

- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/entries/EntryCreateDrawer.tsx`
- `core/admin/ui/shared/listActionToasts.ts`
- `tests/vitest/ui/entry-list-wave.test.tsx`
- `tests/vitest/ui/list-action-toasts.test.ts`

## Testing Requirements

- Update `tests/vitest/ui/entry-list-wave.test.tsx`:
  - assert create success emits the expected final success toast,
  - assert create failure emits the expected final error toast,
  - assert bulk publish/draft/archive success and partial failure toasts,
  - assert row and bulk delete success/error toasts still fire after
    confirmation.
- Update `tests/vitest/ui/list-action-toasts.test.ts` if the Entries adapter
  adds helper branches not already covered.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - update Entries list feedback contract.
- `_docs/_TASKS/TASK-208*.md`
  - update status and validation notes when complete.

## Acceptance Criteria

1. Entries list create success/error emits top-right toasts.
2. Existing duplicate, bulk, and delete toasts remain intact.
3. Partial failures stay truthful and visible.
4. No editor-only flow is changed.
5. `GET /content-entries` remains the all-entries API/read model; admin editor
   navigation remains on the existing Entries route aliases.
6. Entries reuse the generic list-action toast helper/adapter for shared error,
   count, and bulk message behavior.
