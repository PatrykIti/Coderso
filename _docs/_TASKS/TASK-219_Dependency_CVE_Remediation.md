# TASK-219: Dependency CVE Remediation
# FileName: TASK-219_Dependency_CVE_Remediation.md

**Priority:** High
**Category:** Security + Dependencies
**Estimated Effort:** Medium
**Dependencies:** TASK-217
**Status:** To Do

---

## Overview

Remediate the dependency CVEs surfaced by the hardened `TASK-217` scanner matrix. The new local security scan now includes Bun audit and Trivy dev-dependency lockfile coverage, which exposes high/critical findings in build/test tooling dependencies that were previously suppressed.

Current strict scanner findings from 2026-04-27:
- `happy-dom` `17.6.3`: critical VM context escape; fixed line starts at `20.0.0`, with additional high findings fixed by `20.8.9`.
- `vite` `7.3.1`: high dev-server findings; fixed by `7.3.2` or `8.0.5` depending dependency path.
- `rollup` `4.56.0`: high path traversal / arbitrary write; fixed by `4.59.0`.
- `picomatch` `4.0.3`: high ReDoS; fixed by `4.0.4`.
- `flatted` `3.3.3`: high DoS/prototype pollution; fixed by `3.4.2`.
- `minimatch` `3.1.2`: high ReDoS; fixed by at least `3.1.4` on the 3.x line or newer compatible major lines.

## Sub-Tasks

No child task files yet. Add leaf files if the remediation splits into unrelated major dependency upgrade lanes.

## Files to Change

- `package.json`
- `bun.lock`
- `core/package.json` if direct workspace dependency versions need adjustment
- `tests/**` only if dependency behavior changes require test updates
- `_docs/SECURITY_SPEC.md` if scanner policy or temporary exceptions change
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion

## Security Contract

- Visibility: engineering/dependency supply chain.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - do not suppress CVEs without owner, reason, expiry, and task/ticket id,
  - prefer compatible fixed versions before broad major upgrades,
  - if a major test/runtime tool upgrade is required, validate impacted Vitest/admin/UI lanes before closing.
- Idempotency: dependency lockfile updates must be reproducible via `bun install`.
- Secret handling: no package manager tokens or registry credentials may be committed.

## Testing Requirements

- `bun install`
- `bun run scan:security:strict`
- `bun test tests/unit/security/securityGateConfig.test.ts`
- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`
- Relevant focused suites for any dependency behavior changes
- `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion
- `_docs/SECURITY_SPEC.md` only if temporary scanner exceptions are needed

## Acceptance Criteria

1. `bun audit --audit-level high` is clean or has only documented, time-boxed exceptions.
2. `trivy fs --scanners vuln --severity HIGH,CRITICAL --ignore-unfixed --include-dev-deps ...` is clean or has only documented, time-boxed exceptions.
3. `bun run scan:security:strict` passes after dependency remediation and Dockerfile config scan remains clean.
4. Vitest/admin UI lanes still pass after `happy-dom`, Vite, Rollup, and transitive glob dependency updates.
5. Changelog and task board are synchronized.
