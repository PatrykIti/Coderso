# 230-2026-02-17 - Forms submission nonce guard

Date: 2026-02-17
Version: Unreleased
Tasks: TASK-038-07

## Key Changes
- Core/Security: Added HMAC nonce for public form submissions (short-lived, signed by server).
- CMS/Forms: Runtime resolver now issues per-request submission nonces for public forms.
- CMS/Forms: Submission endpoint validates nonce before bot protection.
- Widgets: Form embed renders hidden nonce input for public submissions.
- Docs: Documented nonce requirements and new environment variables.
- Tests: Added nonce generation/validation coverage.
