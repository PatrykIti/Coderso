# TASK-228: Security Gate Trivy Action Pin Repair
# FileName: TASK-228_Security_Gate_Trivy_Action_Pin_Repair.md

**Priority:** High
**Category:** CI/CD + Security Tooling
**Estimated Effort:** Small
**Dependencies:** TASK-217
**Status:** Done (2026-04-28)

---

## Overview

Fix the security gate workflow after GitHub Actions failed to resolve
`aquasecurity/trivy-action@0.24.0`. The official Trivy Action documentation now
shows versioned action usage with the `v` prefix, for example
`aquasecurity/trivy-action@v0.36.0`.

## Sub-Tasks

- [x] Replace the unavailable Trivy Action reference in
  `.github/workflows/security-gate.yml`.
- [x] Add a regression assertion so the security gate config test catches a
  stale/unresolvable Trivy Action pin.
- [x] Update task board and changelog.

## Files Changed

- `.github/workflows/security-gate.yml`
- `tests/unit/security/securityGateConfig.test.ts`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/759-2026-04-28-task-228-security-gate-trivy-action-pin-repair.md`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: internal CI security workflow.
- Auth model: unchanged; no new secrets or tokens.
- RBAC: unchanged; workflow keeps `contents: read` and `security-events: write`.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - scanner coverage remains strict for Semgrep, Trivy, and Gitleaks;
  - no scanner allowlist or severity downgrade is introduced;
  - SARIF upload behavior remains unchanged.

## Testing Requirements

- `bun test tests/unit/security/securityGateConfig.test.ts`
- `git diff --check`
- YAML parse for `.github/workflows/security-gate.yml`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. Security gate workflow resolves Trivy Action through a valid `v`-prefixed
   release tag.
2. Trivy scan inputs, severity, scanners, SARIF output, and exit-code behavior
   remain unchanged.
3. Regression test asserts the expected Trivy Action pin.
