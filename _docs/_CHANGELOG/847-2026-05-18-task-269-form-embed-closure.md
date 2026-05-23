# 847 - TASK-269 Form Embed closure

Date: 2026-05-18
Version: Unreleased
Tasks: TASK-269, TASK-269-01, TASK-269-02, TASK-269-03, TASK-269-04, TASK-269-05, TASK-269-06

## Key Changes

### CMS Widgets

- Reworked the Form Embed renderer and runtime contract so the current Forms
  field model now renders with stable ids, helper linkage, required semantics,
  unsupported-field diagnostics, bounded section/title/button styling, and
  configurable multi-step navigation plus saved-progress expiry.
- Added public submit runtime feedback for Form Embed: busy state, live-region
  success/error messaging, configurable post-success behavior, redirect
  handling, and the safe backend-owned CAPTCHA/nonce bridge required by the
  current Forms public-write policy.
- Split Form Embed editor modes into distinct Wizard, Visual, and Advanced
  surfaces with selected-form diagnostics, field count/type summaries,
  multi-step metadata, runtime error visibility, and normalized payload
  snapshotting.

### QA and Documentation

- Added focused Form Embed runtime DOM coverage, resolver projection coverage,
  and detail-page consumer proof so the widget no longer relies on markup-only
  tests for runtime behavior.
- Updated the Form Embed widget doc and the Playwright report to the truthful
  current contract, including explicit shared-scope routing for the remaining
  TASK-310 rows and named future Forms field-model scope through TASK-311.
