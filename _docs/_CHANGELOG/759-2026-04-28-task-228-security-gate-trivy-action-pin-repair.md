# 759 - TASK-228 Security Gate Trivy Action Pin Repair

- Date: 2026-04-28
- Version: Unreleased
- Tasks: TASK-228

## Key Changes

### CI/CD

- Updated the Security Gate workflow from the unavailable
  `aquasecurity/trivy-action@0.24.0` pin to the current documented
  `aquasecurity/trivy-action@v0.36.0` format.
- Kept Trivy scan type, scanners, severity, SARIF output, skip paths, and strict
  exit behavior unchanged.

### QA

- Added a regression assertion to `securityGateConfig.test.ts` so future stale
  Trivy Action pins are caught in the repository test suite.

## Validation

- Passed:
  - `bun test tests/unit/security/securityGateConfig.test.ts`
  - `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/security-gate.yml"); puts "security-gate.yml YAML OK"'`
  - `git diff --check`
