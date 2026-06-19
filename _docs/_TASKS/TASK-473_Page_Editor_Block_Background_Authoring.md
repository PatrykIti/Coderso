# TASK-473: Page Editor Block Background Authoring
# FileName: TASK-473_Page_Editor_Block_Background_Authoring.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Background
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Block background authoring is half-wired:

1. **Gradient** backgrounds are stored as a raw CSS string the author must paste;
   there is no visual gradient editor.
2. **Background image** is allowed by the block schema (`backgroundType`) but has
   no media picker for blocks (only sections expose one), so the image type is
   unusable from the UI.

Add a visual gradient editor and wire block background image, reusing the
existing gradient sanitizer and the section media-URL policy. Additive and
backward-compatible.

---

## Scope & Sub-Tasks

| ID | Title | Priority | Effort | Summary |
|----|-------|----------|--------|---------|
| TASK-473-01 | Visual Gradient Editor | Medium | Medium | Compose a safe gradient (stops + direction) from a visual control instead of pasting raw CSS. |
| TASK-473-02 | Block Background Image Wiring | Medium | Medium | Add a block-level background-image media control and paint it, reusing the section media-URL policy. |

---

## Security Contract (task-level)

- No new endpoints. Gradient strings stay behind the existing gradient sanitizer
  (`toGradientBackground` / `escapeAuthoringCssString`); background image URLs go
  through the shared media-URL policy/sanitizer. No `url()`/`expression()`
  injection beyond the media-URL sink. Admin session + existing perms/CSRF.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-xss-guards.test.tsx`
- `bun --cwd core lint` / `bun --cwd core lint:types`
- Closure: live `playwright-cli` smoke (gradient + bg image on a block render on
  the front).

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`, `_docs/SECURITY_SPEC.md` (gradient/media sinks).
- `_docs/_TASKS/README.md` (board + statistics), `_docs/_CHANGELOG/` on
  completion.
