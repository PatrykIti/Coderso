# 865. TASK-308 and TASK-309 footer owner wave

Date: 2026-05-19
Version: Unreleased
Tasks: TASK-308, TASK-309, TASK-309-01, TASK-309-02, TASK-309-03

## Key Changes

### Footer structure and utilities
- Footer column reorder now remaps visible columns and `column-1/2/3` slot payloads atomically.
- Footer newsletter is composition-only and reuses the existing hardened Newsletter/Forms contract.
- Footer now supports bounded read-only address/contact presentation with safe `tel:` / `mailto:` rendering.
- Footer now exposes a bounded anchor-based back-to-top action with deterministic fallback labeling.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx -t "footer"`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
