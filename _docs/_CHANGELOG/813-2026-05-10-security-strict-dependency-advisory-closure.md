# 813 - Security strict dependency advisory closure

**Date:** 2026-05-10
**Version:** Unreleased
**Tasks:** TASK-190

## Key Changes

### Dependency advisory closure

- Added root `overrides` for `fast-uri` and `fast-xml-builder` so the lockfile
  resolves the fixed transitive versions used by `ajv` and XML-related storage
  dependencies.
- Refreshed `bun.lock` through `bun install`, moving the vulnerable transitive
  versions out of the strict security scan surface without widening the direct
  dependency graph.

## Validation

- `bun run scan:security:strict`
- `bun run precommit`
