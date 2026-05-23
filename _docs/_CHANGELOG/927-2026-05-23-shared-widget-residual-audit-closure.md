# 927. Shared widget residual audit closure

- **Date:** 2026-05-23
- **Version:** Unreleased
- **Tasks:** TASK-330, TASK-331, TASK-332, TASK-333, TASK-334, TASK-335

## Key Changes

### Runtime and accessibility
- Tabs now exposes a deterministic `Content tabs` tablist label and keyboard-reachable active tabpanels.
- Stats KPI `split-highlight` now uses count-aware odd/even secondary-grid classes instead of a hardcoded two-column rest grid.
- Team and Testimonials avatar surfaces now use contextual `Photo of ...` alt text, while Team member cards expose explicit accessible labels and initials fall back decoratively.

### Editor ownership and truthfulness
- Testimonials Advanced no longer duplicates Visual-owned spacing, slider-navigation, or rating-display controls; those values now appear as read-only diagnostics while pagination/import-export tooling stays editable.
- The shared residual audit also confirmed the changelog index now has unique numbering and no stale row-to-file mappings on the current branch.

### QA and documentation
- Added focused widget, renderer, preview-integration, and editor Vitest coverage for the repaired shared contracts.
- Refreshed the affected Playwright reports, widget docs, task board rows, and reopened task statuses so the repository reflects the fixed branch state.
- Validation for this closure includes green targeted Vitests, `bun run lint`, `bun --cwd core lint`, `bun --cwd core lint:types`, and a clean `bun run scan:security:strict` pass.
