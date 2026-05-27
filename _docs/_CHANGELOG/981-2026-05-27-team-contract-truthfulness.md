# 981 - Team contract truthfulness

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-339, TASK-339-09

## Key Changes

- Synchronized the Team widget contract to the richer sectioned Wizard, Visual,
  and Advanced editor UI that now ships in the admin.
- Replaced the old mutating Advanced flow with Hero-style read-only layout,
  surface, content, and contract summaries.
- Tightened Team field labeling and background color affordances so the main
  Team-owned controls now follow the same accessibility and transparent-state
  patterns as Hero.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx tests/vitest/widgets/team.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts tests/vitest/ui/link-destination-field.test.tsx`
- Claude Playwright snapshot review returned `NO BLOCKERS`
