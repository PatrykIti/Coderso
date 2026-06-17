# TASK-469: Pages Editor Rich-Text Inline Canvas Edit Fidelity
# FileName: TASK-469_Pages_Editor_Rich_Text_Inline_Canvas_Edit_Fidelity.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-422, TASK-438
**Status:** ⏳ To Do

---

## Overview

Carried-forward residual from the audit follow-up closure
(`_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §9.4 item 1; originally §3.4).

Inline canvas editing of rich-text blocks (text/heading/quote/statistic/
button label) is **lossy**: editing a block in place on the canvas surfaces the
raw HTML source and the commit path strips all markup
(`stripInlineMarkup` in `core/services/pages/pageInlineEditContract.ts`), while
the floating-panel "Primary text" / content field preserves the rich markup.
Result: the same block edited on the canvas vs in the panel diverges, and
inline edits flatten `format: "rich"` content to plain text.

Goal: inline canvas edit must round-trip formatting consistently with the panel
field — bold/italic/links survive an inline edit — using the same sanitized
rich-text contract the front renderer already enforces
(`sanitizeAuthoringRichTextHtml` → `renderSanitizedRichTextHtml`, no
`dangerouslySetInnerHTML`).

---

## Sub-Tasks

- [ ] Reproduce the lossy round-trip (inline edit a `format:"rich"` block, confirm markup is stripped on commit while the panel field keeps it).
- [ ] Reconcile the inline commit path with the panel commit path so both persist the same sanitized rich markup.
- [ ] Add regression coverage asserting inline-edit round-trips bold/italic/link without flattening.

---

## Testing Requirements

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` entry on completion
- Reconcile `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §9.4 residual status on closure.
