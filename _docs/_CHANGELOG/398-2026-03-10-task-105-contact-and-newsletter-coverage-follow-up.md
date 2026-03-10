# 398. TASK-105 Contact and Newsletter Coverage Follow-Up

**Date:** 2026-03-10  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-06

## Key Changes

### QA / Widget Editors
- Extended `ContactEditors` coverage around visual submit-label updates, contact detail edits, required-field reorder down-path, and text-token style input handling.
- Extended `NewsletterEditors` coverage around visual content copy, CTA label updates, and integration-mode switching back to webhook with direct webhook-id edits.
- Kept the changes isolated to the existing editor-wave Vitest suites without widening runtime-owned Bun coverage.

### Coverage Progress
- Previous authoritative snapshot after the parallel low-line widget-editor slice: `60.27% stmts`, `50.65% branch`, `64.04% funcs`, `63.16% lines`
- Current authoritative snapshot after this contact/newsletter follow-up: `60.27% stmts`, `50.65% branch`, `64.04% funcs`, `63.16% lines`
- Isolated targeted runs for the touched editor files reached:
  - `ContactEditors.tsx` -> `98.97%` lines / `63.80%` branches
  - `NewsletterEditors.tsx` -> `100.00%` lines / `61.42%` branches
- Combined authoritative `core/admin/ui/widgets/editors/*` snapshot remained `96.12%` lines / `72.42%` branches across `40` tracked files

### Remaining Focus
- The authoritative full-lane summary still points to `StatsKpiEditors`, `FeatureGridEditors`, `TestimonialsEditors`, `RichTextSectionEditors`, `FaqAccordionEditors`, `EntryTeaserEditors`, `NavigationEditors`, and `ContactEditors` as the next visible low-line widget-editor backlog.
- The targeted gains from this slice are validated, but they still are not reflected in the current authoritative full-lane summary artifact.
