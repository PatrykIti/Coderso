# 1021 - TASK-343-15 Navigation truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-15, TASK-343

## Key Changes

### Widgets / Runtime

- Fixed cleared image-logo normalization so image mode no longer falls back to a
  broken `src="Coderso"` and instead renders a safe text fallback.
- Kept cleared saved Navigation links hidden without replacing them with starter
  defaults in both widget render and public navigation runtime resolution.
- Preserved safe-link rejection for unsafe logo, item, child, and CTA
  destinations.

### Admin UI

- Expanded Advanced runtime diagnostics for all declared behavior paths,
  including transparent surface, mobile mode, mobile CTA hiding, active-link
  mode, and the admin-preview/runtime-script boundary.
- Added Visual guidance for static admin preview behavior, active-link/runtime
  limits, and `var(--color-bg)` theme-token resolution.
- Added inline feedback when destinations are cleared and made all 10
  Navigation color fields clearable with shared theme-default labelling.

### QA / Docs

- Added Navigation widget, editor, and public runtime resolver regression
  coverage for cleared links, image-logo clearing, diagnostics, preview
  guidance, color-state labels, and color reset affordances.
- Updated Navigation widget docs, Playwright report notes, task board, and
  TASK-343 parent tracking.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx`
- `bun test tests/unit/navigation/navigationRuntimeResolver.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-15
  drift review)
