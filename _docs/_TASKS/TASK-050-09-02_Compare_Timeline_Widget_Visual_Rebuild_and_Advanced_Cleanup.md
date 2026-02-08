# TASK-050-09-02: Compare Timeline Widget Visual Rebuild and Advanced Cleanup
# FileName: TASK-050-09-02_Compare_Timeline_Widget_Visual_Rebuild_and_Advanced_Cleanup.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-09-01  
**Status:** To Do

---

## Overview

Rebuild Compare Timeline editing UX to match Hero/Navigation/Footer/Timeline quality:
- Wizard remains minimal and onboarding-focused.
- Visual becomes primary editing surface for content + styling.
- Advanced becomes technical-only without duplicating day-to-day controls.

This task finalizes mode responsibilities and section-based Visual IA.

---

## UX Target (Mode Responsibilities)

### Wizard
- Minimal onboarding:
  - track labels,
  - axis step count,
  - marker baseline,
  - highlight mode on/off.
- No deep styling.

### Visual
- Main editing mode.
- Section-based IA with practical controls for compare storytelling.
- Widget-owned variant controls with descriptive cards (no generic duplicate).

### Advanced
- Technical controls only:
  - layout tokens,
  - normalization utilities,
  - expert-level raw fields.
- No duplicate content/style controls from Wizard/Visual.

---

## Scope

### A) Visual IA redesign (section-based)

Required sections:
1. Variant and compare structure
2. Axis steps and track labels
3. Markers and segment mapping
4. Highlight and guide styles
5. Colors and typography
6. Spacing and layout preview hints

Rules:
- show only relevant controls for selected variant,
- use pickers/selects/toggles where practical,
- avoid raw/ambiguous text inputs for normal editing.

### B) Variant ownership in Visual

- Compare Timeline should own variant controls in Visual.
- Generic Visual panel variant selector should be hidden by setting:
  `editorCapabilities.visualOwnsVariantSelection = true`.

### C) Advanced cleanup

- Remove standard content/style editing from Advanced.
- Keep technical-only scope: layout tokens and normalization tooling.

### D) Renderer and model finalization

- Finalize model shape consumed by section-based Visual.
- Preserve compatibility with previously saved compare blocks.
- Keep deterministic render output for both variants.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/compareTimeline.tsx` | add visual-owned variant capability | avoid duplicate selectors |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | verify generic variant selector suppression | capability-based |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | full section-based Visual IA | final UX |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | Advanced cleanup to technical-only | mode boundaries |
| `tests/unit/widgets/compareTimeline.test.tsx` | extend for final model/render behavior | legacy compatibility |
| `tests/unit/pageBuilder/visualPanel.test.tsx` | assert no duplicate variant controls | regression guard |
| `tests/unit/ui/widget-template-editor.test.tsx` | assert compare timeline visual sections | integration guard |

---

## Acceptance Criteria

1. Compare Timeline Visual is section-based and primary editing mode.
2. No duplicate variant selectors in Visual for Compare Timeline.
3. Advanced contains technical-only controls.
4. Runtime output remains deterministic and legacy-compatible.
5. Tests protect mode boundaries and variant ownership behavior.

---

## Testing Requirements

- Unit: schema/default compatibility tests (legacy + final payloads).
- Unit: renderer behavior tests for final segment/style options.
- Unit/UI: Visual section rendering and conditional controls.
- Unit/UI: no duplicate variant selector in Visual.
- Run relevant suites:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/widgets/compareTimeline.test.tsx`
  - `bun test tests/unit/pageBuilder/visualPanel.test.tsx`
  - `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required (after completion)

### Task and board
- Update status in this file to `Done (YYYY-MM-DD)`.
- Update `_docs/_TASKS/README.md`:
  - move `TASK-050-09-02` from **To Do** to **Done**,
  - update Statistics counters.

### Widget docs
- Update `_docs/_WIDGETS/COMPARE_TIMELINE.md`:
  - final Wizard/Visual/Advanced responsibilities,
  - final section map and data examples.

### Cross-doc consistency
- Update `_docs/WIDGETS.md` for mode responsibilities if needed.

### Changelog
- Add new entry file:
  - `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-compare-timeline-widget-visual-rebuild-and-advanced-cleanup.md`
- Add matching index row in `_docs/_CHANGELOG/README.md`.

---

## Out of Scope

- Rebuild of other widgets.
- Cross-widget preset engine.
