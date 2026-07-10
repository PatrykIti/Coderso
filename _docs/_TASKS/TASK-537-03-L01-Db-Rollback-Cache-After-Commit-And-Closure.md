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
not weaken or re-baseline them. It may also edit _docs/CONTENT_TYPES_SPEC.md,
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
  force owned executor operation to throw;
  assert no partial status/revision/taxonomy/visibility/hash/schedule/SEO state;

for each async taxonomy/SEO apply seam:
  hold a deferred promise unresolved;
  assert outer transaction has not resolved and cache/broadcast count remains zero;
  resolve -> assert commit then one cache phase;
  reject -> assert rollback and zero cache effects;

test success:
  assert all state commits;
  assert cache invalidation/broadcast occurs once and only after tx resolution;

test projections:
  inspect named projection keys/query spy;
  assert accessPassword is absent from update/publish/delete/metadata materialization;
  assert only hasPassword boolean crosses the boundary.

test SEO prepare/apply order:
  import ContentTerm/EntryTaxonomyPlan and SeoAnalysis/PreparedSeoMutation plus exact prepare/apply helper
    exports directly from their owning service modules;
  make canonical/robots normalization reject and assert no write seam was reached;
  assert the prepared plan exists before the first entry write;
  inject a DB failure in apply and assert the outer transaction rolls back;
~~~

Tests must not truncate shared tables or assume a clean global database.

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

Re-run each named failure once in isolation. If DATABASE_URL is unavailable, do not
claim closure; record the blocker and rerun after recovery.

## TASK-517 dependency audit

After all tests pass, read TASK-517’s task/leaf files against the post-537 source.
Verify its proposed hash loader is the only explicit secret projection, its helpers
match new executor signatures, its anchors/changelog are current, and it cannot bypass
the transaction/cache contract. Record findings in TASK-537 closeout and leave TASK-517
open for its owner.

## Documentation and closure

Document one metadata transaction, before-first-write validation, after-commit cache
timing, and secret-minimal projections without exposing hashes. Run fresh post-audits.
Then create changelog 1249, mark all physical descendants Done, close the parent, and
synchronize task/changelog indexes. No descendant may remain open.
