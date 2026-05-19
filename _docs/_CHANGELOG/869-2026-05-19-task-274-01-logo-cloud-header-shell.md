# 869. TASK-274-01 Logo Cloud header shell controls

Date: 2026-05-19
Version: Unreleased
Tasks: TASK-274, TASK-274-01

## Key Changes

### CMS Widgets

- Expanded the Logo Cloud widget with product-owned section-shell controls:
  optional eyebrow copy, clearable section background, bounded header
  alignment, and bounded header size.
- Extended the Logo Cloud schema/defaults/normalizer and runtime renderer so
  the new header-shell fields stay backward compatible while producing
  deterministic runtime markers.
- Added the matching Visual editor controls without reopening the shared
  heading/landmark ownership that was already repaired under `TASK-313`.

### QA and Documentation

- Refreshed the Logo Cloud Playwright report note, widget docs, task statuses,
  and board state so `BF-01`, `BF-02`, and `BF-07` now point at the landed
  `TASK-274-01` implementation.
- Extended the focused Logo Cloud test suites to cover the new eyebrow,
  section-surface, and header-typography contract.
