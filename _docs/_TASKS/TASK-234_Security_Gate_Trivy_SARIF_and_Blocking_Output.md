# TASK-234: Security Gate Trivy SARIF and Blocking Output
# FileName: TASK-234_Security_Gate_Trivy_SARIF_and_Blocking_Output.md

**Priority:** High
**Category:** CI/CD + Security Tooling
**Estimated Effort:** Small
**Dependencies:** TASK-228, TASK-231
**Status:** Done (2026-04-28)

---

## Overview

Fix the latest `security-gate` failure where `aquasecurity/trivy-action@v0.36.0`
exited with code 1 while generating a SARIF report. In SARIF mode, the Actions
log does not show a useful findings table, so the workflow failed before
uploading Trivy SARIF and before reviewers could see which finding caused the
failure.

The CI contract should be:

- generate and upload Trivy SARIF reliably for GitHub Code Scanning;
- keep the uploaded SARIF limited to HIGH/CRITICAL findings for this gate;
- run a separate blocking Trivy table-output step so failing findings are
  visible in the workflow log;
- reuse the already-installed Trivy binary on the second action invocation.

## Sub-Tasks

- [x] Change the Trivy SARIF step to `exit-code: "0"`.
- [x] Add `limit-severities-for-sarif: true` so SARIF follows the configured
  HIGH/CRITICAL gate severity.
- [x] Add a separate `Run Trivy (Blocking Gate)` table-output step with
  `exit-code: "1"`.
- [x] Set `skip-setup-trivy: true` on the second Trivy action invocation.
- [x] Update the security gate config regression test.
- [x] Update security/release-gate docs, task board, and changelog.

## Files Changed

- `.github/workflows/security-gate.yml`
- `tests/unit/security/securityGateConfig.test.ts`
- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/765-2026-04-28-task-234-security-gate-trivy-sarif-and-blocking-output.md`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: CI-only security workflow.
- Auth model: unchanged; no new secrets or tokens.
- RBAC: unchanged.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - no scanner severity downgrade is introduced;
  - Trivy still blocks on HIGH/CRITICAL findings;
  - SARIF upload is preserved for auditability;
  - blocking output is moved to a readable table step instead of hidden SARIF
    generation output.

## Testing Requirements

- `bun test tests/unit/security/securityGateConfig.test.ts`
- YAML parse for `.github/workflows/security-gate.yml`
- `git diff --check`

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. Trivy SARIF generation no longer fails the workflow before upload.
2. Trivy Code Scanning upload still receives `trivy.sarif`.
3. The security gate still fails on HIGH/CRITICAL Trivy findings.
4. Failing Trivy findings are visible as table output in the workflow log.
5. Regression tests assert the split SARIF/blocking-step contract.
