# 762 - TASK-231 CI Security and Release Gate Fixes

- Date: 2026-04-28
- Version: Unreleased
- Tasks: TASK-231

## Key Changes

### Security Gate

- Added `actions: read` to the security gate job permissions so SARIF upload can
  read workflow-run metadata.
- Upgraded Semgrep, Trivy, and Gitleaks SARIF upload steps to
  `github/codeql-action/upload-sarif@v4`.
- Extended the security gate config test to assert the SARIF action version and
  required permission.

### Release Gates

- Raised the per-test timeout only for those DB-backed public booking tests to
  30 seconds so remote Render DB latency does not fail the gate.

## Validation

- Passed:
  - `bun test tests/unit/security/securityGateConfig.test.ts`
  - `set -a && source .env && set +a && bun test tests/unit/server/publicBookingApi.test.ts`
  - `set -a && source .env && set +a && bun scripts/coderso-release-gates.ts --gate security --report .tmp/coderso-release-gates-security-db.json`
  - `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/security-gate.yml"); puts "security-gate.yml YAML OK"'`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
