# TASK-050-10-02: Newsletter Widget Visual Rebuild and Advanced Cleanup
# FileName: TASK-050-10-02_Newsletter_Widget_Visual_Rebuild_and_Advanced_Cleanup.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-10-01  
**Status:** Done (2026-02-08)

---

## Overview

Rebuild Newsletter editing UX to match Hero/Navigation/Footer/Timeline/Compare
Timeline quality:
- Wizard remains minimal and onboarding-focused.
- Visual becomes primary editing surface for content + styling.
- Advanced becomes technical-only without duplicating daily controls.

This task finalizes Newsletter mode responsibilities and section-based Visual IA.

---

## UX Target (Mode Responsibilities)

### Wizard
- Minimal onboarding:
  - variant,
  - title/description,
  - submit label,
  - consent baseline.
- No deep styling or integration complexity.

### Visual
- Main editing mode.
- Section-based IA with practical controls for content and subscription UX.
- Widget-owned variant controls with descriptive cards (no generic duplicate).

### Advanced
- Technical controls only:
  - integration endpoint mode/details,
  - normalization and fallback behavior,
  - expert-level structural fields.
- No duplicate content/style controls from Wizard/Visual.

---

## Scope

### A) Visual IA redesign (section-based)

Required sections:
1. Variant and form structure
2. Content and copy
3. Consent and submit behavior
4. Integration target
5. Colors and emphasis
6. Spacing and alignment

Rules:
- show only relevant controls for selected variant and integration mode,
- prefer pickers/selects/toggles,
- avoid ambiguous text-only controls for normal editing.

### B) Variant ownership in Visual

- Newsletter should own variant controls in Visual.
- Generic Visual panel variant selector should be hidden by setting:
  `editorCapabilities.visualOwnsVariantSelection = true`.

### C) Advanced cleanup

- Remove standard content/style editing from Advanced.
- Keep technical-only scope: integration tokens, normalization actions, expert metadata.

### D) Renderer and model finalization

- Finalize model shape consumed by section-based Visual.
- Preserve compatibility with previously saved newsletter blocks.
- Keep deterministic render output for all variants.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/newsletter.tsx` | add visual-owned variant capability | avoid duplicate selectors |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | verify generic variant selector suppression | capability-based |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | full section-based Visual IA | final UX |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | Advanced cleanup to technical-only | mode boundaries |
| `tests/unit/widgets/newsletter.test.tsx` | extend for final model/render behavior | legacy compatibility |
| `tests/unit/pageBuilder/visualPanel.test.tsx` | assert no duplicate variant controls | regression guard |
| `tests/unit/ui/widget-template-editor.test.tsx` | assert Newsletter Visual sections | integration guard |

---

## Acceptance Criteria

1. Newsletter Visual is section-based and primary editing mode.
2. No duplicate variant selectors in Visual for Newsletter.
3. Advanced contains technical-only controls.
4. Runtime output remains deterministic and legacy-compatible.
5. Tests protect mode boundaries and variant ownership behavior.

---

## Testing Requirements

- Unit: schema/default compatibility tests (legacy + final payloads).
- Unit: renderer behavior tests for variant, consent, and integration mode.
- Unit/UI: Visual section rendering and conditional controls.
- Unit/UI: no duplicate variant selector in Visual.
- Run relevant suites:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/widgets/newsletter.test.tsx`
  - `bun test tests/unit/pageBuilder/visualPanel.test.tsx`
  - `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required (after completion)

### Task and board
- Update status in this file to `Done (YYYY-MM-DD)`.
- Update `_docs/_TASKS/README.md`:
  - move `TASK-050-10-02` from **To Do** to **Done**,
  - update Statistics counters.

### Widget docs
- Update `_docs/_WIDGETS/NEWSLETTER.md`:
  - final Wizard/Visual/Advanced responsibilities,
  - final section map and data examples.

### Cross-doc consistency
- Update `_docs/WIDGETS.md` for mode responsibilities if needed.

### Changelog
- Add new entry file:
  - `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-newsletter-widget-visual-rebuild-and-advanced-cleanup.md`
- Add matching index row in `_docs/_CHANGELOG/README.md`.

---

## Out of Scope

- Rebuild of Contact widget.
- Cross-widget preset engine.
