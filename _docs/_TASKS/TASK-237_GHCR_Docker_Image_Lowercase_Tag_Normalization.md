# TASK-237: GHCR Docker Image Lowercase Tag Normalization
# FileName: TASK-237_GHCR_Docker_Image_Lowercase_Tag_Normalization.md

**Priority:** High
**Category:** Release Engineering + CI
**Estimated Effort:** Small
**Dependencies:** TASK-223, TASK-236
**Status:** Done (2026-04-29)

---

## Overview

Fix the Docker publish stage after semantic-release successfully produced
version `1.0.0`, but `docker/build-push-action@v6` failed with:

```text
invalid tag "ghcr.io/PatrykIti/coderso-core:1.0.0": repository name must be lowercase
```

GitHub owner names may contain uppercase characters, but Docker repository names
must be lowercase. The release workflow must normalize the GHCR owner and image
name before generating Docker tags.

## Sub-Tasks

- [x] Lowercase `GITHUB_REPOSITORY_OWNER` before building the GHCR image name.
- [x] Lowercase `DOCKER_IMAGE_NAME` as a defensive guard.
- [x] Add workflow regression coverage for lowercase GHCR tag generation.
- [x] Verify semantic-release produced tag `1.0.0` and synchronized version
  files.
- [x] Update release docs, task board, and changelog.

## Files Changed

- `.github/workflows/release.yml`
- `tests/unit/release/releaseWorkflowConfig.test.ts`
- `_docs/RELEASE_PROCESS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/768-2026-04-29-task-237-ghcr-docker-image-lowercase-tag-normalization.md`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: release CI workflow only.
- Auth model: unchanged; Docker publish still uses the workflow
  `GITHUB_TOKEN` with `packages: write`.
- RBAC: unchanged.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse: no new token, permission, or registry target is introduced; the
  workflow only normalizes the existing GHCR image reference.

## Testing Requirements

- `bun test tests/unit/release`
- YAML parse for `.github/workflows/release.yml`
- Shell simulation for mixed-case owner/image normalization
- Semantic-release output inspection for tag/version synchronization
- Remote `git ls-remote --tags origin 1.0.0`
- GitHub release inspection for `1.0.0`
- `git diff --check`

## Documentation Updates Required

- `_docs/RELEASE_PROCESS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. GHCR image tags use lowercase owner and image name.
2. `ghcr.io/PatrykIti/coderso-core:*` is no longer emitted.
3. Release workflow tests fail if lowercase normalization is removed.
4. Semantic-release version files remain synchronized at `1.0.0`.
5. Remote tag `1.0.0` and GitHub Release `1.0.0` are published.
