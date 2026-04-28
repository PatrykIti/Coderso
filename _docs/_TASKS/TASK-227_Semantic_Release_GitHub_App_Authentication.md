# TASK-227: Semantic Release GitHub App Authentication
# FileName: TASK-227_Semantic_Release_GitHub_App_Authentication.md

**Priority:** High
**Category:** Release Engineering + CI/CD + Security
**Estimated Effort:** Small
**Dependencies:** TASK-223
**Status:** Done (2026-04-28)

---

## Overview

Route semantic-release Git operations and GitHub release API calls through the
dedicated semantic-release GitHub App instead of the repository-scoped workflow
token. The GitHub App is expected to be installed on the repository and included
in the branch protection bypass policy.

The workflow uses these repository secrets:

- `SEMANTIC_RELEASE_APP_ID`
- `SEMANTIC_RELEASE_APP_PRIVATE_KEY`

## Sub-Tasks

- [x] Generate a GitHub App installation token in the semantic-release job.
- [x] Use the GitHub App token for the semantic-release checkout so
  `@semantic-release/git` pushes release commits/tags through the app identity.
- [x] Expose the same token as both `GH_TOKEN` and `GITHUB_TOKEN` for
  semantic-release plugins.
- [x] Generate a GitHub App token in the Docker image job and use it for the
  release-tag checkout.
- [x] Keep GHCR publishing on the workflow token because package publishing uses
  the `packages: write` workflow permission and does not require branch bypass.
- [x] Update release-process docs, task docs, changelog, and task board.

## Files Changed

- `.github/workflows/release.yml`
- `_docs/RELEASE_PROCESS.md`
- `_docs/_TASKS/TASK-223_Semantic_Release_and_Docker_Image_Workflow.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/758-2026-04-28-task-227-semantic-release-github-app-authentication.md`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: internal CI/CD workflow plus public Git tag/GitHub release
  artifacts when a release is published.
- Auth model:
  - `actions/create-github-app-token@v2` creates the installation token from
    `SEMANTIC_RELEASE_APP_ID` and `SEMANTIC_RELEASE_APP_PRIVATE_KEY`, scoped to
    the current repository with `owner` and `repositories`;
  - semantic-release checkout uses the GitHub App token so git credentials for
    release commits/tags use the bypass-capable app;
  - semantic-release plugins receive the GitHub App token through `GH_TOKEN` and
    `GITHUB_TOKEN`;
  - Docker tag checkout uses the GitHub App token;
  - GHCR login continues to use `secrets.GITHUB_TOKEN` for package publishing.
- RBAC:
  - GitHub App requires repository `contents: write` for release commits, tags,
    and releases;
  - GitHub App requires `pull-requests: read` for PR-body release notes;
  - workflow token keeps `packages: write` only in the Docker image job.
- CSRF: not applicable; no admin/runtime HTTP route is added.
- Rate-limit bucket: GitHub API calls remain bounded to release metadata and PR
  lookup in the release range.
- Reject-unknown validation: no payload schema changes.
- Anti-abuse:
  - private key stays in GitHub Actions secrets only;
  - token is created per job and not written to artifacts/logs;
  - release workflow remains limited to pushes on `main` and manual dispatch.

## Testing Requirements

- `git diff --check`
- Review `.github/workflows/release.yml` for token propagation:
  - App token before semantic-release checkout;
  - checkout token set to app token;
  - `GH_TOKEN` and `GITHUB_TOKEN` set to app token for `bun run release:semantic`;
  - Docker tag checkout token set to app token.

## Documentation Updates Required

- `_docs/RELEASE_PROCESS.md`
- `_docs/_TASKS/TASK-223_Semantic_Release_and_Docker_Image_Workflow.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. Semantic-release no longer uses the default repository `GITHUB_TOKEN` for
   release commits, tags, or GitHub release API calls.
2. Release checkout credentials come from the GitHub App installation token.
3. The Docker image job checks out the generated release tag with the GitHub App
   token.
4. GHCR publish remains explicitly scoped to the workflow token and
   `packages: write`.
5. Docs and changelog explain the new secret requirements and auth split.
