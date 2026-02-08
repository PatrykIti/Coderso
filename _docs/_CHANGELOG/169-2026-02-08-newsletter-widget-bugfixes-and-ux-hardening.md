# 169-2026-02-08 - Newsletter widget bugfixes and UX hardening

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-10-01, TASK-050-10

## Summary
- Hardened Newsletter widget model, renderer, and baseline editors to match v1 behavior and eliminate runtime/editor mismatches.

## Key Changes
- CMS/Widgets: Expanded Newsletter model with consent requirement, integration mode (`action-url` / `webhook`), webhook ID support, and style controls (spacing, alignment, background).
- CMS/Widgets: Added payload normalization for safe defaults, integration mode resolution, and deterministic fallback behavior for legacy data.
- CMS/Widgets: Reworked Newsletter runtime renderer to handle all variants (`inline`, `stacked`, `minimal`) with deterministic output and explicit runtime markers.
- Admin/UI: Updated Newsletter Wizard flow to documented onboarding sequence (style, copy, submit label, consent baseline).
- Admin/UI: Expanded baseline Visual/Advanced controls for placeholder/success/consent/style and integration endpoint fields.
- Tests: Added dedicated Newsletter widget unit tests and extended renderer/template-editor coverage for newsletter behavior.
- Docs: Updated Newsletter widget documentation to reflect current 10-01 scope and behavior.
