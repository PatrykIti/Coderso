# TASK-050-11-02: Contact Widget Visual Rebuild and Advanced Cleanup
# FileName: TASK-050-11-02_Contact_Widget_Visual_Rebuild_and_Advanced_Cleanup.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-11-01  
**Status:** Done (2026-02-08)

---

## Overview

Rebuild Contact editing UX to match Hero/Navigation/Footer/Timeline/Compare
Timeline/Newsletter quality:
- Wizard remains minimal and onboarding-focused.
- Visual becomes primary editing surface for content + style.
- Advanced becomes technical-only without duplicating daily controls.

This task finalizes Contact mode responsibilities and section-based Visual IA.

---

## UX Target (Mode Responsibilities)

### Wizard
- Minimal onboarding:
  - variant,
  - form field selection,
  - contact details baseline.
- No deep styling or technical map/source complexity.

### Visual
- Main editing mode.
- Section-based IA with practical controls for content, map, and style.
- Widget-owned variant controls with descriptive cards (no generic duplicate).

### Advanced
- Technical controls only:
  - fallback and normalization metadata,
  - technical embed/source details,
  - expert-level structural fields and tokens.
- No duplicate content/style controls from Wizard/Visual.

---

## Scope

### A) Visual IA redesign (section-based)

Required sections:
1. Variant and layout structure
2. Form fields and required rules
3. Contact details and business info
4. Map source and display behavior
5. Colors, borders, and surface styling
6. Spacing and columns

Rules:
- show only relevant controls for selected variant and map mode,
- prefer checkboxes/toggles/selects/pickers over raw text where possible,
- keep labels/help text explicit and user-friendly.

### B) Variant ownership in Visual

- Contact should own variant controls in Visual.
- Generic Visual panel variant selector should be hidden by setting:
  `editorCapabilities.visualOwnsVariantSelection = true`.

### C) Advanced cleanup

- Remove standard content/style editing from Advanced.
- Keep technical-only scope: source fallbacks, normalization actions, expert metadata.

### D) Renderer and model finalization

- Finalize model shape consumed by section-based Visual.
- Preserve compatibility with previously saved contact blocks.
- Keep deterministic render output for all variants.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/contact.tsx` | add visual-owned variant capability | avoid duplicate selectors |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | verify generic variant selector suppression | capability-based |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | full section-based Visual IA | final UX |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Advanced cleanup to technical-only | mode boundaries |
| `tests/unit/widgets/contact.test.tsx` | extend for final model/render behavior | legacy compatibility |
| `tests/unit/pageBuilder/visualPanel.test.tsx` | assert no duplicate variant controls | regression guard |
| `tests/unit/ui/widget-template-editor.test.tsx` | assert Contact Visual sections | integration guard |

---

## Acceptance Criteria

1. Contact Visual is section-based and primary editing mode.
2. No duplicate variant selectors in Visual for Contact.
3. Advanced contains technical-only controls.
4. Runtime output remains deterministic and legacy-compatible.
5. Tests protect mode boundaries and variant ownership behavior.

---

## Testing Requirements

- Unit: schema/default compatibility tests (legacy + final payloads).
- Unit: renderer behavior tests for variant, required fields, and map visibility.
- Unit/UI: Visual section rendering and conditional controls.
- Unit/UI: no duplicate variant selector in Visual.
- Run relevant suites:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/widgets/contact.test.tsx`
  - `bun test tests/unit/pageBuilder/visualPanel.test.tsx`
  - `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required (after completion)

### Task and board
- Update status in this file to `Done (YYYY-MM-DD)`.
- Update `_docs/_TASKS/README.md`:
  - move `TASK-050-11-02` from **To Do** to **Done**,
  - update Statistics counters.

### Widget docs
- Update `_docs/_WIDGETS/CONTACT.md`:
  - final Wizard/Visual/Advanced responsibilities,
  - final section map and data examples.

### Cross-doc consistency
- Update `_docs/WIDGETS.md` for mode responsibilities if needed.

### Changelog
- Add new entry file:
  - `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-contact-widget-visual-rebuild-and-advanced-cleanup.md`
- Add matching index row in `_docs/_CHANGELOG/README.md`.

---

## Out of Scope

- Rebuild of unrelated widgets.
- Cross-widget preset engine.
