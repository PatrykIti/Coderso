# TASK-474: Page Editor Editing Session History And Clipboard
# FileName: TASK-474_Page_Editor_Editing_Session_History_And_Clipboard.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Editing UX
**Estimated Effort:** Medium
**Dependencies:** TASK-454 (dirty-state / autosave guard — coordinate)
**Status:** ⏳ To Do

---

## Overview

Two power-user editing baselines are missing from the Page Editor:

1. **Undo/redo** within a session (`Cmd+Z` / `Cmd+Shift+Z`) — there is none;
   accidental edits can only be recovered by reloading.
2. **Copy/paste** of blocks and sections — only `Cmd+D` (duplicate in place)
   exists; authors cannot move blocks across pages.

Both must respect the existing dirty-state/autosave contract (TASK-454) and the
schema-first normalization boundary.

---

## Scope & Sub-Tasks

| ID | Title | Priority | Effort | Summary |
|----|-------|----------|--------|---------|
| TASK-474-01 | Editor Session Undo/Redo | Medium | Medium | Bounded in-session history stack + `Cmd+Z`/`Cmd+Shift+Z`, reset on save/publish/load. |
| TASK-474-02 | Copy/Paste Blocks And Sections | Medium | Medium | `Cmd+C`/`Cmd+V` (+ palette) serialize/insert blocks/sections; paste re-normalizes untrusted input + regenerates ids. |

---

## Security Contract (task-level)

- No new endpoints. Clipboard payloads carry only page block/section JSON (no
  secrets). **Paste is untrusted input**: it must pass the same
  normalize/sanitize path as any persisted document before insertion, with
  regenerated ids. Admin session + existing perms/CSRF unchanged.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun run test:vitest` (mutation/normalization helpers)
- `bun --cwd core lint` / `bun --cwd core lint:types`
- Closure: live `playwright-cli` smoke (undo a delete; copy a section, paste into
  another page).

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` / editor docs (history + clipboard behavior).
- `_docs/_TASKS/README.md` (board + statistics), `_docs/_CHANGELOG/` on
  completion.
