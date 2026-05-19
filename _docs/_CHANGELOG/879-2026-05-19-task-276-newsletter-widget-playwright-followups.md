# 879 - TASK-276 newsletter widget Playwright followups

Date: 2026-05-19
Version: Unreleased
Tasks: TASK-276, TASK-276-01, TASK-276-02, TASK-276-03, TASK-276-04, TASK-276-05, TASK-276-06, TASK-276-07

## Summary

- Closed the Newsletter-specific Playwright follow-up family with bounded
  widget/runtime/editor fixes, shared Forms-runtime reuse, refreshed report/doc
  evidence, and one explicit deferred responsive follow-up task (`TASK-319`).

## Key Changes

- CMS/Widgets: Newsletter now emits stable email/consent semantics, bounded
  first-name expansion, provider-owned double opt-in copy, hidden-by-default
  success/error regions, bounded action URL/method handling, width and color
  controls, contrast advisories, and explicit disconnected-state fallbacks.
- Runtime/Admin UI: Forms-runtime bindings now hydrate through
  `publicSite.tsx`, require compatible email/first-name/consent fields, block
  misleading native `/forms/:id/submissions` usage, surface redirect/runtime
  diagnostics in the editor, hydrate page-builder preview without persisting
  runtime secrets, dispatch bounded success analytics events, and keep Visual
  as the single variant owner with truthful minimal/mobile guidance.
- QA/Documentation: Added focused Newsletter validator/runtime/editor coverage,
  refreshed `_docs/_WIDGETS/NEWSLETTER.md`, converted the Newsletter Playwright
  report into a final fixed/deferred matrix, moved the TASK-276 family to
  `Done`, and created `TASK-319` for true per-breakpoint variant overrides.
