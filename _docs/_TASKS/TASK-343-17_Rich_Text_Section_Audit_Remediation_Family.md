# TASK-343-17: Rich Text Section Audit Remediation Family

# FileName: TASK-343-17_Rich_Text_Section_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + Rich Text Section + Editor UX + Renderer + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** To Do

---

## Overview

Close the Rich Text Section truthfulness drift where the Wizard hides real rich
text content, TOC/anchor generation ignores the section heading, and sanitizer
diagnostics under-report what the editor just did.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_RICH_TEXT_SECTION_WIDGET.md:136-145`
- `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx:670,701-752,1841-1962`
- `core/widgets/core/richTextSection.tsx:595-662,759-760,1068,1269-1319`

## Sub-Tasks

- [ ] Make Wizard preview show meaningful text for rich-text blocks instead of
  `"No paragraph text yet"`.
- [ ] Decide whether the section heading belongs in TOC/anchor generation and
  implement the documented behavior consistently.
- [ ] Surface real sanitizer activity in Visual/Advanced instead of near-always
  zero diagnostics.
- [ ] Add a visible drift signal when `body.html` and `body.blocks` diverge.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` | Fix Wizard preview text and sanitizer diagnostics UX. |
| `core/widgets/core/richTextSection.tsx` | Reconcile TOC/anchor rules and sanitized-drift reporting. |
| `tests/vitest/widgets/richTextSection.test.tsx` | Cover TOC/anchor and sanitizer output. |
| `tests/vitest/ui/rich-text-section-editor-wave.test.tsx` | Cover Wizard preview text and diagnostics truthfulness. |

## Implementation Pseudocode

```ts
function summarizeRichTextBlock(block: RichTextBlock) {
  const html = block.contentHtml?.trim();
  if (html) return stripHtmlToPreviewText(html);
  return block.content?.trim() || "No paragraph text yet";
}
```

## Regression Test Shape

- Wizard preview shows text for blocks backed by `contentHtml`.
- TOC behavior for the section heading is explicit and tested.
- Sanitizer diagnostics surface real rewritten/removed content events.

## Security Contract

No API routes are added. Sanitizer allowlist and safe-link policy must not
weaken.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_RICH_TEXT_SECTION_WIDGET.md`.
- Update `_docs/_WIDGETS/RICH_TEXT_SECTION.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Wizard no longer presents rich-text blocks as empty when they contain HTML.
- TOC and sanitizer diagnostics are explicit and trustworthy.

