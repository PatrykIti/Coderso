# 946. Entry Teaser editor ownership

- **Date:** 2026-05-25
- **Version:** Unreleased
- **Tasks:** TASK-336-19

## Key Changes

### Admin UI
- Made Entry Teaser Wizard source setup-only; variant selection now belongs to
  Visual only.
- Moved media, layout, style, and tag-density controls into Visual and changed
  Advanced to read-only source, presentation, and runtime summary rows.
- Replaced the Visual raw custom CTA URL input with the shared page-first
  destination picker while keeping saved custom/hash/external hrefs
  replace-or-clear compatible.
- Changed Entry Teaser color authoring to swatch-only controls and stopped
  fresh defaults from persisting CSS variable surface/border colors.
- Added bounded copy limits for CTA label and fallback copy.

### QA And Docs
- Updated Entry Teaser widget docs, task evidence, and regression tests for the
  corrected Wizard/Visual/Advanced ownership contract.
- Added focused Vitest and Bun route/widget coverage for the Entry Teaser
  contract slice.
