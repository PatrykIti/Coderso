# 768 - TASK-237 GHCR Docker Image Lowercase Tag Normalization

- Date: 2026-04-29
- Version: Unreleased
- Tasks: TASK-237

## Key Changes

### Release Engineering

- Updated the release workflow to lowercase `GITHUB_REPOSITORY_OWNER` and
  `DOCKER_IMAGE_NAME` before generating GHCR Docker tags.
- Fixed the Docker publish failure for mixed-case GitHub owner names such as
  `PatrykIti`.
- Added workflow regression coverage for lowercase GHCR tag generation.
- Documented the Docker image naming rule in the release process docs.
- Verified semantic-release produced tag `1.0.0` and synchronized package/core
  versions to `1.0.0`.
- Verified remote tag `1.0.0` and published GitHub Release `1.0.0`.

## Validation

- Passed:
  - `bun test tests/unit/release`
  - YAML parse for `.github/workflows/release.yml`
  - Shell simulation for mixed-case owner/image normalization
  - Semantic-release output inspection for tag/version synchronization
  - Remote `git ls-remote --tags origin 1.0.0`
  - GitHub release inspection for `1.0.0`
  - `git diff --check`
