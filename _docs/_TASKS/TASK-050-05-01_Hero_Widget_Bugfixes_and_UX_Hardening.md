# TASK-050-05-01: Hero Widget Bugfixes and UX Hardening
# FileName: TASK-050-05-01_Hero_Widget_Bugfixes_and_UX_Hardening.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-05, TASK-050-04  
**Status:** To Do

---

## Overview

Follow-up hardening task for Hero widget after TASK-050-05.
Goal: remove high-friction editing bugs in Wizard/Visual and align UX behavior
with what users see in live preview.

This task is focused on **stability + UX correctness**, not on full IA redesign
of Visual/Advanced (handled by TASK-050-05-02).

---

## Problems To Fix

1. In Wizard, selecting `image` + `media library` can momentarily show the chosen
   asset and then fall back to empty state (`No media selected yet.`).
2. In `centered` variant, media choice is unclear for users because no visible
   media output appears in preview.
3. In Visual, CTA wording can be misleading when the block is in single-CTA mode
   (secondary fields shown as the only actionable CTA editor).
4. Slot summary text (`Hero Content`, count `0`) is technically correct but
   semantically unclear: users read it as "slot missing" instead of "empty slot".

---

## Product Decisions (for this task)

1. **Wizard media persistence is deterministic**:
   - selecting a media library asset must keep `assetId` and resolved `src`
     stable in block data and in picker preview.
   - async media metadata lookup must not overwrite newer user selections.

2. **Centered + media behavior is explicit**:
   - if variant is `centered` and media type is `image`, render it as hero
     background image (with existing background controls still available).
   - if variant is `centered` and media type is `video`, show a clear helper in
     editor and auto-switch to `split` only after explicit user confirmation.

3. **Single CTA wording is consistent**:
   - Visual labels reflect actual active CTA role (`Primary CTA` in single mode).

4. **Slot counter copy is clarified**:
   - show "Hero Content slot" + "0 items" + helper "Slot is available and empty".

---

## Scope

### A) Wizard bugfixes
- Fix media picker state flow for Hero media library source.
- Prevent stale async updates from resetting selected media.
- Ensure preview updates immediately and stays consistent after selection.

### B) Centered variant media UX
- Implement centered-image rendering path in `HeroBlock`.
- Add helper copy for centered-video behavior in editor.
- Keep schema compatibility (no breaking change to existing saved Hero blocks).

### C) Visual UX correctness
- Adjust CTA labels to match single/dual mode semantics.
- Keep current Visual structure for now (full rebuild is TASK-050-05-02).

### D) Slot summary clarity
- Update slot summary copy in builder details to distinguish:
  - slot availability
  - number of inserted blocks.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | fix media source update flow | no stale async overwrite; stable `assetId/src` |
| `core/admin/ui/media/MediaPicker.tsx` | improve selected state UX | avoid false empty-state flicker while selected IDs resolve |
| `core/widgets/core/hero.tsx` | add centered-image rendering path | deterministic behavior for `centered` + image |
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | correct CTA labels in Visual | single vs dual copy consistency |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | update slot summary microcopy | clarify `0` means empty slot |
| `tests/unit/widgets/hero.test.tsx` | add centered-media regression tests | image in centered + no data loss |
| `tests/unit/ui/widget-template-editor.test.tsx` | assert slot summary text | UX wording regression guard |
| `tests/unit/ui/media-picker.test.tsx` | add picker persistence test | selected item remains visible |

---

## Acceptance Criteria

1. Selecting a media asset in Hero Wizard keeps it selected after dialog close,
   rerender, and metadata fetch completion.
2. In `centered` variant with image media, preview visibly changes (background).
3. In Visual single-CTA mode, labels do not mention secondary CTA as primary edit path.
4. Slot summary clearly communicates empty slot availability when count is zero.
5. Existing Hero blocks created before this task still render without migration errors.

---

## Testing Requirements

- Unit: Hero editor media state update flow (including async lookup race).
- Unit: Hero renderer for centered image behavior.
- Unit/UI: Slot summary copy semantics.
- Unit/UI: MediaPicker selected-item persistence.
- Run relevant suites:
  - `bun test tests/unit/widgets/hero.test.tsx`
  - `bun test tests/unit/ui/media-picker.test.tsx tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required (after completion)

### Task and board
- Update status in this file to `Done (YYYY-MM-DD)`.
- Update `_docs/_TASKS/README.md`:
  - move TASK-050-05-01 row from **To Do** to **Done**
  - update Statistics counters.

### Widget docs
- Update `_docs/_WIDGETS/HERO.md`:
  - clarify centered media behavior
  - clarify CTA label semantics in Visual mode.

### Cross-doc consistency
- Update `_docs/WIDGETS.md` if any mode responsibilities or slot UX wording changed.
- Update `_docs/PAGE_MODEL.md` only if data shape changed (not required if behavior-only).

### Changelog
- Add new entry file:
  - `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-hero-widget-bugfixes-and-ux-hardening.md`
- Add matching index row in `_docs/_CHANGELOG/README.md`.

---

## Out of Scope

- Full Visual IA rebuild and preset system.
- Full Advanced cleanup and complete style-control parity.
- New reusable color-token architecture for all widgets.

(These are handled in TASK-050-05-02.)
