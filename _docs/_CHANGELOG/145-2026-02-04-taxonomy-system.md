# 145-2026-02-04 - Taxonomy system

Date: 2026-02-04
Version: Unreleased
Tasks: TASK-048-04

## Summary
- Added WordPress‑like categories/tags per content type and entry metadata.

## Key Changes
- Core/DB: added taxonomies, terms, and assignments tables.
- API: taxonomy config + term endpoints and entry metadata support.
- Admin/UI: taxonomy toggles in content type editor and selectors in entry metadata.
- Search: entry search now indexes tag names.
- Tests: added taxonomy service tests and route registration checks.
