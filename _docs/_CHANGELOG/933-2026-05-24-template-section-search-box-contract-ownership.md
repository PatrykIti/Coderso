# 933 - Template Section and Search Box editor ownership

Date: 2026-05-24
Version: Unreleased
Tasks: TASK-336-04, TASK-336-05

## Key Changes

### Widgets

- Split `template-section` so Wizard owns template setup, Visual owns
  presentation metadata, and Advanced is read-only resolved-template/runtime
  diagnostics.
- Split `search-box` so Wizard owns source setup, Visual owns visitor
  copy/interaction/surface, and Advanced is read-only runtime diagnostics.
- Added v2 `editorContract` metadata for both widgets.

### QA

- Added/updated focused Vitest UI and widget-contract coverage for both
  ownership splits.
- Verified targeted admin Playwright smoke for both widgets with zero admin
  failures and zero metadata gaps.

### Docs

- Updated widget docs, task closure notes, smoke inventory notes, and the
  Playwright re-audit status.
