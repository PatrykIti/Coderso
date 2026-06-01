# 1038 - TASK-351 Backups remediation plan

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-351

## Key Changes

### Planning

- Added the TASK-351 Backups remediation family from the Tools Playwright report
  and Claude UX review.
- Split Backups work into execution leaves for include-option payloads,
  backup lifecycle/artifact/restore/download/delete behavior, pagination and
  queue-health UX, and final QA/docs closure.
- Captured the internal Backups security contract for backup artifacts,
  destructive restore/delete actions, strict validation, and secret-safe audit
  metadata.
- Refined Backups leaves after drift audit to respect the current v1
  metadata-only architecture, require an explicit external-worker boundary or
  architecture/API/security doc updates before artifact execution, and add
  admin cache-contract decisions.

## Validation

- Planning was based on the Backups report, Tools overview report, Claude UX
  addendum, current Backups UI/client/route/service files, current Backups
  tests, and the repo task/changelog format rules.
- Follow-up drift audit checked `_docs/ARCHITECTURE.md`, `_docs/CMS_API.md`,
  current backup service/routes, and admin cache policy.
