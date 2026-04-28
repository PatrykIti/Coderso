# 767 - TASK-236 Semantic Release Node Runtime Pin

- Date: 2026-04-28
- Version: Unreleased
- Tasks: TASK-236

## Key Changes

### Release Engineering

- Added `NODE_VERSION=22.14.0` to the `Semantic Release` workflow so
  `semantic-release@25` runs on a supported Node runtime.
- Added `actions/setup-node@v4` before dependency installation and
  `bun run release:semantic`.
- Added a release runtime verification step that prints `node --version` and
  `bun --version`.
- Added workflow regression coverage for the semantic-release Node runtime
  contract.
- Added local semantic-release config regression coverage for branches, tag
  format, plugins, release rules, generated assets, and referenced release
  files.
- Updated release process docs, task board, and changelog.

## Validation

- Passed:
  - `bun test tests/unit/release/releaseWorkflowConfig.test.ts`
  - `bun test tests/unit/release`
  - YAML parse for `.github/workflows/release.yml`
  - `./node_modules/.bin/semantic-release --dry-run --no-ci` on Node 22.22.2
    (runtime/plugin loading passed; expected non-main branch guard)
  - `git diff --check`
