# 754 - TASK-223 Semantic Release and Docker Image Workflow

- Date: 2026-04-27
- Version: 1.0.0
- Tasks: TASK-223

## Key Changes

### Release Engineering

- Added a GitHub PR template with `Summary`, `Changes`, `Testing`, and
  categorized `[Release Notes]` sections.
- Added semantic-release configuration plus a local plugin that parses merged
  PR release-note bullets into root `CHANGELOG.md`.
- Added version synchronization for root/core/store/SDK package manifests,
  `CORE_VERSION`, and `bun.lock`.

### CI/CD

- Added a two-stage GitHub Actions workflow:
  - stage 1 runs semantic-release and publishes the SemVer tag/GitHub release;
  - stage 2 checks out the generated tag and builds/pushes
    `nextless-core:<version>` to GHCR.
- Added Docker `APP_VERSION` build arg, runtime `CORE_VERSION`, and OCI version
  labels so the image carries the generated release version.

### QA

- Added Vitest coverage for PR release-note extraction, Keep a Changelog
  formatting, changelog upsert behavior, package version updates, and PR-number
  discovery.

## Validation

- Passed:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/semantic-release-pr-notes.test.ts`
  - `bun run lint:repo:types`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun --cwd store lint`
  - `./node_modules/.bin/tsc -p packages/sdk/tsconfig.json --noEmit`
  - `bun test tests/unit/sdk`
  - `./node_modules/.bin/semantic-release --dry-run --no-ci`
  - `docker buildx build --check --build-arg APP_VERSION=1.0.0 -f Dockerfile .`
