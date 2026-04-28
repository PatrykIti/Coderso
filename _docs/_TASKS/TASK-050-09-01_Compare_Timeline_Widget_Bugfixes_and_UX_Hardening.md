# TASK-050-09-01: Compare Timeline Widget Bugfixes and UX Hardening
# FileName: TASK-050-09-01_Compare_Timeline_Widget_Bugfixes_and_UX_Hardening.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-09, TASK-050-04  
**Status:** Done (2026-02-07)

---

## Overview

Hardening step for Compare Timeline widget before full Visual IA rebuild.
Goal: align model/runtime with `_docs/_WIDGETS/COMPARE_TIMELINE.md`, remove
editing friction in Wizard/Visual/Advanced, and stabilize segment/marker rules.

This task focuses on correctness and baseline UX. Final Visual-first IA and
Advanced cleanup are completed in `TASK-050-09-02`.

---

## Problems To Fix

1. Renderer is still too basic and does not fully reflect track segments and
   layout options from docs.
2. Wizard flow is incomplete for documented compare use case:
   - axis steps `3-6`,
   - markers for both tracks,
   - highlight segment toggle and target track.
3. Segment inputs can drift (invalid ranges, `from > to`, out-of-bounds step
   indexes) without deterministic normalization.
4. Track model lacks practical style/layout fields needed for visual parity
   (track spacing, label position, highlight label style).
5. Test coverage is too narrow to protect marker/segment behavior and payload
   compatibility.

---

## Product Decisions (for this task)

1. **Backward-compatible model expansion**:
   - additive fields only,
   - normalize legacy payloads at editor/runtime boundary.
2. **Wizard becomes complete quick setup**:
   - track labels,
   - step count,
   - markers A/B,
   - highlight baseline controls.
3. **Advanced remains broad in 09-01**:
   - full controls remain available while model stabilizes,
   - technical-only cleanup deferred to 09-02.
4. **Deterministic segment safety**:
   - clamp indexes to axis length,
   - enforce `from <= to`,
   - drop/repair invalid segments predictably.

---

## Scope

### A) Data model and schema hardening
- Extend compare timeline model with layout/style fields from docs:
  - `layout.trackSpacing`, `layout.labelPosition`
  - `style.highlightLabelStyle`
- Keep strict schema with safe defaults.

### B) Segment and marker normalization
- Normalize axis steps to range `3-6`.
- Validate and normalize track markers per axis length.
- Validate and normalize segments (`from`, `to`, optional `label`).

### C) Runtime rendering parity
- Render both variants with deterministic behavior:
  - `dual-track`
  - `dual-track-highlight`
- Render normalized highlight segments with style hooks.
- Respect track spacing and label position.

### D) Editor baseline improvements
- Wizard: full quick setup flow aligned to docs.
- Visual: practical marker/segment quick controls.
- Advanced: complete model controls for power users.

### E) Baseline test expansion
- Widget tests for schema/default/normalization.
- Renderer tests for highlight segments and layout options.
- UI tests for key wizard/visual/advanced fields.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/compareTimeline.tsx` | expand model + schema + defaults | additive + compatible |
| `core/widgets/core/compareTimeline.tsx` | add marker/segment normalization helpers | deterministic payload |
| `core/widgets/core/compareTimeline.tsx` | update runtime rendering | variants + spacing + labels |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | harden wizard flow | docs-complete setup |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | improve visual + advanced controls | baseline parity |
| `tests/unit/widgets/compareTimeline.test.tsx` | expand for schema/default/normalization | regression guard |
| `tests/unit/widgets/renderer.test.tsx` | add compare timeline runtime assertions | segments + layout |
| `tests/unit/ui/widget-template-editor.test.tsx` | add compare timeline editor assertions | integration guard |

---

## Acceptance Criteria

1. Compare Timeline model matches required v1 fields from docs.
2. Wizard supports complete first-pass compare setup without Advanced-only hacks.
3. Renderer reflects normalized markers/segments and variant behavior.
4. Existing saved compare blocks remain valid and render after update.
5. Dedicated tests protect schema + renderer + editor baseline.

---

## Testing Requirements

- Unit: schema validates markers, segments, and layout fields.
- Unit: normalization clamps invalid indexes and invalid ranges.
- Unit: renderer output changes with highlight variant and segment data.
- Unit/UI: wizard/visual/advanced field presence for compare editor.
- Run relevant suites:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/widgets/compareTimeline.test.tsx`
  - `bun test tests/unit/widgets/renderer.test.tsx`
  - `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required (after completion)

### Task and board
- Update status in this file to `Done (YYYY-MM-DD)`.
- Update `_docs/_TASKS/README.md`:
  - move `TASK-050-09-01` from **To Do/In Progress** to **Done**,
  - update Statistics counters.

### Widget docs
- Update `_docs/_WIDGETS/COMPARE_TIMELINE.md` with finalized 09-01 model and behavior notes.

### Cross-doc consistency
- Update `_docs/WIDGETS.md` only if generic widget summary changed.

### Changelog
- Add new entry file:
  - `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-compare-timeline-widget-bugfixes-and-ux-hardening.md`
- Add matching index row in `_docs/_CHANGELOG/README.md`.

---

## Out of Scope

- Full section-based Visual IA redesign.
- Advanced technical-only cleanup.
- Compare timeline preset system.
