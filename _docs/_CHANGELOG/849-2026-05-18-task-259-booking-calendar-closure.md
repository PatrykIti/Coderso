# 849 - TASK-259 booking calendar closure

Date: 2026-05-18
Version: Unreleased
Tasks: TASK-259, TASK-259-01, TASK-259-02, TASK-259-03, TASK-259-04, TASK-259-05, TASK-259-06, TASK-259-07, TASK-259-08

## Key Changes

### CMS Widgets

- Added Booking Calendar admin-preview parity so the page builder now hydrates
  active booking services/resources into the canvas and Advanced diagnostics
  without persisting preview-only `resolved` payloads into saved page JSON.
- Landed Booking Calendar product-surface follow-ups across the widget
  contract: date defaults and signed range claims, server-owned past-date
  blocking, service context and timezone copy, loading/abort/clear-selection
  runtime behavior, bounded week-picker availability signals, slot-density
  interval modes, compact/inline/horizontal variants, and selected-slot style
  controls.
- Replaced raw default service/resource UUID entry with catalog-aware picker
  flows and truthful preview/runtime diagnostics while keeping residual shared
  ARIA, frame color-picker, and booking-admin availability UX drift routed to
  `TASK-296`, `TASK-297`, and `TASK-298`.

### QA and Documentation

- Added focused Vitest coverage for Booking Calendar preview hydration, runtime
  script behavior, editor waves, schema validation, and widget render
  normalization, plus route error-map coverage for the new booking date-policy
  machine-readable errors.
- Refreshed the Booking Calendar source-of-truth docs, Playwright report
  closure notes, task board status, and family closeout evidence so `TASK-259`
  can be audited independently from the shared follow-up tasks that remain open.
