# TASK-211-04: Page History Draft Copy Cleanup
# FileName: TASK-211-04_Page_History_Draft_Copy_Cleanup.md

**Priority:** Medium
**Category:** CMS/Pages + Admin/UI + UX Copy
**Estimated Effort:** Small
**Dependencies:** TASK-211, TASK-194-02
**Status:** Done (2026-04-25)

---

## Overview

Align Page History wording with the Page Settings copy fix from `TASK-194`.

Page Settings now tells users that closing the panel keeps one `draft version in
history`, but Page History still uses `autosave` in user-facing description,
badges, and confirmation copy. The underlying API/domain value can remain
`autosave`; only user-facing copy should change.

## Sub-Tasks

- [x] TASK-211-04-01: Page Revision Drawer User-Facing Copy

## Files to Change

- `core/admin/ui/pages/PageRevisionDrawer.tsx`
- `tests/vitest/ui/page-revision-drawer.test.tsx`
- `_docs/CMS_API.md` only if docs should clarify internal `autosave` versus UI
  `draft version` wording.

## Implementation Direction

- Replace visible `autosave` nouns with `draft version` or `unsaved draft`
  wording.
- Keep `revision.kind === "autosave"` checks and API payloads unchanged.
- Preserve button semantics:
  - discard still deletes the latest draft-version snapshot;
  - restore still restores that snapshot into the editor.
- Avoid adding explanatory in-app text beyond the concise drawer/dialog copy.

## Pseudocode

```tsx
const isDraftVersion = revision.kind === "autosave";
const label = isDraftVersion ? "Draft version" : `Version ${revision.version}`;
const badge = isDraftVersion ? "Draft" : "Published";
```

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: no route or persistence changes; copy-only UI update.

## Testing Requirements

- `tests/vitest/ui/page-revision-drawer.test.tsx`
  - no visible `Autosave` / `autosave` text remains in the rendered drawer;
  - draft-version revision still shows discard action;
  - restore/discard callbacks still receive the same revision id.

## Documentation Updates Required

- `_docs/CMS_API.md` only if the distinction between internal `autosave` kind
  and user-facing `draft version` needs documentation.
- `_docs/PLAYWRIGHT/SUMMARY-PAGES.md` on closure.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Page History user-facing copy no longer exposes `autosave`.
2. API/domain revision kind remains backward compatible.
3. Existing restore/discard behavior is unchanged.
