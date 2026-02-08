# 171-2026-02-08 - Contact widget bugfixes and UX hardening

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-11-01, TASK-050-11

## Summary
- Hardened Contact widget runtime and editor behavior to match v1 docs with deterministic variants, safe field normalization, map guards, and baseline UX parity in Wizard/Visual/Advanced.

## Key Changes
- CMS/Widgets: Expanded Contact model with `form.required` and `style` branch (`spacing`, `background`, `columns`), plus strict field enum validation.
- CMS/Widgets: Added Contact normalization pipeline for allowed fields, deduplication, required-field intersection, safe defaults, and variant resolution.
- CMS/Widgets: Rebuilt Contact runtime rendering so `form-left`, `form-right`, and `minimal` behave deterministically; map iframe renders only when enabled with valid `http/https` embed URL.
- Admin/UI: Reworked Contact Wizard to documented onboarding flow (layout, fields, submit label, contact details).
- Admin/UI: Replaced raw comma-separated field editing with structured toggles, required switches, and field ordering controls in Visual/Advanced.
- Tests: Added dedicated Contact widget unit tests and extended renderer/template-editor coverage for Contact runtime markers and editor sections.
- Docs: Updated Contact widget documentation and task board status for `TASK-050-11-01` completion.
