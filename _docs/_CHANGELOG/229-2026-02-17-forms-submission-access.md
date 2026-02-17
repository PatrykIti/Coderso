# 229-2026-02-17 - Forms submission access modes

Date: 2026-02-17
Version: Unreleased
Tasks: TASK-038-07

## Key Changes
- CMS/Forms: Added `submission_access` (public/internal) for per-form submission control.
- Core/Security: Internal form submissions require admin session or API key (`forms.submit` scope).
- Admin/UI: Form settings now expose submission access selector with helper text.
- Admin/UI: Form embed editor warns when selecting internal forms.
- Docs: Updated security and API docs with internal/public behavior.
- Tests: Added submission access policy coverage.
