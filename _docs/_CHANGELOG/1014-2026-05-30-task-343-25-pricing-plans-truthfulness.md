# 1014 - TASK-343-25 Pricing Plans truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-25, TASK-343

## Key Changes

### Admin UI

- Split Pricing Plans fixed-count guidance into variant capacity, actual
  rendered saved plans, missing plan slots, and preserved hidden plans.
- Replaced Visual plan and feature removal with the same
  `ConfirmActionDialog` pattern already used by Advanced repair actions.
- Moved Pricing Plans color controls onto the shared color-state copy so
  theme tokens, selected swatches, inherited clears, and default restores are
  labelled consistently.

### Widgets / Runtime

- Kept billing cycle rendering static, but changed the public billing bar from
  two non-clickable toggle-like pills to a non-interactive status label.
- Rendered highlighted-plan badges even when their text matches the highlight
  banner, keeping saved badge tone visible in runtime output.

### QA / Docs

- Added Pricing Plans regression coverage for capacity-vs-rendered counts,
  static billing semantics, duplicate highlight badge rendering, and confirmed
  destructive Visual removals.
- Updated the Pricing Plans widget docs, Playwright report notes, task board,
  and TASK-343 parent tracking.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-25
  drift review: no blockers)
