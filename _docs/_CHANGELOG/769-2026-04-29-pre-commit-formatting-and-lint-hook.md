# 769 - Pre-commit Formatting and Lint Hook

Date: 2026-04-29
Version: Unreleased
Tasks: none

## Key Changes

### Developer Tooling

- Added a committed `.githooks/pre-commit` hook and wired `prepare` to configure
  `core.hooksPath`.
- Added a staged-file formatter wrapper that runs Prettier only for supported
  staged files and re-stages formatted results.
- Added `precommit` and `precommit:check` package scripts for local formatting,
  lint, and typecheck enforcement before commits.

### Documentation

- Documented the pre-commit workflow and the intentional exclusion of unit,
  integration, security, performance, and release-gate tests from the hook.
- Added an `AGENTS.md` validation rule requiring `bun run precommit` before
  manual commits unless the configured Git hook runs automatically.

## Validation

- No unit or integration tests were run for this tooling-only change.
