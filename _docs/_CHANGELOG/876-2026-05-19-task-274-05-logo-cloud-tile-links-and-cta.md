# 876. TASK-274-05 Logo Cloud tile links and CTA

Date: 2026-05-19
Version: Unreleased
Tasks: TASK-274, TASK-274-05

## Key Changes

### CMS Widgets

- Expanded Logo Cloud schema/runtime ownership with bounded tile radius and
  border-width fields, plus one global `openLinksInNewTab` control for logo
  tile links.
- Added an optional CTA below the logo list with enable, label, href, and
  target fields, all rendered through the shared safe link attribute helper.
- Kept unsafe or incomplete logo/CTA hrefs fail-closed instead of creating a
  second widget-local safe-link contract.

### QA and Documentation

- Extended the Logo Cloud widget, renderer, editor-wave, and shared
  `widgetSafeHref` tests with new-tab link, CTA, and tile-shape proof.
- Refreshed the Logo Cloud report note, widget docs, task statuses, board
  counts, and changelog index so `UX-09`, `BF-08`, and `BF-11` now point at the
  landed `TASK-274-05` implementation.
