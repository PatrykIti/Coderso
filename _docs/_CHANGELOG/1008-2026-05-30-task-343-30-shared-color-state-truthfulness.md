# 1008 - TASK-343-30 shared color state truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343, TASK-343-30

## Key Changes

- Added a shared color-state describer for cleared, theme-default token, theme
  token, transparent, selected swatch, and saved custom color states.
- Updated shared swatch-only color controls so theme tokens and fallback swatches
  no longer read as saved custom author overrides.
- Made shared color Clear accessible names describe removal of saved color
  values, with explicit no-inline Search Box copy and transparent Form Embed
  background copy.
- Refreshed widget audit reports and widget docs for the updated color-state
  vocabulary.

## Validation

- `bun run test:vitest -- tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/clearable-fields.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/search-box-editor-wave.test.tsx tests/vitest/ui/form-embed-editor-wave.test.tsx tests/vitest/ui/content-list-editor-wave.test.tsx tests/vitest/ui/tabs-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/ui/feature-grid-editor-wave.test.tsx tests/vitest/ui/logo-cloud-editor-wave.test.tsx tests/vitest/ui/posts-feed-editor-wave.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx tests/vitest/ui/section-editor-wave.test.tsx tests/vitest/ui/entry-teaser-editor-wave.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx tests/vitest/ui/stats-kpi-editor-wave.test.tsx tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/ui/split-layout-editor-wave.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/widgets/splitLayout.test.tsx tests/vitest/widgets/statsKpi.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-30
  drift review: no blockers)
