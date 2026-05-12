# 839 - TASK-252 widget configuration closure

**Date:** 2026-05-12
**Version:** Unreleased
**Tasks:** TASK-252, TASK-252-03, TASK-252-03-01, TASK-252-04, TASK-252-04-01, TASK-252-05, TASK-252-05-01, TASK-252-05-02, TASK-252-05-03, TASK-252-05-04, TASK-252-05-05, TASK-252-05-06, TASK-252-05-07, TASK-252-05-08, TASK-252-05-09, TASK-252-05-10, TASK-252-06, TASK-252-06-01, TASK-252-06-02, TASK-252-06-03, TASK-252-06-04, TASK-252-06-05, TASK-252-06-06, TASK-252-06-07, TASK-252-06-08, TASK-252-06-09, TASK-252-06-10, TASK-252-06-11, TASK-252-07, TASK-252-07-01, TASK-252-07-02, TASK-252-07-03, TASK-252-07-04, TASK-252-07-05, TASK-252-07-06, TASK-252-07-07, TASK-252-07-08, TASK-252-07-09, TASK-252-07-10, TASK-252-07-11, TASK-252-07-12, TASK-252-07-13, TASK-252-07-14, TASK-252-07-15, TASK-252-08

## Key Changes

### Shared inspector IA closure

- Finished the TASK-252 right-inspector rollout around shared `WidgetEditorSection`
  and `WidgetControlRow` primitives, compact `Info` affordances, stable
  `data-widget-editor*` metadata, and builder-owned slot placement inside
  named `Visual` sections.
- Brought the remaining structural, content, and operational widget editors
  onto the same section-shell contract so Wizard/Visual/Advanced ownership is
  consistent across Pages-publishable widget surfaces.

### Widget contract hardening

- Expanded widget-owned schema/default/normalizer/render/editor coverage for
  the main TASK-252 deltas: hero badge support, timeline chronology/status
  modes, section layout width and spacing, tabs accessibility defaults,
  accordion disclosure semantics, toggle-block radiogroup behavior,
  pricing-plan billing cycles, search-box route-submit mode, template-section
  metadata, and runtime-safe href normalization across hero, navigation,
  footer, feature-grid, CTA banner, pricing-plans, and entry-teaser.
- Preserved existing pack readiness while recording the explicit
  `modulePackMatrix not affected` rationale in the final QA proof matrix.

### Docs, research, and board closure

- Added the missing canonical widget docs for `TABS`, `ACCORDION`,
  `TOGGLE_BLOCK`, `PRODUCT_GALLERY`, `PRODUCT_COMPARE`, `PRODUCT_TABLE`,
  `LISTING_FILTERS`, `SEARCH_BOX`, `BOOKING_CALENDAR`, and
  `APPOINTMENT_FORM`.
- Synced `_docs/WIDGETS.md`, per-widget source-of-truth docs, the TASK-252
  proof matrix, `_docs/_TASKS/README.md`, and all `TASK-252*` task files so
  the family is fully closed as `Done`.

## Validation

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest`
- `bun run test:bun`
- `bun run scan:security:strict`
