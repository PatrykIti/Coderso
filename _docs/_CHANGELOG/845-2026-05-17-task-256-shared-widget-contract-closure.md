# 845 - TASK-256 shared widget contract closure

Date: 2026-05-17
Version: Unreleased
Tasks: TASK-256, TASK-256-01, TASK-256-02, TASK-256-03, TASK-256-04, TASK-256-05, TASK-256-05-01, TASK-256-05-02, TASK-256-05-03, TASK-256-05-04, TASK-256-06, TASK-256-06-01, TASK-256-06-02, TASK-256-06-03, TASK-256-06-04, TASK-256-07, TASK-256-08

## Key Changes

### CMS Widgets

- Added a shared atomic `onBlockPatch` contract across the page builder,
  custom-screen builder, detail-template editor, widget-template editor, and
  widget details drawer so widget variant/data updates no longer race against
  stale block snapshots.
- Added shared render-context gating for editor-only placeholder copy so public
  runtime no longer leaks `Empty region.`, `Empty column.`, tab/accordion pane
  placeholders, or toggle-pane guidance.
- Added scoped widget runtime IDs and `data-coderso-*` selectors for interactive
  shared widgets, removing page-global `nextless` ID collisions from tabs,
  accordion, toggle-block, and FAQ accessibility relationships.
- Repaired shared structural truthfulness for split-layout, stack, spacer,
  divider, section, and grid-columns, including variant/data sync, fixed-mode
  preservation, public technical-label leakage, safer section anchors, and
  disabled no-op technical controls.

### Marketing Widgets

- Repaired shared marketing/content truthfulness across feature-grid,
  stats-kpi, logo-cloud, gallery-mosaic, pricing-plans, FAQ, Hero, Team, and
  Testimonials report scope, including variant/count sync, divider semantics,
  safe external link attributes, accessible media labels, and alpha-preserving
  overlay editing.
- Kept widget-specific product expansion out of the umbrella by routing CTA,
  Timeline, Team, Testimonials, Hero page-shell, commerce, dynamic content,
  forms, booking, footer, compare-timeline, and rich-text backlog to their
  physical follow-up families.

### QA and Documentation

- Refreshed `_docs/PLAYWRIGHT/REPORT_*_WIDGET.md` closure notes with
  `Status po TASK-256 (2026-05-17)` evidence for the shared slices landed in the
  branch and added classification/routing notes for late report families.
- Synchronized `_docs/_TASKS/TASK-256*.md` and `_docs/_TASKS/README.md` with
  the final TASK-256 family status and ownership split.
- Added focused Vitest coverage for builder patching, placeholder gating,
  runtime ID scope, split/stack sync, spacer/divider truthfulness,
  feature-grid/stats-kpi controls, logo-cloud/gallery link/media semantics, and
  the required gate-unblocker UI test drift around settings/listings/forms
  shells.
