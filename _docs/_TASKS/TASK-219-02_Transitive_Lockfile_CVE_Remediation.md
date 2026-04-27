# TASK-219-02: Transitive Lockfile CVE Remediation
# FileName: TASK-219-02_Transitive_Lockfile_CVE_Remediation.md

**Priority:** High
**Category:** Security + Lockfile
**Estimated Effort:** Medium
**Dependencies:** TASK-219-01
**Status:** Done (2026-04-27)

---

## Overview

Close the remaining HIGH/CRITICAL lockfile findings after direct `happy-dom` and `vite` owners are fixed. This subtask owns transitive remediation for Rollup/Picomatch and ESLint-chain Flatted/Minimatch without broad major upgrades.

## Sub-Tasks

- [x] TASK-219-02-01: Rollup and Picomatch Lockfile Closure
- [x] TASK-219-02-02: ESLint Flatted and Minimatch Closure

## Security Contract

- Visibility: lockfile supply chain and local/CI tooling.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - prefer lockfile-compatible fixed versions,
  - avoid global overrides that collapse incompatible dependency majors,
  - use scanner exceptions only with owner, reason, expiry, and ticket.
- Secret handling: no package registry credentials may be committed.

## Testing Requirements

- `bun pm why rollup`
- `bun pm why picomatch`
- `bun pm why flatted`
- `bun pm why minimatch`
- `bun audit --audit-level high`
- `trivy fs --scanners vuln --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed --include-dev-deps --skip-dirs _docs --skip-dirs node_modules --skip-dirs dist --skip-dirs build --skip-dirs .next --skip-dirs .git .`
- `bun --cwd core lint`
- `bun run test:vitest`
- `git diff --check`

## Documentation Updates Required

- Parent `TASK-219` progress note on completion.
- `_docs/SECURITY_SPEC.md` only if an exception is required.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. `bun.lock` no longer resolves vulnerable Rollup, Picomatch, Flatted, or Minimatch rows.
2. Overrides, if any, are narrow and documented.
3. Lint/build/test tooling still works after transitive updates.

## Progress Notes

- 2026-04-27: Completed transitive lockfile closure. Vite 8 removed the vulnerable Rollup row from the lockfile, `picomatch` resolves to `4.0.4`, `flatted` resolves to `3.4.2`, and vulnerable `minimatch@3.1.2` rows are gone.
- 2026-04-27: Avoided a broad `minimatch` override because it would collapse incompatible major ranges. The final graph keeps a root `minimatch` `^3.1.5` for 3.x consumers while newer TypeScript tooling resolves `minimatch@10.2.5`.
