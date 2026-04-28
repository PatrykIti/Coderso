# TASK-063-16-05: Section Paragraph Quote Div Alias Normalization
# FileName: TASK-063-16-05_Section_Paragraph_Quote_Div_Alias_Normalization.md

**Priority:** High  
**Category:** Admin/UI + Editor Core  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-16  
**Status:** Done (2026-03-02)

---

## Overview
Ensure `Section` paragraph/quote commands work even when the contentEditable surface emits `<div>` wrappers (browser default), by normalizing `div` as a paragraph alias in the editor selection and command engine path.

---

## Sub-Tasks
1. Normalize editor block tags: treat `div` as `p` in the command engine and selection logic.
2. Ensure paragraph command replaces `div` with `p` instead of no-op when alias matches.
3. Add unit coverage for block tag normalization behavior.

---

## Implementation Notes / Pseudocode
- Add `normalizePostRichTextBlockTag(tagName)` mapping `div -> p` in `postRichTextCommandEngine.ts` and reuse it for block tag resolution.
- In `applyTagToBlock`, if `currentTag === targetTag` but the actual element is `div`, replace it with the target tag to normalize DOM.
- Extend `PostRichTextAdapter` block selector to include `div` in `editorBlockTagSet`.

---

## Testing Requirements
- `bun test tests/unit/posts/post-richtext-command-engine.test.ts`
- `bun test tests/integration/ui/post-editor-section-paragraph-quote-nodes.test.tsx`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
