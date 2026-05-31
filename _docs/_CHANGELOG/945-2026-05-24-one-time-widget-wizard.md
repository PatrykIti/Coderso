# 945. One-time widget Wizard lifecycle

- **Date:** 2026-05-24
- **Version:** Unreleased
- **Tasks:** TASK-336-16

## Key Changes

### Admin UI
- Changed the shared page-builder widget shell so completed widgets show
  `Visual` and `Advanced` as the daily tabs, plus a read-only `Setup complete`
  summary.
- Added an explicit `Run setup again` action that reopens Wizard through the
  existing `wizardCompleted=false` setup path without resetting widget data.
- Kept `applyWizardSelection` as the canonical completion helper, returning the
  editor to `Visual` with `wizardCompleted=true`.
- Added follow-up normalization for persisted legacy blocks without `editor`
  state so loaded pages/templates open daily `Visual` and save/publish with a
  complete editor-state payload.

### Contract And QA
- Added helper coverage for completed, legacy, and reopened setup state.
- Added regression coverage for legacy page/detail-template normalization and
  page mutation payloads across settings save, preview sync, draft save, and
  publish.
- Updated Playwright widget smoke inventory to validate completed fixtures
  against the daily `visual`/`advanced` modes and added targeted lifecycle
  evidence for Hero.
- Added targeted FAQ Accordion Playwright evidence for the legacy daily-Visual
  path after the 2026-05-25 normalization follow-up.
