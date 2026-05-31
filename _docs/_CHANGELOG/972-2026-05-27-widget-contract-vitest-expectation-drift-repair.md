# 972 - Widget contract Vitest expectation drift repair

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-338

## Key Changes

- Repaired the failing full `bun run test:vitest` lane by aligning stale
  Template Section, Hero, Footer, Newsletter, Section, and Split Layout
  assertions with the current widget-contract and editor-ownership model.
- Updated the broad widget-editor smoke coverage so `TemplateSection` now checks
  the live Visual/Advanced summaries instead of retired raw payload or
  Wizard-only error expectations.
- Removed duplicate broad-smoke variant callback expectations for `PostsFeed`
  and `ContentList`, leaving the focused editor-wave suites as the single owner
  of those variant interaction contracts.
- Kept runtime behavior unchanged: the repair is limited to test expectations,
  task tracking, and changelog synchronization.

## Validation

- `bun run test:vitest -- tests/vitest/ui/widget-editors-wave-1.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/renderer.test.tsx`
- `bun run test:vitest`
