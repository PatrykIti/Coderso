# TASK-050-11-01: Contact Widget Bugfixes and UX Hardening
# FileName: TASK-050-11-01_Contact_Widget_Bugfixes_and_UX_Hardening.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-11, TASK-050-04  
**Status:** Done (2026-02-08)

---

## Overview

Hardening step for Contact widget before full Visual IA rebuild.
Goal: align runtime + editor behavior with `_docs/_WIDGETS/CONTACT.md`,
remove editing friction, and ensure deterministic rendering for all variants.

This task focuses on correctness and practical UX reliability.
Section-based Visual IA and Advanced cleanup are delivered in
`TASK-050-11-02`.

---

## Problems To Fix

1. Runtime renderer ignores selected variant and always uses one fixed two-column
   layout.
2. Map settings are not respected in runtime (toggle and embed URL do not produce
   dedicated map output).
3. Data model is incomplete versus docs:
   - missing `form.required`,
   - missing style branch (`spacing`, `background`, `columns`),
   - no field-level normalization for allowed form fields.
4. Wizard flow is not aligned with v1 onboarding sequence
   (layout -> fields -> contact details).
5. Visual mode currently covers only a subset of contact/map controls and lacks
   practical field selection UX.
6. Advanced mode depends on comma-separated raw text for form fields, which is
   error-prone and not user-friendly.
7. Contact widget has no dedicated unit test file, so regressions are not
   protected.

---

## Product Decisions (for this task)

1. **Backwards compatibility first**:
   - additive schema changes only,
   - normalize legacy payloads at runtime/editor boundaries.
2. **Canonical form field set**:
   - allowed fields: `name`, `email`, `phone`, `message`,
   - remove duplicates and unknown values during normalization.
3. **Wizard provides complete safe quick setup**:
   - variant,
   - form field selection,
   - contact details baseline.
4. **Visual and Advanced stay broad in 11-01**:
   - enough controls for parity and reliability,
   - strict mode-boundary cleanup deferred to 11-02.
5. **Map rendering is explicit and guarded**:
   - render map only when enabled and embed source is valid.

---

## Scope

### A) Data model and schema hardening
- Extend `ContactData` to include:
  - `form.required`,
  - `style.spacing`, `style.background`, `style.columns`.
- Add strict schema guards for allowed form fields.
- Keep schema additive and compatible with existing saved blocks.

### B) Runtime rendering parity
- Implement deterministic variant rendering:
  - `form-left`: form left, contact details right,
  - `form-right`: details left, form right,
  - `minimal`: contact details-focused layout with optional map and no form.
- Respect selected fields and required flags.
- Respect map visibility and embed source.
- Apply style tokens (spacing/background/columns) in runtime.

### C) Wizard and baseline editor fixes
- Wizard follows documented v1 flow.
- Visual and Advanced expose enough controls to edit new fields in 11-01 scope.
- Prefer toggles/selects/checklists over free-text parsing for common actions.

### D) Baseline tests
- Create/expand widget unit tests for schema/defaults/render.
- Add renderer assertions for variant output and map behavior.
- Add integration checks for editor field presence in template block settings.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/contact.tsx` | expand data model + schema + defaults | additive + compatible |
| `core/widgets/core/contact.tsx` | add normalization helpers | allowed fields + required rules |
| `core/widgets/core/contact.tsx` | implement deterministic variant rendering | variant + map + style parity |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | harden Wizard to v1 flow | onboarding quality |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | baseline Visual/Advanced parity | no IA rebuild yet |
| `tests/unit/widgets/contact.test.tsx` | create/expand tests | schema/defaults/render |
| `tests/unit/widgets/renderer.test.tsx` | add Contact runtime assertions | variants + map behavior |
| `tests/unit/ui/widget-template-editor.test.tsx` | add Contact editor integration assertions | baseline coverage |

---

## Acceptance Criteria

1. Contact model matches v1 fields required for 11-01 parity.
2. Wizard follows documented quick setup path.
3. Renderer output changes correctly by selected variant.
4. Map render follows `map.enabled` and valid embed source.
5. Legacy Contact payloads remain valid after normalization.
6. Dedicated Contact tests protect schema + renderer + editor baseline.

---

## Testing Requirements

- Unit: schema validates form fields, required flags, map settings, and style fields.
- Unit: renderer respects variant and map behavior.
- Unit/UI: editor exposes required fields in Wizard/Visual/Advanced.
- Run relevant suites:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/widgets/contact.test.tsx`
  - `bun test tests/unit/widgets/renderer.test.tsx`
  - `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required (after completion)

### Task and board
- Update `_docs/_TASKS/README.md`:
  - move `TASK-050-11-01` from **To Do** to **Done**,
  - update Statistics counters.

### Widget docs
- Update `_docs/_WIDGETS/CONTACT.md` with finalized 11-01 field matrix.

### Cross-doc consistency
- Update `_docs/WIDGETS.md` only if generic widget summary changes.

### Changelog
- Add new entry file:
  - `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-contact-widget-bugfixes-and-ux-hardening.md`
- Add matching index row in `_docs/_CHANGELOG/README.md`.

---

## Out of Scope

- Full section-based Visual IA redesign.
- Advanced technical-only cleanup.
- Cross-widget preset engine.
