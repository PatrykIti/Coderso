# 170-2026-02-08 - Newsletter widget visual rebuild and advanced cleanup

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-10-02, TASK-050-10

## Summary
- Finalized Newsletter editor mode boundaries: Wizard stays minimal, Visual becomes section-based primary editing mode, and Advanced is technical-only.

## Key Changes
- CMS/Widgets: Newsletter now declares `editorCapabilities.visualOwnsVariantSelection = true`, which removes duplicate generic variant controls in Visual.
- Admin/UI: Rebuilt Newsletter Visual editor into six sections: variant/form structure, content copy, consent/submit behavior, integration target, colors/emphasis, spacing/alignment.
- Admin/UI: Advanced mode reduced to technical scope only (layout tokens, raw integration metadata, normalization/fallback diagnostics).
- Tests: Added regression coverage for Newsletter visual variant ownership and section-based Visual IA in page builder/template editor tests.
- Docs: Updated task board, Newsletter widget docs, and task statuses for 050-10 / 050-10-02 completion.
