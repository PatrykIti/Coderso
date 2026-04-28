# 766 - TASK-235 Security Gate Gitleaks Action v2 Contract

- Date: 2026-04-28
- Version: Unreleased
- Tasks: TASK-235

## Key Changes

### CI/CD Security

- Updated `security-gate.yml` to configure `gitleaks/gitleaks-action@v2` through
  environment variables instead of unsupported `with` inputs.
- Added `GITHUB_TOKEN` for pull request scans, `GITLEAKS_CONFIG=.gitleaks.toml`,
  disabled automatic PR comments, and kept the action-owned SARIF artifact
  upload enabled.
- Added `fetch-depth: 0` to checkout for Gitleaks history-aware scanning.
- Removed the separate CodeQL upload for a `gitleaks.sarif` file that the action
  does not create through v2 inputs.
- Updated the security gate config test and security/release-gate docs to cover
  the Gitleaks Action v2 contract.

## Validation

- Passed:
  - `bun test tests/unit/security/securityGateConfig.test.ts`
  - YAML parse for `.github/workflows/security-gate.yml`
  - `git diff --check`
