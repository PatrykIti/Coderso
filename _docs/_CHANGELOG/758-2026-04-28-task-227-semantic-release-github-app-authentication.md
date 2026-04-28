# 758 - TASK-227 Semantic Release GitHub App Authentication

- Date: 2026-04-28
- Version: Unreleased
- Tasks: TASK-227

## Key Changes

### Release Engineering

- Updated the `Semantic Release` workflow to create a GitHub App installation
  token from `SEMANTIC_RELEASE_APP_ID` and
  `SEMANTIC_RELEASE_APP_PRIVATE_KEY`.
- Changed the semantic-release checkout to use the app token so release
  commits and tags are pushed by the bypass-approved app identity.
- Passed the app token to semantic-release as both `GH_TOKEN` and
  `GITHUB_TOKEN` for release API calls.
- Changed the Docker image job release-tag checkout to use the same app-token
  pattern.

### Security

- Documented that GHCR package publishing stays on the workflow `GITHUB_TOKEN`
  with `packages: write`, because package publish does not need branch
  protection bypass.

## Validation

- Passed:
  - `git diff --check`
