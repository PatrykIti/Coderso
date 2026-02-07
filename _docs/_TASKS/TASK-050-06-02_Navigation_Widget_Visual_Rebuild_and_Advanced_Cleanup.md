# TASK-050-06-02: Navigation Widget Visual Rebuild and Advanced Cleanup
# FileName: TASK-050-06-02_Navigation_Widget_Visual_Rebuild_and_Advanced_Cleanup.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-06-01  
**Status:** To Do

---

## Overview

Rebuild Navigation editing UX to match the Hero quality bar:
- Wizard remains minimal.
- Visual becomes the primary editing surface for real content and style.
- Advanced is technical-only (layout/visibility/expert controls) without
  duplicating day-to-day content/style controls.

This task delivers final WordPress-like Navigation editing flow.

---

## UX Target (Mode Responsibilities)

### Wizard
- Minimal onboarding:
  - variant
  - source of links (manual/menu)
  - logo type
  - CTA on/off
- Safe defaults, no deep styling.

### Visual
- Main mode for editors.
- Section-based structure with all practical content/style controls.
- Variant selection with descriptive cards only (no duplicate generic picker).

### Advanced
- Technical controls only:
  - spacing/layout tokens
  - visibility/device toggles
  - optional expert behavior fields
- No duplicate content fields from Wizard/Visual.

---

## Scope

### A) Visual IA redesign (section-based)

Required sections:
1. Variant and structure
2. Brand and logo
3. Navigation links
4. CTA and right actions
5. Mobile behavior
6. Colors, borders, typography
7. Surface/background behavior

Rules:
- Field visibility depends on active variant and selected navigation source.
- Use friendly controls (pickers/selects/toggles), avoid raw-only inputs where possible.

### B) Variant ownership in Visual

- Navigation should own variant selection in its editor (same direction as Hero).
- Generic Visual panel should not render duplicate horizontal selector when
  widget capability says Visual owns variants.

### C) Advanced cleanup

- Move content/style fields out of Advanced.
- Keep technical controls only:
  - alignment/spacing tokens
  - sticky/collapse behavior toggles
  - responsive visibility and technical flags.

### D) Renderer and data shape alignment

- Finalize Navigation data shape needed by Visual controls.
- Ensure renderer consumes the final model deterministically.
- Preserve backward compatibility for existing blocks.

### E) Optional quality add-ons (if capacity allows)

- Quick style presets (built-in, non-persistent) for nav appearance.
- Validation guardrails for invalid/missing href values.

---

## Data Model Expansion (finalization target)

Potential finalized shape (additive, compatibility-safe):
- `logo`: text/image + alt + optional link
- `items`: label/href + optional nested children
- `cta`: optional label/href + style fields
- `behavior`: sticky/transparent/collapseOnScroll + mobile mode
- `layout`: alignment/spacing/content width
- `style`: text/link/button/surface/border colors and typography tokens

If new keys are introduced:
- update schema/defaults
- update renderer mapping
- update tests and docs.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/types.ts` | ensure `editorCapabilities` supports Navigation visual ownership | reuse Hero approach |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | hide generic variant picker when Navigation owns variants | no duplicate controls |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | full section-based Visual rebuild | final IA |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Advanced cleanup | technical-only scope |
| `core/widgets/core/navigation.tsx` | finalize schema/defaults | align with final editor contract |
| `core/widgets/core/navigation.tsx` | renderer mapping for final style/behavior fields | deterministic output |
| `core/admin/ui/media/MediaPicker.tsx` | reuse for logo image workflows if needed | avoid custom picker logic |
| `tests/unit/widgets/navigation.test.tsx` | extend with final style/behavior model tests | backward compatibility included |
| `tests/unit/pageBuilder/visualPanel.test.tsx` | assert no duplicate variant controls for Navigation | regression guard |
| `tests/unit/ui/widget-template-editor.test.tsx` | assert Navigation editor sections render in template builder | integration-level guard |

---

## Acceptance Criteria

1. Navigation Visual has section-based IA and is primary editing mode.
2. No duplicate variant selectors for Navigation.
3. Advanced contains only technical fields and no duplicate content/style editors.
4. Renderer reflects final Navigation style/behavior model.
5. Existing Navigation blocks still validate and render after upgrade.

---

## Testing Requirements

- Unit: schema/defaults compatibility tests (legacy + new payloads).
- Unit: renderer tests for final behavior/style fields.
- Unit/UI: Visual section rendering and conditional field visibility.
- Unit/UI: no duplicate variant selectors in Visual.
- Run relevant suites:
  - `bun test tests/unit/widgets/navigation.test.tsx`
  - `bun test tests/unit/pageBuilder/visualPanel.test.tsx`
  - `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required (after completion)

### Task and board
- Update status in this file to `Done (YYYY-MM-DD)`.
- Update `_docs/_TASKS/README.md`:
  - move TASK-050-06-02 from **To Do** to **Done**
  - update Statistics counters.

### Widget docs
- Update `_docs/_WIDGETS/NAVIGATION.md`:
  - final Wizard/Visual/Advanced scope
  - final field matrix and variant behavior
  - examples for right slot + nested links.

### Cross-doc consistency
- Update `_docs/WIDGETS.md`:
  - mode responsibilities and Navigation-specific behavior.
- Update `_docs/PAGE_MODEL.md` if Navigation block schema changed.
- Update `_docs/CMS_API.md` only if payload contracts changed.

### Changelog
- Add new entry file:
  - `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-navigation-widget-visual-rebuild-and-advanced-cleanup.md`
- Add matching index row in `_docs/_CHANGELOG/README.md`.

---

## Out of Scope

- Rebuild of non-Navigation widgets.
- Cross-widget global preset management system.
- Theme token architecture redesign outside Navigation widget scope.
