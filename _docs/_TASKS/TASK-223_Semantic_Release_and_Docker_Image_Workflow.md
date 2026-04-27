# TASK-223: Semantic Release and Docker Image Workflow
# FileName: TASK-223_Semantic_Release_and_Docker_Image_Workflow.md

**Priority:** High
**Category:** Release Engineering + CI/CD
**Estimated Effort:** Medium
**Dependencies:** TASK-217, TASK-219
**Status:** Done (2026-04-27)

---

## Overview

Add a semantic-release workflow that turns categorized PR release-note content
into the root `CHANGELOG.md`, synchronizes versioned project files with the
generated SemVer value, creates a Git tag/GitHub release, and then builds the
runtime Docker image with the same version tag.

## Sub-Tasks

- [x] Add the repository PR template with `Summary`, `Changes`, `Testing`, and
  categorized `[Release Notes]` blocks.
- [x] Add semantic-release config and local release-note/versioning plugin.
- [x] Add the two-stage GitHub Actions workflow:
  - stage 1: semantic release;
  - stage 2: Docker image build/push with the same release version.
- [x] Add parser tests for PR release-note extraction, changelog formatting,
  version-file updates, and PR-number discovery.
- [x] Document the release process and update repo docs indexes.

## Files to Change

- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/release.yml`
- `release.config.cjs`
- `scripts/semantic-release-pr-notes.cjs`
- `CHANGELOG.md`
- `Dockerfile`
- `package.json`
- `bun.lock`
- `core/package.json`
- `store/package.json`
- `packages/sdk/package.json`
- `core/plugins/compat.ts`
- `tests/vitest/semantic-release-pr-notes.test.ts`
- `_docs/RELEASE_PROCESS.md`
- `README.md`
- `_docs/README.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/754-2026-04-27-task-223-semantic-release-docker-workflow.md`

## Implementation Direction

- Use semantic-release on `main` only and use plain SemVer tags such as
  `1.1.0`, not `v1.1.0`.
- Keep release notes PR-body-driven:
  - parse only `[Added]`, `[Changed]`, `[Fixed]`, `[Removed]`, and
    `[Security]`;
  - ignore empty placeholders;
  - prepend the resulting sections to root `CHANGELOG.md` in Keep a Changelog
    format.
- Keep version synchronization deterministic:
  - update package manifests;
  - update the `CORE_VERSION` fallback;
  - refresh `bun.lock`.
- Build Docker only after semantic-release produced a release, checking out the
  generated tag before image build.
- Push `ghcr.io/<owner>/nextless-core:<version>` and `:latest`.

## Security Contract

- Visibility: internal CI/CD workflow plus public GitHub release artifacts when
  the repository publishes releases.
- Auth model:
  - semantic-release uses `GITHUB_TOKEN`;
  - Docker publishing uses `GITHUB_TOKEN` against GHCR.
- RBAC:
  - `contents: write` for release commits/tags/releases;
  - `pull-requests: read` for PR body release notes;
  - `packages: write` only in the Docker image stage.
- CSRF: not applicable; no admin/runtime HTTP route is added.
- Rate-limit bucket:
  - GitHub REST API calls are bounded to commits/PRs in the release range.
- Reject-unknown validation:
  - only known release-note categories are consumed.
- Anti-abuse:
  - release-note parser ignores empty placeholders and does not execute PR
    body content;
  - Docker image tags are generated only from semantic-release SemVer output;
  - release workflow runs only on `main` pushes or manual dispatch.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/semantic-release-pr-notes.test.ts`
- `bun run lint:repo:types`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/semantic-release --dry-run --no-ci`

## Documentation Updates Required

- Root `CHANGELOG.md` baseline.
- `_docs/RELEASE_PROCESS.md`.
- `README.md`.
- `_docs/README.md`.
- `_docs/_TASKS/README.md`.
- `_docs/_CHANGELOG/README.md`.
- `_docs/_CHANGELOG/754-2026-04-27-task-223-semantic-release-docker-workflow.md`.

## Acceptance Criteria

1. PRs have a default body structure with categorized release-note bullets.
2. Semantic-release creates plain SemVer Git tags and a GitHub release.
3. Root `CHANGELOG.md` receives PR-body release notes grouped by Keep a
   Changelog sections.
4. Version-bearing package manifests, `CORE_VERSION`, and `bun.lock` are
   updated to the generated release version.
5. Docker image build runs as a second stage and tags `nextless-core` with the
   same release version.
