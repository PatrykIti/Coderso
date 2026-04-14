# TASK-176-06: Scanner Strict Mode and Baseline Policy
# FileName: TASK-176-06_Scanner_Strict_Mode_and_Baseline_Policy.md

**Priority:** High
**Category:** Security + Tooling
**Estimated Effort:** Medium
**Dependencies:** TASK-176-01, TASK-176-02, TASK-176-03, TASK-176-04, TASK-176-05
**Status:** To Do

---

## Overview

After the scanner baseline is remediated, add strict scanner scripts or CI gate behavior that fails on new HIGH/CRITICAL or blocking findings.

Current package scripts are advisory wrappers:
- `scan:semgrep`
- `scan:trivy`
- `scan:gitleaks`
- `scan:security`

## Sub-Tasks

No child task files.

## Files to Change

- `package.json`
- `.semgrep.yml`
- `.trivyignore` if time-boxed exceptions are unavoidable
- `.gitleaks.toml` if false positives require allowlisting
- CI workflow files if scanner gates are wired there
- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_RELEASE_GATES.md`

## Security Contract

- Visibility: engineering/CI tooling.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - strict scripts must fail on unapproved new findings,
  - ignores must be narrow and time-boxed,
  - do not hide runtime dependency CVEs with broad global IDs unless explicitly accepted.
- Idempotency: scanner runs should be reproducible from a clean checkout.
- Secret handling: Gitleaks must remain enabled and fail strict mode on real leaks.

## Testing Requirements

- `bun run scan:semgrep`
- `bun run scan:trivy`
- `bun run scan:gitleaks`
- new strict scanner command(s), for example `bun run scan:security:strict`
- `bun run gates:coderso:security` if integrated
- `git diff --check`

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. Strict scanner command exists and is documented.
2. Strict mode exits non-zero on unapproved blocking/HIGH/CRITICAL findings.
3. Any remaining exceptions include owner, reason, expiry/review date, and task/ticket id.
4. Gitleaks remains clean.
