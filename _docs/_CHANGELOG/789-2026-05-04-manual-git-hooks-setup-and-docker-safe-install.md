# 789 - Manual git hooks setup and Docker-safe install

Date: 2026-05-04
Version: Unreleased
Tasks: none

## Key Changes

### Developer Tooling

- Removed the root install-time `prepare` hook setup so `bun install` no longer
  assumes `git` is installed or that the environment is a real Git worktree.
- Kept `.githooks/pre-commit` and the existing `bun run precommit` /
  `precommit:check` flow as the local commit gate.
- Restored the Docker build contract so the dependency install step can run in
  minimal builder images without Git metadata.

### Documentation

- Updated `CONTRIBUTING.md` to use the explicit one-line local setup command:
  `git config core.hooksPath .githooks`.

## Validation

- `bun test tests/unit/tools/packageScripts.test.ts` - PASS.
- `bun --cwd core lint` - PASS.
- `bun --cwd core lint:types` - PASS.
