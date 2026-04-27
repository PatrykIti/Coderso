# TASK-219-03: Scanner Validation and Closure
# FileName: TASK-219-03_Scanner_Validation_and_Closure.md

**Priority:** High
**Category:** Security + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-219-01, TASK-219-02
**Status:** To Do

---

## Overview

Validate that dependency remediation actually closes the hardened scanner matrix from `TASK-217`, then synchronize task docs, changelog, and any security policy notes.

## Sub-Tasks

- [ ] TASK-219-03-01: Strict Security Scan CVE Closure
- [ ] TASK-219-03-02: Docs, Changelog, and Board Closure

## Security Contract

- Visibility: local and CI security gates.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - do not close the task unless `scan:security:strict` passes or every exception is documented and time-boxed,
  - keep `--include-dev-deps` and secret scans enabled,
  - record scanner output accurately in the changelog.
- Secret handling: Gitleaks and Trivy secret scans must remain clean.

## Testing Requirements

- `bun run scan:security:strict`
- `bun run scan:sbom`
- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/TASK-219*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new changelog file for `TASK-219` closure.
- `_docs/SECURITY_SPEC.md` only if exceptions/policy changed.

## Acceptance Criteria

1. Strict scanner matrix no longer reports the dependency CVEs.
2. Scanner policy remains at least as strong as `TASK-217`.
3. Task board and changelog are synchronized at closure.
