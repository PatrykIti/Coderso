# TASK-418-02-L02: Block Selection Model And Layers Tree
# FileName: TASK-418-02-L02-Block-Selection-Model-And-Layers-Tree.md

**Parent Subtask:** TASK-418-02
**Priority:** High
**Category:** Admin UI / Pages
**Estimated Effort:** Large
**Dependencies:** TASK-418-02-L01
**Status:** ✅ Done
**Completed:** 2026-06-09

---

## Overview

Introduce a real selection model for sections and blocks. Clicking a block on
the canvas must select that block, the floating toolbar must describe the
selected target, layers must show section and block nodes, and assistant active
surface context must include the selected block id when relevant. Nested block
paths and server-revalidated `selectedBlockPath` hydration remain deferred to
`TASK-418-06-L02`, after the recursive block contract exists.

---

## Implementation Pseudocode

```ts
type PageEditorSelection =
  | { kind: "none" }
  | { kind: "section"; sectionId: string }
  | { kind: "block"; sectionId: string; blockId: string };

function selectSection(sectionId: string): PageEditorSelection {
  return { kind: "section", sectionId };
}

function selectBlock(sectionId: string, blockId: string): PageEditorSelection {
  return { kind: "block", sectionId, blockId };
}

function summarizeActiveSurface(document, selection) {
  return {
    selectedSectionId: selection.kind === "none" ? null : selection.sectionId,
    selectedBlockId: selection.kind === "block" ? selection.blockId : null,
    sections: summarizeSectionTree(document.sections)
  };
}
```

Expected data flow:

- Canvas clicks dispatch section/block selection without losing dirty state.
- Layers use the same tree selectors as canvas.
- Floating toolbar reads a normalized selected target descriptor.
- Existing typed content edits target the selected block when a block is
  selected; with only a section selected, they keep the current first-block
  fallback until registry-driven controls replace the panel.
- Assistant context receives selected block id and bounded section/block
  summaries; nested slot summaries are handled by `TASK-418-06-L02`.

Error handling:

- If selected target disappears after delete/reorder, fall back to nearest
  surviving section or no selection.
- Invalid block ids must not throw during render; show no selected block.

Regression-test shape:

- Clicking a block selects only that block.
- Toolbar label switches from section to block.
- Content editing patches the selected block, not an unrelated first block.
- Layers selects and scrolls to the same target.
- Assistant context includes selected block id.

---

## Security Contract

- **Endpoint visibility:** no new endpoint.
- **Auth model:** existing admin session for subsequent saves.
- **RBAC:** existing Pages permissions at route layer.
- **CSRF:** existing admin write CSRF behavior for saves.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** selection state is UI state only; persisted documents still
  normalize through the Pages owner.
- **Anti-abuse controls:** assistant context must not include secrets or
  unbounded raw block payloads.

---

## Testing Requirements

- Vitest UI tests for section/block selection and layers selection.
- Vitest assistant surface context test for selected block id.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if selection behavior becomes documented admin
  metadata.
- `_docs/ASSISTANT_SITE_BUILDER.md` if active surface docs mention Pages.

---

## Closeout

- Added PageEditor section/block selection state with canvas block click targets
  and top-level section/block rows in Layers.
- Floating toolbar labels now describe the selected block when one is active.
- Typed content edits now patch the selected block when selected, while keeping
  the section-only first-block fallback until registry-driven controls land.
- Assistant active page surface context now reports the valid selected block id
  instead of hardcoding `null`.
- `selectedBlockPath` and nested slot paths remain deferred to `TASK-418-06-L02`.
- Fresh read-only subagent confirmation `019eae49-d28f-7371-9164-4e1ad1e3e17a`
  reported no remaining High, Medium, or Low L02 drift before implementation.
  Claude confirmation was attempted, but the obsolete long-running process was
  terminated after the clean subagent confirmation and local contract checks.

Validation:

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
  - Passed: 10 tests.
- `bun --cwd core lint:types`
  - Passed.
- `bun --cwd core lint`
  - Passed.
