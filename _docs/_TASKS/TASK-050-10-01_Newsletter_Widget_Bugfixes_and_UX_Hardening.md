# TASK-050-10-01: Newsletter Widget Bugfixes and UX Hardening
# FileName: TASK-050-10-01_Newsletter_Widget_Bugfixes_and_UX_Hardening.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-10, TASK-050-04  
**Status:** To Do

---

## Overview

Hardening step for Newsletter widget before full Visual IA rebuild.
Goal: align runtime + editor behavior with `_docs/_WIDGETS/NEWSLETTER.md`,
remove editing friction, and ensure deterministic rendering for all variants.

This task focuses on correctness and practical UX reliability.
Section-based Visual IA and Advanced cleanup are completed in
`TASK-050-10-02`.

---

## Problems To Fix

1. Runtime renderer does not actually implement variant-specific layouts
   (`inline` / `stacked` / `minimal`) in a deterministic way.
2. Data model is incomplete versus docs:
   - missing `consent.required`,
   - missing integration branch (`webhookId`),
   - missing style controls (`spacing`, `alignment`, `background`).
3. Wizard flow is not aligned with v1 onboarding sequence
   (variant + title/description + button label + consent baseline).
4. Integration UX is ambiguous (single `actionUrl` only, no mode separation).
5. Newsletter widget has no dedicated unit test file, so regressions are not
   protected.

---

## Product Decisions (for this task)

1. **Backwards compatibility first**:
   - additive schema changes only,
   - normalize legacy payloads at runtime/editor boundaries.
2. **Wizard provides complete safe quick setup**:
   - variant,
   - title + description,
   - submit label,
   - consent on/off + short label.
3. **Visual and Advanced stay broad in 10-01**:
   - enough controls for parity,
   - strict mode-boundary cleanup deferred to 10-02.
4. **Integration model supports two routes**:
   - `actionUrl` for external form handlers,
   - `webhookId` for local/system webhook wiring.

---

## Scope

### A) Data model and schema hardening
- Extend `NewsletterData` to include:
  - `consent.required`,
  - `integration.mode` + `integration.webhookId`,
  - `style.spacing`, `style.alignment`, `style.background`.
- Keep strict schema with safe defaults and additive compatibility.

### B) Runtime rendering parity
- Implement deterministic variant rendering:
  - `inline`: input + button row,
  - `stacked`: input over button,
  - `minimal`: compact content-first layout.
- Respect consent visibility and required state.
- Apply style tokens (alignment/spacing/background).

### C) Wizard and baseline editor fixes
- Wizard follows documented v1 flow.
- Visual and Advanced expose enough controls to edit new fields.
- Keep UI user-friendly (toggles/selects/pickers over raw free-text where possible).

### D) Baseline tests
- Create/expand widget unit tests for schema/defaults/render.
- Add renderer assertions for variant output and consent behavior.
- Add integration checks for editor field presence in template block settings.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/newsletter.tsx` | expand data model + schema + defaults | additive + compatible |
| `core/widgets/core/newsletter.tsx` | add normalization helpers | safe payload handling |
| `core/widgets/core/newsletter.tsx` | implement deterministic variant rendering | consent + style parity |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | harden Wizard to v1 flow | onboarding quality |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | baseline Visual/Advanced parity | no IA rebuild yet |
| `tests/unit/widgets/newsletter.test.tsx` | create/expand tests | schema/defaults/render |
| `tests/unit/widgets/renderer.test.tsx` | add Newsletter runtime assertions | variant + consent behavior |
| `tests/unit/ui/widget-template-editor.test.tsx` | add Newsletter editor integration assertions | baseline coverage |

---

## Acceptance Criteria

1. Newsletter model matches v1 fields required for 10-01 parity.
2. Wizard follows documented quick setup path.
3. Renderer output changes correctly by variant and consent state.
4. Legacy Newsletter payloads remain valid after normalization.
5. Dedicated Newsletter tests protect schema + renderer + editor baseline.

---

## Testing Requirements

- Unit: schema validates consent + integration + style fields.
- Unit: renderer respects variant and consent behavior.
- Unit/UI: editor exposes required fields in Wizard/Visual/Advanced.
- Run relevant suites:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/widgets/newsletter.test.tsx`
  - `bun test tests/unit/widgets/renderer.test.tsx`
  - `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required (after completion)

### Task and board
- Update `_docs/_TASKS/README.md`:
  - move `TASK-050-10-01` from **To Do** to **Done**,
  - update Statistics counters.

### Widget docs
- Update `_docs/_WIDGETS/NEWSLETTER.md` with finalized 10-01 field matrix.

### Cross-doc consistency
- Update `_docs/WIDGETS.md` only if generic widget summary changes.

### Changelog
- Add new entry file:
  - `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-newsletter-widget-bugfixes-and-ux-hardening.md`
- Add matching index row in `_docs/_CHANGELOG/README.md`.

---

## Out of Scope

- Full section-based Visual IA redesign.
- Advanced technical-only cleanup.
- Cross-widget preset engine.
