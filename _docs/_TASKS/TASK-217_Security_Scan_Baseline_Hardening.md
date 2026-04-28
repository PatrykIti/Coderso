# TASK-217: Security Scan Baseline Hardening
# FileName: TASK-217_Security_Scan_Baseline_Hardening.md

**Priority:** High
**Category:** Security + Tooling
**Estimated Effort:** Medium
**Dependencies:** TASK-176
**Status:** Done (2026-04-27)

---

## Overview

Harden local and CI security scanning so `bun run scan:security` is a meaningful engineering gate for a CMS built with agent-assisted changes. The goal is broad, repeatable coverage across source SAST, dependency advisories, lockfile CVEs, Docker/IaC-style misconfiguration, filesystem secrets, Git history secrets, worktree secrets, and optional container image CVEs.

## Sub-Tasks

No child task files.

## Files Changed

- `scripts/run-security-scan.ts`
- `package.json`
- `.github/workflows/security-gate.yml`
- `.gitleaks.toml`
- `Dockerfile`
- `tests/unit/security/securityGateConfig.test.ts`
- `_docs/_TASKS/TASK-219_Dependency_CVE_Remediation.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/749-2026-04-27-task-217-security-scan-baseline-hardening.md`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: engineering/local tooling and CI security gate.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - advisory scan mode must run the full scanner matrix even when one scanner reports findings,
  - strict scan mode must fail on unapproved scanner findings,
  - scanner allowlists must stay narrow, documented, and time-boxed,
  - worktree secret scanning must not print raw leaked secret values.
- Idempotency: scanner runs should be reproducible from a clean checkout when the required CLIs are available.
- Secret handling: Gitleaks and Trivy secret scans must remain enabled; Gitleaks output is redacted.

## Testing Requirements

- `bun test tests/unit/security/securityGateConfig.test.ts`
- `bun scripts/run-security-scan.ts --strict`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/749-2026-04-27-task-217-security-scan-baseline-hardening.md`

## Acceptance Criteria

1. `bun run scan:security` runs a layered advisory scanner matrix instead of only the three old baseline tools.
2. `bun run scan:security:strict` runs the same matrix and fails on scanner findings.
3. Trivy covers dependency CVEs, Docker/IaC-style misconfiguration, and filesystem secrets.
4. Gitleaks covers both Git history and current worktree files with redacted output.
5. Bun audit is part of the local dependency advisory signal.
6. Optional container image scanning is documented and scriptable through `SECURITY_SCAN_IMAGE`.
7. CI security gate uses strict Semgrep and Trivy exit behavior.

## Progress Notes

- 2026-04-27: Completed security scan baseline hardening. Added a local scanner matrix runner, expanded package scripts, added advisory/strict modes, added optional image scan support, tightened CI Semgrep/Trivy behavior, fixed Dockerfile `WORKDIR` misconfiguration findings, and documented updated scanner scope.
- 2026-04-27: Validation recorded: Semgrep SAST clean, Trivy config clean after Dockerfile fix, Trivy secret clean, Gitleaks history/worktree clean. `bun audit` and Trivy vuln now surface dependency CVEs; remediation is tracked in `TASK-219`.
