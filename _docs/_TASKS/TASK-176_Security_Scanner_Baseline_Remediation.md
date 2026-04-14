# TASK-176: Security Scanner Baseline Remediation
# FileName: TASK-176_Security_Scanner_Baseline_Remediation.md

**Priority:** High
**Category:** Security + QA + Tooling
**Estimated Effort:** Large
**Dependencies:** TASK-174
**Status:** To Do

---

## Overview

Remediate the current local scanner baseline from `bun run scan:security` so Semgrep, Trivy, and Gitleaks can become useful routine checks instead of noisy advisory output.

Current baseline from 2026-04-14:
- Semgrep: 17 blocking code findings.
- Trivy: 6 runtime dependency findings in `bun.lock` after excluding non-runtime paths aligned with `.semgrep.yml`.
- Gitleaks: clean.

## Sub-Tasks

- `TASK-176-01_Dockerfile_Non_Root_Runtime_User.md`
- `TASK-176-02_AES_GCM_Tag_Length_Hardening.md`
- `TASK-176-03_Post_HTML_Rendering_Sanitization_Audit.md`
- `TASK-176-04_CORS_Origin_Validation_Hardening.md`
- `TASK-176-05_Runtime_Dependency_CVE_Upgrades.md`
- `TASK-176-06_Scanner_Strict_Mode_and_Baseline_Policy.md`

## Architecture

Scanner remediation rules:
- Prefer fixing production code over suppressing findings.
- Suppress only false positives or accepted residual risk.
- Scanner ignore/config changes must record owner, reason, expiry/review date, and ticket/task id.
- Runtime dependency CVEs must be remediated in package manifests/lockfiles, not hidden through global ignores.
- Documentation/reference paths may be excluded from SCA scans only when they are not runtime dependency surfaces.

## Security Contract

- Visibility: internal engineering/tooling only.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: any changed runtime/API payload validation must keep strict rejection.
- Anti-abuse:
  - no scanner suppression without owner/reason/expiry/task id,
  - no broad allowlists that could hide future runtime findings,
  - no weakening CORS, sanitizer, crypto, or container runtime behavior to satisfy scanners.
- Idempotency: not applicable.
- Secret handling:
  - Gitleaks must stay clean,
  - scanner logs must not add real secrets,
  - sample values must remain placeholders.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run scan:semgrep`
- `bun run scan:trivy`
- `bun run scan:gitleaks`
- `bun run test:security`
- Relevant targeted suites per subtask.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_RELEASE_GATES.md` if gate behavior changes
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entries per completed leaf

## Acceptance Criteria

1. Scanner baseline is reduced to either zero findings or documented time-boxed exceptions.
2. Semgrep findings are fixed or explicitly justified with local comments/config and docs.
3. Trivy runtime dependency findings in `bun.lock` are fixed or tracked with time-boxed exceptions.
4. Gitleaks remains clean.
5. Strict scanner scripts/gates are enabled only after the baseline is actionable.

## Progress Notes

- 2026-04-14: Completed `TASK-176-01`; Dockerfile production runner now uses non-root `bun` user and the Semgrep Dockerfile missing-user finding is resolved.
- 2026-04-14: Completed `TASK-176-02`; AES-GCM email/secret decrypt paths now use explicit 16-byte auth tag length and reject malformed IV/tag lengths.
- 2026-04-14: Completed `TASK-176-03`; post editor/runtime rich text rendering now uses sanitized React-node rendering and no longer relies on `dangerouslySetInnerHTML`.
