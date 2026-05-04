# TASK-244-02: Hero, Shared Color Fields, and Background Clear Controls

# FileName: TASK-244-02_Hero_Shared_Color_Fields_and_Background_Clear_Controls.md

**Priority:** High
**Category:** Widgets + Hero + Editor Controls
**Estimated Effort:** Large
**Dependencies:** TASK-244-01-01, TASK-244-01-02
**Status:** Done (2026-04-30)

---

## Overview

Fix the most visible surface-clear issue first: Hero background gradient,
background-related controls, media overlay, and style-owned Hero CTA button
backgrounds. Use this work to establish reusable editor patterns for
color/background clear buttons without widening into unrelated token work.

## Sub-Tasks

- [x] TASK-244-02-01: Hero Gradient, Background, and Media Overlay Clear
- [x] TASK-244-02-02: Shared Clear Field Controls and Section No-Regression
- [x] TASK-244-02-03: Section Background Color Clear

## Files to Change

- `core/widgets/core/hero.tsx`
- `core/admin/ui/widgets/editors/HeroEditors.tsx`
- shared editor helpers only if they avoid repeated clear-button logic without
  adding runtime coupling
- `core/widgets/core/section.tsx`
- `core/admin/ui/widgets/editors/SectionEditors.tsx`
- `tests/vitest/widgets/section.test.tsx`
- `tests/vitest/ui/section-editor-wave.test.tsx`

## Implementation Order

1. Add Hero clear behavior for background gradient.
2. Add clear behavior for background color, media overlay, and primary/secondary
   button background fields where they are user-editable style values.
3. Ensure runtime omits `backgroundImage`, overlay DOM, and cleared inline style
   output.
4. Extract small editor helper components only after Hero behavior is proven.
5. Add Section background-color clear behavior without changing
   empty-gradient/zero-overlay behavior.
6. Add Section no-regression coverage if shared helpers touch additional
   Section controls.

## Security Contract

- Visibility:
  - admin Hero/shared editor controls are internal admin UI;
  - rendered Hero/Section output remains public page/runtime output.
- Auth model:
  - no new endpoint is introduced;
  - edits keep the existing authenticated admin page/template save flow.
  - existing admin writes remain session-authenticated; API-key scope is not
    applicable because this subtask does not introduce an internal API-key mode.
- RBAC:
  - unchanged existing page/template/widget-template write permissions.
- CSRF:
  - unchanged existing admin save calls and CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - Hero/background/media/style schemas must accept clear omission while still
    rejecting unknown keys.
  - Section `style.backgroundColor` must remain owned by the strict Section
    schema and reject unknown style keys.
- Anti-abuse:
  - no public write surface is added;
  - nonce, signature/HMAC, and reCAPTCHA are not applicable because no public
    write endpoint is added.
  - gradient, overlay, and color values must not be interpolated into dynamic
    class names from user input.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx tests/vitest/ui/section-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/_WIDGETS/SECTION.md`
- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md` status only when this subtask moves state

## Acceptance Criteria

1. Hero gradient can be cleared from the editor.
2. Clear removes Hero background and CTA style fields from emitted widget data.
3. Hero runtime does not render cleared gradient/background/overlay/button
   background output.
4. Section background color can be cleared without writing `"transparent"` or an
   empty-string off-state sentinel.
5. Section empty-gradient and zero-overlay behavior remains stable.
