# 857. FAQ accordion shared and product follow-ups

**Date:** 2026-05-17  
**Version:** 1.0.0  
**Tasks:** TASK-306, TASK-266, TASK-266-01, TASK-266-02, TASK-266-03, TASK-266-04, TASK-266-05, TASK-266-06

## Key Changes

### FAQ Shared Contract
- Repaired FAQ shared residuals around chevron affordance, section and region
  accessibility semantics, `spacing="none"` border collapse, and border/divider
  clear adoption without widening FAQ-only product work into the shared family.

### FAQ Product Surface
- Added bounded FAQ layout, typography, color, radius, border-width, and motion
  controls across schema, editor, runtime, and focused tests.
- Added per-item icons, a bounded markdown subset for answers, and safe widget
  link handling with plain-text extraction for downstream SEO.
- Added an opt-in `FAQPage` JSON-LD toggle and safe serializer for structured
  data output.
- Expanded FAQ editor UX with section description, question-aware default-open
  labels, remove confirmation, variant miniatures, drag/drop reorder, and
  bounded bulk delete.

### QA and Documentation
- Refreshed the FAQ widget documentation, the dedicated FAQ Playwright report,
  task-board state, and family closure evidence for TASK-306 and TASK-266.
- Recorded the local security-scan blocker separately: `scan:security:strict`
  is still environment-blocked here by Semgrep trust-anchor initialization and
  `bun audit` network refusal, while the targeted FAQ suites, repo lint, and
  `gates:coderso` passed.
