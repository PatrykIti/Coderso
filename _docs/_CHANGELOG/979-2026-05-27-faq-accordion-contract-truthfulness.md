# 979 - FAQ Accordion contract truthfulness

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-339, TASK-339-07

## Key Changes

- Synchronized the FAQ Accordion widget contract to the richer sectioned editor
  UI already shipping in Wizard, Visual, and Advanced.
- Upgraded FAQ Wizard from a static summary into a one-time layout and starter
  count seed so the setup flow now matches the Hero ownership pattern more
  closely.
- Cleaned the remaining FAQ Hero-parity drift by treating theme tokens as
  `Theme default`, adding FAQ palette presets plus contrast guidance, and
  expanding Advanced with read-only accessibility and contract diagnostics.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts`
- Claude Playwright snapshot review returned `NO BLOCKERS`
