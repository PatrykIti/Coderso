# TASK-235: Security Gate Gitleaks Action v2 Contract
# FileName: TASK-235_Security_Gate_Gitleaks_Action_v2_Contract.md

**Priority:** High
**Category:** CI/CD + Security Tooling
**Estimated Effort:** Small
**Dependencies:** TASK-217, TASK-231
**Status:** Done (2026-04-28)

---

## Overview

Fix the `security-gate` Gitleaks step after `gitleaks/gitleaks-action@v2`
reported unsupported inputs and failed pull request scans because `GITHUB_TOKEN`
was not configured.

The action v2 contract is environment-variable based:

- `GITHUB_TOKEN` is required for pull request scans;
- `GITLEAKS_CONFIG` points at the repository config file;
- `GITLEAKS_ENABLE_COMMENTS=false` avoids automatic PR comments from the
  scanner;
- `GITLEAKS_ENABLE_UPLOAD_ARTIFACT=true` leaves the action-owned SARIF artifact
  behavior enabled.

## Sub-Tasks

- [x] Add `fetch-depth: 0` to checkout for Gitleaks history-aware scanning.
- [x] Remove unsupported `with.config`, `with.report-format`, and
  `with.report-path` inputs from the Gitleaks action step.
- [x] Add `GITHUB_TOKEN` and Gitleaks env configuration.
- [x] Remove the separate CodeQL upload for a `gitleaks.sarif` file that the
  action does not produce via those inputs.
- [x] Update workflow regression coverage, docs, task board, and changelog.

## Files Changed

- `.github/workflows/security-gate.yml`
- `tests/unit/security/securityGateConfig.test.ts`
- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/766-2026-04-28-task-235-security-gate-gitleaks-action-v2-contract.md`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: CI-only security workflow.
- Auth model: uses the automatically provided `GITHUB_TOKEN` for pull request
  scan metadata; no new repository secret is introduced.
- RBAC: workflow keeps `actions: read`, `contents: read`, and
  `security-events: write`.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - Gitleaks scanning remains enabled;
  - repository `.gitleaks.toml` remains the config owner;
  - automatic PR comments are disabled to avoid noisy review comments;
  - action-owned SARIF artifact upload remains enabled.

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

1. Gitleaks Action v2 no longer receives unsupported `with` inputs.
2. Pull request scans receive `GITHUB_TOKEN`.
3. Gitleaks uses `.gitleaks.toml`.
4. The workflow no longer uploads a nonexistent `gitleaks.sarif` via
   `upload-sarif`.
5. Regression tests assert the Gitleaks v2 environment-variable contract.
