# TASK-282-03: Rich Text Structured Blocks Rich Content and Scale UX

# FileName: TASK-282-03_Structured_Blocks_Rich_Content_and_Scale_UX.md

**Priority:** High
**Category:** Widgets + Content + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-282, TASK-282-01, TASK-282-02
**Status:** Done (2026-05-21)

---

## Overview

Upgrade Rich Text Section structured fallback blocks so they can carry safe rich
content and can be managed without accidental data loss or unusable long lists.

This leaf covers KOD-03, KOD-04, KOD-15, and KOD-16. KOD-06 stays classified
in TASK-282-07 as a not-a-bug closure note after these block semantics land.

## Scope Boundary

In scope:

- Safe rich content in `body.blocks[].content`, using the same sanitizer/output
  policy chosen in TASK-282-02.
- Optional bounded block heading level or hierarchy metadata if needed for TOC
  and semantic output.
- Recoverable or confirmed destructive actions for count reductions and block
  removal.
- Scalable editing for up to `richTextBlockMax` blocks via collapse, paging, or
  focused expanded-row state.

Out of scope:

- Generic repeatable-item editor framework changes for every widget.
- Drag-and-drop infrastructure unless existing widget-local reorder helpers can
  be reused without shared-contract work.
- Inline media model, owned by TASK-282-05.

## Sub-Tasks

- [x] Extend `RichTextSectionBlock` only as needed for safe rich content and
  heading hierarchy, preserving legacy `{ id, heading, content }`.
- [x] Add a single block-to-HTML renderer helper that handles heading level,
  rich content, legacy plain text, escaping, and sanitizer reuse.
- [x] Replace destructive `Blocks count` truncation with a confirm/undo flow or
  non-destructive "mark extra blocks inactive" decision.
- [x] Add a recoverable remove action for individual blocks.
- [x] Add collapsed rows, current-block focus, or pagination for large block
  counts, while preserving keyboard move up/down actions.
- [x] Ensure TOC output from block mode remains deterministic and documented.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/richTextSection.tsx` | Replace `renderBlocksAsHtml()` plain-text-only logic with a safe rich block renderer and optional heading-level normalization. Preserve stable ids and cap block count. |
| `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` | Add rich block content controls, destructive-action confirmation/undo, and scalable large-list UI. |
| `tests/vitest/widgets/richTextSection.test.tsx` | Add rich block render, legacy plain text, heading hierarchy, TOC, sanitizer, and bounds assertions. |
| `tests/vitest/ui/rich-text-section-editor-wave.test.tsx` | Add block remove/count confirmation, undo/cancel, large-list, and rich block authoring assertions. |
| `tests/unit/widgets/validator.test.ts` | Run/update if block schema fields change. |

## Implementation Pseudocode

Block render helper:

```ts
type RichTextBlockHeadingLevel = 2 | 3 | 4;

function renderRichTextBlockAsHtml(block: RichTextSectionBlock) {
  const level = resolveRichTextBlockHeadingLevel(block.headingLevel);
  const heading = normalizeOptionalString(block.heading);
  const body = renderRichTextBlockContent(block);

  return [
    heading ? `<h${level}>${escapeHtml(heading)}</h${level}>` : "",
    body,
  ].join("");
}
```

Destructive count flow:

```tsx
function requestBlockCount(nextCount: number) {
  if (nextCount < blocks.length) {
    setPendingBlockCount(nextCount);
    return;
  }
  setBlocksCount(value, onChange, nextCount);
}

function confirmBlockCountReduction() {
  setBlocksCount(value, onChange, pendingBlockCount);
  setUndoSnapshot(blocks);
}
```

Large-list state:

```tsx
const visibleBlocks = blocks.slice(pageStart, pageStart + blockPageSize);
const expandedId = selectedBlockId ?? visibleBlocks[0]?.id;
```

Regression test shape:

```ts
test("legacy plain-text block content still renders as escaped paragraphs with line breaks", ...);
test("rich block content sanitizes and renders safe formatting plus bounded heading levels", ...);
test("count reduction requires confirmation and undo restores the exact previous block array", ...);
test("large block sets collapse or page instead of rendering all 20 editors expanded at once", ...);
```

## Error Handling

- Unknown heading levels normalize to the default chosen for legacy content.
- Legacy plain `content` strings render exactly as before unless the user edits
  them with the rich editor.
- Failed rich-content parsing falls back to escaped plain text.
- Count reduction cancel leaves all blocks untouched.
- Undo restores the exact normalized block array captured before removal.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: any new block field must be explicit in
  `richTextSectionSchema`.
- Input bounds: block count, heading length, rich content length, link length,
  rendered node count, and undo snapshot size must be bounded.
- Anti-abuse: rich block content must not allow raw scripts, unsafe hrefs,
  iframes, event handlers, or unbounded embeds.
- Secret handling: undo/diagnostic state must stay local to the editor and not
  expose private values in widget JSON or report evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- touched post rich-text Vitest lanes if the block editor reuses those helpers
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or committing it
  independently
- If committed independently, also run root `bun run lint`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/RICH_TEXT_SECTION.md` with structured block rich
  content, heading hierarchy, and destructive-action behavior.
- Update `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md` rows KOD-03,
  KOD-04, KOD-15, and KOD-16 after validation.

## Changelog Policy

- Covered by the TASK-282 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Structured blocks can express safe rich content without losing legacy text.
- Reducing/removing blocks is confirmed, undoable, or otherwise recoverable.
- Editing 20 blocks remains usable and keyboard-accessible.
- Block-mode TOC and heading output are deterministic and tested.
