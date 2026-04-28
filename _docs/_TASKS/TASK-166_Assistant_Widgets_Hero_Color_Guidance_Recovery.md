# TASK-166: Assistant Widgets Hero Color Guidance Recovery
# FileName: TASK-166_Assistant_Widgets_Hero_Color_Guidance_Recovery.md

**Priority:** High  
**Category:** Docs/Assistant  
**Estimated Effort:** Small  
**Dependencies:** TASK-118, TASK-127, TASK-165  
**Status:** Done (2026-03-22)

---

## Overview

Restore precise assistant guidance for Hero color configuration after the widget
docs split and stale-doc cleanup.

The observed regression is that `Where can I configure Hero widget colors?`
falls back to clarification or generic `Widget Library` guidance because the
canonical split `Widget Template Editor` doc no longer carries enough
Hero-specific `Details > Block Settings > Visual` language to dominate same-area
retrieval.

## Sub-Tasks

1. Enrich the canonical widget template editor doc with explicit Hero
   color/background guidance on the current shipped UI path.
2. Keep the document explicit about `Settings` vs `Details` ownership so block
   styling and template-wide layout are not conflated.
3. Add retrieval regression coverage with a competing `Widget Library` hit from
   the same product area.
4. Sync task board and changelog.

## Testing Requirements

- `bun run vitest run tests/vitest/assistant/docsDbRetriever.test.ts`
- `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts`

## Documentation Updates Required

- `docs/coderso/widget-template-editor.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Completion Notes (2026-03-22)

- Added Hero-specific configuration language to the canonical split
  `Widget Template Editor` doc, including `Details > Block Settings > Visual`
  and `Colors and Borders` / `Background`.
- Added a retriever regression test that keeps `Widget Template Editor` ahead of
  `Widget Library` for Hero color questions within the same product area.
- Synced task board and changelog.
