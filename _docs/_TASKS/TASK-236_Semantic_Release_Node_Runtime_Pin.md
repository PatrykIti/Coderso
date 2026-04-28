# TASK-236: Semantic Release Node Runtime Pin
# FileName: TASK-236_Semantic_Release_Node_Runtime_Pin.md

**Priority:** High
**Category:** Release Engineering + CI
**Estimated Effort:** Small
**Dependencies:** TASK-223, TASK-227
**Status:** Done (2026-04-28)

---

## Overview

Fix the `Semantic Release` workflow failure:

```text
[semantic-release]: node version ^22.14.0 || >= 24.10.0 is required. Found v20.20.2.
```

The workflow set up Bun but did not set up a Node runtime compatible with
`semantic-release@25`, so GitHub Actions used the runner's default Node 20.

## Sub-Tasks

- [x] Pin `NODE_VERSION=22.14.0` in `.github/workflows/release.yml`.
- [x] Add `actions/setup-node@v4` before dependency install and
  `bun run release:semantic`.
- [x] Add a release runtime verification step that prints `node --version` and
  `bun --version`.
- [x] Add workflow regression coverage for the Node runtime contract.
- [x] Add local semantic-release config regression coverage.
- [x] Update release docs, task board, and changelog.

## Files Changed

- `.github/workflows/release.yml`
- `tests/unit/release/releaseConfig.test.ts`
- `tests/unit/release/releaseWorkflowConfig.test.ts`
- `_docs/RELEASE_PROCESS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/767-2026-04-28-task-236-semantic-release-node-runtime-pin.md`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: release CI workflow only.
- Auth model: unchanged; semantic-release still uses the GitHub App token from
  `SEMANTIC_RELEASE_APP_ID` and `SEMANTIC_RELEASE_APP_PRIVATE_KEY`.
- RBAC: unchanged.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse: the runtime pin does not add credentials or widen workflow
  permissions; it only ensures release tooling runs on the supported Node
  runtime.

## Testing Requirements

- `bun test tests/unit/release/releaseWorkflowConfig.test.ts`
- `bun test tests/unit/release`
- YAML parse for `.github/workflows/release.yml`
- `./node_modules/.bin/semantic-release --dry-run --no-ci` on Node 22.22.2
  (passes runtime/plugin loading; stops at expected non-main branch guard)
- `git diff --check`

## Documentation Updates Required

- `_docs/RELEASE_PROCESS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. The release workflow installs Node 22.14.0 before semantic-release runs.
2. The workflow prints Node and Bun versions before dependency install.
3. The semantic-release GitHub App auth contract remains unchanged.
4. Regression tests fail if the Node runtime pin is removed.
5. Local release config tests verify semantic-release branches, tag format,
   plugins, release rules, generated assets, and referenced release files.
