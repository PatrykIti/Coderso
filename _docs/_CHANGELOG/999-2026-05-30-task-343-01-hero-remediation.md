# 999 - TASK-343-01 Hero remediation

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343, TASK-343-01

## Key Changes

- Fixed Hero single-CTA persistence by preserving intentionally absent
  `secondaryCta` values during widget default normalization for saved data.
- Kept Hero media/background overlay hue stable when only overlay opacity is
  changed in the Visual editor.
- Rendered explicit background image overlays as valid layered
  `linear-gradient(color, color)` CSS image layers instead of invalid raw RGBA
  background-image entries.
- Synchronized the Hero task, audit report, widget docs, and task board.

## Validation

- `bun test tests/unit/widgets/validator.test.ts`
- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p` diff-fed read-only review for TASK-343-01
