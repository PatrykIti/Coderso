# 975 - Contact hero color parity

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-339, TASK-339-03

## Key Changes

- Rebuilt the Contact widget color and surface controls to follow the same
  daily authoring approach as Hero instead of a smaller surface-only subset.
- Added palette quick-apply plus explicit heading, supporting-text, submit
  button, and bounded radius controls so Contact can tune its text and action
  hierarchy without raw CSS inputs.
- Expanded the widget-owned runtime style contract so the new Contact editor
  controls actually render on the frontend, including text, button, and radius
  fields.
- Corrected theme-default state handling for Contact color rows so `Clear`
  behaves like Hero and only activates after a real override exists.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/widgets/contact.test.tsx tests/vitest/ui/shared-color-control.test.tsx`
- Claude Playwright snapshot review returned `NO BLOCKERS`
