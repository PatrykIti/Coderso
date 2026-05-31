# 941. P2 widget editor ownership

- **Date:** 2026-05-24
- **Version:** Unreleased
- **Tasks:** TASK-336-13

## Key Changes

### Editor contract
- Added strict v2 editor contracts for Content List, Booking Calendar, Appointment Form, and Product Table.
- Wizard now owns first-time setup/source configuration for the P2 widgets, while Visual owns daily variant, copy, layout, and surface presentation.
- Advanced diagnostics are read-only, except for explicit technical endpoint overrides on booking widgets.

### UX and safety
- Replaced Visual CSS/token text entry for touched surface controls with swatches and clear actions.
- Replaced Appointment Form raw phone regex authoring with bounded phone-validation presets.
- Hid Product Table raw collection-ID fallback in Wizard and kept collection selection checkbox-based when collections are available.
- Kept booking nonce/slot-token diagnostics redacted to presence-only summaries and preserved public booking security tests.

### QA and documentation
- Added focused widget/editor contract, UI, shared color-control, booking runtime-script, and public booking regression coverage.
- Updated widget docs and task board closure notes for TASK-336-13.
