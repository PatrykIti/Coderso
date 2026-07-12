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

Provide DB-backed rollback, concurrency serialization, cache-after-commit proof, projection/static guards,
route compatibility, documentation, TASK-517 re-audit, and changelog 1249. This
subtask owns additive cross-domain tests/docs plus the existing Admin entries-client
cacheBus regression and cannot reopen production source or re-baseline source-owner
assertions.

## Leaf

TASK-537-03-L01 is the only leaf. Source leaves already own their pre-gate behavior-test
changes; this leaf owns additive cross-domain rollback/cache test changes, relevant
docs, task/index status changes, TASK-517 read-only re-audit evidence, and changelog
1249. The client-side cache proof is owned by
`tests/vitest/admin/entriesClient.test.ts`; production Admin client code is read-only.

The final cache proof distinguishes three owners: an entry SEO mutation clears the global
site cache once after commit; another successful metadata/status mutation performs one
targeted content-entry invalidation after commit; browser `cacheBus` events remain owned
by `entriesClient` and happen only after a successful response. A post-commit invalidator
failure is caught after durable state exists, reports only a stable redacted code, and
still returns the committed result so client reconciliation can run; it is never reported
or asserted as a DB rollback. Concurrency tests prove row-lock serialization for password keep/clear
and per-entry revision numbering.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bun x tsc -p tsconfig.json --noEmit
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/content/entryService.test.ts \
  tests/unit/auth/rbac.test.ts \
  tests/unit/content/taxonomyService.test.ts \
  tests/unit/seo/seoService.test.ts \
  tests/integration/routes/contentEntriesRoutes.test.ts \
  tests/integration/routes/contentTypes.test.ts \
  tests/integration/runtime/detail-page-preview-cache.test.ts \
  tests/integration/runtime/detail-page-runtime.test.ts \
  tests/integration/runtime/detail-page-composer-runtime.test.tsx
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/security/codersoSecurityGate.test.ts
NODE_ENV=test bunx vitest run --config vitest.config.ts \
  tests/vitest/admin/entriesClient.test.ts
semgrep --error --timeout 120 --timeout-threshold 0 \
  --config .semgrep.yml --config p/owasp-top-ten --config p/security-audit \
  --config p/nodejs --config p/typescript \
  core/services/content/taxonomyService.ts core/services/seo/seoService.ts \
  core/services/content/entryService.ts core/server/routes/contentEntryRoutes.ts \
  core/server/routes/index.ts \
  core/services/auth/roleService.ts core/server/middleware/rbac.ts
bun run gates:coderso
bun run scan:security:strict
git diff --check
~~~

Post-audit lenses cover transaction completeness, secret projections, row-lock
concurrency, cache-after-commit, route/RBAC/error mapping, and TASK-517 compatibility.
TASK-517 itself remains untouched: closure records its missing TASK-537 dependency, stale
entry-service anchors, and occupied/stale changelog metadata for its future owner.
