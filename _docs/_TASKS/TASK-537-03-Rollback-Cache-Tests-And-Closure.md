# TASK-537-03: Rollback, Cache Tests, and Closure

# FileName: TASK-537-03-Rollback-Cache-Tests-And-Closure.md

**Parent Task:** TASK-537
**Priority:** High
**Category:** DB Tests / Cache / Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-537-02
**Status:** ⏳ To Do
**Changelog:** 1249 (pinned; create only at implementation closure)

---

## Scope

Provide DB-backed rollback and cache-after-commit proof, projection/static guards,
route compatibility, documentation, TASK-517 re-audit, and changelog 1249. This
subtask owns additive cross-domain tests/docs only and cannot reopen production source or
re-baseline source-owner assertions.

## Leaf

TASK-537-03-L01 is the only leaf. Source leaves already own their pre-gate behavior-test
changes; this leaf owns additive cross-domain rollback/cache test changes, relevant
docs, task/index status changes, TASK-517 read-only re-audit evidence, and changelog
1249.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/content/entryService.test.ts \
  tests/unit/content/taxonomyService.test.ts \
  tests/unit/seo/seoService.test.ts \
  tests/integration/routes/contentEntriesRoutes.test.ts \
  tests/integration/runtime/detail-page-preview-cache.test.ts
bun run gates:coderso
~~~

Post-audit lenses cover transaction completeness, secret projections,
cache-after-commit, route error mapping, and TASK-517 compatibility.
