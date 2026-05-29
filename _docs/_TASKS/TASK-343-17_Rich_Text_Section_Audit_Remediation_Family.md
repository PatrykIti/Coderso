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
diagnostics under-report what the editor just did. The same report also routes
inert embed aspect controls and sanitizer shadowing to this family.

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
- [ ] Hide, disable, or explain embed aspect-ratio controls while embeds render
  only as link cards.
- [ ] Preserve or surface `href_rewritten` and other sanitizer events that are
  currently shadowed by the upstream editor serializer.
- [ ] Route report notes N2/N4/N6 explicitly as local fixes or documented
  product decisions; do not leave them implicit behind the sanitizer/TOC work.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` | Fix Wizard preview text, embed-aspect truthfulness, and sanitizer diagnostics UX. |
| `core/widgets/core/richTextSection.tsx` | Reconcile TOC/anchor rules, embed rendering summaries, and sanitized-drift reporting. |
| `tests/vitest/widgets/richTextSection.test.tsx` | Cover TOC/anchor, embed aspect semantics, and sanitizer output. |
| `tests/vitest/ui/rich-text-section-editor-wave.test.tsx` | Cover Wizard preview text, sanitizer guidance persistence, and diagnostics truthfulness. |

## Implementation Pseudocode

```ts
function summarizeRichTextBlock(block: RichTextBlock) {
  const html = block.contentHtml?.trim();
  if (html) return stripHtmlToPreviewText(html);
  return block.content?.trim() || "No paragraph text yet";
}

function resolveEmbedAspectControl(renderMode: RichTextEmbedRenderMode) {
  return renderMode === "link-card" ? { enabled: false, reason: "link-card" } : { enabled: true };
}
```

## Regression Test Shape

- Wizard preview shows text for blocks backed by `contentHtml`.
- The Wizard regression must seed `contentHtml` (for example
  `<p>Alpha</p>`) and expect stripped preview text, not only seed plain
  `content`.
- TOC behavior for the section heading is explicit and tested.
- Sanitizer diagnostics surface real rewritten/removed content events.
- Embed aspect-ratio controls do not appear writable when the renderer cannot
  express their value.

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
- Sanitizer feedback is not silently lost across Visual/Advanced boundaries.
