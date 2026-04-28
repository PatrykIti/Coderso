# TASK-050-08-01: Timeline Widget Bugfixes and UX Hardening
# FileName: TASK-050-08-01_Timeline_Widget_Bugfixes_and_UX_Hardening.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-08, TASK-050-04  
**Status:** Done (2026-02-07)

---

## Overview

Hardening step for Timeline widget before full Visual IA rebuild.
Goal: align runtime + editor behavior with `_docs/_WIDGETS/TIMELINE.md`, remove
editing friction, and ensure deterministic rendering for variants and layout
options.

This task targets correctness and practical usability. Full Visual-first
information architecture and Advanced cleanup are finalized in `TASK-050-08-02`.

---

## Problems To Fix

1. Timeline renderer ignores `variant` and most layout/style fields.
2. Wizard does not support documented onboarding flow (step count 3-8,
   orientation, label position, guide toggle).
3. Timeline steps have no stable IDs, increasing render churn and edit risk.
4. Step metadata is incomplete against docs (missing `accent`).
5. Data model lacks full style/layout controls documented for v1:
   - `layout.spacing`
   - `style.thickness`
   - `style.backgroundColor`
6. Current test coverage is minimal and does not protect variant rendering or
   orientation/label behavior.

---

## Product Decisions (for this task)

1. **Backwards compatibility first**:
   - additive schema changes only,
   - normalize legacy steps at runtime/editor boundaries.
2. **Wizard becomes complete quick setup**:
   - steps count,
   - variant,
   - orientation,
   - label position,
   - guides on/off.
3. **Visual remains lightweight in 08-01**:
   - practical style controls,
   - no full IA overhaul yet.
4. **Advanced remains broad in 08-01**:
   - keep full controls for now,
   - cleanup to technical-only deferred to 08-02.

---

## Scope

### A) Data model and schema hardening
- Extend `TimelineStep` with optional `id` and `accent`.
- Extend layout/style with documented tokens:
  - `layout.spacing`
  - `style.thickness`
  - `style.backgroundColor`
- Keep schema strict (`additionalProperties: false`) with safe defaults.

### B) Deterministic step normalization
- Ensure 3-8 steps in wizard flow.
- Generate stable IDs for placeholder/generated steps.
- Keep existing user-entered titles/descriptions/icons when resizing step count.

### C) Runtime rendering parity
- Implement variant-specific rendering semantics:
  - `milestones`
  - `cards`
  - `compact`
- Respect orientation + label position in output.
- Apply guides, line style, marker size, and thickness.

### D) Baseline editor improvements
- Wizard implements full documented quick flow.
- Visual provides key style controls relevant to visible output.
- Advanced exposes complete model fields for power users.

### E) Test baseline expansion
- Widget tests: schema/defaults/normalization and variant rendering hints.
- Renderer tests: orientation and label-position behavior.
- UI tests: wizard/visual/advanced field presence.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/timeline.tsx` | expand data model + schema + defaults | additive + compatible |
| `core/widgets/core/timeline.tsx` | add normalization helpers for steps | stable IDs and safe count |
| `core/widgets/core/timeline.tsx` | implement variant-aware renderer | orientation/labels/guides |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | harden Wizard flow to v1 | steps count + layout basics |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | expand Visual + Advanced controls | parity with model |
| `tests/unit/widgets/timeline.test.tsx` | extend tests for schema/defaults/normalization | regression guard |
| `tests/unit/widgets/renderer.test.tsx` | add Timeline runtime assertions | orientation/labels |
| `tests/unit/ui/widget-template-editor.test.tsx` | add Timeline editor integration assertions | section/field presence |

---

## Acceptance Criteria

1. Timeline data model matches v1 fields required by docs.
2. Wizard supports steps count, variant, orientation, label position, and guides.
3. Renderer visibly changes output by variant and respects orientation/labels.
4. Existing Timeline blocks remain valid after migration.
5. Timeline has dedicated tests covering schema + renderer + editor baseline.

---

## Testing Requirements

- Unit: schema validates `accent`, spacing, thickness, background color.
- Unit: step normalization keeps stable IDs and valid count range.
- Unit: renderer output differs for variants and orientation/label options.
- Unit/UI: editor shows required controls in Wizard/Visual/Advanced.
- Run relevant suites:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/widgets/timeline.test.tsx`
  - `bun test tests/unit/widgets/renderer.test.tsx`
  - `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required (after completion)

### Task and board
- Update `_docs/_TASKS/README.md`:
  - move `TASK-050-08-01` from **In Progress** to **Done**,
  - update Statistics counters.

### Widget docs
- Update `_docs/_WIDGETS/TIMELINE.md` with final 08-01 field matrix and notes.

### Cross-doc consistency
- Update `_docs/WIDGETS.md` only if generic widget summary changes.

### Changelog
- Add new entry file:
  - `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-timeline-widget-bugfixes-and-ux-hardening.md`
- Add matching index row in `_docs/_CHANGELOG/README.md`.

---

## Out of Scope

- Full section-based Visual IA redesign.
- Advanced technical-only cleanup.
- Timeline preset system.
