# TASK-207-04-03: Entries Create/Action Popup Theme Token Audit
# FileName: TASK-207-04-03_Entries_Create_Action_Popup_Theme_Token_Audit.md

**Priority:** Medium
**Category:** Admin/UI + Design Tokens
**Estimated Effort:** Medium
**Dependencies:** TASK-207-04-02
**Status:** To Do

---

## Overview

Audit remaining Entries popup/action surfaces for Admin UI Theme token
compliance after the list parity change.

This is a visual token contract pass. It should not change API behavior or
invent resource-specific popup styles.

## Sub-Tasks

No child task files.

## Popup Inventory

- `core/admin/ui/entries/EntryCreateDrawer.tsx`
  - create drawer,
  - content-type selector,
  - validation/API error alerts.
- `core/admin/ui/entries/EntryList.tsx`
  - row dropdown actions,
  - duplicate/delete/bulk feedback alerts/toasts.
- `core/admin/ui/entries/EntryEditorHeader.tsx`
  - header action popups/badges if hard-coded destructive/warning treatment is
    still present in actionable popup surfaces.
- `core/admin/ui/entries/EntryMetadataPanel.tsx`
  - destructive/action feedback only where it is popup/action related.

## Files to Change

- `core/admin/ui/entries/EntryCreateDrawer.tsx`
- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/entries/EntryEditorHeader.tsx` if needed.
- `core/admin/ui/entries/EntryMetadataPanel.tsx` if needed.
- `core/admin/components/ui/alert.tsx` only if a missing shared warning variant
  is required.
- `core/admin/styles/globals.css` only if a missing Admin UI state token must be
  mapped.
- `tests/vitest/ui/entry-list-wave.test.tsx`
- `tests/vitest/ui/content-entry-editor.test.tsx` if editor surfaces are touched.

## Security Contract

- Visibility: internal admin UI.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: no new write path; destructive actions remain confirmed.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/entry-list-wave.test.tsx tests/vitest/ui/content-entry-editor.test.tsx`
- Manual/theme smoke: change active Admin UI Theme template and verify targeted
  popup backgrounds, borders, text, overlays, focus, and destructive states
  follow tokens.

## Documentation Updates Required

- `_docs/DESIGN_TOKENS.md` only if token/variant mapping changes.
- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Entries create drawer and action popups use shared token-backed primitives.
2. No new hard-coded rose/amber/destructive popup palette is introduced.
3. Resource copy stays in Entries components; reusable token semantics stay in
   shared UI primitives.
4. API/client/service behavior is unchanged.
