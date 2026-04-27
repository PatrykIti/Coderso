# TASK-219-03-01: Strict Security Scan CVE Closure
# FileName: TASK-219-03-01_Strict_Security_Scan_CVE_Closure.md

**Priority:** High
**Category:** Security + QA
**Estimated Effort:** Medium
**Dependencies:** TASK-219-01-01, TASK-219-01-02, TASK-219-02-01, TASK-219-02-02, TASK-219-03
**Status:** To Do

---

## Overview

Prove the hardened security scanner matrix passes after dependency remediation. This leaf is the release-quality proof that the scan is no longer only advisory noise.

## Sub-Tasks

- [ ] Run direct audit and Trivy vulnerability checks.
- [ ] Run full `scan:security:strict`.
- [ ] Generate SBOM after the lockfile is clean.
- [ ] Record scanner summary in the closure changelog.

## Files to Change

- `.trivyignore` only if a justified time-boxed exception is unavoidable.
- `_docs/SECURITY_SPEC.md` only if scanner policy or exceptions change.
- `_docs/_CHANGELOG/*` during closure.

## Security Contract

- Visibility: local and CI scanner validation.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - no silent scanner scope reductions,
  - no removal of `--include-dev-deps`,
  - no broad `.trivyignore` entries.
- Secret handling: scanner output must not expose secrets; Gitleaks remains redacted.

## Pseudocode

```bash
bun audit --audit-level high
trivy fs --scanners vuln --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed --include-dev-deps --skip-dirs _docs --skip-dirs node_modules --skip-dirs dist --skip-dirs build --skip-dirs .next --skip-dirs .git .
bun run scan:security:strict
bun run scan:sbom
```

Expected full scan result:

```text
semgrep-sast: ok
bun-audit: ok
trivy-vuln: ok
trivy-config: ok
trivy-secret: ok
gitleaks-history: ok
gitleaks-worktree: ok
```

## Testing Requirements

- `bun audit --audit-level high`
- `trivy fs --scanners vuln --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed --include-dev-deps --skip-dirs _docs --skip-dirs node_modules --skip-dirs dist --skip-dirs build --skip-dirs .next --skip-dirs .git .`
- `bun run scan:security:strict`
- `bun run scan:sbom`
- `git diff --check`

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` if scanner exceptions/policy changed.
- Closure changelog scanner evidence.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. `bun run scan:security:strict` exits `0`.
2. SBOM generation succeeds.
3. Any exception is narrow, time-boxed, and documented with owner/reason/ticket.
