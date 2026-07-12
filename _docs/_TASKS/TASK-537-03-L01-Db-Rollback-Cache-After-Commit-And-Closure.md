# TASK-537-03-L01: DB Rollback, Cache After Commit, and Closure

# FileName: TASK-537-03-L01-Db-Rollback-Cache-After-Commit-And-Closure.md

**Parent Task:** TASK-537
**Parent Subtask:** TASK-537-03
**Priority:** High
**Category:** DB Tests / Reliability / Security / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-537-02-L01
**Status:** ⏳ To Do
**Changelog:** 1249 (pinned; create only at implementation closure)

---

## Scope and ownership

Tests-and-docs-only closure leaf. Source leaves have already updated their
changed-behavior and compatibility assertions before their gates. This leaf may add only
cross-domain DB-fault/rollback/cache-after-commit cases to the relevant
entry/taxonomy/SEO/cache test files and rerun source-owner assertions read-only; it must
not weaken or re-baseline them. It also owns an additive cacheBus assertion in
`tests/vitest/admin/entriesClient.test.ts`; `core/admin/services/entriesClient.ts`
remains read-only. It may also edit _docs/CONTENT_TYPES_SPEC.md,
_docs/CMS_API.md, _docs/SECURITY_SPEC.md,
_docs/ADMIN_CACHE.md only if cache timing changes, this family’s statuses,
_docs/_TASKS/README.md, changelog 1249, and _docs/_CHANGELOG/README.md. It must not edit
production source or TASK-517. Read TASK-517 and record a fresh audit; route required
changes into its own future contract rather than editing it here.

## Implementation Pseudocode

~~~ts
beforeEach:
  create uniquely prefixed content type, entry, taxonomy, terms, SEO, and actor fixtures;
afterEach:
  delete only records created by this test in FK-safe order;

test invalid taxonomy after requested publish:
  snapshot entry/status/revisions/assignments/SEO;
  call updateEntryMetadata;
  expect stable domain error;
  assert every snapshot unchanged and zero cache events;

test invalid SEO after valid taxonomy:
  assert the same full rollback boundary;

for each injected write seam:
  use entryService's internal dependency/executor seam to throw deterministically;
  assert no partial status/revision/taxonomy/visibility/hash/schedule/SEO state;

for each async taxonomy/SEO apply seam:
  supply a deferred prepare/apply dependency without mutable module mocks;
  assert outer transaction has not resolved and site-cache count remains zero;
  resolve -> assert commit then the exact post-commit cache effect;
  reject -> assert rollback and zero site-cache effects;

test locked-state serialization:
  race password clear-to-public against password/omit;
  assert the final row is never visibility=password with a null hash;
  race two standalone publishes;
  assert the shared SELECT FOR UPDATE serializes distinct increasing revision versions;

test route authorization and schedule presence:
  assert every route mutation rechecks content:write from one locked-transaction snapshot;
  assert a real transition checks content:write + content:publish from that same snapshot;
  assert DB_POOL_MAX=1 completes without a second global connection;
  assert already-published ordinary metadata remains content:write-only;
  assert omitted scheduledAt is absent from service input;
  assert explicit null cannot leave resulting status=scheduled without a date;
  assert seo_canonical_invalid and seo_robots_invalid map to HTTP 400;

test cache effect matrix:
  SEO mutation -> one global clear and zero targeted invalidations after commit;
  changed non-SEO metadata/status -> one targeted invalidation after commit;
  no-op or rollback -> zero site-cache effects;
  post-commit invalidator failure -> stable redacted telemetry, committed result/HTTP success,
    DB state stays durable, and client reconciliation/cacheBus still runs;
  subscribe to cacheBus in the existing entries-client Vitest: successful metadata response
    emits the exact list/type, list/all, and detail reconciliation events; rejected HTTP emits
    zero events; admin cacheBus remains client-owned and is not counted as an entry-service side effect;

test projections:
  inspect named projection keys and static/query shape;
  assert accessPassword is absent from update/publish/delete/metadata JavaScript materialization;
  permit only the SQL-derived access_password IS NOT NULL -> hasPassword boolean;
  assert delete returns id/title, publish returns cache fields, and update has no returning.

test SEO prepare/apply order:
  import ContentTerm/EntryTaxonomyPlan and SeoAnalysis/PreparedSeoMutation plus exact prepare/apply helper
    exports directly from their owning service modules;
  make canonical/robots normalization reject and assert no write seam was reached;
  assert the prepared plan exists before the first entry write;
  inject a DB failure in apply and assert the outer transaction rolls back;
~~~

Tests must not truncate shared tables or assume a clean global database.
Every fault/deferred/concurrency case uses uniquely prefixed fixtures and cleans only its
own entry, revisions, assignments, SEO document, taxonomy/terms, type, actor, role, and
user-role link in FK-safe order. A DB_POOL_MAX=1 child sets its env before fresh imports,
has an internal deadline, calls `process.exit`, and is killed plus awaited in parent
`finally` before cleanup if it hangs. Do not install shared DB triggers, truncate tables,
or mutate process-global service deps.

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

Re-run each named failure once in isolation. If DATABASE_URL is unavailable, do not
claim closure; record the blocker and rerun after recovery.

## TASK-517 dependency audit

After all tests pass, read TASK-517’s task/leaf files against the post-537 source.
Verify its proposed hash loader is the only explicit secret projection, its helpers
match new executor signatures, and it cannot bypass the transaction/cache contract.
The closeout must explicitly record, without editing TASK-517:

- TASK-517 must add TASK-537 as a dependency before implementation;
- all `entryService.ts` symbol/line anchors must be freshly grounded after the new
  projections, locked loader, and coordinator land;
- its proposed `getEntryAccessPasswordHash` remains the sole raw-hash projection and
  must not be merged into the locked public/detail projection;
- its pinned changelog `1236` is already occupied by TASK-526, while the board still
  advertises stale `1230`; the TASK-517 owner must select a currently free pin and sync
  its parent/children/board before implementation;
- TASK-517 must consume the post-537 cache timing and may not reintroduce pre-commit
  invalidation or bypass the locked mutation contract.

Record those blockers in TASK-537 closeout and leave every TASK-517 file/status open for
its future owner.

## Documentation and closure

Document one metadata transaction, before-first-write validation, after-commit cache
timing, and secret-minimal projections without exposing hashes. Run fresh post-audits.
Then create changelog 1249, mark all physical descendants Done, close the parent, and
synchronize task/changelog indexes. No descendant may remain open.
