# 858 - TASK-267 feature grid widget followups

Date: 2026-05-17
Version: Unreleased
Tasks: TASK-267, TASK-267-01, TASK-267-02, TASK-267-03, TASK-267-04, TASK-267-05, TASK-267-06, TASK-267-07, TASK-267-08, TASK-307

## Key Changes

### CMS Widgets

- Closed the shared Feature Grid residuals discovered during TASK-267 audit:
  invalid image and CTA URLs now show inline feedback, unsafe image URLs no
  longer render publicly, decorative emoji output is `aria-hidden`, and
  Advanced mode now stays diagnostics-only for the token controls already owned
  by Visual.
- Closed the final local Feature Grid residuals before family closeout:
  runtime now honors authored card counts instead of clamping back to variant
  baselines, and media-picker state stays attached to stable `items[].id`
  values across reorder/remove flows.
- Added Feature Grid-local variant preview cards, moved the `cards-4` desktop
  baseline to `lg`, and upgraded card management with drag-handle reorder plus
  confirm-remove flow.
- Expanded Feature Grid authoring with media-library image picking, explicit
  `imageAlt`, bounded emoji presets, image-over-icon guidance, card layout and
  density controls, section background/width/title/hover styling, explicit CTA
  enablement and target selection, and sanitized rich card descriptions.
- Added local Wizard guidance that points authors to Visual for richer
  media/layout/action editing while keeping the first-open builder policy out of
  widget-local scope.

### Documentation and QA

- Reworked the Feature Grid Playwright report so post-`TASK-256` /
  post-`TASK-307` shared fixes are explicitly remapped instead of leaving
  contradictory historical “open bug” rows as closure evidence.
- Refreshed `_docs/_WIDGETS/FEATURE_GRID.md`, the TASK-267/TASK-307 task files,
  and `_docs/_TASKS/README.md` to reflect the final owner map, implemented
  scope, and deferred/shared follow-up boundaries.
