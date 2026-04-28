# TASK-050-08-02: Timeline Widget Visual Rebuild and Advanced Cleanup
# FileName: TASK-050-08-02_Timeline_Widget_Visual_Rebuild_and_Advanced_Cleanup.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-08-01  
**Status:** Done (2026-02-07)

---

## Overview

Rebuild Timeline editing UX to match Hero/Navigation/Footer quality:
- Wizard stays minimal and onboarding-focused.
- Visual becomes primary editing surface for content + styling.
- Advanced becomes technical-only without duplicating day-to-day fields.

This task finalizes Timeline UX architecture and mode boundaries.

---

## UX Target (Mode Responsibilities)

### Wizard
- Minimal onboarding:
  - timeline goal/template starter (optional),
  - step count,
  - variant,
  - orientation,
  - guides baseline.
- No deep styling.

### Visual
- Main mode for editors.
- Section-based IA with practical content + visual controls.
- Variant selection with descriptive cards only (no duplicate generic picker).

### Advanced
- Technical controls only:
  - layout tokens,
  - spacing fine-tuning,
  - responsive behavior,
  - raw expert toggles (if needed).
- No duplicate content/style controls from Wizard/Visual.

---

## Scope

### A) Visual IA redesign (section-based)

Required sections:
1. Variant and timeline structure
2. Steps content and order
3. Guides and axis line
4. Markers and accents
5. Colors and background
6. Typography and spacing

Rules:
- Show only relevant fields for selected variant and orientation.
- Prefer friendly controls (pickers/selects/toggles) over raw text fields.

### B) Variant ownership in Visual

- Timeline should own variant controls in Visual.
- Generic Visual panel variant selector should be hidden via
  `editorCapabilities.visualOwnsVariantSelection = true`.

### C) Advanced cleanup

- Remove standard content/style editing from Advanced.
- Keep only technical/expert controls.

### D) Renderer and model finalization

- Finalize model shape consumed by Visual controls.
- Preserve compatibility for previously saved blocks.
- Keep deterministic rendering for all variant/orientation combinations.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/timeline.tsx` | add visual-owned variant capability | avoid duplicate selectors |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | ensure generic variant selector is hidden | capability-based |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | full section-based Visual IA | final UX |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | Advanced cleanup to technical-only | mode responsibility |
| `tests/unit/widgets/timeline.test.tsx` | extend for final model/render behavior | legacy compatibility |
| `tests/unit/pageBuilder/visualPanel.test.tsx` | assert no duplicate variant controls | regression guard |
| `tests/unit/ui/widget-template-editor.test.tsx` | assert Timeline Visual sections | integration guard |

---

## Acceptance Criteria

1. Timeline Visual is section-based and primary editing mode.
2. No duplicate variant selectors in Visual for Timeline.
3. Advanced contains technical controls only.
4. Runtime output remains deterministic and compatible with old payloads.
5. Tests protect mode boundaries and variant control behavior.

---

## Testing Requirements

- Unit: schema/default compatibility tests (legacy + final payloads).
- Unit: renderer behavior tests for final style/layout options.
- Unit/UI: Visual section rendering and conditional fields.
- Unit/UI: no duplicate variant selector in Visual.
- Run relevant suites:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/widgets/timeline.test.tsx`
  - `bun test tests/unit/pageBuilder/visualPanel.test.tsx`
  - `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required (after completion)

### Task and board
- Update status in this file to `Done (YYYY-MM-DD)`.
- Update `_docs/_TASKS/README.md`:
  - move `TASK-050-08-02` from **To Do** to **Done**,
  - update Statistics counters.

### Widget docs
- Update `_docs/_WIDGETS/TIMELINE.md`:
  - final Wizard/Visual/Advanced responsibilities,
  - final field matrix and examples.

### Cross-doc consistency
- Update `_docs/WIDGETS.md` for mode responsibilities if needed.

### Changelog
- Add new entry file:
  - `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-timeline-widget-visual-rebuild-and-advanced-cleanup.md`
- Add matching index row in `_docs/_CHANGELOG/README.md`.

---

## Out of Scope

- Rebuild of Compare Timeline widget.
- Cross-widget preset engine.
