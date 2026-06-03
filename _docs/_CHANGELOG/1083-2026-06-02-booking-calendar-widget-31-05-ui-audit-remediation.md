# 1083 - Booking Calendar widget 31-05 UI audit remediation

**Date:** 2026-06-02  
**Version:** Unreleased  
**Tasks:** TASK-393, TASK-393-01, TASK-393-02, TASK-393-03, TASK-393-04

## Key Changes

### CMS Widgets / Booking Calendar

- Booking Calendar runtime copy now creates DOM nodes and assigns `textContent` instead of composing service/status/week copy through `innerHTML`.
- Week picker labels, buttons, and availability requests now use unique bounded dates near min/max edges.
- Tokenless admin/page-builder week preview now shows an explicit noninteractive runtime boundary instead of an empty week shell.
- Admin preview and public runtime preview now share active linked booking catalog filtering through `buildBookingRuntimeCatalog`.

### QA / Security / Docs

- Added runtime regressions for attacker-shaped copy payloads, bounded week date uniqueness, and availability request de-duplication.
- Added renderer and catalog parity regressions for tokenless admin week preview and inactive/unlinked catalog filtering.
- Re-ran Booking Calendar target suites, adjacent public-render/editor-contract checks, the Coderso security gate, lint, typecheck, and whitespace diff checks.
- Updated the 31-05 audit report, widget docs, task board, and audit index with TASK-393 closure evidence.
