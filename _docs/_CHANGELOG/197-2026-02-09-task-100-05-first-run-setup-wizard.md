# 197-2026-02-09 - TASK-100-05 first-run setup wizard and gating

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-100-05, TASK-100

## Summary
- Added authenticated first-run Setup Wizard flow gated by `setup.completed`.

## Key Changes
- Admin/UI:
  - Added `SetupWizard` component (`core/admin/ui/setup/SetupWizard.tsx`) with 3-step flow:
    - Site Identity
    - Runtime URL
    - Security TTL
  - Added setup validation/payload helpers in `core/admin/ui/setup/setupWizardValidation.ts`.
- Admin/App:
  - Extended settings state with `auth.sessionTtlDays`, `auth.resetTtlMinutes`, `setup.completed`.
  - Added setup gate logic in `AdminApp` and exposed `shouldShowSetupWizard` helper.
  - Wired wizard submit to bulk `PATCH /settings` with final `setup.completed=true`.
- Tests:
  - Added setup wizard validation unit tests and setup wizard render integration tests.
  - Added AdminApp gate matrix test.
- Docs:
  - Updated `_docs/ARCHITECTURE.md`, `_docs/CMS_SPEC.md`, and `_docs/CMS_API.md` for first-run setup lifecycle.
