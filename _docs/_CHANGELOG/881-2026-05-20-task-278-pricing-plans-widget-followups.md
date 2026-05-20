# 881. TASK-278 pricing plans widget follow-ups

**Date:** 2026-05-20
**Version:** Unreleased
**Tasks:** TASK-278, TASK-278-01, TASK-278-02, TASK-278-03, TASK-278-04, TASK-278-05, TASK-278-06, TASK-278-07, TASK-278-08

## Key Changes

### Pricing plan hierarchy and authoring

- Added plan-level descriptions, surfaces, badge tones, CTA styles, and
  highlighted top-banner labels for Pricing Plans cards.
- Expanded Wizard authoring so a publishable plan can be configured with badge,
  billing period, CTA, and feature essentials without switching modes.
- Tightened destructive editor actions with remove confirmation, highlighted
  affordances, feature autofocus, clearer Advanced cleanup copy, and explicit
  confirmation before trimming preserved hidden plans.

### Billing, comparison, and layout behavior

- Added structured/free/custom pricing modes, annual savings copy, non-negative
  structured amount normalization, and truthful static billing status labels.
- Added bounded feature status/icon metadata, comparison-header CTA/badge
  hierarchy, sticky comparison headers, width presets, typography presets, and
  plain-text footer notes.
- Added a dedicated `two-plans` runtime/editor variant and synchronized the
  widget definition, validator, and registry coverage around it.

### Documentation and evidence

- Synchronized the Pricing Plans Playwright report, widget docs, task board, and
  closure notes with the final TASK-278 owner split after the shared
  TASK-256-02 / TASK-256-06-03 pricing baseline was re-verified.
