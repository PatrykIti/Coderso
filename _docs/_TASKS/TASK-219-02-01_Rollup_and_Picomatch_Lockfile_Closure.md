# TASK-219-02-01: Rollup and Picomatch Lockfile Closure
# FileName: TASK-219-02-01_Rollup_and_Picomatch_Lockfile_Closure.md

**Priority:** High
**Category:** Security + Build Tooling
**Estimated Effort:** Medium
**Dependencies:** TASK-219-01-02, TASK-219-02
**Status:** To Do

---

## Overview

Close Vite/Vitest-chain transitive CVEs for Rollup and Picomatch after the direct Vite version is fixed.

Scanner findings to close:
- `rollup@4.56.0`: high path traversal / arbitrary write, fixed by `4.59.0`.
- `picomatch@4.0.3`: high ReDoS, fixed by `4.0.4`.

## Sub-Tasks

- [ ] Confirm owners with `bun pm why rollup` and `bun pm why picomatch`.
- [ ] Check whether the Vite lock refresh already moves Rollup and Picomatch.
- [ ] Apply targeted lockfile update if vulnerable versions remain.
- [ ] Use narrow overrides only if the lockfile cannot otherwise resolve fixed versions.

## Files to Change

- `bun.lock`
- `package.json` only if a narrow override is required.
- `core/package.json` only if a direct Vite-related dependency must move.

## Security Contract

- Visibility: build/test tooling transitive dependencies.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - do not leave vulnerable `rollup@4.56.0` or `picomatch@4.0.3`,
  - do not add broad overrides that force incompatible dependency trees,
  - do not weaken Vite config to work around upgrade failures.
- Secret handling: no secrets or package tokens may be committed.

## Pseudocode

```bash
bun pm why rollup
bun pm why picomatch
rg -n '"rollup": \\["rollup@4\\.56\\.|"picomatch": \\["picomatch@4\\.0\\.3' bun.lock

# If direct Vite upgrade did not fix both:
bun update rollup picomatch

# If still vulnerable, prefer narrow root overrides:
# "overrides": {
#   "rollup": "^4.59.0",
#   "picomatch": "^4.0.4"
# }
```

## Testing Requirements

- `rg -n '"rollup": \\["rollup@4\\.56\\.|"picomatch": \\["picomatch@4\\.0\\.3' bun.lock` returns no rows.
- `bun --cwd core x vite build --config vite.config.ts`
- `bun --cwd core build:site`
- `bun run test:vitest`
- `bun audit --audit-level high`
- `trivy fs --scanners vuln --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed --include-dev-deps --skip-dirs _docs --skip-dirs node_modules --skip-dirs dist --skip-dirs build --skip-dirs .next --skip-dirs .git .`
- `git diff --check`

## Documentation Updates Required

- Parent `TASK-219` progress note on completion.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Rollup resolves to `4.59.0` or newer fixed version.
2. Picomatch resolves to `4.0.4` or newer fixed version for 4.x consumers.
3. Vite build and Vitest tooling still pass.
