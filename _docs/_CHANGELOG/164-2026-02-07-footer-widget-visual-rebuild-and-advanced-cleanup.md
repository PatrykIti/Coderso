# 164-2026-02-07 - Footer widget visual rebuild and advanced cleanup

Date: 2026-02-07
Version: Unreleased
Tasks: TASK-050-07-02, TASK-050-07

## Summary
- Rebuilt Footer editing flow to a Visual-first, section-based UX and moved Advanced mode to technical-only layout tokens.

## Key Changes
- Admin/UI: rebuilt `FooterVisualEditor` into explicit sections (variant/structure, columns/links, legal strip, social + icon style, colors/borders, typography/spacing, slots hints).
- Admin/UI: Footer Visual now supports full structured link editing in columns (label + href, add/remove) as the primary day-to-day workflow.
- Admin/UI: Footer Advanced now contains technical layout tokens only (`align`, `legalAlign`, `maxWidth`, `columnGap`, `sectionPaddingY`) and no duplicate content/style controls.
- CMS/Widgets: finalized Footer data model with additive `layout` and `style` tokens while preserving compatibility with previous payloads.
- CMS/Widgets: Footer runtime renderer now maps layout/style tokens (surface/border/typography/alignment/max width) deterministically.
- CMS/Widgets: Footer now declares `editorCapabilities.visualOwnsVariantSelection = true`, so generic Visual variant controls are hidden.
- Tests: expanded coverage for Footer visual IA sections, technical Advanced scope, VisualPanel variant-ownership behavior, and renderer slot/runtime parity.
