# 765 - TASK-234 Security Gate Trivy SARIF and Blocking Output

- Date: 2026-04-28
- Version: Unreleased
- Tasks: TASK-234

## Key Changes

### CI/CD Security

- Split Trivy in `security-gate.yml` into a non-blocking SARIF generation step
  and a separate blocking table-output step.
- Set the SARIF step to `exit-code: "0"` and
  `limit-severities-for-sarif: true` so GitHub Code Scanning can receive the
  report without failing before upload.
- Kept HIGH/CRITICAL enforcement in a readable `Run Trivy (Blocking Gate)` step
  with `exit-code: "1"` and `skip-setup-trivy: true`.
- Updated the security gate config test and security/release-gate docs to cover
  the split SARIF/blocking contract.

## Validation

- Passed:
  - `bun test tests/unit/security/securityGateConfig.test.ts`
  - YAML parse for `.github/workflows/security-gate.yml`
  - `git diff --check`
