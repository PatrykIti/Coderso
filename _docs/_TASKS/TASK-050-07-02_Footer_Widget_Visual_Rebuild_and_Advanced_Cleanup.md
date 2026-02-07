# TASK-050-07-02: Footer Widget Visual Rebuild and Advanced Cleanup
# FileName: TASK-050-07-02_Footer_Widget_Visual_Rebuild_and_Advanced_Cleanup.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-07-01  
**Status:** To Do

---

## Overview

Rebuild Footer editing UX to match Hero/Navigation quality:
- Wizard remains minimal and onboarding-focused.
- Visual becomes the primary editing surface for real content and styling.
- Advanced is technical-only (layout/visibility/expert controls), without
  duplicating day-to-day content/style fields.

This task delivers final WordPress-like Footer editing flow.

---

## UX Target (Mode Responsibilities)

### Wizard
- Minimal onboarding:
  - variant,
  - column strategy (2/3/minimal),
  - legal basics,
  - social on/off.
- Safe defaults, no deep styling.

### Visual
- Main mode for editors.
- Section-based structure with practical content and style controls.
- Variant selection with descriptive cards only (no duplicate generic picker).

### Advanced
- Technical controls only:
  - spacing/layout tokens,
  - visibility/device toggles,
  - expert behavior switches (if needed).
- No duplicate content/style fields from Wizard/Visual.

---

## Scope

### A) Visual IA redesign (section-based)

Required sections:
1. Variant and structure
2. Columns and links
3. Legal strip
4. Social links and icon style
5. Colors and borders
6. Typography and spacing
7. Slots overview and insertion hints

Rules:
- Field visibility depends on active variant and enabled footer regions.
- Use friendly controls (pickers/selects/toggles), avoid raw text-only inputs
  where practical.

### B) Variant ownership in Visual

- Footer should own variant selection in its editor (same approach as Hero and
  Navigation).
- Generic Visual panel must not render duplicate variant selector when Footer
  capability indicates visual-owned variants.

### C) Advanced cleanup

- Move content/style editing out of Advanced.
- Keep only technical controls:
  - container/layout tokens,
  - spacing/margins,
  - responsive visibility,
  - expert-only flags.

### D) Renderer and data shape finalization

- Finalize Footer data shape required by Visual controls.
- Ensure renderer consumes final model deterministically.
- Preserve compatibility for previously saved Footer blocks.

### E) Optional quality add-ons (if capacity allows)

- Built-in quick style presets (non-persistent).
- Per-column collapse behavior on mobile.

---

## Data Model Finalization Target

Additive and compatibility-safe shape (final target):
- `columns[]`: title + links + optional per-column style token hooks.
- `legal`: copyright + optional privacy/terms labels/hrefs.
- `social[]`: type/platform + href + optional label.
- `layout`: width/alignment/spacing tokens.
- `style`: surface/border/text/link/legal/social tokenized style fields.
- `slots`: `column-1`, `column-2`, `column-3`, `bottom` (already from 07-01).

If new keys are introduced:
- update schema/defaults,
- update renderer mapping,
- update tests and docs.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/types.ts` | ensure Footer can declare visual-owned variant capability | reuse Hero/Navigation pattern |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | hide generic variant picker when Footer owns variants | no duplicate controls |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | full section-based Visual rebuild | final IA |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | Advanced cleanup | technical-only scope |
| `core/widgets/core/footer.tsx` | finalize schema/defaults for final editor contract | additive and compatible |
| `core/widgets/core/footer.tsx` | finalize renderer mapping for style/layout fields | deterministic output |
| `tests/unit/widgets/footer.test.tsx` | extend with final model tests | legacy payload compatibility |
| `tests/unit/pageBuilder/visualPanel.test.tsx` | assert no duplicate variant controls for Footer | regression guard |
| `tests/unit/ui/widget-template-editor.test.tsx` | assert Footer Visual sections in template builder | integration guard |

---

## Acceptance Criteria

1. Footer Visual has section-based IA and is the primary editing mode.
2. No duplicate variant selectors for Footer.
3. Advanced contains only technical fields.
4. Renderer reflects final Footer style/layout model.
5. Existing Footer blocks still validate and render after upgrade.

---

## Testing Requirements

- Unit: schema/default compatibility tests (legacy + new payloads).
- Unit: renderer tests for final style/layout fields and slot behavior.
- Unit/UI: Visual section rendering and conditional field visibility.
- Unit/UI: no duplicate variant selectors in Visual.
- Run relevant suites:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/widgets/footer.test.tsx`
  - `bun test tests/unit/pageBuilder/visualPanel.test.tsx`
  - `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required (after completion)

### Task and board
- Update status in this file to `Done (YYYY-MM-DD)`.
- Update `_docs/_TASKS/README.md`:
  - move `TASK-050-07-02` from **To Do** to **Done**,
  - update Statistics counters.

### Widget docs
- Update `_docs/_WIDGETS/FOOTER.md`:
  - final Wizard/Visual/Advanced scope,
  - field matrix and slot behavior,
  - final examples for columns + bottom strip.

### Cross-doc consistency
- Update `_docs/WIDGETS.md`:
  - mode responsibilities and Footer-specific behavior.
- Update `_docs/PAGE_MODEL.md` if Footer block schema changed.
- Update `_docs/CMS_API.md` only if payload contracts changed.

### Changelog
- Add new entry file:
  - `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-footer-widget-visual-rebuild-and-advanced-cleanup.md`
- Add matching index row in `_docs/_CHANGELOG/README.md`.

---

## Out of Scope

- Rebuild of non-Footer widgets.
- Global cross-widget preset engine.
- Theme token architecture redesign outside Footer widget scope.
