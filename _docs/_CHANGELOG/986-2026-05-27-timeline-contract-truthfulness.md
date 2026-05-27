# 986 - Timeline contract truthfulness

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-339, TASK-339-14

## Key Changes

- Synchronized the Timeline widget contract to the richer sectioned Wizard,
  Visual, and Advanced editor UI that now ships in the admin.
- Restored real Wizard section metadata and replaced the old mutating Advanced
  normalization action with Hero-style read-only diagnostics and ownership
  summaries.
- Normalized Timeline-owned color rows so clear/default behavior is consistent
  across line, text, background, and per-step marker/accent controls.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx tests/vitest/widgets/timeline.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts`
- Claude Playwright snapshot review returned `NO BLOCKERS`
