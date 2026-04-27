# TASK-219-01: Direct Test and Build Tooling Bumps
# FileName: TASK-219-01_Direct_Test_and_Build_Tooling_Bumps.md

**Priority:** High
**Category:** Security + Dependencies + Tooling
**Estimated Effort:** Medium
**Dependencies:** TASK-219
**Status:** To Do

---

## Overview

Update the direct dependency owners that currently keep the lockfile on vulnerable scanner rows:

- root `package.json` owns `happy-dom` for the Vitest DOM lane,
- `core/package.json` owns `vite` for admin/site builds and dev-server tooling.

This subtask must use minimal fixed versions first and avoid broad runtime dependency churn.

## Sub-Tasks

- [ ] TASK-219-01-01: Happy DOM Vitest Runtime Upgrade
- [ ] TASK-219-01-02: Vite Core Build Tool Upgrade

## Security Contract

- Visibility: local tooling, CI test/build tooling, and lockfile supply chain.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - do not suppress `happy-dom` or `vite` CVEs,
  - keep package manager registry credentials out of committed files,
  - validate the DOM/test and build lanes before closing.
- Secret handling: no package tokens or registry credentials may be committed.

## Testing Requirements

- `bun pm why happy-dom`
- `bun pm why vite`
- `bun audit --audit-level high`
- `bun run test:vitest`
- `bun --cwd core x vite build --config vite.config.ts`
- `bun --cwd core build:site`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/README.md` on status changes.
- Parent `TASK-219` progress notes on completion.
- Changelog entry only when the family is completed.

## Acceptance Criteria

1. Direct manifests no longer request vulnerable `happy-dom` or `vite` versions.
2. `bun.lock` resolves `happy-dom` and `vite` to fixed versions.
3. Vitest and both Vite builds still pass.
4. No unrelated runtime dependency family is changed unless required by lock resolution.
