# TASK-471-02: Block Center Self-Alignment Fix
# FileName: TASK-471-02-Block-Center-Self-Alignment-Fix.md

**Parent Task:** TASK-471
**Priority:** High
**Category:** Pages / Page Editor V2 / Renderer
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

---

## Topic

The Layout `align` control's `center` (and `right`) does not center/end the
**block box** within its space — the block reads as left/full-width. The owner
wants `center` to center the block relative to its available container space for
**every** block type. (`align` is already a universal block control applied to
every block frame — see Current State — so the defect is the centering CSS, not
control coverage.)

Root cause (verified): `align` is overloaded onto both the frame self-alignment
(`justify-self-*`) and inner `textAlign`, and the frame is force-stretched in its
grid track so `justify-self:center` cannot shrink-center it. This subtask
decouples block self-alignment from content alignment and makes centering robust.

## Current State (summary)

- `pageRendererV2.tsx:397-402` `pageBlockAlignmentClass` (`center→justify-self-center`).
- `pageRendererV2.tsx:391-395` `pageBlockWidthClass` (`full→w-full`).
- `pageRendererV2.tsx:582-593` `toPageBlockRenderProps` (always `max-w-full` +
  width + align classes).
- `pageRendererV2.tsx:507-514` `toPageBlockLayoutStyle` (`textAlign: style.align`).
- `align` is a **universal** block control on all block types
  (`getPageEditorControlsForTarget` → `pageUniversalBlockControls`,
  `pageEditorControlRegistry.ts:870-889`); typography-capable blocks present it in
  the Typography group, others (image/video/gallery/…) in the Layout panel. The
  align class is applied to **every** block frame, so the center defect is
  uniform — not media-specific.

## Executable Leaves

| ID | Leaf | Effort |
|----|------|--------|
| TASK-471-02-L01 | Decouple block self-alignment from content alignment + center for all block types | Medium |

## Dependencies / Notes

- Independent of 01/03/04. Shares `pageRendererV2.tsx` with TASK-469/470/471-03
  — sequence to avoid churn.

## Security / Testing / Docs

No API routes touched (renderer/control only). Detail + tests in the leaf;
rolled up by TASK-471-05.
