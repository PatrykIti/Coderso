# TASK-471-01: Extended Text Size Scale
# FileName: TASK-471-01-Extended-Text-Size-Scale.md

**Parent Task:** TASK-471
**Priority:** High
**Category:** Pages / Page Editor V2 / Typography
**Estimated Effort:** Small
**Dependencies:** TASK-424 (typography inspector)
**Status:** ✅ Done
**Completed:** 2026-06-22

---

## Topic

The Page V2 typography scale bottoms out at `sm` (0.875rem / 14px), so authors
cannot make text smaller than surrounding elements (captions, eyebrows, fine
print, badge labels). This subtask adds two smaller steps — `xs` (x-small,
0.75rem) and `2xs` (xx-small, 0.625rem) — to the Page V2 font-size scale, mirror
of the large end (`2xl`/`3xl` ↔ `2xs`).

The size control auto-derives its options from the enum, so the work is bounded
to the token/enum/CSS/label surfaces plus the a11y floor.

## Current State (summary)

- Enum + CSS map: `pageDocumentV2.ts:176-185, 248-257`.
- Token defaults + CSS vars: `core/services/theme/tokenTypes.ts`,
  `core/ui/theme/tokenCss.ts`.
- Control labels: `pageEditorControlUiModel.ts` (`pageEditorOptionLabelCatalog`).
- Control auto-derives from the enum: `pageEditorControlRegistry.ts:509-518`.

## Executable Leaves

| ID | Leaf | Effort |
|----|------|--------|
| TASK-471-01-L01 | Add `xs` / `2xs` scale steps end-to-end | Small |

## Dependencies / Notes

- Foundation for **TASK-471-04** (badge sizes). No dependency on 02/03.
- Post-block text scale (`inspectorSchemas.ts` `TEXT_SCALE_OPTIONS`) is separate;
  default is out of scope (decided in L01).

## Security / Testing / Docs

No API routes touched (token/enum/render only). Validation + docs are specified
in the leaf and rolled up by TASK-471-05.
