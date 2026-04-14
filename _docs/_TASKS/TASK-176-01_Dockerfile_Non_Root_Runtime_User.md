# TASK-176-01: Dockerfile Non-Root Runtime User
# FileName: TASK-176-01_Dockerfile_Non_Root_Runtime_User.md

**Priority:** High
**Category:** Security + Runtime
**Estimated Effort:** Small
**Dependencies:** TASK-176
**Status:** To Do

---

## Overview

Fix Semgrep finding `dockerfile.security.missing-user.missing-user` by ensuring the production Docker image does not run the application as root.

Current finding:
- `Dockerfile:35`
- `CMD ["bun", "run", "server/prod.ts"]`

## Sub-Tasks

No child task files.

## Files to Change

- `Dockerfile`
- Docker/runtime docs if the runtime user affects deployment assumptions
- Docker build/run tests if needed

## Security Contract

- Visibility: runtime container hardening.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - production runtime must not run as root,
  - file ownership must allow only necessary app writes,
  - no broad writable root filesystem assumptions unless explicitly required.
- Idempotency: not applicable.
- Secret handling: do not copy secrets into the image or Dockerfile.

## Testing Requirements

- Build the Docker image or run the repo-supported Docker build command.
- `bun run scan:semgrep` should no longer report the Dockerfile missing-user finding.
- Run at minimum:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` if the container runtime contract changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. Dockerfile uses a non-root runtime user.
2. App can still start in the container.
3. Semgrep Dockerfile missing-user finding is resolved.
