# 947. Testimonials editor ownership

- **Date:** 2026-05-25
- **Version:** Unreleased
- **Tasks:** TASK-336-19

## Key Changes

### Admin UI
- Moved Testimonials load-more pagination out of Advanced and into Visual.
- Converted Advanced to read-only runtime, display, and content-health summaries
  with no writable inputs, selects, textareas, action buttons, or raw payload
  snapshot.
- Changed Testimonials color authoring to swatch-only controls and stopped
  fresh defaults from persisting CSS variable color strings.
- Updated rich quote copy to avoid raw HTML terminology in normal authoring.
- Aligned Wizard/Visual duplicate allowances with the one-time starter social
  proof setup fields.

### QA And Docs
- Updated Testimonials widget docs, Playwright report notes, task status, and
  regression tests for the corrected mode ownership.
- Added focused Vitest coverage for Visual pagination ownership, Advanced
  read-only diagnostics, swatch-only colors, and ownership metadata.
- Added strict Playwright evidence and release-gate evidence for the
  Testimonials ownership slice.
