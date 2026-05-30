# 1004 - TASK-343-14 Form Embed truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343, TASK-343-14

## Key Changes

- Made the Form Embed `Spacing` control visibly update vertical padding instead
  of only changing the data marker.
- Treated Form Embed theme-token color defaults as `Theme default`, made color
  `Clear` remove authored keys, and fixed Advanced color override counts.
- Clamped saved-progress TTL `0` to `1`, removed duplicate surface `border`
  classes, and replaced raw public runtime error codes with user-facing copy.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/form-embed-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-14
  drift review: no blockers)
