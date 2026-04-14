# 644. TASK-176-01 Dockerfile non-root runtime user

**Date:** 2026-04-14
**Version:** 0.1.0
**Tasks:** TASK-176, TASK-176-01

## Key Changes

### Security
- Hardened the production Docker runner image to run as non-root `bun`.
- Copied runtime app files as `bun:bun` in the final image stage.
- Documented the non-root container runtime requirement in `_docs/SECURITY_SPEC.md`.
- Resolved the Semgrep `dockerfile.security.missing-user.missing-user` finding for `Dockerfile`.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - filtered Semgrep check confirming the Dockerfile missing-user finding is resolved
  - `docker build -t nextless-task-176-01 .`
  - `docker run --rm --entrypoint sh nextless-task-176-01 -lc 'id -u; id -un; test "$(id -u)" != "0"'`
- Docker runtime user verification returned UID `1000` and username `bun`.
