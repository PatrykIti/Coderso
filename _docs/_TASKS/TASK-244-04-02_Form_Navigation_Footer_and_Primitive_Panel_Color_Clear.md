# TASK-244-04-02: Form, Navigation, Footer, and Primitive Panel Color Clear

# FileName: TASK-244-04-02_Form_Navigation_Footer_and_Primitive_Panel_Color_Clear.md

**Priority:** High
**Category:** Widgets + Forms + Shell + Panels
**Estimated Effort:** Large
**Dependencies:** TASK-244-04
**Status:** To Do

---

## Overview

Add clear controls and runtime output omission for form widgets, global shell
widgets, and primitive panel widgets with forced or configurable backgrounds.

Target widgets:

- `contact`
- `newsletter`
- `form-embed`
- `navigation`
- `footer`
- `accordion`
- `tabs`
- `toggle-block`

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/contact.tsx`
- `core/widgets/core/newsletter.tsx`
- `core/widgets/core/formEmbed.tsx`
- `core/widgets/core/navigation.tsx`
- `core/widgets/core/footer.tsx`
- `core/widgets/core/accordion.tsx`
- `core/widgets/core/tabs.tsx`
- `core/widgets/core/toggleBlock.tsx`
- matching editor files under `core/admin/ui/widgets/editors/`
- matching runtime/editor tests
- `_docs/WIDGETS.md`
- impacted `_docs/_WIDGETS/*.md`

## Implementation Notes

Navigation already has a transparent behavior mode. Do not replace that product
behavior. Add clear semantics only for style-owned color/background fields such
as CTA background or shell surface fields where the user can currently configure
a value but cannot clear it.

For forms, keep input readability and accessibility intact. Clearing a surface
must not make focus rings, labels, error messages, or submit controls unusable.

For primitive panel widgets, preserve state semantics:

- `accordion.surfaceColor`
- `tabs.surfaceColor`
- `tabs.activeBackgroundColor`
- `tabs.panelBackgroundColor`
- `toggleBlock.surfaceColor`
- `toggleBlock` accent backgrounds where style-owned

## Implementation Pseudocode

```ts
const rootStyle = compactStyle({
  backgroundColor: resolveClearableStyleValue(style.background),
});

const ctaStyle = compactStyle({
  backgroundColor: resolveClearableStyleValue(style.ctaBackgroundColor),
  color: resolveClearableStyleValue(style.ctaTextColor),
  borderColor: resolveClearableStyleValue(style.ctaBorderColor),
});
```

For widgets currently using class-only backgrounds, introduce a style field only
where it maps to user-facing control.

```tsx
<section className={joinClasses("rounded-xl border p-5", hasClearedSurface ? undefined : "bg-[var(--color-bg)]/95")} />
```

When cleared, prefer no background class and no inline background style.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx tests/vitest/widgets/newsletter.test.tsx tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/widgets/tabs.test.tsx tests/vitest/widgets/toggleBlock.test.tsx`
- Matching editor-wave tests:
  - `tests/vitest/ui/contact-editor-wave.test.tsx`
  - `tests/vitest/ui/newsletter-editor-wave.test.tsx`
  - `tests/vitest/ui/form-embed-editor-wave.test.tsx`
  - `tests/vitest/ui/navigation-editor-wave.test.tsx`
  - `tests/vitest/ui/footer-editor-wave.test.tsx`
  - `tests/vitest/ui/accordion-editor-wave.test.tsx`
  - `tests/vitest/ui/tabs-editor-wave.test.tsx`
  - `tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- impacted `_docs/_WIDGETS/*.md`
- `_docs/_TASKS/README.md` status only when this leaf moves state

## Acceptance Criteria

1. Form widget backgrounds/surfaces can be cleared without breaking inputs.
2. Navigation/footer style-owned backgrounds can be cleared without changing
   route or menu behavior.
3. Primitive panel widget surfaces can be cleared while preserving active/state
   semantics.
4. Runtime/editor tests prove clear removes saved fields and rendered output.
